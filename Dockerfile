FROM node:10-alpine
WORKDIR /app

ADD ["package.json", "yarn.lock", "./"]

RUN yarn install

ADD . .

RUN yarn build

EXPOSE 4000

CMD ["yarn", "start:production"]