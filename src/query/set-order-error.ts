import Knex from 'knex';

const setOrderErrorQuery = (knex: Knex) =>
  (orderId: number) =>
    (error: Object): PromiseLike<void> =>
      knex('order').update({
        error,
        failed_at: knex.fn.now(),
      }).where({ id: orderId });

export default setOrderErrorQuery;
