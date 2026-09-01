const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('password123', 10);
console.log('Generated Hash for password123:', hash);
