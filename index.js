const express = require('express');

process.env.NODE_ENV =
  process.env.NODE_ENV &&
  process.env.NODE_ENV.trim().toLowerCase() === 'production'
    ? 'production'
    : 'development';

const app = express();
const db = require('./src/loader/database');
const { logger } = require('./src/util/logger');
const PillRecogApi = require('./src/api/pill_recognition');
const loader = require('./src/loader/loader');
const pill = require('./src/services/pill_recognition');

const port = 17260;

app.use('/pill-recognition', PillRecogApi);

async function main() {
  app.listen(port, () => {
    logger.info(`[APP-INIT] Server Running on ${port} port`);
  });

  try {
    await db.connectOnDatabase();
    await loader.updateConfig();
    await loader.updateRecognitionData();
    await pill.getOverview(); // 테스트를 위한 코드
  } catch (e) {
    logger.error(`[APP-INIT] ${e}`);
  }
}

main();