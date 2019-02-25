import { LatLon } from '../types';
import { MessagePayload, OperationName } from '../postgraphile/get-pubsub';

export interface TableListenerSpec {
  handler: (msg: MessagePayload) => any,
  qualifiedTable: string,
  columns?: string[],
  operation: OperationName,
};

export const SEC_TO_MS = 1000;

export const fromCoord = (geoJSON: string): LatLon => {
  if (!geoJSON) return null;
  const { coordinates } = JSON.parse(geoJSON);
  return {
    lat: coordinates[1],
    lon: coordinates[0],
  };
};

export const tween = (a: number, b: number, pct: number): number =>
  (1 - pct) * a + pct * b;

export const mix = (a: LatLon, b: LatLon, pct: number): LatLon => ({
  lat: tween(a.lat, b.lat, pct),
  lon: tween(a.lon, b.lon, pct),
});
