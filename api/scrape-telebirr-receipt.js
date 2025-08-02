const https = require('https');
const { parseFromHTML } = require('telebirr-receipt').utils;

module.exports = async (req, res) => {
  const { transaction_number } = req.query;

  if (!transaction_number) {
    return res.status(400).json({
      success: false,
      error: 'Transaction number is required',
    });
  }

  const options = {
    hostname: 'transactioninfo.ethiotelecom.et',
    path: `/receipt/${transaction_number}`,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'DNT': '1'
    }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => {
      const parsedData = parseFromHTML(data);
      res.status(200).json({
        success: true,
        data: {
          payerName: parsedData.payer_name || '',
          payerTelebirrNo: parsedData.payer_phone || '',
          creditedPartyName: parsedData.credited_party_name || '',
          transactionStatus: parsedData.transaction_status || '',
          settledAmount: parsedData.settled_amount || 'Not available in this version',
          paymentDate: parsedData.date || 'Not available in this version',
        },
      });
    });
  });

  request.on('error', (error) => {
    console.error('Error scraping receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape receipt',
      details: error.message,
    });
  });

  request.end();
};