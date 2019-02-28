import Knex from 'knex';
import Express from 'express';
import passport from 'passport';

import applyLocal from './local';

import createDebugger from 'debug';
const debug = createDebugger('gbpg:auth');

interface UserRow {
  id: number
};

const applyPassport = (app: Express.Application, knex: Knex) => {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: UserRow, done) => {
    debug('serialize', user, '=>', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await knex('app_public.user as u')
        .innerJoin('app_private.user as pu', 'pu.user_id', 'u.id')
        .where({ "u.id": id })
        .first(
          'u.id as id',
          'u.email as email',
          'pu.is_admin as isAdmin',
        );
      debug('deserialize', id, '=>', user);
      done(null, user);
    } catch (err) {
      console.error('Could not deserialize user', err);
      done(err);
    }
  });

  applyLocal(app, knex);
};

export default applyPassport;
