const https = require('https');
const { eq } = require('drizzle-orm');
const { parseFromHTML } = require('telebirr-receipt').utils;
const logger = require('../logger');
const { db } = require('../db');
const { payment_transactions } = require('../db/schema');

module.exports = async (req, res) => {
  const { transaction_number } = req.query;

  if (!transaction_number) {
    return res.status(400).json({
      success: false,
      error: 'Transaction number is required',
    });
  }

  try {
    const data = await new Promise((resolve, reject) => {
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
        response.on('end', () => resolve(data));
      });

      request.on('error', (error) => reject(error));
      request.end();
    });

    const parsedData = parseFromHTML(data);

    if (!parsedData.transaction_status) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction number',
      });
    }

    const existingTransaction = await db.select().from(payment_transactions).where(eq(payment_transactions.transaction_id, transaction_number));

    if (existingTransaction.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Transaction with this ID already exists',
      });
    }

    await db.insert(payment_transactions).values({
      transaction_id: transaction_number,
      amount: Math.round(parseFloat(parsedData.settled_amount) * 100),
      provider: 'telebirr',
      date: parsedData.date,
    });

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
  } catch (error) {
    logger.error('Error scraping receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape receipt',
      details: error.message,
    });
  }
};