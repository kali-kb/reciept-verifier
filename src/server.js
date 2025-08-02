const express = require('express');
const compression = require('compression');
const logger = require('./logger');
const scrapeCbeHandler = require('./api/scrape-receipt');
const scrapeTelebirrHandler = require('./api/scrape-telebirr-receipt');

const app = express();
app.use(compression());
const PORT = process.env.PORT || 3000;

const adaptServerlessToExpress = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    logger.error('Error in serverless function:', { error: error.message, stack: error.stack });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

app.all('/api/cbe', adaptServerlessToExpress(scrapeCbeHandler));
app.all('/api/telebirr', adaptServerlessToExpress(scrapeTelebirrHandler));

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Receipt Scraper API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .container { background: #f5f5f5; padding: 20px; border-radius: 5px; }
          code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
          .endpoint { margin-top: 20px; background: #e9f7fe; padding: 15px; border-left: 4px solid #0099ff; }
        </style>
      </head>
      <body>
        <h1>Receipt Scraper API</h1>
        <div class="container">
          <p>This API extracts data from CBE and Telebirr receipts.</p>
          
          <div class="endpoint">
            <h3>Endpoint: /api/cbe</h3>
            <p><strong>Method:</strong> GET</p>
            <p><strong>Query Parameters:</strong></p>
            <ul>
              <li><code>id</code> - The receipt ID (required)</li>
            </ul>
            <p><strong>Example:</strong></p>
            <code>/api/cbe?id=FT25186CS2K308680658</code>
          </div>

          <div class="endpoint">
            <h3>Endpoint: /api/telebirr</h3>
            <p><strong>Method:</strong> GET</p>
            <p><strong>Query Parameters:</strong></p>
            <ul>
              <li><code>transaction_number</code> - The receipt transaction number (required)</li>
            </ul>
            <p><strong>Example:</strong></p>
            <code>/api/telebirr?transaction_number=CG179W93AJ</code>
          </div>
        </div>
      </body>
    </html>
  `);
});

const server = app.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  logger.error('Server startup error:', { error: err.message, stack: err.stack });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});