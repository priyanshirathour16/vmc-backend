import axios from 'axios';

(async () => {
  try {
    console.log('🔐 Step 1: Admin login...\n');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@vmcreviews.com',
      password: 'AdminPass@2026'
    });

    const adminToken = loginRes.data.data.accessToken;
    console.log('✅ Admin logged in\n');

    console.log('📝 Step 2: Create consumer WITH custom password...\n');
    
    const uniqueEmail = `adminconsumer${Date.now()}@example.com`;
    const createRes = await axios.post(
      'http://localhost:5000/api/admin/consumers',
      {
        email: uniqueEmail,
        name: 'Jane Custom Password',
        password: 'CustomPassword@123',  // Admin provided password
        phone: '+91 8765432109',
        location: 'Bangalore, Karnataka',
        country: 'India'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    console.log('✅ Consumer created successfully!');
    console.log('Email:', createRes.data.data.user.email);
    console.log('Name:', createRes.data.data.user.name);
    console.log('Temporary Password:', createRes.data.data.temporaryPassword);
    console.log('(Should be undefined since admin provided password)\n');
    console.log('📧 Welcome email sent (without password section)');
    console.log('✨ Check backend logs below for confirmation!\n');

  } catch (error) {
    if (error.response?.data) {
      console.error('❌ Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
})();
