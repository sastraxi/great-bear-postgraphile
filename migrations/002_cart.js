exports.up = knex =>
  knex.raw(`
    create table app_public."item" (
      id serial primary key,
      "name" text not null,
      "amount" int not null check (amount > 0),
      "category" text not null,
      "description" text,
      "image_url" text
    );

        /* NB: no RLS for item; public data */
        grant select on app_public."item" to app_user;
        grant select, update, insert, delete on app_public."item" to app_admin;

    -- -- -- --

    create table app_public."cart" (
      id serial primary key,
      user_id int null
        references app_public."user" (id)
          on delete restrict
          on update cascade,
      session_id text not null,
      created_at timestamptz not null default now(),
      modified_at timestamptz not null default now()
    );
    alter table app_public."cart" enable row level security;

        -- -- -- --

        create trigger modified_at_before_update
          before update on app_public."cart" for each row
          execute procedure
            update_modified_at();
        
        -- security --
            
        grant select on app_public."cart" TO app_user;
        create policy own_data on app_public."cart"
          to app_user
          using (user_id = current_user_id());

        grant select, update, insert, delete on app_public."cart" to app_admin;
        create policy all_data on app_public."cart"
          to app_admin
          using (true);

        -- -- -- --

    create table app_public."cart_item" (
      id serial primary key,
      cart_id int not null
        references app_public."cart" (id)
          on delete restrict
          on update cascade,
      item_id int not null
        references app_public."item" (id)
          on delete restrict
          on update cascade,
      quantity int not null default 1
        check (quantity > 0),
      unique (cart_id, item_id)
    );
    alter table app_public."cart_item" enable row level security;

        -- security --
            
        grant select, update, insert, delete on app_public."cart_item" TO app_user;
        create policy own_data on app_public."cart_item"
          to app_user
          using (cart_id in (
            select id from app_public."cart"
            where user_id = current_user_id()
          ));

        grant select, update, insert, delete on app_public."cart_item" to app_admin;
        create policy all_data on app_public."cart_item"
          to app_admin
          using (true);

        -- -- -- --

    /**
     * Here's where we expose getting the cart tied
     * to the current user session via postgraphile.
     */
    create function app_public.current_cart()
    returns app_public."cart" as $$
      select * from app_public."cart"
      where session_id = current_session_id()
    $$ language sql stable;
  `);

exports.down = (knex, Promise) => Promise.resolve();
