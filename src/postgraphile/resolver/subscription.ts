import _ from 'lodash';
import { QueryBuilder } from 'graphile-build-pg';

type StringMap = {[key: string]: string};
type PostGraphileSubscriptionPayload = StringMap & {
  event: string
};

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
  const [schema, table] = opts.qualifiedTable.split('.');
  const columnValue = event[opts.column];

  const rows = await selectGraphQLResultFromTable(
    sql.identifier(schema, table),
    (_tableAlias: any, sqlBuilder: QueryBuilder) => {
      sqlBuilder.where(
        sql.fragment`${sqlBuilder.getTableAlias()}.${sql.identifier(opts.column)} = ${sql.value(columnValue)}`
      );
    }
  );
  return opts.multi ? rows : rows[0];
};

export default subscriptionResolver;
