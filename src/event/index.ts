import Knex from 'knex';
import { addListener } from '../postgraphile/get-pubsub';
import { TableListenerSpec } from './util';

type Factory = (knex: Knex) => TableListenerSpec;

import Waiter from './handler/waiter';
const SPEC_FACTORIES: Factory[] = [
  Waiter,
];

const attachEventHandlers = (knex: Knex) =>
  SPEC_FACTORIES.forEach((createSpec) => {
    const spec = createSpec(knex);
    addListener(
      spec.qualifiedTable,
      spec.operation,
      spec.columns || 'any',
      spec.handler,
    );
  });

export default attachEventHandlers;
