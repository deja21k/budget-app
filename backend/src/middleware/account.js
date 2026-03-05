const accountMiddleware = (req, res, next) => {
  req.accountId = req.headers['x-account-id'] || 'default';
  next();
};

module.exports = accountMiddleware;
