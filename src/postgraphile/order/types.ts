import { LatLon } from '../../types';

export interface CheckoutParams {
  deliveryLocation: LatLon
  stripeToken: string
  amount: number
};
