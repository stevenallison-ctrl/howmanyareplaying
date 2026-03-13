FROM node:20-alpine

RUN apk add --no-cache chromium

WORKDIR /app

RUN npm init -y && npm install prerender

COPY server.js .

EXPOSE 3000
CMD ["node", "server.js"]
