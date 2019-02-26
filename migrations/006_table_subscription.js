exports.up = knex =>
  knex.raw(`
    -- see https://gist.github.com/colophonemes/9701b906c5be572a40a84b08f4d2fa4e#gistcomment-2745115
    CREATE FUNCTION app_public.table_subscription() RETURNS trigger AS $trigger$
    DECLARE
      curr_ts text;
      payload text;
    BEGIN

      set datestyle = 'ISO';
      curr_ts := replace(current_timestamp::text, ' ', 'T') || ':00';
      reset datestyle;

      payload := json_build_object(
        'operation', TG_OP,
        'old', row_to_json(OLD),
        'new', row_to_json(NEW),
        'timestamp', curr_ts
      )::text;

      PERFORM pg_notify(
        'tbl:' || lower(TG_OP) || ':' || TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        payload
      );

      RETURN NULL;
    END;
    $trigger$ LANGUAGE plpgsql;
  `);

exports.down = knex =>
  knex.raw(`
    drop function app_public.table_subscription();
  `);
