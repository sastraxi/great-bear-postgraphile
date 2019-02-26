import Bluebird from 'bluebird';
import Knex from 'knex';
import _ from 'lodash';
import moment from 'moment';
import { MessagePayload } from '../../postgraphile/get-pubsub';
import getOrderLocationsQuery from '../../query/get-order-locations';
import getProjectionQuery from '../../query/get-projection';
import sendEmailQuery from '../../query/send-email';
import setOrderLocationQuery from '../../query/set-order-location';
import { HR_TO_SEC, KM_TO_M, mix, SEC_TO_MS, TableListenerSpec } from '../util';

const {
  DRIVER_DISTANCE_KM,
  DRIVER_SPEED_KPH,
  DRIVER_UPDATE_HZ,
  DRIVER_DROP_PACKAGE_SEC,
} = process.env;

/**
 * after the food has been prepared,
 * a drone flies it to the user's address.
 */
export default (knex: Knex): TableListenerSpec => {
  const getOrderLocations = getOrderLocationsQuery(knex);
  const setOrderLocation = setOrderLocationQuery(knex);
  const getProjection = getProjectionQuery(knex);
  const sendEmail = sendEmailQuery(knex);

  return {
    qualifiedTable: 'app_public.order',
    operation: 'update',
    columns: ['cooked_at'],
    handler: async (msg: MessagePayload) => {
      const order = msg.new;

      const { destination: targetCoord } = await getOrderLocations(order.id);

      // generate a fake location near the user's location using postgis
      const randomAngle = 360.0 * Math.random();
      const initialCoord = await getProjection(
        targetCoord,
        KM_TO_M * +DRIVER_DISTANCE_KM,
        randomAngle,
      );

      // simulate sending a drone to the user's house then dropping their meal
      const deliverySeconds = HR_TO_SEC * (+DRIVER_DISTANCE_KM / +DRIVER_SPEED_KPH);
      const step = 1.0 / +DRIVER_UPDATE_HZ;
      for (let t = 0.0; t < deliverySeconds; t += step) {
        const pct = t / deliverySeconds;
        const interpolated = mix(initialCoord, targetCoord, pct);
        await Promise.all([
          setOrderLocation(order.id, interpolated),
          Bluebird.delay(SEC_TO_MS * step),
        ])
      }
      await Promise.all([
        setOrderLocation(order.id, initialCoord),
        Bluebird.delay(SEC_TO_MS * +DRIVER_DROP_PACKAGE_SEC),
      ]);
    
      // mark / notify that the delivery has been completed
      const delivered_at = moment().toISOString();
      await Promise.all([
        sendEmail(order.user_id, 'receipt', {
          order: {
            ..._.pick(order, ['id', 'amount', 'created_at']),
            delivered_at,
          },
        }),
        knex('order')
          .update({ delivered_at })
          .where({ id: order.id }),
      ]);
    },
  };
};
