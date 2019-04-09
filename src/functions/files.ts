import S3 from 'aws-sdk/clients/s3'
import getFileType from 'file-type'
import fs from 'fs'
import md5File from 'md5-file'
import path from 'path'
import sharp = require('sharp')
import logger from 'utils/logger'

const Bucket = process.env.AWS_S3_BUCKET
const Region = process.env.AWS_REGION

const imageSizes: Array<{ name: SizeName; maxWidth: number }> = [
  {
    name: 'original',
    maxWidth: 1366,
  },
  {
    name: 'large',
    maxWidth: 1024,
  },
  {
    name: 'medium',
    maxWidth: 768,
  },
  {
    name: 'small',
    maxWidth: 448,
  },
  {
    name: 'thumb',
    maxWidth: 128,
  },
]

type SizeName = 'original' | 'large' | 'medium' | 'small' | 'thumb'

type ACL =
  | 'private'
  | 'public-read'
  | 'public-read-write'
  | 'authenticated-read'
  | 'aws-exec-read'
  | 'bucket-owner-read'
  | 'bucket-owner-full-control'

export const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
})

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/'

export const FILE_LOCATIONS = {
  LOCAL: 'local',
  S3: 's3',
  NOT_EXIST: 'not_exist',
}

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
    return FILE_LOCATIONS.S3
  }

  const existsOnLocal = fs.existsSync(getFilePath(fileName))

  if (existsOnLocal) {
    logger.verbose(`[getFileLocation][%s] file location is LOCAL`, fileName)
    return FILE_LOCATIONS.LOCAL
  }

  logger.verbose(`[getFileLocation][%s] file location is NOT_EXIST`, fileName)
  return FILE_LOCATIONS.NOT_EXIST
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

export const readFileBufferFromLocal = async (fileName: string) => {
  if (fs.existsSync(getFilePath(fileName))) {
    logger.verbose(`[readFileBuffer][%s] File found on local`, fileName)
    return fs.readFileSync(getFilePath(fileName))
  }

  return
}

export const readFileBuffer = async (fileName: string) => {
  logger.verbose(`[readFileBuffer][%s] Getting file buffer`, fileName)

  if (fs.existsSync(getFilePath(fileName))) {
    logger.verbose(`[readFileBuffer][%s] File found on local`, fileName)
    return fs.readFileSync(getFilePath(fileName))
  }

  const s3Buffer = await readFileFromS3(fileName)
  if (s3Buffer) {
    return s3Buffer
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

  return s3
    .putObject({ Bucket, Key: fileName, Body: fileBuffer, ACL: 'public-read' })
    .promise()
}

export const getFileMimeType = async (fileName: string) => {
  const fileBuffer = await readFileBuffer(fileName)

  if (!fileBuffer) {
    return null
  }

  return await getFileType(fileBuffer)
}

export const generateFileNameWithSize = (
  fileName: string,
  sizeName?: SizeName,
) => {
  if (!sizeName) {
    return fileName
  }

  const sizeSuffix = sizeName === 'original' ? '' : `-${sizeName}`

  return /\./.test(fileName)
    ? fileName.replace(/\./, `${sizeSuffix}.`)
    : `${fileName}${sizeSuffix}`
}

export const resizeImage = (fileName: string, buffer: Buffer) => {
  return Promise.all(
    imageSizes.map(async size => {
      const resizedBuffer = await sharp(buffer)
        .resize(size.maxWidth, null, {
          withoutEnlargement: true,
        })
        .jpeg()
        .toBuffer()

      const filePath = path.resolve(
        'uploads/',
        generateFileNameWithSize(fileName, size.name),
      )

      return fs.writeFileSync(filePath, resizedBuffer)
    }),
  )
}

export const uploadImagesToS3AndRemove = (fileName: string) => {
  return Promise.all(
    imageSizes.map(async size => {
      const fileNameWithSize = generateFileNameWithSize(fileName, size.name)

      if (fs.existsSync(getFilePath(fileNameWithSize))) {
        await uploadFileToS3(fileNameWithSize)
        removeFile(fileNameWithSize)
      }
    }),
  )
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

    await resizeImage(fileName, originalImageBuffer)
  }

  await uploadImagesToS3AndRemove(fileName)
}

export const reProcessLocalFiles = async (startAt: number = 0) => {
  const files = await fs.readdirSync(UPLOAD_DIR)
  const maxJobs = 10

  let count = startAt
  while (count < files.length) {
    const jobFiles = files.slice(count, count + maxJobs)

    await Promise.all(
      jobFiles.map(async (fileName, idx) => {
        // skip if this is resized file
        if (/-/.test(fileName)) {
          return
        }

        logger.verbose(`[${count + idx}]: ${fileName}`)
        const buffer = await readFileBuffer(fileName)
        const fileMimeType = await getFileType(buffer)

        if (fileMimeType && fileMimeType.mime.startsWith('image')) {
          await resizeImage(fileName, buffer)
        }
        return
      }),
    )

    count += maxJobs
  }
}

export const reUploadImageToS3AndRemove = async (startAt: number = 0) => {
  const files = await fs.readdirSync(UPLOAD_DIR)
  const maxJobs = 10
  let count = startAt

  while (count < files.length) {
    const jobFiles = files.slice(count, count + maxJobs)

    await Promise.all(
      jobFiles.map(async (fileName, idx) => {
        logger.verbose(`[${count + idx}]: ${fileName}`)
        const buffer = await readFileBuffer(fileName)
        const fileMimeType = await getFileType(buffer)

        if (fileMimeType && fileMimeType.mime.startsWith('image')) {
          if (fs.existsSync(getFilePath(fileName))) {
            await s3
              .putObject({ Bucket, Key: fileName, Body: buffer })
              .promise()
            removeFile(fileName)
          }
        }
      }),
    )

    count += maxJobs
  }
}

/**
 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjects-property
 * @param limit Sets the maximum number of keys returned in the response. The response might contain fewer keys but will never contain more.
 * @param marker Specifies the key to start with when listing objects in a bucket.
 */
export const listObjects = ({
  limit,
  marker,
}: {
  /** Sets the maximum number of keys returned in the response. The response might contain fewer keys but will never contain more. */
  limit?: number
  /** Specifies the key to start with when listing objects in a bucket. */
  marker?: string
} = {}) => {
  return s3
    .listObjects({
      Bucket,
      // up to 1000
      MaxKeys: limit,
      Marker: marker,
    })
    .promise()
}

export const listAllObjects = async (
  startAt?: number,
  marker?: string,
  prevObjects?: S3.Object[],
): Promise<S3.Object[]> => {
  let objects: S3.Object[] = prevObjects
  let count = startAt

  logger.verbose(
    `[Get objects from ${count}000-${count + 1}000]: marker ${marker}`,
  )
  const response: S3.ListObjectsOutput = await listObjects({
    marker,
  })

  objects = objects.concat(response.Contents)

  if (response.IsTruncated) {
    return await listAllObjects(
      ++count,
      response.Contents.slice(-1)[0].Key,
      objects,
    )
  }

  return objects
}

export const putObjectACL = ({ key, acl }: { key: string; acl: ACL }) => {
  return s3
    .putObjectAcl({
      Bucket,
      Key: key,
      ACL: acl,
    })
    .promise()
}

export const rePutAllErrorObjectsACL = async (
  prevObjects: S3.Object[],
): Promise<void> => {
  let objects = prevObjects

  logger.verbose(`[Re put error object ACL]: ${objects.length} objects`)

  objects = (await Promise.all(
    objects.map(async item => {
      try {
        await putObjectACL({ key: item.Key, acl: 'public-read' })
        return null
      } catch (err) {
        logger.error(`[Put object ACL error]: ${item.Key}`, err)
        return item
      }
    }),
  )).filter(object => object)

  if (objects.length < 1) {
    logger.info(`[Re put error object ACL has finished]`)
  } else {
    return await rePutAllErrorObjectsACL(objects)
  }
}

export const rePutAllObjectsACL = async (
  startAt: number = 0,
  marker?: string,
  prevErrorObjects?: S3.Object[],
): Promise<void> => {
  let count = startAt
  let errorObjects: S3.Object[] = prevErrorObjects

  logger.verbose(
    `[Put object ACL from ${count}000-${count + 1}000]: marker ${marker}`,
  )

  const response: S3.ListObjectsOutput = await listObjects({
    marker,
  })

  await Promise.all(
    response.Contents.map(async item => {
      try {
        return await putObjectACL({ key: item.Key, acl: 'public-read' })
      } catch (err) {
        errorObjects = errorObjects.concat(item)
        logger.error(`[Put object ACL error]: ${item.Key}`, err)
      }
    }),
  )

  if (response.IsTruncated) {
    return await rePutAllObjectsACL(
      ++count,
      response.Contents.slice(-1)[0].Key,
      errorObjects,
    )
  } else {
    logger.info(
      `[Put object ACl has finished] with ${errorObjects.length} errors`,
    )

    return await rePutAllErrorObjectsACL(errorObjects)
  }
}

export const getObjectUrl = (
  fileName: string,
  { size = 'original' }: { size?: SizeName },
) => {
  const fileNameWithSize = generateFileNameWithSize(fileName, size)

  return s3.getSignedUrl('getObject', {
    Bucket,
    Key: fileNameWithSize,
    Expires: 60 * 24 * 7,
  })
}

export const getObjectPublicUrl = (
  fileName: string,
  { size = 'original' }: { size?: SizeName } = {},
) => {
  const fileNameWithSize = generateFileNameWithSize(fileName, size)

  return `https://${Bucket}.s3.${Region}.amazonaws.com/${fileNameWithSize}`
}
