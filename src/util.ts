import { LatLon } from './types';

/**
 * A valid password has at least 8 characters and contains letters and numbers.
 * This is required for PCI compliance through Stripe.
 */
export const isValidPassword = (password: string) => {
  if (!password) return false;
  if (password.length < 8) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[a-z]/i.test(password)) return false;
  return true;
};

export const frontendUrl = (path: string) =>
  `${process.env.FRONTEND_URL}${path}`;

export const fromGeoJSON = (geoJSON: string): LatLon => {
  if (!geoJSON) return null;
  const { coordinates } = JSON.parse(geoJSON);
  return { // notice it's flipped in postgis
    lat: coordinates[1],
    lon: coordinates[0],
  };
};
