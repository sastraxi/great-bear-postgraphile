exports.up = knex =>
  knex.raw(`
    create table app_private."email" (
      id serial primary key,
      user_id int not null
        references app_public."user" (id)
          on delete restrict
          on update cascade,
      recipient text not null,
      template text not null,
      props jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      sent_at timestamptz default null,
      sent_mime text default null
    );

    create index email___props___idx
      on app_private."email"
      using gin (props);

    comment on column app_private."email".sent_mime is
      'The generated email that was ultimately sent';
  `);

exports.down = knex =>
  knex.raw(`
    drop table app_private."email";
  `);
