import 'dotenv/config';
import './types';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import knex, { databaseUrl } from './knex';
import session from './session';

import applyPassport from './auth';
import attachPostGraphile from './postgraphile';
import attachEventHandlers from './event';

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

applyPassport(app, knex);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

attachPostGraphile(app, databaseUrl, { knex }).then(() => {
  attachEventHandlers(knex);

  const port = process.env.PORT || 3000;
  app.listen(port , () =>
    console.log(`App running at http://localhost:${port}`));
});
