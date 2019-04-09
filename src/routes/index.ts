import express from 'express'
import {
  FILE_LOCATIONS,
  generateFileNameWithSize,
  getFileLocation,
  getPublicUrl,
} from 'functions/files'
import {
  filesProcessing,
  multer,
  renameFilesToChecksum,
} from 'middlewares/files'
import logger from 'utils/logger'

const router = express.Router()

const DEFAULT_IMAGE_NAME = '8acd942c9940ce0a7df1a8e15d4bad81'

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

  const fileNameWithSize = generateFileNameWithSize(
    fileName,
    req.query && req.query.size,
  )

  const location = await getFileLocation(fileNameWithSize)

  switch (location) {
    // case FILE_LOCATIONS.LOCAL:
    //   return res
    //     .header('Cache-Control', 'public, max-age=31536000')
    //     .sendFile(getFilePath(fileNameWithSize))

    case FILE_LOCATIONS.S3:
      return res.redirect(301, getPublicUrl(fileName, req.query))

    default:
      return res.redirect(301, getPublicUrl(DEFAULT_IMAGE_NAME))
  }
})

export default router
