import express from 'express'
import fileType from 'file-type'
import { readFileBuffer } from 'functions/files'
import { processImage } from 'functions/images'
import {
  filesProcessing,
  multer,
  renameFilesToChecksum,
} from 'middlewares/files'
import path from 'path'
import logger from 'utils/logger'

const router = express.Router()

router.put(
  '/images',
  multer,
  renameFilesToChecksum,
  filesProcessing,
  (req, res) => {
    logger.verbose('uploaded %o', req.files)
    res.send(req.files)
  },
)

router.get('/:fileName', async (req, res, next) => {
  const fileName: string = req.params.fileName
  logger.verbose('Getting file %s', fileName)

  try {
    const fileBuffer = await readFileBuffer(fileName)

    if (!fileBuffer) {
      return res
        .status(404)
        .sendFile(path.resolve(__dirname, '../../static/empty.webp'))
    }

    const optimizedFileBuffer = fileType(fileBuffer).mime.startsWith('image/')
      ? await (await processImage(fileBuffer, req.query)).toBuffer()
      : fileBuffer

    logger.verbose('Downloaded file %s %s', fileName, fileType(fileBuffer).mime)

    res
      .header('Cache-Control', 'public, max-age=31536000')
      .contentType(fileType(optimizedFileBuffer).mime)
      .send(optimizedFileBuffer)
  } catch (err) {
    logger.error(err)
    throw err
  }
})

export default router
