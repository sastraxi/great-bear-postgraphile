exports.up = knex =>
  knex.raw(`
    alter table app_public."order"
      alter column verified_at
        set default now();
  `);

exports.down = knex =>
  knex.raw(`
    alter table app_public."order"
      alter column verified_at
        drop default;
  `);
