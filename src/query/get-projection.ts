import Knex from 'knex';
import { LatLon } from '../types';    

export const getProjectionQuery = (knex: Knex) => (
  latlon: LatLon,
  distanceMetres: number,
  degreesFromNorthCCW: number
): PromiseLike<string> =>
  knex.raw(`
    select
      st_asgeojson(
        st_project(
          st_setsrid(st_makepoint(?, ?), 4326),
          ?,
          radians(?)
        )
      ) as latlon
  `, [latlon.lon, latlon.lat, distanceMetres, degreesFromNorthCCW])
    .then(({ rows }) => rows[0].latlon);

export default getProjectionQuery;
