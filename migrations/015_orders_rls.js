exports.up = knex =>
  knex.raw(`
    alter table app_public."order" enable row level security;
    alter table app_public."order_item" enable row level security;
  `);

exports.down = knex =>
  knex.raw(`
    alter table app_public."order" disable row level security;
    alter table app_public."order_item" disable row level security;
  `);
