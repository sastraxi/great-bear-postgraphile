import { PostGraphileContext } from '../../custom-types';

const ensureCart = ({ knex, user, sessionId }: PostGraphileContext) =>
  knex.raw(` 
    insert into app_public."cart"
      (session_id, user_id)
    values
      (?, ?)
    on conflict
    do nothing
  `, [sessionId, user!.id]);

export default ensureCart;
