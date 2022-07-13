const jwt = require("jsonwebtoken");
const { jwtCode, tokenExpiresIn } = require("../config.js");

module.exports = {
  getAuthToken: (userId, role) => {
    return jwt.sign(
      { userId, role },
      jwtCode,
      { expiresIn: tokenExpiresIn }
    );
  }
};