const https = require('https');
const pdfParse = require('pdf-parse');

/**
 * Serverless function to scrape CBE receipt data
 * This function is optimized for Vercel deployment
 * It extracts only the necessary data without storing the PDF
 */
module.exports = async (req, res) => {
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get receipt ID from query parameter
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing receipt ID' });
    }

    // Construct the URL
    const url = `https://apps.cbe.com.et:100/?id=${id}`;
    
    console.log(`Processing receipt with ID: ${id}`);
    console.log(`Fetching from URL: ${url}`);
    
    // Download and process the PDF in memory
    const pdfBuffer = await downloadPDF(url);
    
    // Extract data from the PDF buffer
    const extractionResult = await extractDataFromPDFBuffer(pdfBuffer);
    
    if (extractionResult.success) {
      // Return only the extracted data
      return res.status(200).json({
        success: true,
        data: extractionResult.data
      });
    } else {
      return res.status(500).json({
        success: false,
        error: extractionResult.error
      });
    }
  } catch (error) {
    console.error(`Error processing receipt: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Download PDF directly to memory buffer
 * @param {string} url - The URL to download from
 * @returns {Promise<Buffer>} - The PDF buffer
 */
async function downloadPDF(url) {
  return new Promise((resolve, reject) => {
    // Create HTTPS request with options to ignore SSL errors
    const request = https.get(url, {
      rejectUnauthorized: false, // Ignore SSL certificate errors
      timeout: 30000 // 30 second timeout
    }, (response) => {
      // Check if the response is successful
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: HTTP status code ${response.statusCode}`));
        return;
      }
      
      // Get content type from headers
      const contentType = response.headers['content-type'];
      console.log(`Content-Type: ${contentType}`);
      
      // Check if content type is PDF
      if (!contentType.includes('application/pdf')) {
        reject(new Error(`Unexpected content type: ${contentType}`));
        return;
      }
      
      // Collect data chunks
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      
      // Combine chunks when download completes
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`Downloaded PDF: ${buffer.length} bytes`);
        
        // Verify it's a PDF by checking signature
        if (buffer.slice(0, 5).toString() === '%PDF-') {
          resolve(buffer);
        } else {
          reject(new Error('Downloaded file is not a valid PDF'));
        }
      });
    });
    
    // Handle request errors
    request.on('error', (err) => {
      reject(new Error(`Request error: ${err.message}`));
    });
    
    // Handle timeout
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timed out'));
    });
    
    // End the request
    request.end();
  });
}

/**
 * Extract data from PDF buffer
 * @param {Buffer} pdfBuffer - The PDF buffer
 * @returns {Promise<Object>} - The extraction result
 */
async function extractDataFromPDFBuffer(pdfBuffer) {
  try {
    console.log('Extracting data from PDF buffer...');
    const data = await pdfParse(pdfBuffer);
    
    // Extract the text content
    const text = data.text;
    
    // Define regex patterns for extracting the required information
    const payerPattern = /Payer([^\n]+)/;
    const amountPattern = /Transferred Amount([\d,.]+)\s*ETB/;
    const transactionPattern = /Reference No\.\s*\(VAT Invoice No\)([^\n]+)/;
    
    // Extract the information using regex
    const payerMatch = text.match(payerPattern);
    const amountMatch = text.match(amountPattern);
    const transactionMatch = text.match(transactionPattern);
    
    // Get the extracted values
    const payerName = payerMatch ? payerMatch[1].trim() : null;
    const amount = amountMatch ? amountMatch[1].trim() : null;
    const transactionNumber = transactionMatch ? transactionMatch[1].trim() : null;
    
    return {
      success: true,
      data: {
        payerName,
        amount,
        transactionNumber
      }
    };
  } catch (error) {
    console.error(`Error extracting data from PDF: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}