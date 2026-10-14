import mongoose from 'mongoose'

mongoose.set('sanitizeFilter', true)

export async function connectDatabase(uri) {
  if (!uri) throw new Error('MONGODB_URI is not configured')
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  return mongoose.connection
}

export { mongoose }