import Express from 'express';

export default (
  req: Express.Request,
  res: Express.Response,
) => {
  req.logout();
  res.status(200).json({ status: 'OK' });
};
