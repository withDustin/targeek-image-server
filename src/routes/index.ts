import express from 'express'
import fileType from 'file-type'
import { readFileBuffer } from 'functions/files'
import { processImage } from 'functions/images'
import {
  filesProcessing,
  multer,
  renameFilesToChecksum,
} from 'middlewares/files'
import logger from 'utils/logger'

const router = express.Router()

router.put(
  '/image',
  multer,
  renameFilesToChecksum,
  filesProcessing,
  (req, res) => {
    // logger.verbose('uploaded %o', req.files)
    res.send(req.files)
  },
)

router.get('/:fileName', async (req, res, next) => {
  try {
    const fileName: string = req.params.fileName
    const fileBuffer = await readFileBuffer(fileName)

    if (!fileBuffer) {
      return res.status(404).send({
        code: 404,
        message: 'File not found',
      })
    }

    const optimizedFileBuffer = fileType(fileBuffer).mime.startsWith('image/')
      ? (await processImage(fileBuffer, req.query)).toBuffer()
      : fileBuffer

    logger.verbose('Downloaded file %s', fileName)

    res
      .header('Cache-Control', 'public, max-age=31536000')
      .contentType('image/*')
      .send(optimizedFileBuffer)
  } catch (err) {
    throw err
  }
})

export default router
