import winston from 'winston'

const logger = winston.createLogger({
  level: 'verbose',
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.json(),
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log', level: 'verbose' }),
  ],
})

export default logger
