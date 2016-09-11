const compose = require('composable-middleware');
const jwt = require('jsonwebtoken');
const User = require('../db/db').User;
const expressJwt = require('express-jwt');

const EXPIRY = 90000;
const SECRET = process.env.SESSION_SECRET;
const validateJwt = expressJwt({ secret: SECRET });

let clientServer = 'http://localhost:8080';
if (process.env.HOST_SERVER && process.env.HOST_SERVER !== '') {
  clientServer = process.env.HOST_SERVER;
}

// Include access_token query param in req.header for validateJwt
const getTokenHeader = (req, res, next) => {
  if (req.query && Object.prototype.hasOwnProperty.call(req.query, 'access_token')) {
    req.headers.authorization = `Bearer ${req.query.access_token}`;
  } else if (req.cookies['token']) {
    req.headers.authorization = `Bearer ${req.cookies['token']}`;
  } else {
    return res.status(401).send('\'ello Poppet. No tokens \'ere love.');
  }
  next();
};

// Convert req.user after validateJwt
// Object with an id to User instance from database
const populateReqUser = (req, res, next) => {
  User.findOne({ where: { id: req.user.id } })
    .then(user => {
      if (!user) {
        return res.status(401).end();
      };
      req.user = user;
      return next();
    })
    .catch(err => next(err));
};

const isAuthenticated = () => compose()
  .use(compose().use(getTokenHeader).use(validateJwt))
  .use(populateReqUser);

const signToken = id => jwt.sign({ id }, SECRET, { expiresIn: EXPIRY });

const setTokenCookie = (req, res) => {
  if (!req.user) {
    return res.status(401).send('User not logged in, please try again.');
  }
  res.cookie('token', signToken(req.user.id));
  return res.redirect(`${clientServer}/home`);
};

module.exports = {
  getTokenHeader,
  populateReqUser,
  isAuthenticated,
  signToken,
  setTokenCookie,
};