import S3 from 'aws-sdk/clients/s3'
import getFileType from 'file-type'
import fs from 'fs'
import md5File from 'md5-file'
import path from 'path'

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
  const existsOnS3 = await s3
    .headObject({ Bucket, Key: fileName })
    .promise()
    .then(() => Promise.resolve(true))
    .catch(() => Promise.resolve(false))

  if (existsOnS3) {
    return 's3'
  }

  const existsOnLocal = fs.existsSync(getFilePath(fileName))

  if (existsOnLocal) {
    return 'local'
  }

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
  return s3
    .getObject({ Bucket, Key: fileName })
    .promise()
    .then(response => Promise.resolve(response.Body))
    .catch(() => Promise.resolve(null))
}

export const readFileBuffer = async (fileName: string) => {
  const s3Buffer = await readFileFromS3(fileName)
  if (s3Buffer) {
    return s3Buffer
  }

  if (fs.existsSync(getFilePath(fileName))) {
    return fs.readFileSync(getFilePath(fileName))
  }

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
