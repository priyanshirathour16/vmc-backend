import axios from 'axios';

(async () => {
  try {
    console.log('🔐 Step 1: Admin login to get valid token...\n');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@vmcreviews.com',
      password: 'AdminPass@2026'
    });

    const adminToken = loginRes.data.data.accessToken;
    console.log('✅ Admin logged in successfully\n');

    console.log('📝 Step 2: Create a consumer via admin...\n');
    
    const uniqueEmail = `admincreatedconsumer${Date.now()}@example.com`;
    const createRes = await axios.post(
      'http://localhost:5000/api/admin/consumers',
      {
        email: uniqueEmail,
        name: 'John Admin Consumer',
        // NO password field = auto-generate
        phone: '+91 9876543210',
        location: 'Mumbai, Maharashtra',
        country: 'India',
        gender: 'male',
        bio: 'Test consumer created by admin',
        language: 'en',
        notification_email: true
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    console.log('✅ Consumer created successfully!');
    console.log('Email:', createRes.data.data.user.email);
    console.log('Name:', createRes.data.data.user.name);
    console.log('Verified Email:', createRes.data.data.user.verified_email);
    console.log('Temporary Password:', createRes.data.data.temporaryPassword);
    console.log('\n📧 Welcome email should be sent non-blocking to:', uniqueEmail);
    console.log('✨ Check backend logs below for email confirmation!\n');

  } catch (error) {
    if (error.response?.data) {
      console.error('❌ Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
})();
