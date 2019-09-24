# This is a learning repo.

This page will take you on a guided tour of the codebase. if you found it hard to follow, please submit a pull request with clarifications.

## Graphile's design decisions

---

## This app's architectural decisions


---

## Defining our data model

I decided to use [knex](...) for database migrations because I knew it the best. Knex reads migrations in lexicographic order out of a folder; in this project that's `migrations/`.

In order to start using its migration system, we must first create a database. Let's do that by executing the commands in [the bootstrap directory](bootstrap/) using `psql`.

After that's done, we can start adding a schema to our newly-created postgres database. Take a look at [the first migration](migrations/001_system_and_user.js) for where this begins. 

> **Note** that some migrations (like [004_graphql_subscription.js](migrations/004_graphql_subscription.js)) capture versions of functions that have since been replaced in newer migrations. I decided to leave these happy little accidents in as a testament to learning as-you-go.

---

## Starting our application

At this point, we could use the command line tools provided by Graphile to introspect our database and expose a GraphQL endpoint:

```bash
$ postgraphile -c postgres://greatbear:greatbear@localhost/gbpg [--watch]
```

There's a problem, though: we can't make any calls that require access to sensitive data as nothing is setting `jwt.claims.user_id`!

We could solve this a number of ways. If we pass in a JWT token, the `postgraphile` process will validate it then set the claims included as `jwt.claims.*` (there's a reason this is the idiomatic way to set `user_id` with Graphile; it's so easy).

The other way is to build some scaffolding up around the GraphQL calls by using Graphile as a library. This way, we don't have to be confined to using JWTs and can instead use http-only cookies (my preference). Take a look at [this code](src/postgraphile/index.ts) where we start a Postgraphile server inside of our app, and particularly the `pgSettingsFromRequest` function where we grab user information out of the HTTP (express) request.

## Authentication

Where does `req.user` get set, though? We're using [passportjs](...) behind the scenes and storing the resolved valid user into `req.user`.

* the initial setup is in [server.ts](src/server.ts)
* the `applyPassport` function spans across [auth/index.ts](src/auth/index.ts) and [auth/local.ts](src/auth/local.ts); a similar approach can be taken if you'd like to e.g. integrate with a third-party identity provider

## Authorization

As you saw in our migrations definitions, we have security policies defined on a row level that effectively hide any rows that a user shouldn't see. These policies largely apply to the `app_user` role, whereas the `app_admin` has a much larger set of permissions. Lastly, `greatbear` users have more-or-less free rein over the database. Here's why:

* `app_user`: queries made on behalf of a regular logged-in user, or an anonymous user
* `app_admin`: queries made on behalf of a logged-in user with administrator privileges (that we define ourselves)
* `greatbear`: the "root" database user that can really fuck things up. No users will be able to run queries as this role, but our built-in `knex` queries will

## Login, logout, and registration

See ...

## Splitting duties with postgraphile

So now we can authenticate to


## Our context

We add to the GraphQL context for every request we handle in the system.

