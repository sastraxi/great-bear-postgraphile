exports.up = knex =>
  knex.raw(`
    CREATE FUNCTION app_public.order_current_json("order" app_public."order") RETURNS json AS $$
      SELECT ST_AsGeoJSON("order".current_latlon)::json
    $$ LANGUAGE sql STABLE;

    CREATE FUNCTION app_public.order_destination_json("order" app_public."order") RETURNS json AS $$
      SELECT ST_AsGeoJSON("order".destination_latlon)::json
    $$ LANGUAGE sql STABLE;    
  `);

exports.down = knex =>
  knex.raw(`
    drop function app_public.order_current_json(app_public."order");
    drop function app_public.order_destination_json(app_public."order");
  `);
