const express = require('express');

const app = express();
const db = require('./src/loader/database');
const { logger } = require('./src/util/logger');
const PillRecogApi = require('./src/api/pill_recognition');
const loader = require('./src/loader/loader');

const port = 17260;
app.use('/pill-recognition', PillRecogApi);

async function main() {
  app.listen(port, () => {
    logger.info(`[APP-INIT] Server Running on ${port} port`);
  });

  try {
    await db.connectOnDatabase();
    await loader.updateConfig();
  } catch (e) {
    logger.error(`[APP-INIT] ${e}`);
  }
}

main();
