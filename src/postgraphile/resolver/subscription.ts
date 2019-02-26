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
    sql.fragment`app_public.${tableName}`,
    (tableAlias: any, sqlBuilder: QueryBuilder) => {
      sqlBuilder.where(
        sql.fragment`${tableAlias}.${columnName} = ${sql.value(event.subject)}`
      );
    }
  );
  return rows[0];
};

export default subscriptionResolver;
