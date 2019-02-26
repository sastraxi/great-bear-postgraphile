exports.up = knex =>
  knex.raw(`
    CREATE TRIGGER subscription_cart___cart_item_insert
    AFTER INSERT ON app_public."cart_item"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.graphql_subscription(
      'cartItemInsert',   /* event */
      'graphql:cart:$1',  /* topic */
      'cart_id'           /* $1 (column from OLD / NEW row) */
    );

    CREATE TRIGGER subscription_cart___cart_item_update
    AFTER UPDATE ON app_public."cart_item"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.graphql_subscription(
      'cartItemUpdate',   /* event */
      'graphql:cart:$1',  /* topic */
      'cart_id'           /* $1 (column from OLD / NEW row) */
    );

    CREATE TRIGGER subscription_cart___cart_item_delete
    AFTER DELETE ON app_public."cart_item"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.graphql_subscription(
      'cartItemDelete',   /* event */
      'graphql:cart:$1',  /* topic */
      'cart_id'           /* $1 (column from OLD / NEW row) */
    );
  `);

exports.down = knex =>
  knex.raw(`
    DROP TRIGGER subscription_cart___cart_item_insert ON app_public."cart_item";
    DROP TRIGGER subscription_cart___cart_item_update ON app_public."cart_item";
    DROP TRIGGER subscription_cart___cart_item_delete ON app_public."cart_item";
  `);
