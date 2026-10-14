import assert from 'node:assert/strict'
import { test } from 'node:test'
import request from 'supertest'
import { app } from '../src/app.js'
import { buildPublicEventFilter, geoCoordinates } from '../src/controllers/eventController.js'
import { Event } from '../src/models/Event.js'

test('health reports service and database availability without secrets', async () => {
  const response = await request(app).get('/api/health')

  assert.equal(response.status, 200)
  assert.equal(response.body.status, 'ok')
  assert.equal(response.body.service, 'eventora-api')
  assert.ok(['connected', 'disconnected'].includes(response.body.database))
  assert.equal('jwtSecret' in response.body, false)
})

test('unknown API routes return a structured not-found response', async () => {
  const response = await request(app).get('/api/not-a-route')

  assert.equal(response.status, 404)
  assert.equal(typeof response.body.error.message, 'string')
})

test('public registration rejects client-selected privileged roles', async () => {
  const response = await request(app).post('/api/auth/register').send({
    name: 'Untrusted User',
    email: 'untrusted@example.com',
    password: 'a-secure-password',
    role: 'admin',
  })

  assert.equal(response.status, 400)
})

test('session and admin routes reject anonymous requests', async () => {
  const sessionResponse = await request(app).get('/api/auth/me')
  const adminResponse = await request(app).get('/api/admin/organizers/verification')

  assert.equal(sessionResponse.status, 401)
  assert.equal(adminResponse.status, 401)
})

test('database-backed event routes fail fast when MongoDB is unavailable', async () => {
  const response = await request(app).get('/api/events')

  assert.equal(response.status, 503)
  assert.match(response.body.error.message, /MONGODB_URI/)
})

test('public event filters search manual locations and retain only available events', () => {
  const filter = buildPublicEventFilter({ location: 'Koramangala 560034', availability: 'available', priceType: 'paid' })

  assert.equal(filter.status, 'published')
  assert.equal(filter.ticketTypes.$elemMatch.remaining.$gt, 0)
  assert.equal(filter.ticketTypes.$elemMatch.price.$gt, 0)
  assert.ok(filter.$and.some((clause) => clause.$or?.some((condition) => condition.postalCode)))
})

test('event schema declares a 2dsphere venue index', () => {
  assert.ok(Event.schema.indexes().some(([keys]) => keys.venueLocation === '2dsphere'))
})

test('nearby coordinates require valid latitude, longitude, and supported radius', () => {
  assert.deepEqual(geoCoordinates({ lat: '12.97', lng: '77.59', radiusKm: '10' }), {
    latitude: 12.97,
    longitude: 77.59,
    radiusKm: 10,
  })
  assert.throws(() => geoCoordinates({ lat: '91', lng: '77.59', radiusKm: '10' }), /coordinates are invalid/)
  assert.throws(() => geoCoordinates({ lat: '12', lng: '77', radiusKm: '7' }), /Radius must be/)
})