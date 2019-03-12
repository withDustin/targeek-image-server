import { s3 } from 'functions/files'
import logger from './logger'

export const serverStartingHealthCheck = async () => {
  return s3
    .headBucket({ Bucket: process.env.AWS_S3_BUCKET })
    .promise()
    .then(() => {
      logger.info(
        'Connected to S3 bucket %s successfully',
        process.env.AWS_S3_BUCKET,
      )
    })
    .catch(e => {
      logger.error(
        'Could not connect to S3 bucket %s',
        process.env.AWS_S3_BUCKET,
      )
      throw e
    })
}
