# Great Bear (PostGraphile)

### Getting started

1. `cp .env.example .env` and fill in details.
2. Execute the SQL in `bootstrap/` as superuser, first in the `postgres` database and then
   in the `gbpg` database (or whatever you choose to call it).
3. Make sure your connection string points to the database you just created,
   then run `pgsh up` to migrate to the latest version.
4. `yarn start` to begin the server
5. Clone `https://github.com/sastraxi/great-bear-frontend` and follow its setup instructions. Put the following in your `.env`:

    ```
    REACT_APP_GRAPHQL_VARIANT=postgraphile
    REACT_APP_GRAPHQL_URL=http://localhost:3000/graphql # by default
    ```
6. Run the frontend with `yarn start` as well.
7. Navigate to http://localhost:4000 (by default).