import { PostGraphileContext } from '../../../types';
import { CartParams } from '../types';
import ensureCart from '../ensure-cart';

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

export default addToCart;
