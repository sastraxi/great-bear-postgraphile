import { PubSub } from "graphql-subscriptions";
import { PostGraphilePlugin } from "postgraphile";
import createDebugger from 'debug';

const debug = createDebugger('gbpg:pubsub');

export let pubsub: PubSub = null;

export type OperationName = "insert" | "update" | "delete";
type ColumnType = string[] | "any";
type AnyMap = {[key: string]: any};

export interface MessagePayload {
  operation: string
  old: AnyMap | null
  new: AnyMap | null
  timestamp: number
}

type ListenerFunction = (msg: MessagePayload) => any;

const plugin: PostGraphilePlugin = {
  ["postgraphile:options"](incomingOptions) {
    const { graphileBuildOptions: { pubsub: recvPubSub } } = incomingOptions;
    pubsub = recvPubSub;
    console.log('got pubsub', pubsub);
    return incomingOptions;
  },
};

// TODO: build an app_public.table_subscription() function
// - notifies "tbl:<operation>:schema.name" { old, new, uuid, timestamp }
// - can run on execute; TG_OP TG_TABLE_SCHEMA TG_TABLE_NAME NEW OLD
// - see how hasura builds uuids

export const addListener = (
  qualifiedTable: string,
  operation: OperationName,
  columns: ColumnType = "any",
  listener: ListenerFunction,
): Promise<number> => {

  const topic = `tbl:${operation}:${qualifiedTable}`;
  if (topic.length > 63) {
    debug(`topic length over 63: "${topic}"`);
  }

  return pubsub.subscribe(topic, (msg: MessagePayload) => {
    if (columns !== "any") {
      const { old, new: newRecord } = msg;        
      if (!columns.some(col => newRecord[col] !== old[col])) {
        debug(`${operation}(${qualifiedTable}): no modified columns: ${columns}`);
        return;
      }
    }
    listener(msg);
  });
};

export const removeListener = (listenerId: number) =>
  pubsub.unsubscribe(listenerId);

export default plugin;
