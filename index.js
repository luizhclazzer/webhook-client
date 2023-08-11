/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
require('dotenv').config();

const express = require('express');

const app = express();
const port = process.env.PORT;

const mysql = require('mysql2/promise');

const client = mysql.createPool(process.env.CONNECTION_STRING);

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
