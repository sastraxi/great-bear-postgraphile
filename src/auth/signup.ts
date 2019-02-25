import Knex from 'knex';
import Express from 'express';
import bcrypt from 'bcrypt';
import _ from 'lodash';

import { isValidPassword } from '../util';

const BCRYPT_ROUNDS = 12;

export default (knex: Knex) =>
  async (req: Express.Request, res: Express.Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        message: 'Expected "email" and "password" in the request body',
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).send({
        message: 'Passwords must be at least 8 characters in length ' +
          'and contain both letters and numbers',
      });
    }

    const existingUserId = await knex('user')
      .whereRaw('lower(email) = ?', [email.toLowerCase().trim()])
      .first('id')
      .then(row => row && row.id);

    if (existingUserId) {
      return res.status(400).send({
        message: 'An account for this email address already exists',
      });
    }

    const id = await knex('user')
      .insert({
        email,
        hash_password: await bcrypt.hash(password, BCRYPT_ROUNDS),
        is_admin: false,
      })
      .returning('id')
      .then(rows => rows && rows[0]);

    return req.login({ id, email }, (err) => {
      if (err) return res.status(500).send(err);
      return res.status(200).json({
        user: {
          id,
          email,
          is_admin: false,
        }
      });
    });
  };
