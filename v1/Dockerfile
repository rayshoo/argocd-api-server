FROM node:18.12.0-alpine3.16 as builder
COPY package*.json ./
RUN npm install && touch .env
COPY . .
RUN npm run build

FROM alpine:3.17.2
COPY --from=builder .env .env
COPY --from=builder dist/server /bin/server
EXPOSE 3000
ENTRYPOINT ["server"]