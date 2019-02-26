import Bluebird from 'bluebird';
import Knex from 'knex';
import { MessagePayload } from '../../postgraphile/get-pubsub';
import { SEC_TO_MS, TableListenerSpec } from '../util';

const {
  CHEF_PREP_SEC,
} = process.env;

/**
 * after the charge has been captured,
 * the chef starts prepping the food
 */
export default (knex: Knex): TableListenerSpec => ({
  qualifiedTable: 'app_public.order',
  operation: 'update',
  columns: ['captured_at'],
  handler: async (msg: MessagePayload) => {
    const order = msg.new;

    // the chef takes their time cooking the food...
    await Bluebird.delay(SEC_TO_MS * +CHEF_PREP_SEC);

    // the chef cooked the order.
    await knex('order')
      .update({ cooked_at: knex.fn.now() })
      .where({ id: order.id });
  },
});
