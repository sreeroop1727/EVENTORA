import { mkdirSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

export const privateUploadDirectory = resolve(process.cwd(), env.uploadDir)
mkdirSync(privateUploadDirectory, { recursive: true })

const allowedTypes = new Map([
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
])

const storage = multer.diskStorage({
  destination: privateUploadDirectory,
  filename(request, file, callback) {
    callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`)
  },
})

export const uploadVerificationDocuments = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 3 },
  fileFilter(request, file, callback) {
    const extension = extname(file.originalname).toLowerCase()
    if (allowedTypes.get(extension) !== file.mimetype) return callback(new AppError(400, 'Only PDF, PNG, JPG, and WebP documents are accepted.'))
    return callback(null, true)
  },
}).array('documents', 3)

export function validDocumentSignature(buffer, mimeType) {
  if (mimeType === 'application/pdf') return buffer.subarray(0, 5).toString() === '%PDF-'
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (mimeType === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
  return false
}