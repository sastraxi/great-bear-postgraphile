exports.up = knex =>
  knex.raw(`
    create table app_public."order" (
      id serial primary key,
      user_id int not null
        references app_public."user" (id)
          on delete restrict
          on update cascade,
    
      /* unlike in Hasura, we don't have to store stripe_token here */
      /* the mutation that creates an order will fail if auth fails */
      /* ... no authorized_at because it would be equal to created_at */
      /* ... no cart_id because it'd just be destroyed in the migration */

      stripe_charge jsonb not null,
      amount int not null
        check (amount > 0),
    
      current_latlon geometry(point, 4326),
      destination_latlon geometry(point, 4326) not null,
    
      created_at timestamptz not null default now(),
      modified_at timestamptz not null default now(),
      verified_at timestamptz not null,
      captured_at timestamptz default null,
      cooked_at timestamptz default null,
      delivered_at timestamptz default null,

      error jsonb default null,
      failed_at timestamptz default null,
    
      check (
        delivered_at is null or
        failed_at is null
      )
    );

        -- -- -- --

        comment on column app_public."order".amount is
          'In the smallest currency unit available for the currency.';

        create index stripe_charge_idx
          on app_public."order"
          using gin (stripe_charge); -- high-performance json queries

        create trigger modified_at_before_update
          before update on app_public."order" for each row
          execute procedure
            update_modified_at();

        -- security --

        grant select on app_public."order" TO app_user;
        create policy own_data on app_public."order"
          to app_user
          using (user_id = current_user_id());

        grant select, update, insert, delete on app_public."order" to app_admin;
        create policy all_data on app_public."order"
          to app_admin
          using (true);

        -- -- -- --
        
    create table app_public."order_item" (
      id serial primary key,
      order_id int not null
        references app_public."order" (id)
          on delete restrict
          on update cascade,
      item_id int not null
        references app_public."item" (id)
          on delete restrict
          on update cascade,
      quantity int not null default 1
        check (quantity > 0),
      unique (order_id, item_id)
    );

        -- security --
                
        grant select, update, insert, delete on app_public."order_item" TO app_user;
        create policy own_data on app_public."order_item"
          to app_user
          using (order_id in (
            select id from app_public."order"
            where user_id = current_user_id()
          ));

        grant select, update, insert, delete on app_public."order_item" to app_admin;
        create policy all_data on app_public."order_item"
          to app_admin
          using (true);
  `);

exports.down = (knex, Promise) => Promise.resolve();
