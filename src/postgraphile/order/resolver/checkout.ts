import createDebugger from 'debug';
import Stripe from 'stripe';
import sendEmailQuery from '../../../query/send-email';
import toGeometryQuery from '../../../query/to-geometry';
import { PostGraphileContext } from '../../../types';
import { frontendUrl } from '../../../util';
import getCartId from '../get-cart-id';
import { CheckoutParams } from '../types';

const debug = createDebugger('gbpg:checkout');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * When an order is created, we need to authorize the charge
 * on the payment card, as well as make sure the amount is correct.
 */
const checkout = async (
  _root: any,
  { deliveryLocation, stripeToken, amount }: CheckoutParams,
  context: PostGraphileContext,
): Promise<number> => {
  const { user, knex } = context;
  const sendEmail = sendEmailQuery(knex);
  const toGeometry = toGeometryQuery(knex);

  // validate our cart
  const cartId = await getCartId(context);
  const cart = await knex.raw(`
    select
      c.user_id as "userId",
      sum(i.amount * ci.quantity)::int as "totalAmount"
    from app_public."cart" c
    inner join app_public."cart_item" ci on ci.cart_id = c.id
    inner join app_public."item" i on i.id = ci.item_id
    where c.id = ?
    group by c.id
  `, [cartId]).then(({ rows }) => rows[0]);

  if (cart.totalAmount === 0) {
    throw new Error("There are no items in your cart!");
  } else if (cart.userId !== user.id) {
    throw new Error("You do not own this cart!");
  } else if (cart.totalAmount !== amount) {
    throw new Error(`Cart amount: ${cart.totalAmount}. Your amount: ${amount}`);
  }

  // validated! authorize a charge and create the order.
  // FIXME: in this ordering, someone could add items
  // to the cart at the last minute, between payment and item copy.
  try {
    const charge = await stripe.charges.create({
      amount,
      currency: process.env.ISO_CURRENCY,
      source: stripeToken,
      description: 'Great Bear Food Delivery',
      capture: false,
    });

    const orderId = await knex('app_public.order')
      .insert({
        user_id: user!.id,
        stripe_charge: charge,
        amount,
        destination_latlon: toGeometry(deliveryLocation),
      })
      .returning('id')
      .then(rows => rows && rows[0]);

    await knex.raw(`
      insert into app_public.order_item (order_id, item_id, quantity)
      select
        ?,
        item_id,
        quantity
      from app_public.cart_item
      where cart_id = ?
    `, [orderId, cartId])

    await knex('app_public.cart_item').delete().where('cart_id', cartId);
    await Promise.all([
      sendEmail(user.id, 'submitted', {
        order: {
          id: orderId,
          amount,
        },
        url: frontendUrl(`/order/${orderId}`),
      }),
      knex('app_public.cart').delete().where('id', cartId), // fk will nullify order.cart_id
    ]);

    debug(`created order #${orderId}`);
    return orderId;
  } catch (err) {
    debug('checkout failed', err);
    throw new Error('Checkout failed for an unknown reason. Try DEBUG=gbpg:checkout');
  }
};

export default checkout;
