import { PostGraphileContext, IdParam } from '../../types';
import { gql, makeExtendSchemaPlugin, embed } from 'graphile-utils';
import { combineResolvers } from 'graphql-resolvers';

import subscriptionResolver from '../resolver/subscription';
import ensureUserSession from '../resolver/ensure-user-session';

import addToCart from './resolver/add-to-cart';
import resetCart from './resolver/reset-cart';
import setCartQuantity from './resolver/set-cart-quantity';
import ensureCart from './ensure-cart';

const cartTopic = ({ id }: IdParam) =>
  `graphql:cart:${id}`;

const currentCartTopic = async (_args: any, context: PostGraphileContext) => {
  const { knex, sessionId } = context;

  await ensureCart(context);
  const cart = await knex('app_public.cart')
    .where('session_id', sessionId)
    .first('id');

  return cartTopic({ id: cart.id });
};

const typeDefs = gql`
  type CartSubscriptionPayload {
    cart: Cart
    event: String
  }

  extend type Query {
    sessionId: String
  }

  extend type Mutation {
    addToCart(itemId: Int!, quantity: Int!): Boolean!
    setCartQuantity(itemId: Int!, quantity: Int!): Boolean!
    resetCart: Boolean!
  }

  extend type Subscription {
    currentCart: CartSubscriptionPayload @pgSubscription(topic: ${embed(currentCartTopic)})
  }
`;

/**
 * Wrap our resolver delegates in middleware.
 */
const resolvers = (sql: any) => ({
  Query: {
    sessionId: (_root: any, _params: any, { sessionId }: PostGraphileContext) => sessionId,
  },
  Mutation: {
    addToCart: combineResolvers(
      ensureUserSession,
      addToCart,
    ),
    setCartQuantity: combineResolvers(
      ensureUserSession,
      setCartQuantity,
    ),
    resetCart: combineResolvers(
      ensureUserSession,
      resetCart,
    ),
  },
  CartSubscriptionPayload: {
    cart: subscriptionResolver(sql, {
      qualifiedTable: 'app_public.cart',
      column: 'id',
      payloadColumn: 'cart_id', // events come from cart_item
      multi: false,
    }),
  },
});

export default makeExtendSchemaPlugin(({ pgSql }) => ({
  typeDefs,
  resolvers: resolvers(pgSql),
}));
