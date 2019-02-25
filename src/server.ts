import 'dotenv/config';

import './custom-types';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import attachPostGraphile from './postgraphile';
import knex, { databaseUrl } from './knex';
import session from './session';

if (!process.env.SESSION_SECRET) {
  console.error('Please prove a SESSION_SECRET in your .env file.');
  process.exit(1);
}

const app = express();

app.use(session);
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

attachPostGraphile(app, databaseUrl, { knex }).then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port , () =>
    console.log('App running at http://localhost:' + port));
});
