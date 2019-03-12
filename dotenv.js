const dotenv = require('dotenv')
const version = require('./package.json').version

function dotenvSetup() {
  const ENV = process.env.NODE_ENV

  dotenv.config({ path: `.env.${ENV}.local` })
  dotenv.config({ path: `.env.${ENV}` })

  dotenv.config({ path: '.env.local' })
  dotenv.config({ path: '.env' })

  process.env.SERVER_VERSION = version
}

module.exports = dotenvSetup
