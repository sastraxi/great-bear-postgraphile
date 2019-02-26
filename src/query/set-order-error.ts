import Knex from 'knex';

const setOrderErrorQuery = (knex: Knex) =>
  (orderId: number) =>
    (error: Object): PromiseLike<void> =>
      knex('app_public.order').update({
        error,
        failed_at: knex.fn.now(),
      }).where({ id: orderId });

export default setOrderErrorQuery;
