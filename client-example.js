const axios = require('axios');

/**
 * Example client that demonstrates how to use the receipt scraper API
 * This is a lightweight approach that only fetches the extracted data
 * without downloading the entire PDF
 */
async function fetchReceiptData(receiptId) {
  try {
    console.log(`Fetching receipt data for ID: ${receiptId}`);
    
    // In production, replace with your actual deployed Vercel URL
    const apiUrl = `http://localhost:3000/api/scrape-receipt?id=${receiptId}`;
    
    console.log(`Making API request to: ${apiUrl}`);
    const response = await axios.get(apiUrl);
    
    if (response.data.success) {
      console.log('\n✅ Receipt data fetched successfully:');
      console.log('Payer Name:', response.data.data.payerName);
      console.log('Amount:', response.data.data.amount, 'ETB');
      console.log('Transaction Number:', response.data.data.transactionNumber);
      
      return response.data.data;
    } else {
      console.error('\n❌ Error fetching receipt data:', response.data.error);
      return null;
    }
  } catch (error) {
    console.error('\n❌ Error making API request:', error.message);
    return null;
  }
}

// Example usage
const receiptId = 'FT25186CS2K308680658';
fetchReceiptData(receiptId).then(data => {
  if (data) {
    console.log('\nReceipt data can now be used in your application');
    console.log('Example: Display confirmation to user');
    console.log(`Payment of ${data.amount} ETB from ${data.payerName} confirmed.`);
    console.log(`Transaction #${data.transactionNumber}`);
  }
});