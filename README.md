# Targeek Image Server

An image server that optimizes images by sharp and upload them to AWS S3. Made to serve a huge amount of requests.

[![CircleCI](https://circleci.com/gh/targeek/targeek-image-server.svg?style=svg)](https://circleci.com/gh/targeek/targeek-image-server)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/targeek/targeek-image-server/graphs/commit-activity)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![TypeScript](https://badges.frapsoft.com/typescript/awesome/typescript.png?v=101)](https://github.com/ellerbrock/typescript-badges/)

## Usage

Use this docker image [targeek/targeek-image-server](https://hub.docker.com/r/targeek/targeek-image-server)

```bash
docker pull targeek/targeek-image-server
# or
docker run -p 4000:4000 -e REDIS_URI=redis://redis-uri targeek/targeek-image-server
```

## Development

1. Clone this repository
2. Install dependencies

```bash
yarn install
```

3. Setup environment variables by edit `.env`, `.env.development`, `.env.production`. You can see the list of environment variables in the `src/modules.d.ts` file.

4. Run

```bash
# Run in development mode
yarn start

# Run in production mode
yarn build
yarn start:production
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

**Working on your first Pull Request?** You can learn how from this _free_ series [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github)

## License

[MIT](https://choosealicense.com/licenses/mit/)
