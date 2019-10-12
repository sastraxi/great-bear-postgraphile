import { PostGraphileContext, IdParam } from '../../types';
import { gql, makeExtendSchemaPlugin, embed } from 'graphile-utils';
import { combineResolvers } from 'graphql-resolvers';

import subscriptionResolver from '../resolver/subscription';
import ensureUserSession from '../resolver/ensure-user-session';

import checkout from './resolver/checkout';

const orderTopic = async ({ id }: IdParam, { knex, user }: PostGraphileContext) => {
  if (!user) {
    throw new Error('You must be logged in.');
  }

  const orderUserId = await knex('app_public.cart')
    .where('id', id)
    .first('user_id')
    .then(o => o && o.user_id);

  if (orderUserId !== user.id) {
    // We must be responsible for checking whether or not the given order ID
    // belongs to the user that's logged in. Even though PostGraphile gives
    // us data security for free, we'd still be leaking *when* something changes
    // for data the user isn't privy to. Take a page out of the RLS book and
    // treat the "hidden" row as if it does not exist.
    throw new Error(`Order #${id} does not exist!`);
  }

  return `graphql:order:${id}`;
};
  

const allUserOrdersTopic = async (_args: any, context: PostGraphileContext) => {
  const { user } = context;
  
  if (!user) {
    throw new Error('You must be logged in.');
  }

  return `graphql:orders:${user.id}`;
};

const typeDefs = gql`
  input LatLon {
    lat: Float!
    lon: Float!
  }

  type OrderSubscriptionPayload {
    order: Order
    event: String!
  }

  type OrdersSubscriptionPayload {
    orders: [Order]
    event: String!
  }

  extend type Mutation {
    checkout(
      deliveryLocation: LatLon!,
      stripeToken: String!,
      amount: Int!
    ): Int!
  }

  extend type Subscription {
    order(id: Int!): OrderSubscriptionPayload @pgSubscription(topic: ${embed(orderTopic)})
    orders: OrdersSubscriptionPayload @pgSubscription(topic: ${embed(allUserOrdersTopic)})
  }
`;

/**
 * Wrap our resolver delegates in middleware.
 */
const resolvers = (sql: any) => ({
  Mutation: {
    checkout: combineResolvers(
      ensureUserSession,
      checkout,
    ),
  },
  OrderSubscriptionPayload: {
    order: subscriptionResolver(sql, {
      qualifiedTable: 'app_public.order',
      column: 'id',
      multi: false,
    }),
  },
  OrdersSubscriptionPayload: {
    orders: subscriptionResolver(sql, {
      qualifiedTable: 'app_public.order',
      column: 'id',
      multi: true,
    }),
  },
});

export default makeExtendSchemaPlugin(({ pgSql }) => ({
  typeDefs,
  resolvers: resolvers(pgSql),
}));
