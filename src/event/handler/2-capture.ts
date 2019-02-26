import Knex from 'knex';
import _ from 'lodash';
import Stripe from 'stripe';
import { MessagePayload } from '../../postgraphile/get-pubsub';
import sendEmailQuery from '../../query/send-email';
import { amountPaidToPoints, TableListenerSpec } from '../util';

const {
  STRIPE_SECRET_KEY,
} = process.env;

/**
 * after the order has been verified, the authorized charge
 * is captured and points are added to the user's account
 */
export default (knex: Knex): TableListenerSpec => {
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const sendEmail = sendEmailQuery(knex);

  return {
    qualifiedTable: 'app_public.order',
    operation: 'update',
    columns: ['verified_at'],
    handler: async (msg: MessagePayload) => {
      const order = msg.new;
      const { stripe_charge: existingCharge } = order;
  
      try {
        const charge = await stripe.charges.capture(existingCharge.id, {
          amount: order.amount,
        });
      
        await Promise.all([
          knex('user')
            .increment('points', amountPaidToPoints(order.amount)),
          knex('order')
            .update({
              captured_at: knex.fn.now(),
              stripe_charge: JSON.stringify(charge),
            })
            .where({ id: order.id }),
        ]);
      } catch (err) {
        console.log(`Could not capture charge for order.id=${order.id}`, err);
        await Promise.all([
          sendEmail(order.user_id, 'failure', {
            order: _.pick(order, ['id']),
            failure_message: 'We were unable to properly charge your payment card.',
          }),
          knex('order')
            .update({
              failed_at: knex.fn.now(),
              error: JSON.stringify(err),
            }),
        ]);
      }
    },
  };
};
