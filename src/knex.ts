import Knex from 'knex';

// generate database URL from environment
export let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  databaseUrl = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}` +
    `@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DATABASE}`;
}

export default Knex({
  client: 'pg',
  connection: databaseUrl,
});
