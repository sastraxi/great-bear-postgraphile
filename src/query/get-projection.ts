import Knex from 'knex';
import { LatLon } from '../types';    
import { fromGeoJSON } from '../util';

export const getProjectionQuery = (knex: Knex) => (
  latlon: LatLon,
  distanceMetres: number,
  degreesFromNorthCCW: number
): PromiseLike<LatLon> =>
  knex.raw(`
    select
      st_asgeojson(
        st_project(
          st_setsrid(st_makepoint(?, ?), 4326),
          ?,
          radians(?)
        )
      ) as latlon
  `, [latlon.lon, latlon.lat, distanceMetres, degreesFromNorthCCW]) // notice it's flipped in postgis
    .then(({ rows }) => fromGeoJSON(rows[0].latlon));

export default getProjectionQuery;
