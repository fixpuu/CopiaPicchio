/**
 * Modulo email: reindirizza su mailgun.js
 */
const mailgun = require('./mailgun');

module.exports = {
  sendOtpEmail: mailgun.sendOtpEmail,
  isConfigured: mailgun.isConfigured
};
