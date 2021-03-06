# Great Bear (PostGraphile)

### Getting started

1. `cp .env.example .env` and fill in details.
2. Execute the SQL in `bootstrap/` as superuser, first in the `postgres` database and then in the `gbpg` database (or whatever you choose to call it).
3. Make sure your connection string points to the database you just created, then run `pgsh up` to migrate to the latest version.
4. Run `pgsh psql < seed.sql` to seed the database with some dishes you can order.
5. `yarn start` to begin the server
6. Clone `https://github.com/sastraxi/great-bear-frontend` and follow its setup instructions. Put the following in its `.env`:
    ```
    REACT_APP_GRAPHQL_VARIANT=postgraphile
    REACT_APP_GRAPHQL_URL=http://localhost:4000/graphql # by default
    REACT_APP_SUBSCRIPTION_URL=ws://localhost:4000/graphql # by default
    ```
7. Run the frontend with `yarn start` as well.
8. Navigate to http://localhost:3000 (by default).

### Current medium-term plan

1. Add error handling
2. Follow https://www.graphile.org/postgraphile/testing-jest/

### Out of the scope of this project

* retire `get-pubsub`, refactor this gist into a library:
  * https://gist.github.com/benjie/839740697f5a1c46ee8da98a1efac218
  * include the necessary sql
  * use `pg.listen`
