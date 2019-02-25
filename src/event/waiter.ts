import Knex from 'knex';
import Stripe from 'stripe';
import Bluebird from 'bluebird';
import _ from 'lodash';

import { MessagePayload } from '../postgraphile/get-pubsub';

import {
  rowFromRequest,
  SEC_TO_MS,
} from '../../util';

const {
  WAITER_PREP_SEC,
  WAITER_VERIFICATION_RATE,
} = process.env;

import sendEmailQuery from './query/send-email';

/**
 * after the charge has been authorized,
 * the waiter receives and validates the order
 */
export default (knex: Knex) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sendEmail = sendEmailQuery(knex);

  return async (msg: MessagePayload) => {
    const order = rowFromRequest(req);
    const existingCharge = order.stripe_charge;

    // let hasura know everything is ok before we sleep
    res.status(200).end();

    // the waiter takes their time getting ready...
    await Bluebird.delay(SEC_TO_MS * +WAITER_PREP_SEC);

    let failure_message;
    if (!existingCharge) {
      failure_message = 'Your credit card was never charged for some reason...';
    } else if (Math.random() > +WAITER_VERIFICATION_RATE) {
      failure_message = 'This order was deemed invalid by random chance.';
    } else {
      failure_message = null;
    }

    const valid = !failure_message;
    if (!valid) {
      await Promise.all([
        stripe.refunds.create({
          charge: existingCharge.id,
          metadata: {
            reason: 'Waiter verification failed',
            message: failure_message,
          },
        }),
        sendEmail(
          order.user_id,
          'failure',
          {
            order: _.pick(order, ['id']),
            failure_message,
          },
        ),
        knex('order')
          .update({
            failed_at: knex.fn.now(),
            error: JSON.stringify({ message: failure_message }),
          })
          .where({ id: order.id }),
      ]);
      return;
    }

    // the order is valid.
    await knex('order')
      .update({ verified_at: knex.fn.now() })
      .where({ id: order.id });
  };
};
