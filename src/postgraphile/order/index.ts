import { PostGraphileContext, IdParam } from '../../types';
import { gql, makeExtendSchemaPlugin, embed } from 'graphile-utils';
import { combineResolvers } from 'graphql-resolvers';

import subscriptionResolver from '../resolver/subscription';
import ensureUserSession from '../resolver/ensure-user-session';

import checkout from './resolver/checkout';

const orderTopic = ({ id }: IdParam) =>
  `graphql:order:${id}`;

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
    orderById(id: Int!): OrderSubscriptionPayload @pgSubscription(topic: ${embed(orderTopic)})
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
      column: 'user_id',
      multi: true,
    }),
  },
});

export default makeExtendSchemaPlugin(({ pgSql }) => ({
  typeDefs,
  resolvers: resolvers(pgSql),
}));
