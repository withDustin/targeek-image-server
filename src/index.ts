import express from 'express'
import logger from 'utils/logger'

const app = express()

app.listen(process.env.PORT, () =>
  logger.info('Server has started with %o', {
    port: process.env.PORT,
    env: process.env.NODE_ENV,
  }),
)
