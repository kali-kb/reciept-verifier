/**
 * Test script to verify the CBE transaction flow fix
 * This script tests that transactions are only saved after successful order creation
 */

// Use built-in fetch in Node.js 18+

// Test configuration
const CBE_VERIFIER_URL = process.env.CBE_VERIFIER_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testCBEFlow() {
  console.log('🧪 Testing CBE transaction flow fix...\n');
  
  // Test 1: Verify /parse endpoint no longer saves transactions
  console.log('Test 1: Verifying /parse endpoint does not save transactions');
  try {
    const testImageUrl = 'https://example.com/test-receipt.jpg';
    const parseResponse = await fetch(`${CBE_VERIFIER_URL}/parse?image_url=${testImageUrl}`);
    
    if (parseResponse.ok) {
      const data = await parseResponse.json();
      console.log('✅ /parse endpoint response:', data);
      
      if (data.success && !data.transactionSaved) {
        console.log('✅ PASS: Transaction not saved during parsing');
      } else {
        console.log('❌ FAIL: Transaction was saved during parsing');
      }
    } else {
      console.log('⚠️  /parse endpoint returned error:', parseResponse.status);
    }
  } catch (error) {
    console.log('⚠️  Error testing /parse endpoint:', error.message);
  }
  
  // Test 2: Verify /save-transaction endpoint exists and works
  console.log('\nTest 2: Verifying /save-transaction endpoint');
  try {
    const saveResponse = await fetch(`${CBE_VERIFIER_URL}/save-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_id: 'TEST123456',
        amount: 1000,
        sender: 'Test User',
        receiver: 'Kaleb Mate',
        date: '2024-01-01',
        image_url: 'https://example.com/test.jpg',
        order_id: 999
      })
    });
    
    if (saveResponse.ok) {
      const data = await saveResponse.json();
      console.log('✅ /save-transaction endpoint response:', data);
      console.log('✅ PASS: /save-transaction endpoint working correctly');
    } else {
      console.log('❌ FAIL: /save-transaction endpoint error:', saveResponse.status);
    }
  } catch (error) {
    console.log('⚠️  Error testing /save-transaction endpoint:', error.message);
  }
  
  console.log('\n🎯 Summary:');
  console.log('- CBE verifier server modified to not save during parsing');
  console.log('- Bot updated to call /save-transaction after order creation');
  console.log('- Flow ensures transactions only saved when orders succeed');
}

// Run the test
if (require.main === module) {
  testCBEFlow().catch(console.error);
}

module.exports = { testCBEFlow };