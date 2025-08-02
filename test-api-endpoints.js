#!/usr/bin/env node

/**
 * Comprehensive API Endpoint Testing Script
 * Tests all frontend-backend integration points
 */

const axios = require('axios');
const chalk = require('chalk');

const API_BASE_URL = 'http://localhost:3001/api';
const TEST_USER_ID = 'retailer-123';
const TEST_WHOLESALER_ID = 'wholesaler-123';

// Test configuration
const config = {
  timeout: 5000,
  retries: 2
};

class APITester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      errors: []
    };
  }

  async testEndpoint(name, method, url, data = null, expectedStatus = 200) {
    this.results.total++;
    
    try {
      console.log(chalk.blue(`Testing: ${name}`));
      console.log(chalk.gray(`  ${method.toUpperCase()} ${url}`));
      
      const response = await axios({
        method,
        url: `${API_BASE_URL}${url}`,
        data,
        timeout: config.timeout,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      if (response.status === expectedStatus) {
        console.log(chalk.green(`  ✅ PASS (${response.status})`));
        this.results.passed++;
        return response;
      } else {
        console.log(chalk.yellow(`  ⚠️  PARTIAL (Expected ${expectedStatus}, got ${response.status})`));
        this.results.failed++;
        this.results.errors.push({
          name,
          expected: expectedStatus,
          actual: response.status,
          url
        });
        return response;
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ FAIL (${error.message})`));
      this.results.failed++;
      this.results.errors.push({
        name,
        error: error.message,
        url
      });
      return null;
    }
  }

  async runTests() {
    console.log(chalk.bold.blue('\n🚀 Starting Wholetail API Integration Tests\n'));

    // Health check
    await this.testEndpoint('Health Check', 'GET', '/health');

    // Authentication endpoints
    console.log(chalk.bold.yellow('\n📋 Authentication & User Management'));
    await this.testEndpoint('Get Current User', 'GET', '/auth/me', null, 401); // Should require auth
    await this.testEndpoint('Get User Profile', 'GET', `/users/profile/${TEST_USER_ID}`);
    await this.testEndpoint('Get Business Stats', 'GET', `/users/business-stats/${TEST_USER_ID}`);
    await this.testEndpoint('Get User Achievements', 'GET', `/users/achievements/${TEST_USER_ID}`);

    // Analytics endpoints
    console.log(chalk.bold.yellow('\n📊 Analytics & Business Intelligence'));
    await this.testEndpoint('Business Intelligence', 'GET', `/analytics/business-intelligence/${TEST_USER_ID}`);
    await this.testEndpoint('KPI Analytics', 'GET', `/analytics/kpi/${TEST_USER_ID}`);
    await this.testEndpoint('Savings Analytics', 'GET', `/analytics/savings/${TEST_USER_ID}`);
    await this.testEndpoint('Seasonal Trends', 'GET', `/analytics/seasonal-trends/${TEST_USER_ID}`);

    // Recommendations endpoints
    console.log(chalk.bold.yellow('\n🤖 AI Recommendations'));
    await this.testEndpoint('Smart Recommendations', 'GET', `/recommendations/smart/${TEST_USER_ID}`);
    await this.testEndpoint('Inventory Recommendations', 'GET', `/recommendations/inventory/${TEST_USER_ID}`);
    await this.testEndpoint('Pricing Recommendations', 'GET', `/recommendations/pricing/${TEST_USER_ID}`);

    // Inventory endpoints
    console.log(chalk.bold.yellow('\n📦 Inventory Management'));
    await this.testEndpoint('Inventory Analytics', 'GET', `/inventory/analytics/${TEST_USER_ID}`);
    await this.testEndpoint('Reorder Suggestions', 'GET', `/inventory/reorder-suggestions/${TEST_USER_ID}`);
    await this.testEndpoint('Low Stock Alerts', 'GET', `/inventory/low-stock/${TEST_USER_ID}`);
    await this.testEndpoint('Inventory Trends', 'GET', `/inventory/trends/${TEST_USER_ID}`);

    // Product endpoints
    console.log(chalk.bold.yellow('\n🛍️ Product Catalog'));
    await this.testEndpoint('Product Listings', 'GET', '/products');
    await this.testEndpoint('Product Categories', 'GET', '/products/categories');
    await this.testEndpoint('Single Product', 'GET', '/products/1');
    await this.testEndpoint('Products with Search', 'GET', '/products?search=rice');
    await this.testEndpoint('Products by Category', 'GET', '/products?category=Grains');

    // Order endpoints
    console.log(chalk.bold.yellow('\n📋 Order Management'));
    await this.testEndpoint('User Orders', 'GET', `/orders/user/${TEST_USER_ID}`);
    await this.testEndpoint('All Orders', 'GET', '/orders');

    // Financing endpoints
    console.log(chalk.bold.yellow('\n💰 Financing System'));
    await this.testEndpoint('Retailer Loans', 'GET', `/financing/retailer-loans/${TEST_USER_ID}`);
    await this.testEndpoint('Loan Eligibility', 'GET', `/financing/eligibility/${TEST_USER_ID}`);
    await this.testEndpoint('Credit Profile', 'GET', `/financing/credit-profile/${TEST_USER_ID}`);

    // Confidence scoring endpoints
    console.log(chalk.bold.yellow('\n⭐ Confidence Scoring'));
    await this.testEndpoint('Retailer Confidence Score', 'GET', `/confidence/retailer/${TEST_USER_ID}`);
    await this.testEndpoint('Confidence Score Details', 'GET', `/confidence/score/${TEST_USER_ID}`);
    await this.testEndpoint('Score History', 'GET', `/confidence/history/${TEST_USER_ID}`);

    // Advertising endpoints
    console.log(chalk.bold.yellow('\n📢 Advertising Platform'));
    await this.testEndpoint('Featured Products', 'GET', '/advertising/featured-products');
    await this.testEndpoint('Advertising Campaigns', 'GET', `/advertising/campaigns/${TEST_WHOLESALER_ID}`);
    await this.testEndpoint('Advertising Analytics', 'GET', `/advertising/analytics/${TEST_WHOLESALER_ID}`);

    // Test POST endpoints with sample data
    console.log(chalk.bold.yellow('\n✏️ POST Endpoint Tests'));
    
    // Test ad interaction recording
    await this.testEndpoint('Record Ad Interaction', 'POST', '/advertising/interactions', {
      campaign_id: 'camp-1',
      interaction_type: 'click',
      retailer_id: TEST_USER_ID
    });

    // Test recommendation execution
    await this.testEndpoint('Execute Recommendation', 'POST', '/recommendations/rec-1/action', {
      action_type: 'apply_pricing',
      parameters: { price_adjustment: 5 }
    });

    this.printResults();
  }

  printResults() {
    console.log(chalk.bold.blue('\n📊 Test Results Summary\n'));
    
    const passRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
    
    console.log(`Total Tests: ${this.results.total}`);
    console.log(chalk.green(`Passed: ${this.results.passed}`));
    console.log(chalk.red(`Failed: ${this.results.failed}`));
    console.log(`Pass Rate: ${passRate}%`);

    if (this.results.errors.length > 0) {
      console.log(chalk.bold.red('\n❌ Failed Tests:'));
      this.results.errors.forEach((error, index) => {
        console.log(chalk.red(`${index + 1}. ${error.name}`));
        if (error.expected && error.actual) {
          console.log(chalk.gray(`   Expected: ${error.expected}, Got: ${error.actual}`));
        }
        if (error.error) {
          console.log(chalk.gray(`   Error: ${error.error}`));
        }
        console.log(chalk.gray(`   URL: ${error.url}`));
      });
    }

    if (passRate >= 90) {
      console.log(chalk.bold.green('\n🎉 EXCELLENT! Platform integration is working great!'));
    } else if (passRate >= 80) {
      console.log(chalk.bold.yellow('\n⚠️  GOOD! Minor issues detected, but platform is mostly functional.'));
    } else {
      console.log(chalk.bold.red('\n🚨 NEEDS ATTENTION! Several endpoints are not responding correctly.'));
    }

    console.log(chalk.bold.blue('\n🔧 Next Steps:'));
    console.log('1. Start the backend server: npm run start:backend');
    console.log('2. Start the frontend: npm run start:frontend');
    console.log('3. Open http://localhost:3000 to test the full platform');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new APITester();
  tester.runTests().catch(error => {
    console.error(chalk.red('Test runner error:', error));
    process.exit(1);
  });
}

module.exports = APITester;