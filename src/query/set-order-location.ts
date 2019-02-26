import Knex from 'knex';
import { LatLon } from '../types';

const setOrderLocationQuery = (knex: Knex) => (
  orderId: number,
  latlon: LatLon,
): PromiseLike<void> =>
  knex.raw(`
    update "order"
    set
      latlon = st_setsrid(st_makepoint(?, ?), 4326)
    where id = ?
  `, [latlon.lon, latlon.lat, orderId]);

export default setOrderLocationQuery;