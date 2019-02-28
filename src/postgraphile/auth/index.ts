import { gql, makeExtendSchemaPlugin } from 'graphile-utils';
import { combineResolvers } from 'graphql-resolvers';
import ensureLoggedOut from '../resolver/ensure-logged-out';
import ensureUserSession from '../resolver/ensure-user-session';
import login from './resolver/login';
import logout from './resolver/logout';
import signup from './resolver/signup';

const typeDefs = gql`
  type AuthedUser {
    id: Int!
    email: String!
    isAdmin: Boolean!
  }

  extend type Mutation {
    login(email: String!, password: String!): AuthedUser!
    logout: Boolean!
    signup(email: String!, password: String!): AuthedUser!
  }
`;

/**
 * Wrap our resolver delegates in middleware.
 */
const resolvers = {
  Mutation: {
    login: combineResolvers(
      ensureLoggedOut,
      login,
    ),
    logout: combineResolvers(
      ensureUserSession,
      logout,
    ),
    signup: combineResolvers(
      ensureLoggedOut,
      signup,
    ),
  },
};

export default makeExtendSchemaPlugin(() => ({
  typeDefs,
  resolvers,
}));
