import bcrypt from 'bcrypt';
import { PostGraphileContext } from '../../../types';
import { isValidPassword } from '../../../util';
import { UserParams, User } from "../types";

const BCRYPT_ROUNDS = 12;

const signup = async (
  _root: any,
  { email, password }: UserParams,
  { req, knex }: PostGraphileContext,
): Promise<User> => {

  if (!isValidPassword(password)) {
    throw new Error(
      'Passwords must be at least 8 characters in length ' +
        'and contain both letters and numbers',
    );
  }

  const existingUserId = await knex('app_public.user')
    .whereRaw('lower(email) = ?', [email.toLowerCase().trim()])
    .first('id')
    .then(row => row && row.id);

  if (existingUserId) {
    throw new Error(
      'An account for this email address already exists',
    );
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // FIXME: need to insert some of this data into app_private.user
  const id = await knex('app_public.user')
    .insert({
      email,
    })
    .returning('id')
    .then(rows => rows && rows[0]);

  await knex('app_private.user')
    .insert({
      user_id: id,
      hash_password: hashedPassword,
      is_admin: false,
    });

  return new Promise((resolve, reject) => {
    req.login({ id, email }, (err) => {
      if (err) return reject(err);
      return resolve({
        id,
        email,
        isAdmin: false,
      });
    });
  });
};

export default signup;
