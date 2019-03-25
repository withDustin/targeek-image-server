import express from 'express'
import ExpressRedisCache from 'express-redis-cache'
import fileType from 'file-type'
import { readFileBuffer } from 'functions/files'
import { processImage } from 'functions/images'
import {
  filesProcessing,
  multer,
  renameFilesToChecksum,
} from 'middlewares/files'
import path from 'path'
import redis from 'redis'
import logger from 'utils/logger'

const router = express.Router()

const redisClient = redis.createClient({ url: process.env.REDIS_URI })

const DEFAULT_TTL = +(process.env.CACHE_TTL || 60)

const cache = ExpressRedisCache({
  client: redisClient,
  prefix: 'file',
  expire: DEFAULT_TTL, // 1 min,
})

cache.on('message', message => logger.verbose('Cached %s', message))
cache.on('connected', () => logger.verbose('Cache redis server connected'))
cache.on('disconnected', () => logger.verbose('Cache redis server connected'))
cache.on('error', error => logger.error('Cache redis server error %o', error))
cache.on('deprecated', deprecated =>
  logger.warning('deprecated warning', {
    type: deprecated.type,
    name: deprecated.name,
    substitute: deprecated.substitute,
    file: deprecated.file,
    line: deprecated.line,
  }),
)

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

router.get(
  '/:fileName',
  (req, res, next) => {
    const { cache: enableCache = 'true' } = req.query

    if (
      enableCache === 'false' ||
      process.env.DISABLE_EXPRESS_CACHING === 'true'
    ) {
      return next()
    }

    const imageFormat = req.query.format || 'webp'

    res.express_redis_cache_name = `${req.originalUrl}-${imageFormat}`
    return cache.route({
      binary: true,
      expire: {
        200: DEFAULT_TTL,
        404: 15,
        xxx: 1,
      },
    })(req, res, next)
  },
  async (req, res, next) => {
    const fileName: string = req.params.fileName
    const imageFormat = req.query.format

    logger.verbose('Getting file %s', fileName)

    try {
      const fileBuffer = await readFileBuffer(fileName)

      if (!fileBuffer) {
        return res
          .header('Cache-Control', 'private')
          .status(404)
          .sendFile(path.resolve(__dirname, '../../static/empty.webp'))
      }

      const optimizedFileBuffer = fileType(fileBuffer).mime.startsWith('image/')
        ? await (await processImage(
            fileBuffer,
            req.query,
            imageFormat === 'jpeg' ? 'jpeg' : 'webp',
          )).toBuffer()
        : fileBuffer

      logger.verbose(
        'Downloaded file %s %s',
        fileName,
        fileType(fileBuffer).mime,
      )

      res
        .header('Cache-Control', 'public, max-age=31536000')
        .contentType(fileType(optimizedFileBuffer).mime)
        .send(optimizedFileBuffer)
    } catch (err) {
      logger.error(err)
      throw err
    }
  },
)

export default router
