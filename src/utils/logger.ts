import winston from 'winston'

const logger = winston.createLogger({
  level: 'verbose',
  format: winston.format.combine(winston.format.splat(), winston.format.json()),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log', level: 'verbose' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
})

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  )
  logger.add(
    new winston.transports.File({ filename: 'combined.log', level: 'verbose' }),
  )
}

export default logger
