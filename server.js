const express = require('express');
const scrapeReceiptHandler = require('./api/scrape-receipt');
const scrapeTelebirrReceiptHandler = require('./api/scrape-telebirr-receipt');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to adapt the serverless function to Express
const adaptServerlessToExpress = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('Error in serverless function:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// Mount the serverless function as an Express route
app.all('/api/scrape-receipt', adaptServerlessToExpress(scrapeReceiptHandler));
app.all('/api/scrape-telebirr-receipt', adaptServerlessToExpress(scrapeTelebirrReceiptHandler));

// Add a simple home route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>CBE Receipt Scraper</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .container { background: #f5f5f5; padding: 20px; border-radius: 5px; }
          code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
          .endpoint { margin-top: 20px; background: #e9f7fe; padding: 15px; border-left: 4px solid #0099ff; }
        </style>
      </head>
      <body>
        <h1>CBE Receipt Scraper API</h1>
        <div class="container">
          <p>This API extracts data from CBE receipts without downloading the entire PDF.</p>
          
          <div class="endpoint">
            <h3>Endpoint: /api/scrape-receipt</h3>
            <p><strong>Method:</strong> GET</p>
            <p><strong>Query Parameters:</strong></p>
            <ul>
              <li><code>id</code> - The receipt ID (required)</li>
            </ul>
            <p><strong>Example:</strong></p>
            <code>/api/scrape-receipt?id=FT25186CS2K308680658</code>
          </div>

          <div class="endpoint">
            <h3>Endpoint: /api/scrape-telebirr-receipt</h3>
            <p><strong>Method:</strong> GET</p>
            <p><strong>Query Parameters:</strong></p>
            <ul>
              <li><code>transaction_number</code> - The receipt transaction number (required)</li>
            </ul>
            <p><strong>Example:</strong></p>
            <code>/api/scrape-telebirr-receipt?transaction_number=CG179W93AJ</code>
          </div>
          
          <p>Try it now: <a href="/api/scrape-receipt?id=FT25186CS2K308680658">/api/scrape-receipt?id=FT25186CS2K308680658</a></p>
        </div>
      </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API endpoint available at http://localhost:${PORT}/api/scrape-receipt`);
});