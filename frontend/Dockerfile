FROM node:18-alpine

WORKDIR /usr/src/app
COPY package.json /usr/src/app/package.json
RUN npm install
COPY ./src /usr/src/app/src
COPY ./tailwind.config.js /usr/src/app/tailwind.config.js

EXPOSE 3000
CMD ["npm","start"]
