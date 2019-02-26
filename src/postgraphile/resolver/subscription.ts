import _ from 'lodash';
import { QueryBuilder } from 'graphile-build-pg';

interface PostGraphileSubscriptionPayload {
  event: string
  subject: any
}

export interface SubscriptionResolverOptions {
  qualifiedTable: string,
  column: string,
  multi: boolean
}

const subscriptionResolver = (
  sql: any,
  opts: SubscriptionResolverOptions,
) => async (
  event: PostGraphileSubscriptionPayload,
  _args: any,
  _context: any,
  { graphile: { selectGraphQLResultFromTable } }: any,
) => {
  console.log('sql is', sql);
  const [schema, table] = opts.qualifiedTable.split('.');
  const rows = await selectGraphQLResultFromTable(
    sql.identifier(schema, table),
    (tableAlias: any, sqlBuilder: QueryBuilder) => {
      sqlBuilder.where(
        sql.fragment`${sqlBuilder.getTableAlias()}.${sql.identifier(opts.column)} = ${sql.value(event.subject)}`
      );
    }
  );
  return opts.multi ? rows : rows[0];
};

export default subscriptionResolver;
