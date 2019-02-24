# Typescript / Express / Knex Template

### Getting started

1. `cp .env.example .env` and fill in details.
2. Execute the SQL in `bootstrap/` as superuser, first in the `postgres` database and then
   in the `gbpg` database (or whatever you choose to call it).
3. Make sure your connection string points to the database you just created,
   then run `pgsh up` to migrate to the latest version.
