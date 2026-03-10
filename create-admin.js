import bcryptjs from 'bcryptjs';
import { supabase } from './src/config/db.js';
import { generateToken } from './src/middleware/auth.js';

async function createAdminUser() {
  const adminEmail = 'admin@vmcreviews.com';
  const adminPassword = 'AdminPass@2026';
  const adminName = 'Admin User';

  console.log('\n🔐 Creating Admin User...\n');

  try {
    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single();

    if (existingAdmin) {
      console.log('⚠️  Admin already exists with email:', adminEmail);
      console.log('\nAdmin Credentials:');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password:', adminPassword);
      console.log('\nLogin at: http://localhost:3000/admin/login\n');
      return;
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(adminPassword, 10);

    // Create admin user
    const { data: newAdmin, error: userError } = await supabase
      .from('users')
      .insert([
        {
          email: adminEmail,
          password_hash: hashedPassword,
          name: adminName,
          role: 'admin',
          verified_email: true,
          is_active: true,
          is_banned: false,
        },
      ])
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating admin user:', userError);
      return;
    }

    console.log('✅ Admin user created successfully!\n');

    // Create admin profile
    const { data: adminProfile, error: profileError } = await supabase
      .from('profile_admin')
      .insert([
        {
          user_id: newAdmin.id,
          admin_level: 'super_admin',
          admin_title: 'Platform Administrator',
          admin_description: 'Full system administrator with all permissions',
          can_manage_users: true,
          can_manage_businesses: true,
          can_manage_reviews: true,
          can_moderate_content: true,
          can_manage_reports: true,
          can_view_analytics: true,
          can_manage_admins: true,
          can_manage_settings: true,
          can_view_audit_logs: true,
          can_send_notifications: true,
        },
      ])
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating admin profile:', profileError);
      return;
    }

    console.log('✅ Admin profile created successfully!\n');

    // Generate tokens
    const accessToken = generateToken(newAdmin.id, 'admin', '48h');
    const refreshToken = generateToken(newAdmin.id, 'admin', '30d');

    console.log('═'.repeat(60));
    console.log('🎉 ADMIN ACCOUNT CREATED SUCCESSFULLY\n');
    console.log('═'.repeat(60));
    console.log('\n📋 Admin Credentials:\n');
    console.log('  📧 Email:    ' + adminEmail);
    console.log('  🔑 Password: ' + adminPassword);
    console.log('\n═'.repeat(60));
    console.log('\n🌐 How to Login:\n');
    console.log('  1. Open: http://localhost:3000/admin/login');
    console.log('  2. Enter email: ' + adminEmail);
    console.log('  3. Enter password: ' + adminPassword);
    console.log('  4. Click "Login"');
    console.log('  5. Redirect to: http://localhost:3000/admin/dashboard\n');
    console.log('═'.repeat(60));
    console.log('\n✨ Access Token (for testing):\n');
    console.log(accessToken);
    console.log('\n═'.repeat(60));
    console.log('\n💾 Keep these credentials safe!\n');
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
}

createAdminUser();
