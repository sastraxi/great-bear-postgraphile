import { PostGraphileContext } from '../../types';

const getCartId = ({ knex, user, sessionId }: PostGraphileContext) =>
  knex('app_public.cart')
    .where('session_id', sessionId)
    .andWhere('user_id', user!.id)
    .first('id')
    .then(cart => cart.id);

export default getCartId;
