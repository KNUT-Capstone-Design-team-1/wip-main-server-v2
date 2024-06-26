FROM node:20.12.0-alpine

ARG MAIN_SERVER_PORT
ARG DBMS_ADDRESS
ARG NODE_ENV
ARG PERM_ENC_SERVICE_KEY
ARG PERM_DEC_SERVICE_KEY
ARG DL_SERVER_ADDRESS
ARG DL_SERVER_PORT
ARG DL_SERVER_PILL_RECOGNITION_API_URL_PATH

ENV TZ=Asia/Seoul
ENV MAIN_SERVER_PORT=$MAIN_SERVER_PORT
ENV DBMS_ADDRESS=$DBMS_ADDRESS
ENV NODE_ENV=$NODE_ENV
ENV PERM_ENC_SERVICE_KEY=$PERM_ENC_SERVICE_KEY
ENV PERM_DEC_SERVICE_KEY=$PERM_DEC_SERVICE_KEY
ENV DL_SERVER_ADDRESS=$DL_SERVER_ADDRESS
ENV DL_SERVER_PORT=$DL_SERVER_PORT
ENV DL_SERVER_PILL_RECOGNITION_API_URL_PATH=$DL_SERVER_PILL_RECOGNITION_API_URL_PATH

RUN apk add \
  tcpdump \
  net-tools \
  vim \
  tzdata

COPY . /usr/local/wip-main-server-v2 

WORKDIR /usr/local/wip-main-server-v2

RUN yarn install && \
  yarn global add typescript
RUN yarn build

EXPOSE $MAIN_SERVER_PORT
# 식약처 API 응답 수신
EXPOSE 80

ENTRYPOINT ["node", "./build/src/app.js"]