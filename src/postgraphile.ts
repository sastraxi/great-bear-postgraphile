import http from 'http';
import Express from 'express';
import expressPlayground from 'graphql-playground-middleware-express';
import {
  postgraphile,
  createPostGraphileSchema,
  Plugin,
  PostGraphileOptions,
} from 'postgraphile';

// @ts-ignore
import PgSimplifyInflectorPlugin from '@graphile-contrib/pg-simplify-inflector';

import CartSchema from './schema/cart';

/**
 * Stitched-in schemas.
 */
const EXTEND_SCHEMA_PLUGINS: Plugin[] = [
  CartSchema,
];

/**
 * Options common to schema-mode and middleware-mode.
 */
const commonOptions = (): PostGraphileOptions => ({
  appendPlugins: [
    // allOrders -> orders, cartItemsByCartItemId -> cartItems
    PgSimplifyInflectorPlugin,
    ...EXTEND_SCHEMA_PLUGINS,
  ],
  // adds a *List that reduces boilerplate when we don't need (relay) pagination
  simpleCollections: 'both',
  // 
  subscriptions: true,
});

/**
 * Communicate user and session status to postgres.
 * Take a look at the migrations/ directory for how we read
 * these settings from queries and stored functions.
 */
export const pgSettingsFromRequest = (req: http.IncomingMessage) => ({
  role: req.user && req.user.isAdmin ? 'app_admin' : 'app_user',
  ...(req.user
    ? { 'jwt.claims.user_id': String(req.user.id) }
    : {}),
  ...(req.session
    ? { 'jwt.claims.session_id': req.session.id }
    : {}),
});

/**
 * For any schemas that we extend, we can also access
 * user and session status directly from GraphQL context.
 * This function adds values into context from the http request.
 */
export const contextFromRequest = (req: http.IncomingMessage) => ({
  ip: req.ip,
  user: req.user,
  sessionId: req.session && req.session.id,
});

/**
 * Builds an executable schema; useful for testing.
 */
export const createSchema = (databaseUrl: string) =>
  createPostGraphileSchema(databaseUrl, 'app_public', {
    ...commonOptions(),
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
  // The GraphQL endpoint
  app.use(
    postgraphile(databaseUrl, 'app_public', {
      ...commonOptions(),
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

  // GraphiQL, a visual editor for queries
  const playground = expressPlayground({ endpoint: '/graphql' });
  app.get('/playground', (req, res, next) => {
    if (process.env.NODE_ENV === 'development' || (req.user && req.user.isAdmin)) {
      return playground(req, res, next);
    }
    return next();
  });

  return app;
};

