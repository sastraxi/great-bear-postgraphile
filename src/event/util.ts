import { LatLon } from '../types';
import { MessagePayload, OperationName } from '../postgraphile/get-pubsub';

export interface TableListenerSpec {
  handler: (msg: MessagePayload) => any,
  qualifiedTable: string,
  columns?: string[],
  operation: OperationName,
};

export const SEC_TO_MS = 1000;
export const KM_TO_M = 1000;
export const HR_TO_SEC = 3600;

export const tween = (a: number, b: number, pct: number): number =>
  (1 - pct) * a + pct * b;

export const mix = (a: LatLon, b: LatLon, pct: number): LatLon => ({
  lat: tween(a.lat, b.lat, pct),
  lon: tween(a.lon, b.lon, pct),
});

export const amountPaidToPoints = (cents: number) =>
  Math.ceil(cents / 100) * 10;
