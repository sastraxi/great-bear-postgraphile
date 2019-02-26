/**
 * We need to hook up events on the orders table to our
 * table subscription system (see src/postgraphile/get-pubsub.ts).
 */
exports.up = knex =>
  knex.raw(`
    CREATE TRIGGER insert_trigger
    AFTER INSERT ON app_public."order"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.table_subscription();

    CREATE TRIGGER update_trigger
    AFTER UPDATE ON app_public."order"
    FOR EACH ROW
    EXECUTE PROCEDURE app_public.table_subscription();
  `);

exports.down = knex =>
  knex.raw(`
    DROP TRIGGER insert_trigger ON app_public."order";
    DROP TRIGGER update_trigger ON app_public."order";
  `);
