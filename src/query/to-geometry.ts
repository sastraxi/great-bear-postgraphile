import Knex from 'knex';
import { LatLon } from '../types';

const toGeometryQuery = (knex: Knex) =>
  (coord: LatLon) => knex.raw(`
    st_setsrid(st_makepoint(?, ?), 4326)
  `, [coord.lon, coord.lat]); // notice it's flipped in postgis

export default toGeometryQuery;
