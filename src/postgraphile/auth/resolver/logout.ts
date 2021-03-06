import { PostGraphileContext } from '../../../types';

const logout = async (
  _root: any,
  _params: any,
  { req }: PostGraphileContext,
): Promise<boolean> => {
  req.logout();
  req.session.destroy(() => {});
  return true;
};

export default logout;
