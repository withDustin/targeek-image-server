import Queue from 'bull'
import fs from 'fs'
import {
  getFileLocation,
  getFileMimeType,
  getFilePath,
  readFileBuffer,
  removeFile,
  uploadFileToS3,
} from 'functions/files'
import sharp = require('sharp')
import logger from 'utils/logger'

const imageQueue = new Queue('image-processing')

imageQueue.process(async (job, done) => {
  const imageName = job.data.filename

  const imageLocation = await getFileLocation(imageName)

  job.progress(10)

  if (imageLocation !== 'local') {
    return done()
  }

  const fileMimeType = await getFileMimeType(imageName)

  job.progress(20)

  if (
    !(
      !fileMimeType.mime.startsWith('image') ||
      fileMimeType.mime === 'image/webp'
    )
  ) {
    const filePath = await getFilePath(imageName)
    const originalImageBuffer = await readFileBuffer(imageName)

    job.progress(50)

    const convertedImageBuffer = await sharp(originalImageBuffer)
      .webp()
      .toBuffer()
    fs.writeFileSync(filePath, convertedImageBuffer)
  }

  job.progress(75)

  await uploadFileToS3(imageName)
  removeFile(imageName)

  done()
})

imageQueue.on('completed', job =>
  logger.info(`[${job.data.filename}] Processing completed`),
)

export default imageQueue
