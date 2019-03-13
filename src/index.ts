import bodyParser from 'body-parser'
import express, { NextFunction, Request, Response } from 'express'
import methodOverride from 'method-override'

import routes from 'routes'

import { s3 } from 'functions/files'
import imageQueue, { imageHealthCheckQueue } from 'jobs/image-processor'
import arenaMiddleware from 'middlewares/arena'
import { serverStartingHealthCheck } from 'utils'
import logger from 'utils/logger'

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(methodOverride())

app.use('/', arenaMiddleware)

app.all('*', routes)

app.all('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: '404 Not found',
  })
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(error.stack)
  res.status(500).json({
    code: 500,
    message: error.message,
  })
})

serverStartingHealthCheck()
  .then(() => {
    imageHealthCheckQueue.add('clean-uploads-dir', null, {
      repeat: { every: 5000 },
    })
    app.listen(process.env.PORT, () =>
      logger.info('Server has started with %o', {
        port: process.env.PORT,
        env: process.env.NODE_ENV,
      }),
    )
  })
  .catch(e => {
    logger.error('Server health check failed')

    process.exit(0)
  })
