# This is a learning repo.

This page will take you on a guided tour of the codebase. if you found it hard to follow, please submit a pull request with clarifications.

## Graphile's design decisions

---

## This app's architectural decisions

---

## GraphQL glossary

* Schema - TODO
* Resolver - TODO 
* Query - TODO
* Mutation - TODO
* Subscription - TODO

---

## Defining our data model

I decided to use [knex](...) for database migrations because I knew it the best. Knex reads migrations in lexicographic order out of a folder; in this project that's [migrations/](migrations/).

In order to start using its migration system, we must first create a database. Let's do that by executing the commands in [the bootstrap folder](bootstrap/) using `psql`.

After that's done, we can start adding a schema to our newly-created postgres database. Take a look at [the first migration](migrations/001_system_and_user.js) for where this begins. 

> Note that some migrations (like [004_graphql_subscription.js](migrations/004_graphql_subscription.js)) capture versions of functions that have since been replaced in newer migrations. I decided to leave these happy little accidents in as a testament to learning as-you-go.

---

## Authorization

As you saw in [the migrations folder](migrations/), we have defined row-level security policies (`GRANT` DDL) that effectively hide any rows that a user shouldn't see from their queries. These policies largely apply to the `app_user` role, whereas the `app_admin` has a much larger set of permissions. Lastly, the `greatbear` role have more-or-less free rein over the database. Here's why:

* `app_user`: queries made on behalf of a regular logged-in user, or an anonymous user
* `app_admin`: queries made on behalf of a logged-in user with administrator privileges (that we define ourselves)
* `greatbear`: the "root" database user that can really fuck things up. No users will be able to run queries as this role, but our built-in `knex` queries will

> The postgres documentation uses the terms *role* and *user* interchangeably.

---

## Graphile, two ways

At this point, we could use the command line tools provided by Graphile to introspect our database and expose a GraphQL endpoint:

```bash
$ postgraphile -c postgres://app_user@localhost/gbpg [--watch]
[...]
  ‣ GraphQL endpoint served at http://localhost:5000/graphql
  ‣ GraphiQL endpoint served at http://localhost:5000/graphiql
```

Assuming that you have some seed data in your database (see [seed.sql](seed.sql)), you can go to [the running GraphiQL server](http://localhost:5000/graphiql) and run commands like:

```graphql
query {
  orders {
    id
    user {
      id
      email
    }
    orderItemsList {
      quantity
      item {
        id
        name
        amount
        category
        description
        imageUrl
      }
    }
  }
}
```

Wait, where did that query come from? Graphile [automatically generates these](https://www.graphile.org/postgraphile/tables/) from our tables and foreign key relationships. Pretty useful, eh?

> The whole "Tables" section linked above is worthwhile reading to wrap your head around what Graphile gives you out-of-the-box.

There's a problem, though: even if there are orders in our database, we won't see them. In fact, we can't make any calls that require access to sensitive data at all! This is because nothing is setting the `jwt.claims.user_id` variable that our `app_user`'s `GRANT` statements use to make rows in our data model visible. 

Let's try a command that only uses public data:

```graphql
query {
  itemsList {
    id
    name
    amount
    category
    description
    imageUrl
  }
}
```

Success! Some data. So how do we solve the problem?

If we pass in a JWT secret on the command line using the `--jwt-secret` option, the `postgraphile` process will start pulling JWTs from the `Authorization:` HTTP header. If they're valid, it'll then set the claims included as `jwt.claims.*` in the transaction wrapping each SQL query (there's a reason this is the idiomatic way to set `user_id` with Graphile; it's so easy).

The other way is to build some scaffolding up around the GraphQL calls by using Graphile as a library. This way, we don't have to be confined to using JWTs and can instead use http-only cookies (my preference). Take a look at [this code](src/postgraphile/index.ts) where we start a Postgraphile server inside of our app, and particularly the `pgSettingsFromRequest` function where we grab user information out of the HTTP (express) request.

> Notice that we also set the postgres `role` in this function: administrators perform SQL queries as `app_admin` while regular users' queries are executed as `app_user`.

---

## Authentication

Where does `req.user` get set, though? Graphile only performs authorization; for authentication, we're using [passportjs](...) behind the scenes and storing the resolved user into `req.user` using its express middleware.

* the initial setup is in [server.ts](src/server.ts)
* the `applyPassport` function spans across [auth/index.ts](src/auth/index.ts#L12) and [auth/local.ts](src/auth/local.ts); a similar approach can be taken if you'd like to e.g. integrate with a third-party identity provider

The final piece of the puzzle is actually performing auth flows; these are created as custom GraphQL resolvers in our codebase. See [login.ts](src/postgraphile/auth/resolver/login.ts), [signup.ts](src/postgraphile/auth/resolver/signup.ts), and [logout.ts](src/postgraphile/auth/resolver/logout.ts) for how we actually use the passport library once it's been set up. The mutations end up looking really simple:

```graphql
mutation {
    login(email: "foo@bar.com", password: "hunter2") {
      id
    }
  }
```

```
mutation {
  logout
}
```

Because internally we're just delegating to passport, session semantics remain the same as they would be for regular HTTP calls. In this case, we're using [express-session](https://github.com/expressjs/session) to store a signed cookie with a session ID and serialized user ID.

## Our context

Notice that we are able to access the original express HTTP request in our GraphQL resolvers! See [contextFromRequest](src/postgraphile/index.ts#L103) to see how Graphile allows us to build our own context based on the incoming request. We add the following:

* `user` - as resolved by passport
* `sessionId` - express-session ID, used to have different shopping carts in each browser
* `ip` - the IP address that sent the request, used for nothing right now (lol)
* `req` - allows interacting with express middleware (calling passport functions, mostly). In the future we might use something like `_.pick` to only grab those fields from the request that we need

---

## Stitching everything together

Let's step back for a second. As we saw previously, Graphile generates queries like `itemsList` for us based on our tables (`app_public.item`). It also creates mutations like `createItem` or `updateUserById` by default.

We can define our own GraphQL queries and mutations that extend the schema that Graphile builds based on its introspection of our database. We do this by building extend schema *plugins*; in this codebase, the convention is to store these plugins in `src/postgraphile/*/index.ts`:

* [auth/index.ts](src/postgraphile/auth/index.ts) defines the schema for `login`, `signup`, and `logout` (we saw the resolvers for these earlier)

* [cart/index.ts](src/postgraphile/cart/index.ts) defines the `addToCart`, `setCartQuantity`, and `resetCart` mutations. It also exposes the current `sessionId` and allows subscribing to cart events using `currentCart`

* Similarly, [order/index.ts](src/postraphile/) defines `checkout` and allows subscribing to the events of one order (`orderById`) or the events of all orders visible to the user (`orders`)

The resolver folders in each "schema directory", by convention, contain one file per resolver, with `resolverName` being implemented in `resolver/resolver-name.ts`. These extension schemas can refer to datatypes created by Graphile; for example, see [the definition of CartSubscription](src/postgraphile/cart/index.ts#L29) which refers to the Graphile-defined `Cart` type.

---

## Subscriptions

- weird in postgraphile