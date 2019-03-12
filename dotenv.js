const dotenv = require('dotenv')

function dotenvSetup() {
  const ENV = process.env.NODE_ENV

  dotenv.config({ path: `.env.${ENV}.local` })
  dotenv.config({ path: `.env.${ENV}` })

  dotenv.config({ path: '.env.local' })
  dotenv.config({ path: '.env' })
}

dotenvSetup()

module.exports = dotenvSetup
