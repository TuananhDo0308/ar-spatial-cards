const locationsData = require('../data/locations.js');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query || {};
  if (id !== undefined && locationsData[id]) {
    return res.status(200).json(locationsData[id]);
  }

  return res.status(200).json(locationsData);
};
