import { RequestHandler } from 'express-serve-static-core'
import fs from 'fs'
import {
  fileExists,
  getFileChecksum,
  removeFile,
  renameFile,
} from 'functions/files'
import multerMiddleware from 'multer'
import path from 'path'

const storage = multerMiddleware.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(
      __dirname,
      '../..',
      process.env.UPLOAD_DIR || 'uploads/',
    )
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir)
    }
    cb(null, process.env.UPLOAD_DIR || 'uploads/')
  },
})

export const multer = multerMiddleware({
  storage,
  limits: {
    files: +(process.env.MAX_UPLOAD_FILES || 10),
    fileSize: +(process.env.MAX_FILE_SIZE || 1) * 1024 * 1024,
  },
}).any()

export const renameFilesToChecksum: RequestHandler = (req, res, next) => {
  const nextFiles = (req.files as Express.Multer.File[]).map(
    (file: Express.Multer.File) => {
      const checksum = getFileChecksum(file.path)

      const isFileExisted = fileExists(checksum)

      if (isFileExisted) {
        removeFile(file.filename)
        file.filename = checksum
        return file
      }

      renameFile(file.filename, checksum)

      file.filename = checksum
      return file
    },
  )

  req.files = nextFiles
  next()
}
