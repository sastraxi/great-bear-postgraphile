import session from 'express-session';

export default session({
  name: 'great-bear-postgraphile.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 120,
  },
  rolling: true,
});
