import axios from 'axios';

(async () => {
  try {
    console.log('🔐 Step 1: Admin login to get valid token...\n');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@vmcreviews.com',
      password: 'AdminPass@2026'
    });

    const adminToken = loginRes.data.data?.access_token || loginRes.data.data?.accessToken || loginRes.data.data?.tokens?.accessToken;
    console.log('✅ Admin logged in successfully\n');

    console.log('📝 Step 2: Register a business owner with unique email...\n');
    const uniqueEmail = `testbusinessowner${Date.now()}@example.com`;
    const registerRes = await axios.post('http://localhost:5000/api/businesses/apply', {
      owner_name: 'Another Test Owner',
      owner_email: uniqueEmail,
      owner_password: 'TestPassword123',
      business_name: `Test Rejection Business ${Date.now()}`,
      business_category: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      website_url: 'https://testbusiness2.com',
      phone_number: '+1 (555) 987-6543',
      email_business: `business${Date.now()}@testbusiness2.com`,
      business_description: 'A test business for rejection workflow testing',
      street_address: '456 Test Avenue',
      city: 'Los Angeles',
      country: 'United States'
    });

    const businessId = registerRes.data.data.business.id;
    const businessData = registerRes.data.data.business;
    console.log('✅ Business registered with ID:', businessId);
    console.log('✅ Business Name:', businessData.business_name);
    console.log('Initial Status:', businessData.verification_status);

    console.log('\n📧 Step 3: Rejecting business as admin...\n');
    
    const rejectRes = await axios.patch(
      `http://localhost:5000/api/admin/businesses/${businessId}/verify`,
      { verification_status: 'rejected' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    console.log('✅ Business rejected!');
    console.log('New Status:', rejectRes.data.data.verification_status);
    console.log('Is Verified:', rejectRes.data.data.is_verified);
    console.log('\n✨ Check server logs below for rejection email send confirmation!');

  } catch (error) {
    if (error.response?.data) {
      console.error('❌ Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
})();
