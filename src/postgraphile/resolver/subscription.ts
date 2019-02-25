import { QueryBuilder } from 'graphile-build-pg';

interface PostGraphileSubscriptionPayload {
  event: string
  subject: any
}

const subscriptionResolver = (
  sql: any,
  tableName: string,
  columnName: string,
) => async (
  event: PostGraphileSubscriptionPayload,
  _args: any,
  _context: any,
  { graphile: { selectGraphQLResultFromTable } }: any,
) => {
  const rows = await selectGraphQLResultFromTable(
    sql.fragment`app_public.cart`,
    (tableAlias: any, sqlBuilder: QueryBuilder) => {
      sqlBuilder.where(
        sql.fragment`${tableAlias}.id = ${sql.value(event.subject)}`
      );
    }
  );
  return rows[0];
};

export default subscriptionResolver;
