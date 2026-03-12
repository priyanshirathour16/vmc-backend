// Quick standalone test for Zepto Mail credentials
// Run: node test-zepto.js
import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.ZEPTO_MAIL_API_KEY;
const fromEmail = process.env.ZEPTO_MAIL_FROM_EMAIL;

console.log('─── Zepto Mail Credential Check ───────────────────────');
console.log('API Key loaded :', !!apiKey);
console.log('API Key length :', apiKey?.length);
console.log('API Key starts :', apiKey?.substring(0, 20));
console.log('API Key ends   :', apiKey?.slice(-10));
console.log('From Email     :', fromEmail);
console.log('────────────────────────────────────────────────────────');

if (!apiKey) {
  console.error('❌ ZEPTO_MAIL_API_KEY is not set. Check .env file.');
  process.exit(1);
}

const payload = {
  from: { address: fromEmail, name: 'VMC Test' },
  to: [{ email_address: { address: fromEmail, name: 'Test' } }],
  subject: 'Zepto Mail Test',
  htmlbody: '<p>Test email from VMC backend.</p>',
};

try {
  const res = await axios.post('https://api.zeptomail.in/v1.1/email', payload, {
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 15000,
  });
  console.log('✅ Success:', res.data);
} catch (err) {
  console.error('❌ Zepto Mail API Error:');
  console.error('   Status :', err.response?.status);
  console.error('   Data   :', JSON.stringify(err.response?.data, null, 2));
}
