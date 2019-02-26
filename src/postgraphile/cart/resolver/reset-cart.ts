import { PostGraphileContext } from '../../../types';
import ensureCart from '../ensure-cart';

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
    delete from app_public.cart_item
    where cart_id = (
      select id
      from cart
      where cart.session_id = ?
      and cart.user_id = ?
    )
  `, [sessionId!, user!.id]).then(() => true);
};

export default resetCart;
