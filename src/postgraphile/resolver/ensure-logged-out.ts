import { skip } from 'graphql-resolvers';
import { PostGraphileContext } from '../../types';

const LOGGED_IN_MSG = 'You cannot access this resource while logged in.';

/**
 * A simple resolver "middleware" we can combine with other resolvers
 * to make sure we are not logged in when we perform another action.
 */
const ensureLoggedOut = (_root: any, _params: any, { user }: PostGraphileContext) => {
  if (user) return new Error(LOGGED_IN_MSG);
  return skip;
};

export default ensureLoggedOut;
