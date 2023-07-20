/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
require('dotenv').config();

const express = require('express');

const app = express();
const port = process.env.PORT;

const mysql = require('mysql2/promise');

const client = mysql.createPool(process.env.CONNECTION_STRING);

const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const Queue = require('bull');

const queueNames = ['verifyPendingEventsCron', 'retryFailureEvents'];

// Initialize Bull Queues instances
// eslint-disable-next-line arrow-body-style
const queues = queueNames.map((queueName) => {
  return new Queue(queueName, {
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
    prefix: 'bull',
  });
});

// set up BullBoard to use Bull Queues
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/bull-board');

createBullBoard({
  queues: queues.map((queue) => new BullAdapter(queue)),
  serverAdapter,
});

async function insertWebhook(object) {
  const sql = 'INSERT INTO WEBHOOKS(id_origin, id_company, origin_date, fk_id, description, body) VALUES (?,?,?,?,?,?);';
  const values = [
    object.meta.id,
    object.meta.company_id,
    object.meta.date,
    object.current.fk_id,
    object.current.name,
    JSON.stringify(object),
  ];
  await client.query(sql, values);
}

app.use(express.json());

app.use('/bull-board', serverAdapter.getRouter());

app.get('/', (req, res) => res.json({ message: 'Online!' }));

app.post('/webhook', async (req, res) => {
  try {
    await insertWebhook(req.body);
    return res.json({ message: 'ok' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error', error });
  }
});

app.listen(port);
console.log('Running on port', port);
