// Script to create Pro user
const proUser = {
  id: 'pro-user-001',
  name: 'مستخدم تجريبي Pro',
  email: 'prouser@khabeer.com',
  phone: '+96599999999',
  password: 'Pro2024!',
  role: 'user',
  package: 'pro',
  status: 'active',
  createdAt: new Date().toISOString(),
  freePackage: true
};

console.log('Pro User Created:');
console.log(JSON.stringify(proUser, null, 2));
console.log('\nبيانات الدخول:');
console.log('البريد: prouser@khabeer.com');
console.log('كلمة المرور: Pro2024!');
