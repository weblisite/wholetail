const axios = require('axios');

// Test configuration
const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, success, details = '') {
  testResults.total++;
  if (success) {
    testResults.passed++;
    log(`✅ ${testName}`, 'green');
    if (details) log(`   ${details}`, 'blue');
  } else {
    testResults.failed++;
    log(`❌ ${testName}`, 'red');
    if (details) log(`   ${details}`, 'red');
  }
}

// Test individual API endpoint
async function testAPI(endpoint, method = 'GET', data = null, expectedStatus = 200) {
  try {
    const config = {
      method,
      url: `${BACKEND_URL}${endpoint}`,
      timeout: 10000
    };
    
    if (data) {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    return {
      success: response.status === expectedStatus,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.message
    };
  }
}

// 1. Test Backend Health
async function testBackendHealth() {
  log('\n🔍 Testing Backend Health...', 'bold');
  
  const result = await testAPI('/api/health');
  logTest(
    'Backend Health Check',
    result.success,
    result.success ? `Status: ${result.data.status}` : `Error: ${result.error}`
  );
  
  return result.success;
}

// 2. Test Authentication APIs
async function testAuthentication() {
  log('\n🔐 Testing Authentication APIs...', 'bold');
  
  // Test login endpoint
  const loginResult = await testAPI('/api/auth/login', 'POST', {
    email: 'test@wholetail.com',
    password: 'testpassword'
  });
  
  logTest(
    'Login API',
    loginResult.success || loginResult.status === 401,
    loginResult.success ? 'Login successful' : 'Login endpoint accessible'
  );
  
  // Test register endpoint
  const registerResult = await testAPI('/api/auth/register', 'POST', {
    email: 'test@wholetail.com',
    password: 'testpassword',
    name: 'Test User',
    user_type: 'retailer'
  });
  
  logTest(
    'Register API',
    registerResult.success || registerResult.status === 400,
    registerResult.success ? 'Register successful' : 'Register endpoint accessible'
  );
}

// 3. Test Product APIs
async function testProducts() {
  log('\n📦 Testing Product APIs...', 'bold');
  
  // Test get products
  const productsResult = await testAPI('/api/products');
  logTest(
    'Get Products',
    productsResult.success,
    productsResult.success ? `Found ${productsResult.data.length} products` : `Error: ${productsResult.error}`
  );
  
  // Test get categories
  const categoriesResult = await testAPI('/api/products/categories');
  logTest(
    'Get Categories',
    categoriesResult.success,
    categoriesResult.success ? `Found ${categoriesResult.data.length} categories` : `Error: ${categoriesResult.error}`
  );
  
  return productsResult.success && categoriesResult.success;
}

// 4. Test Order APIs
async function testOrders() {
  log('\n🛒 Testing Order APIs...', 'bold');
  
  // Test get orders
  const ordersResult = await testAPI('/api/orders');
  logTest(
    'Get Orders',
    ordersResult.success,
    ordersResult.success ? `Found ${ordersResult.data.orders?.length || 0} orders` : `Error: ${ordersResult.error}`
  );
  
  // Test create order
  const createOrderResult = await testAPI('/api/orders', 'POST', {
    retailer_id: 'test-retailer',
    items: [
      { product_id: 'test-product', quantity: 2, price: 100 }
    ],
    delivery_address: 'Test Address, Nairobi'
  });
  
  logTest(
    'Create Order',
    createOrderResult.success,
    createOrderResult.success ? `Order created: ${createOrderResult.data.order?.id}` : `Error: ${createOrderResult.error}`
  );
  
  return ordersResult.success;
}

// 5. Test Payment APIs
async function testPayments() {
  log('\n💳 Testing Payment APIs...', 'bold');
  
  // Test payment initiation
  const paymentResult = await testAPI('/api/payments/initiate', 'POST', {
    amount: 1000,
    phone_number: '+254712345678',
    order_id: 'test-order-001'
  });
  
  logTest(
    'Payment Initiation',
    paymentResult.success,
    paymentResult.success ? `Payment ID: ${paymentResult.data.payment_id}` : `Error: ${paymentResult.error}`
  );
  
  // Test payment analytics
  const analyticsResult = await testAPI('/api/payments/analytics');
  logTest(
    'Payment Analytics',
    analyticsResult.success,
    analyticsResult.success ? `Total volume: KSh ${analyticsResult.data.analytics.daily_stats.total_volume}` : `Error: ${analyticsResult.error}`
  );
  
  // Test payment history
  const historyResult = await testAPI('/api/payments/history');
  logTest(
    'Payment History',
    historyResult.success,
    historyResult.success ? `Found ${historyResult.data.payments.length} payments` : `Error: ${historyResult.error}`
  );
  
  return paymentResult.success && analyticsResult.success;
}

// 6. Test Location APIs
async function testLocation() {
  log('\n🗺️ Testing Location APIs...', 'bold');
  
  // Test geocoding
  const geocodeResult = await testAPI('/api/location/geocode', 'POST', {
    address: 'Nakuru, Kenya'
  });
  
  logTest(
    'Geocoding Service',
    geocodeResult.success,
    geocodeResult.success ? `Coordinates: ${geocodeResult.data.lat}, ${geocodeResult.data.lng}` : `Error: ${geocodeResult.error}`
  );
  
  // Test distance calculation
  const distanceResult = await testAPI('/api/location/distance', 'POST', {
    origin: 'Nakuru, Kenya',
    destination: 'Nairobi, Kenya'
  });
  
  logTest(
    'Distance Calculation',
    distanceResult.success,
    distanceResult.success ? `Distance: ${distanceResult.data.distance_km} km` : `Error: ${distanceResult.error}`
  );
  
  return geocodeResult.success && distanceResult.success;
}

// 7. Test Logistics APIs
async function testLogistics() {
  log('\n🚚 Testing Logistics APIs...', 'bold');
  
  // Test fleet management
  const fleetResult = await testAPI('/api/logistics/fleet');
  logTest(
    'Fleet Management',
    fleetResult.success,
    fleetResult.success ? `Found ${fleetResult.data.vehicles.length} vehicles` : `Error: ${fleetResult.error}`
  );
  
  // Test performance metrics
  const metricsResult = await testAPI('/api/logistics/performance');
  logTest(
    'Performance Metrics',
    metricsResult.success,
    metricsResult.success ? `Deliveries today: ${metricsResult.data.daily_stats.total_deliveries}` : `Error: ${metricsResult.error}`
  );
  
  return fleetResult.success && metricsResult.success;
}

// 8. Test Notification APIs
async function testNotifications() {
  log('\n📱 Testing Notification APIs...', 'bold');
  
  // Test SMS notification
  const smsResult = await testAPI('/api/notifications/test/sms', 'POST', {
    phone_number: '+254712345678',
    message: 'Test SMS from system test'
  });
  
  logTest(
    'SMS Notification',
    smsResult.success,
    smsResult.success ? `SMS sent successfully` : `Error: ${smsResult.error}`
  );
  
  // Test email notification
  const emailResult = await testAPI('/api/notifications/test/email', 'POST', {
    email: 'test@example.com',
    subject: 'Test Email',
    message: 'Test email from system test'
  });
  
  logTest(
    'Email Notification',
    emailResult.success,
    emailResult.success ? `Email sent successfully` : `Error: ${emailResult.error}`
  );
  
  // Test notification history
  const historyResult = await testAPI('/api/notifications/history');
  logTest(
    'Notification History',
    historyResult.success,
    historyResult.success ? `Found ${historyResult.data.notifications.length} notifications` : `Error: ${historyResult.error}`
  );
  
  return smsResult.success && emailResult.success;
}

// 9. Test Confidence Score APIs
async function testConfidenceScore() {
  log('\n🎯 Testing Confidence Score APIs...', 'bold');
  
  // Test confidence scores
  const scoresResult = await testAPI('/api/confidence/scores');
  logTest(
    'Confidence Scores',
    scoresResult.success,
    scoresResult.success ? `Found ${scoresResult.data.confidence_scores.length} retailer scores` : `Error: ${scoresResult.error}`
  );
  
  // Test analytics
  const analyticsResult = await testAPI('/api/confidence/analytics');
  logTest(
    'Confidence Analytics',
    analyticsResult.success,
    analyticsResult.success ? `Average score: ${analyticsResult.data.analytics.average_score}` : `Error: ${analyticsResult.error}`
  );
  
  // Test loan recommendations
  const loansResult = await testAPI('/api/confidence/loan-recommendations');
  logTest(
    'Loan Recommendations',
    loansResult.success,
    loansResult.success ? `Found ${loansResult.data.loan_recommendations.length} eligible retailers` : `Error: ${loansResult.error}`
  );
  
  // Test score simulation
  const simulationResult = await testAPI('/api/confidence/simulate', 'POST', {
    name: 'Test Business',
    business_age_months: 18,
    total_orders: 75,
    total_revenue: 200000,
    payment_success_rate: 0.92,
    return_rate: 0.06
  });
  
  logTest(
    'Score Simulation',
    simulationResult.success,
    simulationResult.success ? `Simulated score: ${simulationResult.data.simulation_result.confidence_score}` : `Error: ${simulationResult.error}`
  );
  
  return scoresResult.success && analyticsResult.success;
}

// 10. Test Frontend Accessibility
async function testFrontend() {
  log('\n🌐 Testing Frontend Accessibility...', 'bold');
  
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    logTest(
      'Frontend Accessibility',
      response.status === 200,
      response.status === 200 ? 'Frontend is accessible' : `Status: ${response.status}`
    );
    return response.status === 200;
  } catch (error) {
    logTest(
      'Frontend Accessibility',
      false,
      `Error: ${error.message}`
    );
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Wholetail Complete System Test...', 'bold');
  log('================================================', 'blue');
  
  const startTime = Date.now();
  
  // Run all tests
  const backendHealthy = await testBackendHealth();
  
  if (!backendHealthy) {
    log('\n❌ Backend is not healthy. Stopping tests.', 'red');
    return;
  }
  
  await testAuthentication();
  await testProducts();
  await testOrders();
  await testPayments();
  await testLocation();
  await testLogistics();
  await testNotifications();
  await testConfidenceScore();
  await testFrontend();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print summary
  log('\n================================================', 'blue');
  log('📊 Test Summary:', 'bold');
  log(`Total Tests: ${testResults.total}`, 'blue');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 'blue');
  log(`Duration: ${duration} seconds`, 'blue');
  
  if (testResults.failed === 0) {
    log('\n🎉 All tests passed! System is ready for deployment.', 'green');
  } else {
    log(`\n⚠️  ${testResults.failed} test(s) failed. Please review and fix issues before deployment.`, 'yellow');
  }
  
  log('================================================', 'blue');
}

// Handle command line execution
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n💥 Test runner error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runAllTests, testAPI }; 