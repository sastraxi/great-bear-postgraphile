exports.up = knex =>
  knex.raw(`
    create function public.update_modified_at()
    returns trigger as $$
      begin
        new.modified_at = now();
        return new;
      end;
    $$ language 'plpgsql';

    /*
     * This one requires a little bit of explanation.
     * 
     * We aren't using jwts in this project, but (by convention)
     * we pass our user_id via the (transactional) setting jwt.claims.user_id.
     * 
     * This is the user that is currently logged in and accessing
     * the database via postgraphile.
     */ 
    create function public.current_user_id()
    returns integer as $$
      select nullif(current_setting('jwt.claims.user_id', true), '')::integer
    $$ language sql stable;

    -- -- -- --

    create table app_public."user" (
      id serial primary key,
      email text NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      modified_at timestamp with time zone DEFAULT now() NOT NULL,
      points integer DEFAULT 0 NOT NULL check (points >= 0),
      UNIQUE (email)
    );
    alter table app_public."user" enable row level security;

        -- -- -- --

        create trigger modified_at_before_update
          before update on app_public."user" for each row
          execute procedure
            public.update_modified_at();

        CREATE INDEX lower_email_idx
          ON app_public."user"
          USING btree (lower(email));
        
        -- security --
        
        GRANT SELECT, UPDATE ON app_public."user" TO app_user;
        create policy own_data on app_public."user"
          to app_user
          using (id = current_user_id());

        grant select, update, insert, delete on app_public."user" to app_admin;
        create policy all_if_admin on app_public."user"
          to app_admin
          using (true)
          with check (true);

        -- -- -- --

    CREATE TABLE app_private."user" (
      user_id integer not null
        references app_public."user" (id)
           on delete cascade,
      
      hash_password text NOT NULL,
      is_admin boolean DEFAULT false NOT NULL,
      modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id)
    );

    -- -- -- --
    
    /* convenience functions. */

    create function app_public.current_user()
    returns app_public."user" as $$
      select * from app_public."user" where id = current_user_id()
    $$ language sql stable;

    create function public.current_user_is_admin()
    returns bool as $$
      select coalesce(
        (
          select is_admin from app_private."user"
          where user_id = current_user_id()
        ),
        false
      )
    $$ language sql stable;

    -- -- -- --

    /*
     * We're also going to pass in our current session ID as a jwt claim.
     * This will be useful when we tie sessions to shopping carts.
     */ 
    create function public.current_session_id()
    returns text as $$
      select nullif(current_setting('jwt.claims.session_id', true), '')::text
    $$ language sql stable;
  `);

exports.down = (knex, Promise) => Promise.resolve();
