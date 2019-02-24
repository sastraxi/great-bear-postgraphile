create schema app_public; -- public; 
create schema app_private;
create schema app_hidden; -- public, but not exposed via postgraphile

-- ensure migrations succeed
grant all privileges on schema public to greatbear;
grant all privileges on schema app_public to greatbear;
grant all privileges on schema app_private to greatbear;
grant all privileges on schema app_hidden to greatbear;

create role app_user nologin nobypassrls;
grant usage on schema app_public to app_user;
grant usage on schema app_hidden to app_user;
grant app_user to greatbear; -- allow postgraphile to assume this role

create role app_admin nologin nobypassrls;
grant usage on schema app_public to app_admin;
grant usage on schema app_hidden to app_admin;
grant app_admin to greatbear;-- allow postgraphile to assume this role

create extension "postgis";
create extension "pgcrypto";

/*
 * Tables in all schemas are still subject to RLS policies.
 * Please note the following:
 *
 * - You need to GRANT actions (S/U/I/D) to app_user and app_admin
 *   for things they should be able to do via postgraphile.
 *
 * - Remember to GRANT the corresponding _id_seq for tables that you
 *   want to have INSERT access for, otherwise inserts will fail.
 *
 * - Any tables in app_public or app_hidden must have row-level
 *   security (RLS) enabled if they contain any private data.
 *
 * - The default row-level security policy is to deny, even if your
 *   user has been granted access. In practice, this means app_admin
 *   is going to have a lot of USING (true) policies so it can access
 *   private data that has been hidden via RLS policies for app_user.
 *
 * - We'll be building some security primitives in our first migration
 *   to make writing RLS policies a little bit less painful.
 *
 * - Don't forget to assign each table to a schema. Putting things in
 *   public is not a great idea with postgraphile; the app_* prefixes
 *   give us a quick view into overall visibility which ends up being
 *   super-helpful during development.
 */