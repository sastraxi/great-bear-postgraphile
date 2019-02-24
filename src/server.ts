import 'dotenv/config';

import './custom-types';

import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import cors from 'cors';

import attachPostGraphile from './postgraphile';
import { databaseUrl } from './knex';

if (!process.env.SESSION_SECRET) {
  console.error('Please prove a SESSION_SECRET in your .env file.');
  process.exit(1);
}

const app = express();

app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 120,
  },
  rolling: true,
}));

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

attachPostGraphile(app, databaseUrl).then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port , () =>
    console.log('App running at http://localhost:' + port));
});
