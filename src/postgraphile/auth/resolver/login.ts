import pick from 'lodash/pick';
import passport from 'passport';
import { PostGraphileContext } from '../../../types';
import { UserParams, User } from "../types";

const login = async (
  _root: any,
  { email, password }: UserParams,
  { req }: PostGraphileContext,
): Promise<User> => new Promise((resolve, reject) => {
  req.body.email = email;
  req.body.password = password;

  passport.authenticate('local', (err: any, user) => {
    if (err) {
      return reject('User or password mismatch.');
    }
    return req.login(user, (loginError) => {
      if (loginError) return reject(loginError);

      return resolve(
        pick(user, ['id', 'email', 'isAdmin']),
      );
    });
  })(req);
});

export default login;
