exports.up = knex =>
  knex.raw(`
    CREATE TRIGGER subscription_orderById___update
    AFTER UPDATE ON app_public."order"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.graphql_subscription(
      'orderUpdate',       /* event */
      'graphql:order:$1',  /* topic */
      'id'                 /* $1 (column from OLD / NEW row) */
    );
  `);

exports.down = knex =>
  knex.raw(`
    DROP TRIGGER subscription_orderById___update ON app_public."order";
  `);
