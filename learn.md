# This is a learning repository

This page will take you on a guided tour of the codebase. If you find it hard to follow, please feel free to submit a pull request with clarifications (or simply an issue!).

## What we're building

Great Bear is a food delivery application that allows users to order food to be delivered via drone. Well, at least that's what we're simulating. The frontend can be found in the [great-bear-frontend](https://github.com/sastraxi/great-bear-frontend) repository; this codebase is a compatible backend.

### User Stories

* As an anonymous user I can signup using email and password so I can keep a history of my orders
* As a registered user I can login so I can use the site
* As a logged in user I can logout so I can use the site on a shared computer
* As a logged in user I can add items to a shopping cart so I can take my time choosing my order
* As a logged in user I can remove or modify the quantity of items in my shopping cart so I can change my mind
* As a logged in user I can choose my delivery location at checkout so I don't have to maintain a list of addresses
* As a logged in user I can pay for all the items in my cart by credit card at checkout so I can save time
* As a logged in user I can track the status of my order in real-time so I know when to expect my food
* As a logged in user I can view a list of my previous and current orders so I can see how much I've spent and what I spent it on

---

## Introducing PostGraphile

Formerly known as PostGraphQL, [PostGraphile](https://graphile.org) advertises itself as an "extensible high-performance automatic GraphQL API for PostgreSQL". Like [Hasura](https://hasura.io), it acts as an intermediary between a GraphQL client (your frontend, for example) and a postgres database, allowing you to perform queries using GraphQL instead of SQL. Like Hasura, it solves the "N+1 query problem" by avoiding round-trips to the database:

> [We leverage graphile-build's look-ahead features when resolving a GraphQL request so that a single root level query, no matter how nested, is compiled into just one SQL query.](https://www.graphile.org/postgraphile/performance/#how-is-it-so-fast)

One tip to keep in mind while we explore PostGraphile is that it does some renaming of your schema. For example, it changes column names into `camelCase` and table names into singular `UpperCamelCase`. There are many other rules for "inflection" that you can read about in [the documentation](https://graphile.org/postgraphile/inflection/). This repository also follows [the recommended namespacing technique](https://graphile.org/postgraphile/namespaces/) for postgres schemas.

I suggest referring back to [the official documentation](https://www.graphile.org/postgraphile/introduction/) if you get stuck on a concept.

---

## GraphQL glossary

* Schema - TODO
* Resolver - TODO 
* Query - TODO
* Mutation - TODO
* Subscription - TODO
* Transport - TODO

---

## Defining our data model

I decided to use [knex](...) for database migrations because I knew it the best. Knex reads migrations in lexicographic order out of a folder; in this project that's [migrations/](migrations/).

In order to start using its migration system, we must first create a database. Let's do that by executing the commands in [the bootstrap folder](bootstrap/) using `psql`.

> I'm going to take a moment to plug another project of mine: [pgsh](https://github.com/sastraxi/pgsh). This git-inspired tool aims to help you branch your database, perform migrations, and more. Users of this tool can run `pgsh psql` to enter into a psql shell that's pointed at the same database as our `.env`.

After that's done, we can start adding a schema to our newly-created postgres database. Take a look at [the first migration](migrations/001_system_and_user.js) for where this begins. 

> Note that some migrations (like [004_graphql_subscription.js](migrations/004_graphql_subscription.js)) capture versions of functions that have since been replaced in newer migrations. I decided to leave these happy little accidents in as a testament to learning as-you-go.

---

## .env

Take a moment to `cp .env.example .env` and fill it in to reflect your environment.

In particular, make sure that you set `DATABASE_URL` to point at the database you set up, choose a high-entropy `SESSION_SECRET`, and fill in your `STRIPE_SECRET_KEY` (a Stripe account can be created [for free](https://stripe.com)).

> `.env` files are an idiomatic way of providing secrets to node apps in development. See [The Twelve-Factor App](https://12factor.net) for more information on what this makes sense. Remember to never commit files containing secrets to version control!

--- 

## Authorization

As you saw in [the migrations folder](migrations/), we have defined row-level security policies (`GRANT` DDL) that effectively hide any rows that a user shouldn't see from their queries. These policies largely apply to the `app_user` role, whereas the `app_admin` has a much larger set of permissions. Lastly, the `greatbear` role have more-or-less free rein over the database. Here's why:

* `app_user`: queries made on behalf of a regular logged-in user, or an anonymous user
* `app_admin`: queries made on behalf of a logged-in user with administrator privileges (that we define ourselves)
* `greatbear`: the "root" database user that can really fuck things up. No users will be able to run queries as this role, but our built-in `knex` queries will

> The postgres documentation uses the terms *role* and *user* interchangeably.

---

## PostGraphile, two ways

At this point, we could use the command line tools provided by Graphile to introspect our database and expose a GraphQL endpoint:

```bash
$ postPostGraphile -c postgres://app_user@localhost/gbpg [--watch]
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

Wait, where did that query come from? PostGraphile [automatically generates these](https://www.graphile.org/postgraphile/tables/) from our tables and foreign key relationships. Pretty useful, eh?

> The whole "Tables" section linked above is worthwhile reading to wrap your head around what PostGraphile gives you out-of-the-box.

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

Success! Some data. So how do we solve this problem generally?

If we pass in a JWT secret on the command line using the `--jwt-secret` option, the `postgraphile` process will start pulling JWTs from the `Authorization:` HTTP header. If they're valid, it'll then set the claims included as `jwt.claims.*` in the transaction wrapping each SQL query (there's a reason this is the idiomatic way to set `user_id` with PostGraphile; it's so easy).

The other way is to build some scaffolding up around the GraphQL calls by using PostGraphile as a library. This way, we don't have to be confined to using JWTs and can instead use http-only cookies (my preference). Take a look at [this code](src/postgraphile/index.ts) where we start a PostGraphile server inside of our app, and particularly the `pgSettingsFromRequest` function where we grab user information out of the HTTP (express) request.

> Notice that we also set the postgres `role` in this function: administrators perform SQL queries as `app_admin` while regular users' queries are executed as `app_user`.

---

## Authentication

Where does `req.user` get set, though? PostGraphile only performs authorization; for authentication, we're using [passportjs](...) behind the scenes and storing the resolved user into `req.user` using its express middleware.

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

```graphql
mutation {
  logout
}
```

Because internally we're just delegating to passport, session semantics remain the same as they would be for regular HTTP calls. In this case, we're using [express-session](https://github.com/expressjs/session) to store a signed cookie with a session ID and serialized user ID.

---

## Our context

Notice that we are able to access the original express HTTP request in our GraphQL resolvers! See [contextFromRequest](src/postgraphile/index.ts#L103) to see how PostGraphile allows us to build our own context based on the incoming request. We add the following:

* `user` - as resolved by passport
* `sessionId` - express-session ID, used to have different shopping carts in each browser
* `ip` - the IP address that sent the request, used for nothing right now (lol)
* `req` - allows interacting with express middleware (calling passport functions, mostly). In the future we might use something like `_.pick` to only grab those fields from the request that we need

---

## Stitching everything together

Let's step back for a second. As we saw previously, PostGraphile generates queries like `itemsList` for us based on our tables (`app_public.item`). It also creates mutations like `createItem` or `updateUserById` by default.

We can define our own GraphQL queries and mutations that extend the schema that PostGraphile builds based on its introspection of our database. We do this by building extend schema *plugins*; in this codebase, the convention is to store these plugins in `src/postgraphile/*/index.ts`:

* [auth/index.ts](src/postgraphile/auth/index.ts) defines the schema for `login`, `signup`, and `logout` (we saw the resolvers for these earlier)

* [cart/index.ts](src/postgraphile/cart/index.ts) defines the `addToCart`, `setCartQuantity`, and `resetCart` mutations. It also exposes the current `sessionId` and allows subscribing to cart events using `currentCart`

* Similarly, [order/index.ts](src/postgraphile/order/index.ts) defines `checkout` and allows subscribing to the events of one order (`orderById`) or the events of all orders visible to the user (`orders`)

The resolver folders in each "schema directory", by convention, contain one file per resolver, with `resolverName` being implemented in `resolver/resolver-name.ts`. These extension schemas can refer to datatypes created by PostGraphile; for example, see [the definition of CartSubscription](src/postgraphile/cart/index.ts#L29) which refers to the PostGraphile-defined `Cart` type.

These schema extension plugins are not the only type of plugins you can extend PostGraphile using; next, we'll take a look at a very different type of plugin.

---

## Subscriptions in PostGraphile

In GraphQL, subscriptions are a special type of query that automatically pushes data to the client whenever it changes. Unlike in [the Hasura implementation](https://github.com/sastraxi/great-bear-hasura), subscriptions in PostGraphile require a fair bit of boilerplate on our end. The library provides:

* a websocket transport layer, which lets us push data to the GraphQL client when things change;
* a `@pgSubscription(topic)` decorator for our schema extensions, which will trigger our resolver whenever `pg_notify` is used with a given topic (a string like `order:54`)

This second one requires a bit of explanation. Let's start by looking at a subscription resolver to see what they look like. I've written a smaller helper function called [subscriptionResolver](src/postgraphile/resolver/subscription.ts) that takes care of some of the boilerplate involved. Essentially, this function acts as the resolver for any subscriptions that use the `@pgSubscription` decorator introduced earlier.

When the configured topic is trigged via `pg_notify`, this function will receive a payload (`event`) that we'll extract a value from (`payloadColumn`). We'll use that value to query the configured table (`qualifiedTable`). Essentially, we'll perform the SQL query

```sql
select * from <qualifiedTable> where <column> = <event[payloadColumn]>
```

... and either return all rows (`multi: true`) or just the first one (`multi: false`).

> Take a few minutes to review the comments in this file as well as the official [PostGraphile documentation on subscriptions](https://www.graphile.org/postgraphile/subscriptions/) before moving on.

So that's all well and good, but what's all this `pg_notify` stuff? If we're just specifying an arbitrary string for the topic we're subscribing to, where else is this topic defined? The secret sauce here are database `TRIGGER`s that notify our code that new data is ready to be sent to GraphQL clients who have subscribed to the topic. Here's an example trigger from [014_orders_subscription_triggers.js](migrations/014_orders_subsription_triggers.js):

```sql
CREATE TRIGGER subscription_orders___insert
AFTER INSERT ON app_public."order"
FOR EACH ROW
EXECUTE PROCEDURE app_public.graphql_subscription(
  'orderInsert',        /* event */
  'graphql:orders:$1',  /* topic */
  'user_id',            /* $1 (column from OLD / NEW row) */
  'id'                  /* extra value to select from row */
);
```

To recap, the overall subscription flow for PostGraphile looks like this:

1. A GraphQL client sends a `subscription { ... }` query to our PostGraphile endpoint. The topic function (examples [here](src/postgraphile/cart/index.ts#L13)) is executed with parameters from the GraphQL subscription, letting PostGraphile know to subscribe to this topic in its PostgreSQL connection
2. Some SQL query modifies the contents of a table somehow -- an `INSERT`, `UPDATE`, or `DELETE`
3. Triggers we've defined call our [app_public.graphql_subscription](migrations/013_graphql_subscription.js) function
4. The function in turn calls `pg_notify` (see [lines 47 and 53](migrations/013_graphql_subscription.js#L47)) with the configured topic from the originating `TRIGGER`
5. PostGraphile picks up this notification from the subscription created earlier, then calls our `subscriptionResolver` as above
6. The resolver makes an SQL query to re-fetch the data, and returns it to PostGraphile to be sent to the GraphQL client via websocket

> It's worth noting that the PostGraphile documentation provides a version of `app_public.graphql_subscription` that's been modified here to support using values other than the table's primary key in the topic.

Once you get past the boilerplate required, PostGraphile's idea of subscriptions is extremely powerful and lets you wire things up however makes sense for your application.

---

## Custom "table" subscriptions

Clearly, Hasura's subscriptions are a lot simpler to set up than PostGraphile's. In fact, the developer experience with them was so good I decided to re-implement their whole-table "watches" using PostGraphile, calling them *table subcriptions*.

How are these different than the style that was just introduced? Well, rather than our GraphQL clients being the ones we notify, these will be more "internal" events that let us build our food delivery workflow in an event-driven style. We'll define when code should be run (for any new `INSERT`s on `app_public.order`, or maybe whenever we `UPDATE` the `cooked_at` column on that table). This lets us perform a business process for each row that transitions through a certain "edge".

We hook into PostGraphile's pubsub instance to provide this functionality. See [get-pubsub.ts](src/postgraphile/get-pubsub.ts) for how we use a PostGraphile plugin to grab this.



- by convention, in [src/event/handler/*.ts](src/event/handler/)

---

## Computed functions

One of the most useful things that PostGraphile lets us do is define computed "columns": these become fields on the types that are generated as part of introspection, but aren't represented in postgres as a column on the table. Instead, these are *functions* whose names take the form `schema.table_name_column_name`.

For an example, take a look at [009_geojson.js](migrations/009_geojson.js). This migration defines a function `app_public.order_current_json`, which means that our `Order` type gets a `currentJson` field on it that we can query anywhere an order is returned. The value of this column is defined by the return value of the function; it doesn't even have to use the table in question as part of its definition.

> In order to be exposed as a computed column, these functions must take a row from the table in question and be marked as `STABLE`, which essentially means the function is only reading from the database (not writing or modifying anything).

---

## GeoJSON support in PostGraphile

* swapped lat / lon
* no native support (see Order typedefs)
