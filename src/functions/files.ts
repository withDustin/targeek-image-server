import S3 from 'aws-sdk/clients/s3'
import getFileType from 'file-type'
import fs from 'fs'
import md5File from 'md5-file'
import path from 'path'
import sharp = require('sharp')
import logger from 'utils/logger'

const Bucket = process.env.AWS_S3_BUCKET

export const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
})

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/'

export const getFilePath = (fileName: string) =>
  path.resolve(UPLOAD_DIR, fileName)

export const getFileChecksum = md5File.sync

export const getFileLocation = async (fileName: string) => {
  logger.verbose(`[getFileLocation][%s] start getting file location`, fileName)
  const existsOnS3 = await s3
    .headObject({ Bucket, Key: fileName })
    .promise()
    .then(() => Promise.resolve(true))
    .catch(() => Promise.resolve(false))

  if (existsOnS3) {
    logger.verbose(`[getFileLocation][%s] file location is S3`, fileName)
    return 's3'
  }

  const existsOnLocal = fs.existsSync(getFilePath(fileName))

  if (existsOnLocal) {
    logger.verbose(`[getFileLocation][%s] file location is LOCAL`, fileName)
    return 'local'
  }

  logger.verbose(`[getFileLocation][%s] file location is NOT_EXIST`, fileName)
  return 'not_exist'
}

export const fileExists = async (fileName: string) => {
  return (await getFileLocation(fileName)) !== 'not_exist'
}

export const removeFile = (fileName: string) => {
  if (!fs.existsSync(getFilePath(fileName))) {
    return
  }
  return fs.unlinkSync(getFilePath(fileName))
}

export const renameFile = (oldName: string, newName: string) => {
  return fs.renameSync(getFilePath(oldName), getFilePath(newName))
}

const readFileFromS3 = (fileName: string) => {
  logger.verbose(`[readFileFromS3][%s] Reading file from s3`, fileName)
  return s3
    .getObject({ Bucket, Key: fileName })
    .promise()
    .then(response => {
      logger.verbose(`[readFileFromS3][%s] File found on S3`, fileName)
      return Promise.resolve(response.Body)
    })
    .catch(error => {
      if (error.statusCode !== 404) {
        return Promise.reject(error)
      }
      logger.verbose(
        `[readFileFromS3][%s] File doesn't exist on S3 %s`,
        fileName,
        error.statusCode,
      )
      return Promise.resolve(null)
    })
}

export const readFileBuffer = async (fileName: string) => {
  logger.verbose(`[readFileBuffer][%s] Getting file buffer`, fileName)

  const s3Buffer = await readFileFromS3(fileName)
  if (s3Buffer) {
    return s3Buffer
  }

  if (fs.existsSync(getFilePath(fileName))) {
    logger.verbose(`[readFileBuffer][%s] File found on local`, fileName)
    return fs.readFileSync(getFilePath(fileName))
  }

  logger.verbose(
    `[readFileBuffer][%s] File not found on local or s3. Return null`,
    fileName,
  )

  return null
}

export const uploadFileToS3 = async (fileName: string) => {
  const isFileExistsOnS3 = (await getFileLocation(fileName)) === 's3'

  if (isFileExistsOnS3) {
    return
  }

  const fileBuffer = fs.readFileSync(getFilePath(fileName))

  return s3.putObject({ Bucket, Key: fileName, Body: fileBuffer }).promise()
}

export const getFileMimeType = async (fileName: string) => {
  const fileBuffer = await readFileBuffer(fileName)

  if (!fileBuffer) {
    return null
  }

  return await getFileType(fileBuffer)
}

export const processAndUpload = async (fileName: string) => {
  const filePath = getFilePath(fileName)
  const imageLocation = await getFileLocation(fileName)

  if (imageLocation === 'local' && !fs.statSync(filePath).isFile()) {
    return
  }

  if (imageLocation !== 'local') {
    removeFile(fileName)
    return
  }

  const fileMimeType = await getFileMimeType(fileName)

  if (
    fileMimeType &&
    !(
      !fileMimeType.mime.startsWith('image') ||
      fileMimeType.mime === 'image/webp'
    )
  ) {
    const originalImageBuffer = await readFileBuffer(fileName)

    const convertedImageBuffer = await sharp(originalImageBuffer)
      .webp()
      .toBuffer()
    fs.writeFileSync(filePath, convertedImageBuffer)
  }

  await uploadFileToS3(fileName)
  removeFile(fileName)
}
