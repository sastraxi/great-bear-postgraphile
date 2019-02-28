import Knex from 'knex';
import Express from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import _ from 'lodash';

import createDebugger from 'debug';
const debug = createDebugger('gbpg:auth');

import { Strategy as LocalStrategy } from 'passport-local';

const ERR_USER_OR_PASSWORD_MISMATCH = 'user-or-password-mismatch';

export default (app: Express.Application, knex: Knex) =>
  passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      const user = await knex('app_public.user as u')
        .innerJoin('app_private.user as pu', 'pu.user_id', 'u.id')
        .whereRaw('lower(email) = ?', [email.toLowerCase().trim()])
        .first(
          'u.id as id',
          'u.email as email',
          'pu.hash_password as hashPassword',
          'pu.is_admin as isAdmin',
        );
      
      if (!user) return done(ERR_USER_OR_PASSWORD_MISMATCH);
      if (!user.hashPassword) return done(ERR_USER_OR_PASSWORD_MISMATCH);
      
      const passwordMatches = await bcrypt.compare(password, user.hashPassword);
      if (!passwordMatches) return done(ERR_USER_OR_PASSWORD_MISMATCH);

      debug('auth.local', user);

      return done(null, _.pick(user, ['id', 'email', 'isAdmin']));
    },
  ));
