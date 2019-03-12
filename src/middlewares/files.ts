import { RequestHandler } from 'express-serve-static-core'
import fs from 'fs'
import {
  fileExists,
  getFileChecksum,
  getFileLocation,
  getFilePath,
  removeFile,
  renameFile,
} from 'functions/files'
import multerMiddleware from 'multer'
import path from 'path'
import sharp = require('sharp')
import logger from 'utils/logger'

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

export const renameFilesToChecksum: RequestHandler = async (req, res, next) => {
  const files = req.files as Express.Multer.File[]
  const nextFiles = await Promise.all(
    files.map(async (file: Express.Multer.File) => {
      const checksum = getFileChecksum(file.path)

      const existingFileLocation = await getFileLocation(checksum)
      const isFileExisted = existingFileLocation !== 'not_exist'

      if (isFileExisted) {
        removeFile(file.filename)
        file.filename = checksum
        return {
          ...file,
          location: existingFileLocation,
        }
      }

      renameFile(file.filename, checksum)

      file.filename = checksum

      return {
        ...file,
        location: existingFileLocation,
      }
    }),
  )

  req.files = nextFiles
  next()
}

export const convertImagesToWebP: RequestHandler = async (req, res, next) => {
  const files = req.files as Array<
    Express.Multer.File & {
      location: 's3' | 'local' | 'not_exist'
    }
  >

  files.forEach(async file => {
    if (file.location === 'not_exist' && file.mimetype.startsWith('image/')) {
      const filePath = getFilePath(file.filename)
      const optimizedImageBuffer = await sharp(filePath)
        .webp()
        .toBuffer()

      fs.writeFileSync(filePath, optimizedImageBuffer)
      logger.debug('Converted image %s to webp', filePath)
    }
  })

  next()
}
