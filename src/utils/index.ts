import fs from 'fs'
import { s3 } from 'functions/files'
import logger from './logger'

export const serverStartingHealthCheck = async () => {
  if (!process.env.UPLOAD_DIR) {
    logger.error(`process.env.UPLOAD_DIR is not set.`)
    throw new Error(`process.env.UPLOAD_DIR is not set.`)
  }

  if (process.env.UPLOAD_DIR.length && !fs.existsSync(process.env.UPLOAD_DIR)) {
    fs.mkdirSync(process.env.UPLOAD_DIR)
    logger.info(
      `Found process.env.UPLOAD_DIR=${process.env.UPLOAD_DIR} but ${
        process.env.UPLOAD_DIR
      } directory doesn't exist. We will auto-create ${
        process.env.UPLOAD_DIR
      } for you.`,
    )
  }

  if (!(process.env.UPLOAD_DIR && fs.existsSync(process.env.UPLOAD_DIR))) {
    logger.error('process.env.UPLOAD_DIR is not valid.')
    throw new Error('process.env.UPLOAD_DIR is not valid.')
  }

  return s3
    .headBucket({ Bucket: process.env.AWS_S3_BUCKET })
    .promise()
    .then(() => {
      logger.info(
        'Connected to S3 bucket %s successfully',
        process.env.AWS_S3_BUCKET,
      )

      logger.info('%o', {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: `${process.env.AWS_SECRET_ACCESS_KEY.toUpperCase()} (length: ${
          process.env.AWS_SECRET_ACCESS_KEY.length
        })`,
        region: process.env.AWS_REGION,
      })
    })
    .catch(e => {
      logger.error(
        'Could not connect to S3 bucket %s',
        process.env.AWS_S3_BUCKET,
      )
      throw e
    })
}
