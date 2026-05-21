const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',           // اسم المستخدم (تأكد منه)
  host: 'localhost',
  database: 'sehhtak_db',     // اسم قاعدة بياناتك
  password: '1234',           // اكتب كلمة السر هنا نصاً صريحاً
  port: 5432,
});

pool.on('connect', () => {
  console.log('✅ تم الاتصال بقاعدة البيانات sehhtak_db بنجاح!');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};