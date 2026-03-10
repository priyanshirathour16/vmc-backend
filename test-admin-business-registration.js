/**
 * Test ADMIN BUSINESS REGISTRATION API
 * These tests demonstrate all the endpoints created for admin business registration
 * 
 * Prerequisites:
 * 1. Backend server running on http://localhost:5000
 * 2. Admin user with valid JWT token
 * 3. Supabase database with migrations applied
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/admin/businesses';

// Mock admin token (replace with actual token from login)
let ADMIN_TOKEN = '';

// Set token before running tests
export const setAdminToken = (token) => {
  ADMIN_TOKEN = token;
};

// Helper to make authenticated requests
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (ADMIN_TOKEN) {
    config.headers.Authorization = `Bearer ${ADMIN_TOKEN}`;
  }
  return config;
});

/**
 * Test 1: List all businesses with filters
 */
export const testListBusinesses = async () => {
  try {
    console.log('\n=== TEST 1: List All Businesses with Filters ===');
    
    const response = await api.get('/', {
      params: {
        created_by_type: 'admin',
        sort_by: 'created_at',
        sort_order: 'desc',
        page: 1,
        perpage: 10,
        is_verified: 'true',
        is_published: 'true',
      },
    });

    console.log('✅ Successfully fetched businesses');
    console.log(`Total businesses: ${response.data.pagination.total}`);
    console.log(`Found ${response.data.data.length} results on page ${response.data.pagination.page}`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to list businesses:', error.response?.data || error.message);
  }
};

/**
 * Test 2: Create a new business (Admin registration)
 */
export const testCreateBusiness = async () => {
  try {
    console.log('\n=== TEST 2: Create New Business (Admin) ===');
    
    const businessData = {
      business_name: 'Tech Innovations Ltd',
      business_category: '550e8400-e29b-41d4-a716-446655440000', // Replace with real UUID
      website_url: 'https://techinnovations.com',
      street_address: '123 Tech Street, Innovation Park',
      city: 'San Francisco',
      state_province: 'California',
      postal_code: '94102',
      country: 'United States',
      phone_number: '+1 (415) 555-0123',
      email_business: 'contact@techinnovations.com',
      business_description: 'Leading technology solutions provider',
    };

    const response = await api.post('/', businessData);

    console.log('✅ Business created successfully');
    console.log('Business ID:', response.data.data.id);
    console.log('Status:', response.data.data.verification_status);
    console.log('Published:', response.data.data.is_published);
    console.log('Created By:', response.data.data.created_by_type);
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to create business:', error.response?.data || error.message);
  }
};

/**
 * Test 3: Get single business by ID
 */
export const testGetBusiness = async (businessId) => {
  try {
    console.log(`\n=== TEST 3: Get Business by ID (${businessId}) ===`);
    
    const response = await api.get(`/${businessId}`);

    console.log('✅ Business retrieved successfully');
    console.log('Business Name:', response.data.data.business_name);
    console.log('Verification Status:', response.data.data.verification_status);
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to get business:', error.response?.data?.message || error.message);
  }
};

/**
 * Test 4: Update business
 */
export const testUpdateBusiness = async (businessId) => {
  try {
    console.log(`\n=== TEST 4: Update Business (${businessId}) ===`);
    
    const updateData = {
      business_description: 'Updated description with more details',
      phone_number: '+1 (415) 555-9999',
    };

    const response = await api.put(`/${businessId}`, updateData);

    console.log('✅ Business updated successfully');
    console.log('Phone Number:', response.data.data.phone_number);
    console.log('Description:', response.data.data.business_description);
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to update business:', error.response?.data || error.message);
  }
};

/**
 * Test 5: Publish/Unpublish business
 */
export const testPublishBusiness = async (businessId, isPublished = true) => {
  try {
    console.log(`\n=== TEST 5: ${isPublished ? 'Publish' : 'Unpublish'} Business (${businessId}) ===`);
    
    const response = await api.patch(`/${businessId}/publish`, {
      is_published: isPublished,
    });

    console.log(`✅ Business ${isPublished ? 'published' : 'unpublished'} successfully`);
    console.log('Is Published:', response.data.data.is_published);
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to publish business:', error.response?.data || error.message);
  }
};

/**
 * Test 6: Verify/Reject business
 */
export const testVerifyBusiness = async (businessId, status = 'verified') => {
  try {
    console.log(`\n=== TEST 6: Verify Business (${businessId}) ===`);
    
    const response = await api.patch(`/${businessId}/verify`, {
      verification_status: status, // 'verified', 'pending', or 'rejected'
    });

    console.log(`✅ Business verified (${status}) successfully`);
    console.log('Verification Status:', response.data.data.verification_status);
    console.log('Is Verified:', response.data.data.is_verified);
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to verify business:', error.response?.data || error.message);
  }
};

/**
 * Test 7: Get business audit log
 */
export const testGetAuditLog = async (businessId) => {
  try {
    console.log(`\n=== TEST 7: Get Audit Log for Business (${businessId}) ===`);
    
    const response = await api.get(`/${businessId}/audit-log`, {
      params: { limit: 20 },
    });

    console.log('✅ Audit log retrieved successfully');
    console.log(`Found ${response.data.count} log entries`);
    response.data.data.forEach((log) => {
      console.log(`- [${log.action_type}] at ${log.created_at}`);
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to get audit log:', error.response?.data || error.message);
  }
};

/**
 * Test 8: Delete (unpublish) business
 */
export const testDeleteBusiness = async (businessId) => {
  try {
    console.log(`\n=== TEST 8: Delete Business (${businessId}) ===`);
    
    const response = await api.delete(`/${businessId}`);

    console.log('✅ Business deleted (unpublished) successfully');
    console.log('Message:', response.data.message);
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to delete business:', error.response?.data || error.message);
  }
};

/**
 * Run all tests in sequence
 */
export const runAllTests = async (adminToken) => {
  setAdminToken(adminToken);
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   ADMIN BUSINESS REGISTRATION API - FULL TEST SUITE    ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Test 1: List businesses
  const listResult = await testListBusinesses();
  
  // Test 2: Create a business
  const createdBusiness = await testCreateBusiness();
  if (!createdBusiness) return;
  
  const businessId = createdBusiness.id;
  
  // Test 3: Get single business
  await testGetBusiness(businessId);
  
  // Test 4: Update business
  await testUpdateBusiness(businessId);
  
  // Test 5: Publish/Unpublish
  await testPublishBusiness(businessId, true);
  await testPublishBusiness(businessId, false);
  
  // Test 6: Verify business
  await testVerifyBusiness(businessId, 'verified');
  
  // Test 7: Audit log
  await testGetAuditLog(businessId);
  
  // Test 8: Delete (unpublish)
  // await testDeleteBusiness(businessId);

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║              TEST SUITE COMPLETED                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
};

export default {
  setAdminToken,
  testListBusinesses,
  testCreateBusiness,
  testGetBusiness,
  testUpdateBusiness,
  testPublishBusiness,
  testVerifyBusiness,
  testGetAuditLog,
  testDeleteBusiness,
  runAllTests,
};
