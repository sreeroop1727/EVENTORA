import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { connectDatabase, mongoose } from '../config/database.js'
import { User } from '../models/User.js'

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password || password.length < 16) {
    throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters in backend/.env.')
  }
  if (!env.mongoUri) throw new Error('Set MONGODB_URI in backend/.env before seeding.')

  await connectDatabase(env.mongoUri)
  const existing = await User.findOne({ email })
  if (existing) {
    if (existing.role !== 'admin') throw new Error('That email already belongs to a non-admin account; use a different ADMIN_EMAIL.')
    console.log('An admin account already exists for ADMIN_EMAIL; no changes made.')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({ name: 'EVENTORA Administrator', email, passwordHash, role: 'admin', status: 'active' })
  console.log('Initial admin account created. Credentials were not printed.')
}

seedAdmin()
  .catch((error) => {
    console.error(`Admin seed failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => mongoose.disconnect())