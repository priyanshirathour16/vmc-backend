/**
 * Test Business Dashboard Backend
 * Tests: /api/business/me and /api/business/reviews endpoints
 */

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

let authToken = '';

const log = {
  info: (msg) => console.log(`\n✅ ${msg}`),
  error: (msg) => console.error(`\n❌ ${msg}`),
  section: (msg) => console.log(`\n${'='.repeat(60)}\n📍 ${msg}\n${'='.repeat(60)}`),
  response: (data) => console.log(JSON.stringify(data, null, 2)),
};

/**
 * Step 1: Login as a business owner
 */
const loginAsBusiness = async () => {
  log.section('Step 1: Login as Business Owner');
  
  try {
    const response = await api.post('/auth/login', {
      email: 'business@example.com',
      password: 'password123'
    });

    if (response.data.data?.accessToken) {
      authToken = response.data.data.accessToken;
      log.info(`Logged in successfully`);
      log.info(`Token: ${authToken.substring(0, 20)}...`);
      log.info(`User Role: ${response.data.data.user?.role}`);
      return true;
    } else {
      log.error('No token in response');
      return false;
    }
  } catch (error) {
    log.error(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

/**
 * Step 2: Test /api/business/me endpoint
 */
const testDashboard = async () => {
  log.section('Step 2: Test /api/business/me (Dashboard)');
  
  try {
    const response = await api.get('/business/me', {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    if (response.data.status === 'success') {
      const data = response.data.data;
      
      log.info('Dashboard data retrieved successfully');
      
      // Log business info
      log.info(`Business: ${data.business?.business_name}`);
      log.info(`Location: ${data.business?.city}, ${data.business?.country}`);
      log.info(`Status: ${data.business?.status}`);
      
      // Log stats
      log.info(`Total Reviews: ${data.stats?.totalReviews}`);
      log.info(`Approved Reviews: ${data.stats?.approvedReviews}`);
      log.info(`Pending Reviews: ${data.stats?.pendingReviews}`);
      log.info(`Average Rating: ${data.stats?.avgRating}⭐`);
      log.info(`Response Rate: ${data.stats?.responseRate}%`);
      
      // Log rating distribution
      log.info(`Rating Distribution:`);
      Object.entries(data.stats?.ratingDistribution || {})
        .sort((a, b) => b[0] - a[0])
        .forEach(([rating, count]) => {
          log.info(`  ${rating}★: ${count} reviews`);
        });
      
      // Log recent reviews
      log.info(`Recent Reviews: ${data.recentReviews?.length || 0}`);
      (data.recentReviews || []).slice(0, 3).forEach((review, idx) => {
        log.info(`  ${idx + 1}. "${review.title}" by ${review.reviewer_name} (${review.rating}★)`);
      });

      return true;
    } else {
      log.error(response.data.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    log.error(`Dashboard request failed: ${error.response?.data?.message || error.message}`);
    if (error.response?.status === 404) {
      log.error('Business profile not found - ensure you have a business account');
    }
    return false;
  }
};

/**
 * Step 3: Test /api/business/reviews endpoint with filters
 */
const testReviews = async () => {
  log.section('Step 3: Test /api/business/reviews (My Reviews)');
  
  try {
    // Test 1: Get all reviews
    log.info('Fetching all reviews...');
    const response1 = await api.get('/business/reviews', {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      params: {
        limit: 10,
        offset: 0
      }
    });

    if (response1.data.status === 'success') {
      const data = response1.data.data;
      
      log.info(`Total Reviews Found: ${data.pagination?.total}`);
      log.info(`Current Page: ${Math.floor(data.pagination?.offset / data.pagination?.limit) + 1} of ${data.pagination?.pages}`);
      log.info(`Reviews on this page: ${data.reviews?.length}`);

      if (data.reviews?.length > 0) {
        log.info('Sample reviews:');
        data.reviews.slice(0, 3).forEach((review, idx) => {
          log.info(`  ${idx + 1}. "${review.title}" by ${review.reviewer_name}`);
          log.info(`     Rating: ${review.rating}★ | Helpful: ${review.helpful_count} | Status: ${review.is_approved ? 'Approved' : 'Pending'}`);
        });
      }
    } else {
      log.error(response1.data.message || 'Unknown error');
      return false;
    }

    // Test 2: Filter by approved status
    log.info('\nFiltering: Approved reviews only...');
    const response2 = await api.get('/business/reviews', {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      params: {
        status: 'approved',
        limit: 10
      }
    });

    if (response2.data.status === 'success') {
      log.info(`Approved Reviews: ${response2.data.data.pagination?.total}`);
    }

    // Test 3: Filter by rating
    log.info('\nFiltering: 5-star reviews only...');
    const response3 = await api.get('/business/reviews', {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      params: {
        rating: 5,
        limit: 10
      }
    });

    if (response3.data.status === 'success') {
      log.info(`5-star Reviews: ${response3.data.data.pagination?.total}`);
    }

    // Test 4: Sort by rating (highest first)
    log.info('\nSorting: By rating (highest first)...');
    const response4 = await api.get('/business/reviews', {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      params: {
        sort_by: 'rating',
        sort_order: 'desc',
        limit: 5
      }
    });

    if (response4.data.status === 'success') {
      log.info(`Top rated reviews:`);
      response4.data.data.reviews.forEach((review, idx) => {
        log.info(`  ${idx + 1}. ${review.rating}★ - ${review.reviewer_name}`);
      });
    }

    return true;
  } catch (error) {
    log.error(`Reviews request failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

/**
 * Step 4: Test /api/business/stats endpoint
 */
const testStats = async () => {
  log.section('Step 4: Test /api/business/stats (Stats snapshot)');
  
  try {
    const response = await api.get('/business/stats', {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    if (response.data.status === 'success') {
      const stats = response.data.data;
      
      log.info('Stats snapshot retrieved successfully');
      log.info(`Total Reviews: ${stats.totalReviews}`);
      log.info(`Average Rating: ${stats.avgRating}⭐`);
      log.info(`Approved: ${stats.approvedReviews} | Pending: ${stats.pendingReviews}`);
      log.info(`Response Rate: ${stats.responseRate}%`);

      return true;
    } else {
      log.error(response.data.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    log.error(`Stats request failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
};

/**
 * Main test runner
 */
const runTests = async () => {
  console.log('\n🚀 BUSINESS DASHBOARD BACKEND TESTS\n');

  try {
    const step1 = await loginAsBusiness();
    if (!step1) {
      log.error('\nLogin failed. Stopping tests.');
      process.exit(1);
    }

    const step2 = await testDashboard();
    const step3 = await testReviews();
    const step4 = await testStats();

    log.section('TEST SUMMARY');
    
    if (step2 && step3 && step4) {
      log.info('✅ All tests passed!');
      console.log('\n✅ Backend is ready for frontend integration!\n');
      process.exit(0);
    } else {
      log.error('⚠️ Some tests failed. Check errors above.');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Test suite error: ${error.message}`);
    process.exit(1);
  }
};

// Run tests
runTests();
