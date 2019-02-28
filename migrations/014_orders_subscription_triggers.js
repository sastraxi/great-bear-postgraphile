exports.up = knex =>
  knex.raw(`
    DROP TRIGGER subscription_orders___insert ON app_public."order";
    DROP TRIGGER subscription_orders___update ON app_public."order";
    DROP TRIGGER subscription_orders___delete ON app_public."order";
    
    CREATE TRIGGER subscription_orders___insert
    AFTER INSERT ON app_public."order"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.graphql_subscription(
      'orderInsert',        /* event */
      'graphql:orders:$1',  /* topic */
      'user_id',            /* $1 (column from OLD / NEW row) */
      'id'                  /* extra value to select from row */
    );

    CREATE TRIGGER subscription_orders___update
    AFTER UPDATE ON app_public."order"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.graphql_subscription(
      'orderUpdate',        /* event */
      'graphql:orders:$1',  /* topic */
      'user_id',            /* $1 (column from OLD / NEW row) */
      'id'                  /* extra value to select from row */      
    );

    CREATE TRIGGER subscription_orders___delete
    AFTER DELETE ON app_public."order"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.graphql_subscription(
      'orderDelete',        /* event */
      'graphql:orders:$1',  /* topic */
      'user_id',            /* $1 (column from OLD / NEW row) */
      'id'                  /* extra value to select from row */      
    );
  `);

exports.down = knex =>
  knex.raw(`
    DROP TRIGGER subscription_orders___insert ON app_public."order";
    DROP TRIGGER subscription_orders___update ON app_public."order";
    DROP TRIGGER subscription_orders___delete ON app_public."order";

    CREATE TRIGGER subscription_orders___insert
    AFTER INSERT ON app_public."order"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.graphql_subscription(
      'orderInsert',        /* event */
      'graphql:orders:$1',  /* topic */
      'user_id'             /* $1 (column from OLD / NEW row) */
    );

    CREATE TRIGGER subscription_orders___update
    AFTER UPDATE ON app_public."order"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.graphql_subscription(
      'orderUpdate',        /* event */
      'graphql:orders:$1',  /* topic */
      'user_id'             /* $1 (column from OLD / NEW row) */
    );

    CREATE TRIGGER subscription_orders___delete
    AFTER DELETE ON app_public."order"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.graphql_subscription(
      'orderDelete',        /* event */
      'graphql:orders:$1',  /* topic */
      'user_id'             /* $1 (column from OLD / NEW row) */
  `);
