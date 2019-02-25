import { PostGraphileContext } from '../custom-types';
import { gql, makeExtendSchemaPlugin, embed } from 'graphile-utils';
import { skip, combineResolvers } from 'graphql-resolvers';
import { QueryBuilder } from 'graphile-build-pg';

interface CartParams {
  itemId: number
  quantity: number
}

interface IdParam {
  id: number
}

interface PostGraphileSubscriptionPayload {
  event: string
  subject: any
}

const NOT_LOGGED_IN_MSG = 'You must be logged in to interact with this resource.';
const NO_SESSION_ID_MSG = 'No session ID is available on your request!';

const cartTopic = ({ id }: IdParam) =>
  `graphql:cart:${id}`;

const ensureCart = ({ knex, user, sessionId }: PostGraphileContext) =>
  knex.raw(` 
    insert into app_public."cart"
      (session_id, user_id)
    values
      (?, ?)
    on conflict
    do nothing
  `, [sessionId, user!.id]);

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
 * A simple resolver "middleware" we can combine with other resolvers
 * to make sure we always have a valid user session.
 */
const ensureUserSession = (_root: any, _params: any, { user, sessionId }: PostGraphileContext) => {
  if (!user) return new Error(NOT_LOGGED_IN_MSG);
  if (!sessionId) return new Error(NO_SESSION_ID_MSG);
  return skip;
};

/**
 * Make sure we have a cart for the current session,
 * then add a quantity of the given item to it.
 */
const addToCart = async (
  _root: any,
  { itemId, quantity }: CartParams,
  context: PostGraphileContext,
) => {
  if (quantity < 1) throw new Error(
    "addToCart expects an integer >= 1",
  );

  const { sessionId, user, knex } = context;
  await ensureCart(context);
  return knex.raw(`
    insert into app_public.cart_item
      (cart_id, item_id, quantity)
    select
      id, ?, ?
    from app_public.cart
      where cart.session_id = ?
      and cart.user_id = ?
    on conflict
      (cart_id, item_id)
    do update
      set quantity = cart_item.quantity + excluded.quantity
  `, [itemId, quantity, sessionId!, user!.id]).then(() => true);
};

/**
 * Make sure we have a cart for the current session,
 * then set an item's quantity in it (0 to remove).
 */
const setCartQuantity = async (
  _root: any,
  { itemId, quantity }: CartParams,
  context: PostGraphileContext,
) => {
  const { sessionId, user, knex } = context;
  await ensureCart(context);
  if (quantity > 0) {
    // directly set cart_item.quantity
    return knex.raw(`
      insert into app_public.cart_item
        (cart_id, item_id, quantity)
      select
        id, ?, ?
      from app_public.cart
        where cart.session_id = ?
        and cart.user_id = ?
      on conflict
        (cart_id, item_id)
      do update
        set quantity = excluded.quantity
  `, [itemId, quantity, sessionId!, user!.id]).then(() => true);
  } else {
    // silently treats negatives as 0 (deletion)
    return knex.raw(`
      delete from cart_item

      where item_id = ? and cart_id = (
        select id
        from app_public.cart
        where cart.session_id = ?
        and cart.user_id = ?
      )
    `, [itemId, sessionId!, user!.id]).then(() => true);
  }
};

/**
 * Make sure we have a cart for the current session,
 * then remove all items from it.
 */
const resetCart = async(
  _root: any,
  _params: any,
  context: PostGraphileContext,
) => {
  const { sessionId, user, knex } = context;
  await ensureCart(context);
  return knex.raw(`
    delete from cart_item
    where cart_id = (
      select id
      from cart
      where cart.session_id = ?
      and cart.user_id = ?
    )
  `, [sessionId!, user!.id]).then(() => true);
};

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
    cart: async (
      event: PostGraphileSubscriptionPayload,
      _args: any,
      _context: PostGraphileContext,
      { graphile: { selectGraphQLResultFromTable } }: any,
    ) => {
      const rows = await selectGraphQLResultFromTable(
        sql.fragment`app_public.cart`,
        (tableAlias: any, sqlBuilder: QueryBuilder) => {
          sqlBuilder.where(
            sql.fragment`${tableAlias}.id = ${sql.value(event.subject)}`
          );
        }
      );
      return rows[0];
    },
  },
});

export default makeExtendSchemaPlugin(({ pgSql }) => ({
  typeDefs,
  resolvers: resolvers(pgSql),
}));
