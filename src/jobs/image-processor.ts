import Queue from 'bull'
import fs from 'fs'
import {
  getFileLocation,
  getFileMimeType,
  getFilePath,
  readFileBuffer,
  removeFile,
  resizeImage,
  uploadFileToS3,
  uploadImagesToS3AndRemove,
} from 'functions/files'
import sharp = require('sharp')
import logger from 'utils/logger'

export const imageQueue = new Queue('image-processing', process.env.REDIS_URI, {
  defaultJobOptions: {
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  },
})
export const imageHealthCheckQueue = new Queue(
  'image-health-check',
  process.env.REDIS_URI,
  {
    defaultJobOptions: { delay: 20000 },
    limiter: {
      max: 1,
      duration: 10000,
    },
  },
)

imageQueue.process(async (job, done) => {
  const fileName = job.data.filename
  const filePath = getFilePath(fileName)
  const imageLocation = await getFileLocation(fileName)

  if (imageLocation === 'local' && !fs.statSync(filePath).isFile()) {
    return done()
  }

  job.progress(10)

  if (imageLocation !== 'local') {
    removeFile(fileName)
    return done()
  }

  const fileMimeType = await getFileMimeType(fileName)

  job.progress(20)

  if (
    fileMimeType &&
    !(
      !fileMimeType.mime.startsWith('image') ||
      fileMimeType.mime === 'image/webp'
    )
  ) {
    const originalImageBuffer = await readFileBuffer(fileName)

    job.progress(50)

    // const convertedImageBuffer = await sharp(originalImageBuffer)
    //   .webp()
    //   .toBuffer()
    // fs.writeFileSync(filePath, convertedImageBuffer)
    await resizeImage(fileName, originalImageBuffer)
    job.progress(75)
    await uploadImagesToS3AndRemove(fileName)
  }

  // await uploadFileToS3(fileName)
  // removeFile(fileName)

  done()
})

imageQueue.on('completed', async job => {
  logger.info(`[${job.data.filename}] Processing completed`)
})
imageQueue.on('error', error => {
  logger.error(`[${error.name}]: ${error.message} %o`, error.stack)
})

imageHealthCheckQueue.process('clean-uploads-dir', async (job, done) => {
  const pendingFiles = fs
    .readdirSync(process.env.UPLOAD_DIR)
    .filter(
      file => file !== '.DS_Store' && fs.statSync(getFilePath(file)).isFile(),
    )

  if (+(await imageQueue.getJobCountByTypes('waiting')) === 0) {
    if (pendingFiles.length) {
      logger.info(
        '[Health check] Adding %d files to processor %o',
        pendingFiles.length,
        pendingFiles,
      )
      pendingFiles.forEach(filename => imageQueue.add({ filename }))
    }
  } else {
    if (pendingFiles.length) {
      logger.info(
        `[Health check] Skipping %d files while image processor queue is not empty`,
        pendingFiles.length,
      )
    }
  }

  done()
})

export default imageQueue
