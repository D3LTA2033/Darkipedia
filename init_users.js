const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'darkipedia_salt_2024').digest('hex');
}

// Complex passwords for default users
const defaultUsers = {
    users: [
        {
            id: crypto.randomBytes(16).toString('hex'),
            username: 'founder',
            password_hash: hashPassword('F0und3r@2024!XyZ#Secure'),
            role: 'founder',
            created_at: new Date().toISOString()
        },
        {
            id: crypto.randomBytes(16).toString('hex'),
            username: 'staff1',
            password_hash: hashPassword('St@ff$2024!AbC#Secure'),
            role: 'staff',
            created_at: new Date().toISOString()
        },
        {
            id: crypto.randomBytes(16).toString('hex'),
            username: 'manager1',
            password_hash: hashPassword('M@n@g3r$2024!DeF#Secure'),
            role: 'manager',
            created_at: new Date().toISOString()
        }
    ]
};

// Load existing users if file exists
let existingUsers = { users: [] };
if (fs.existsSync(USERS_FILE)) {
    try {
        existingUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (err) {
        console.log('Creating new users file...');
    }
}

// Merge users (don't overwrite existing)
const existingUsernames = new Set(existingUsers.users.map(u => u.username.toLowerCase()));
defaultUsers.users.forEach(user => {
    if (!existingUsernames.has(user.username.toLowerCase())) {
        existingUsers.users.push(user);
        console.log(`Added user: ${user.username} (role: ${user.role})`);
    } else {
        console.log(`User ${user.username} already exists, skipping...`);
    }
});

// Save users
fs.writeFileSync(USERS_FILE, JSON.stringify(existingUsers, null, 2));
console.log('\nUsers initialized!');
console.log('\nDefault credentials:');
console.log('Founder: username=founder, password=F0und3r@2024!XyZ#Secure');
console.log('Staff: username=staff1, password=St@ff$2024!AbC#Secure');
console.log('Manager: username=manager1, password=M@n@g3r$2024!DeF#Secure');
console.log('\n⚠️  Change these passwords after first login!');

