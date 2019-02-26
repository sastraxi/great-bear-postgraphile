import Knex from 'knex';
import { addListener } from '../postgraphile/get-pubsub';
import Validate from './handler/1-validate';
import Capture from './handler/2-capture';
import Chef from './handler/3-chef';
import Delivery from './handler/4-delivery';
import { TableListenerSpec } from './util';

type Factory = (knex: Knex) => TableListenerSpec;

const SPEC_FACTORIES: Factory[] = [
  Validate,
  Capture,
  Chef,
  Delivery,
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
