FROM node:20-alpine

RUN apk add --no-cache chromium

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_EXECUTABLE=/usr/bin/chromium-browser

RUN npm install -g prerender

EXPOSE 3000
CMD ["prerender"]
