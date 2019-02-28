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

    const existingUserId = await knex('app_public.user')
      .whereRaw('lower(email) = ?', [email.toLowerCase().trim()])
      .first('id')
      .then(row => row && row.id);

    if (existingUserId) {
      return res.status(400).send({
        message: 'An account for this email address already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // FIXME: need to insert some of this data into app_private.user
    const id = await knex('app_public.user')
      .insert({
        email,
      })
      .returning('id')
      .then(rows => rows && rows[0]);

    await knex('app_private.user')
      .insert({
        user_id: id,
        hash_password: hashedPassword,
        is_admin: false,
      });

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
