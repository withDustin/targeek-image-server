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

export const imageQueue = new Queue('image-processing', {
  defaultJobOptions: {
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  },
})
export const imageHealthCheckQueue = new Queue('image-health-check', {
  defaultJobOptions: { delay: 20000 },
})

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
    fileMimeType &&
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

imageQueue.on('completed', async job => {
  logger.info(`[${job.data.filename}] Processing completed`)
})
imageQueue.on('error', error => {
  logger.error(`[${error.name}]: ${error.message} %o`, error.stack)
})

imageHealthCheckQueue.process('clean-uploads-dir', async (job, done) => {
  const pendingFiles = fs.readdirSync(process.env.UPLOAD_DIR)

  pendingFiles
    .filter(file => file !== '.DS_Store')
    .forEach(filename => imageQueue.add({ filename }))

  setTimeout(done, 5000)
})

export default imageQueue
