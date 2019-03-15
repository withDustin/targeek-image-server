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
const cache = ExpressRedisCache({
  // client: redisClient,
  host: '127.0.0.1',
  port: 6379,
  prefix: 'file',
  expire: 60e3, // 1 min
})

redisClient.on('message', console.log)
cache.on('connect', () => logger.info('Cache redis server connected'))
cache.on('error', error => logger.info('Cache redis server error %o', error))

router.put(
  '/images',
  multer,
  renameFilesToChecksum,
  filesProcessing,
  (req, res) => {
    logger.verbose('uploaded %o', req.files)
    cache.get('*', console.log)
    res.send(req.files)
  },
)

router.get(
  '/:fileName',
  // (req, res, next) => {
  //   res.express_redis_cache_name = req.params.fileName
  //   next()
  // },
  cache.route(),
  async (req, res, next) => {
    const fileName: string = req.params.fileName
    logger.verbose('Getting file %s', fileName)

    try {
      const fileBuffer = await readFileBuffer(fileName)

      if (!fileBuffer) {
        return res
          .status(404)
          .sendFile(path.resolve(__dirname, '../../static/empty.webp'))
      }

      const optimizedFileBuffer = fileType(fileBuffer).mime.startsWith('image/')
        ? await (await processImage(fileBuffer, req.query)).toBuffer()
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
