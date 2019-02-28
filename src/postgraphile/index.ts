import http from 'http';
import Express from 'express';
import expressPlayground from 'graphql-playground-middleware-express';
import PubSubPlugin from '@graphile/pg-pubsub';
import {
  postgraphile,
  createPostGraphileSchema,
  Plugin,
  makePluginHook,
} from 'postgraphile';
import passport from 'passport';
import createDebugger from 'debug';

// FIXME: why does ts complain when importing directly from postgraphile?
import { PostGraphileOptions } from 'postgraphile/build/interfaces';

// @ts-ignore
import PgSimplifyInflectorPlugin from '@graphile-contrib/pg-simplify-inflector';

import session from '../session';
import CartSchemaPlugin from './cart';
import OrderSchemaPlugin from './order';
import AuthSchemaPlugin from './auth';
import GetPubSubPlugin from './get-pubsub';

const authDebug = createDebugger('gbpg:auth');

const REFLECT_SCHEMA = 'app_public';

/**
 * Stitched-in schemas.
 */
const EXTEND_SCHEMA_PLUGINS: Plugin[] = [
  CartSchemaPlugin,
  OrderSchemaPlugin,
  AuthSchemaPlugin,
];

/**
 * Options common to schema-mode and middleware-mode.
 */
const COMMON_OPTIONS: PostGraphileOptions = {

  appendPlugins: [
    // allOrders -> orders, cartItemsByCartItemId -> cartItems
    PgSimplifyInflectorPlugin,
    ...EXTEND_SCHEMA_PLUGINS,
  ],

  // adds a *List that reduces boilerplate when we don't need (relay) pagination
  simpleCollections: 'both',

  // parse JSON columns so consumers don't have to
  dynamicJson: true,

  pluginHook: makePluginHook([
    // necessary for subscriptions to work.
    PubSubPlugin,
    // captures the pubsub instance used in the previous plugin
    // and makes it available anywhere else in the program.
    // yeah, it's pretty much a global variable... wanna fight about it?
    GetPubSubPlugin,
  ]),

  // enable the websocket server
  subscriptions: true,
  websocketMiddlewares: [
    // the websocket server is separate from the main express server; any
    // middleware we want to run for Subscriptions has to be listed here as well.
    // TODO: reduce duplication between this and server.ts / passport.ts
    session,
    passport.initialize(),
    passport.session(),
  ],
};

/**
 * Communicate user and session status to postgres.
 * Take a look at the migrations/ directory for how we read
 * these settings from queries and stored functions.
 */
export const pgSettingsFromRequest = (req: http.IncomingMessage) => {
  authDebug('sesion and user', req.session, req.user);
  const settings = {
    role: req.user && req.user.isAdmin ? 'app_admin' : 'app_user',
    ...(req.user
      ? { 'jwt.claims.user_id': String(req.user.id) }
      : {}),
    // 'jwt.claims.user_id': '1',
    ...(req.session
      ? { 'jwt.claims.session_id': req.session.id }
      : {}),
  };
  authDebug('settings from request', settings);
  return settings;
};

/**
 * For any schemas that we extend, we can also access
 * user and session status directly from GraphQL context.
 * This function adds values into context from the http request.
 */
export const contextFromRequest = (req: http.IncomingMessage) => ({
  ip: req.ip,
  user: req.user,
  // user: { id: 1 },
  sessionId: req.session && req.session.id,
  req,
});

/**
 * Builds an executable schema; useful for testing.
 */
export const createSchema = (databaseUrl: string) =>
  createPostGraphileSchema(databaseUrl, REFLECT_SCHEMA, {
    ...COMMON_OPTIONS,
  });

/**
 * Adds /graphql and /playground routes to the given app.
 * The extra Promise.resolve()s below are to please typescript.
 */
export default async (
  app: Express.Application,
  databaseUrl: string,
  extraContext: object = {},
): Promise<Express.Application> => {
  // actual graphql endpoint (/graphql)
  app.use(
    postgraphile(databaseUrl, REFLECT_SCHEMA, {
      ...COMMON_OPTIONS,
      graphiql: false, // created below
      additionalGraphQLContextFromRequest: (req: http.IncomingMessage) =>
        Promise.resolve({
          ...contextFromRequest(req),
          ...extraContext,
        }),
      pgSettings: (...args) =>
        Promise.resolve(pgSettingsFromRequest(...args)),
    })
  );

  // playground, for development and testing
  const playground = expressPlayground({
    endpoint: '/graphql',
    subscriptionEndpoint: `ws://localhost:3000/graphql`, // FIXME: env var
  });
  app.get('/playground', (req, res, next) => {
    if (process.env.NODE_ENV === 'development' || (req.user && req.user.isAdmin)) {
      return playground(req, res, next);
    }
    return next();
  });

  return app;
};
