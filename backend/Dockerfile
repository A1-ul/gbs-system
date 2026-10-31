FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN addgroup -S gbs && \
    adduser -S gbs -G gbs

USER gbs

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health || exit 1

CMD ["node", "src/core/server.js"]