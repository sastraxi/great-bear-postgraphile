import { PubSub } from "graphql-subscriptions";
import { PostGraphilePlugin } from "postgraphile";
import createDebugger from 'debug';

const debug = createDebugger('gbpg:pubsub');

let pubsub: PubSub = null;

type ColumnType = string[] | "any";
type AnyMap = {[key: string]: any};

interface MessagePayload {
  operation: string
  old: AnyMap | null
  new: AnyMap | null
  timestamp: number
}

type ListenerFunction = (msg: MessagePayload) => any;

export const plugin: PostGraphilePlugin = {
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

export const api = {
  addListener: (
    qualifiedTable: string,
    operation = 'insert',
    columns: ColumnType = "any",
    listener: ListenerFunction,
  ): Promise<number> => {

    const topic = `tbl:${operation}:${qualifiedTable}`;
    if (topic.length > 63) {
      debug(`topic length over 63: "${topic}"`);
    }

    return pubsub.subscribe(`tbl:${operation}:${qualifiedTable}`, (msg: MessagePayload) => {
      if (columns !== "any") {
        const { old, new: newRecord } = msg;        
        if (!columns.some(col => newRecord[col] !== old[col])) {
          debug(`${operation}(${qualifiedTable}): no modified columns: ${columns}`);
          return;
        }
      }
      listener(msg);
    });
  },

  removeListener: (listenerId: number) =>
    pubsub.unsubscribe(listenerId),
};

export default pubsub;
