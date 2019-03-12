import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import methodOverride from 'method-override'

import routes from 'routes'

import logger from 'utils/logger'

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(methodOverride())

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

app.listen(process.env.PORT, () =>
  logger.info('Server has started with %o', {
    port: process.env.PORT,
    env: process.env.NODE_ENV,
  }),
)
