let app;

try {
  app = require('../server');
} catch (err) {
  console.error('[CopiaPicchio Vercel Lambda Init Error]:', err);
  const express = require('express');
  app = express();
  app.all('*', (req, res) => {
    res.status(500).json({
      error: 'SERVERLESS_INITIALIZATION_ERROR',
      message: err.message,
      stack: err.stack
    });
  });
}

module.exports = app;
