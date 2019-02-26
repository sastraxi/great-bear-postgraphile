import { LatLon } from '../types';
import { MessagePayload, OperationName } from '../postgraphile/get-pubsub';

export interface TableListenerSpec {
  handler: (msg: MessagePayload) => any,
  qualifiedTable: string,
  columns?: string[],
  operation: OperationName,
};

export const SEC_TO_MS = 1000;

export const tween = (a: number, b: number, pct: number): number =>
  (1 - pct) * a + pct * b;

export const mix = (a: LatLon, b: LatLon, pct: number): LatLon => ({
  lat: tween(a.lat, b.lat, pct),
  lon: tween(a.lon, b.lon, pct),
});
