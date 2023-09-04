/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
require('dotenv').config();

const express = require('express');

const app = express();
const port = process.env.PORT;

const mysql = require('mysql2/promise');

const client = mysql.createPool(process.env.CONNECTION_STRING);
const errorRate = process.env.ERROR_RATE || 0;
let errorStatusCode = 500;

async function insertWebhook(object) {
  const sql = 'INSERT INTO WEBHOOKS(id_origin, id_company, origin_date, fk_id, description, body) VALUES (?,?,?,?,?,?);';
  const values = [
    object.meta.id,
    object.meta.company_id,
    object.meta.date,
    object.data.fk_id,
    object.data.name,
    JSON.stringify(object),
  ];
  await client.query(sql, values);
}

function simulateErrorsWithRate() {
  // random between 1 and 10
  const random = Math.floor(Math.random() * 10) + 1;
  // console.log(`random: ${random} - Error rate: ${errorRate} - ${random < errorRate}`);

  if (random <= errorRate) {
    const errorRandom = Math.floor(Math.random() * 6) + 1;
    switch (errorRandom) {
      case 1:
        errorStatusCode = 500;
        throw new Error('Internal Server Error');
      case 2:
        errorStatusCode = 502;
        throw new Error('Bad Gateway');
      case 3:
        errorStatusCode = 504;
        throw new Error('Gateway Timeout');
      case 4:
        errorStatusCode = 403;
        throw new Error('Certificate has expired');
      case 5:
        errorStatusCode = 404;
        throw new Error('ENOTFOUND');
      case 6:
        errorStatusCode = 408;
        throw new Error('ECONNABORTED');
      default:
        errorStatusCode = 500;
        throw new Error('Internal Server Error');
    }
  }
}

app.use(express.json());

app.get('/', (req, res) => res.json({ message: 'Online!' }));

app.post('/webhook', async (req, res) => {
  try {
    simulateErrorsWithRate();
    await insertWebhook(req.body);
    return res.json({ message: 'ok' });
  } catch (error) {
    return res.status(errorStatusCode || 500).json({ message: error.message });
  }
});

app.listen(port);
console.log(`Running on port: ${port}. Error rate: ${errorRate}`);
