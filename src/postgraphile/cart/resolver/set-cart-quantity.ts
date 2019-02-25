import { PostGraphileContext } from '../../../types';
import { CartParams } from '../types';
import ensureCart from '../ensure-cart';

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

export default setCartQuantity;
