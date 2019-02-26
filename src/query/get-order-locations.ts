import Knex from 'knex';
import _ from 'lodash';

import { LatLon } from '../types';
import { fromGeoJSON } from '../util';

interface OrderLocations {
  current?: LatLon
  destination: LatLon
}

export const getOrderLocationsQuery = (knex: Knex) =>
  (orderId: number): PromiseLike<OrderLocations> =>
    knex.raw(`
      select
        st_asgeojson(current_latlon) as current,
        st_asgeojson(destination_latlon) as destination
      from "order"
      where id = ?
    `, [orderId])
    .then(({ rows }) => rows[0])
    .then(({ current, destination }) => ({
      current: fromGeoJSON(current),
      destination: fromGeoJSON(destination),
    }));

export default getOrderLocationsQuery;
