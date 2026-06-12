const geoip = require('geoip-lite');

module.exports = (req, res, next) => {
  // Get IP from request
  const ip = req.ip || req.connection.remoteAddress;
  
  // Look up geolocation
  const geo = geoip.lookup(ip);
  
  // For now, set city to Portland (development)
  req.userCity = 'Portland';
  req.userRegion = geo?.timezone || 'America/Los_Angeles';
  req.userCountry = geo?.country || 'US';
  
  next();
};
