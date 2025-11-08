const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'pastes.db');
const USERS_FILE = path.join(__dirname, 'users.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Initialize users.json if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = {
        users: []
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
}

// Simple password hashing (using crypto for basic security)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'darkipedia_salt_2024').digest('hex');
}

// Load users from JSON
function loadUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { users: [] };
    }
}

// Save users to JSON
function saveUsers(usersData) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
        // Create backup
        const backupFile = path.join(BACKUP_DIR, `users_backup_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(usersData, null, 2));
        // Keep only last 10 backups
        const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('users_backup_')).sort().reverse();
        backups.slice(10).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
        return true;
    } catch (err) {
        console.error('Error saving users:', err);
        return false;
    }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        // Create pastes table with new fields
        db.run(`CREATE TABLE IF NOT EXISTS pastes (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT NOT NULL,
            category TEXT,
            date TEXT NOT NULL,
            user_id TEXT,
            role TEXT DEFAULT 'user',
            pinned INTEGER DEFAULT 0
        )`, (err) => {
            if (err) {
                console.error('Error creating pastes table:', err.message);
            } else {
                console.log('Pastes table ready');
                // Try to add new columns (will fail if they exist, which is fine)
                db.run(`ALTER TABLE pastes ADD COLUMN role TEXT DEFAULT 'user'`, () => {});
                db.run(`ALTER TABLE pastes ADD COLUMN user_id TEXT`, () => {});
                db.run(`ALTER TABLE pastes ADD COLUMN pinned INTEGER DEFAULT 0`, () => {});
                // Check if old manager column exists and migrate
                db.all(`PRAGMA table_info(pastes)`, [], (err, columns) => {
                    if (!err && columns) {
                        const hasManager = columns.some(col => col.name === 'manager');
                        if (hasManager) {
                            db.run(`UPDATE pastes SET role = 'manager' WHERE manager = 1 AND (role IS NULL OR role = 'user')`, () => {});
                        }
                    }
                });
            }
        });

        // Create users table for session management
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            } else {
                console.log('Users table ready');
            }
        });
    }
});

// Helper function to get role hierarchy (higher number = higher priority)
function getRolePriority(role) {
    const priorities = {
        'founder': 4,
        'staff': 3,
        'manager': 2,
        'user': 1
    };
    return priorities[role] || 0;
}

// API Routes

// GET all pastes (sorted: pinned founder > pinned staff > pinned manager > regular by role > date)
app.get('/api/pastes', (req, res) => {
    db.all(`SELECT * FROM pastes ORDER BY 
        pinned DESC,
        CASE role
            WHEN 'founder' THEN 4
            WHEN 'staff' THEN 3
            WHEN 'manager' THEN 2
            ELSE 1
        END DESC,
        date DESC`, [], (err, rows) => {
        if (err) {
            console.error('Error fetching pastes:', err);
            return res.status(500).json({ error: 'Failed to fetch pastes' });
        }
        const pastes = rows.map(row => ({
            ...row,
            pinned: row.pinned === 1
        }));
        res.json(pastes);
    });
});

// GET single paste by id
app.get('/api/pastes/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM pastes WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Error fetching paste:', err);
            return res.status(500).json({ error: 'Failed to fetch paste' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Paste not found' });
        }
        const paste = {
            ...row,
            pinned: row.pinned === 1
        };
        res.json(paste);
    });
});

// POST create new paste
app.post('/api/pastes', (req, res) => {
    const { id, title, content, category, date, user_id, role } = req.body;
    
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }
    
    db.run(
        'INSERT INTO pastes (id, title, content, category, date, user_id, role, pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, title || 'Untitled', content, category || 'Uncategorized', date || new Date().toISOString(), user_id || null, role || 'user', 0],
        function(err) {
            if (err) {
                console.error('Error creating paste:', err);
                return res.status(500).json({ error: 'Failed to create paste' });
            }
            res.status(201).json({ 
                id, 
                title: title || 'Untitled', 
                content, 
                category: category || 'Uncategorized', 
                date: date || new Date().toISOString(),
                user_id: user_id || null,
                role: role || 'user',
                pinned: false
            });
        }
    );
});

// DELETE paste by id
app.delete('/api/pastes/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM pastes WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('Error deleting paste:', err);
            return res.status(500).json({ error: 'Failed to delete paste' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Paste not found' });
        }
        res.json({ message: 'Paste deleted successfully' });
    });
});

// PIN/UNPIN paste (founder, staff, manager only)
app.post('/api/pastes/:id/pin', (req, res) => {
    const id = req.params.id;
    const { pinned } = req.body;
    const { role } = req.body; // Role from authenticated user
    
    if (!['founder', 'staff', 'manager'].includes(role)) {
        return res.status(403).json({ error: 'Only founder, staff, and managers can pin posts' });
    }
    
    db.run('UPDATE pastes SET pinned = ? WHERE id = ?', [pinned ? 1 : 0, id], function(err) {
        if (err) {
            console.error('Error pinning paste:', err);
            return res.status(500).json({ error: 'Failed to pin/unpin paste' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Paste not found' });
        }
        res.json({ message: `Paste ${pinned ? 'pinned' : 'unpinned'} successfully` });
    });
});

// AUTHENTICATION ROUTES

// POST signup
app.post('/api/auth/signup', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const usersData = loadUsers();
    
    // Check if username exists
    if (usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    
    const userId = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password);
    const newUser = {
        id: userId,
        username: username,
        password_hash: passwordHash,
        role: 'user',
        created_at: new Date().toISOString()
    };
    
    usersData.users.push(newUser);
    
    if (saveUsers(usersData)) {
        // Also save to database
        db.run('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
            [userId, username, passwordHash, 'user', newUser.created_at], (err) => {
            if (err) {
                console.error('Error saving user to database:', err);
            }
        });
        
        res.status(201).json({ message: 'User created successfully', user: { id: userId, username, role: 'user' } });
    } else {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// POST login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const usersData = loadUsers();
    const user = usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const passwordHash = hashPassword(password);
    
    if (user.password_hash !== passwordHash) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    res.json({ 
        message: 'Login successful',
        user: {
            id: user.id,
            username: user.username,
            role: user.role
        }
    });
});

// GET users (for backup/management)
app.get('/api/users', (req, res) => {
    const usersData = loadUsers();
    const safeUsers = usersData.users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        created_at: u.created_at
    }));
    res.json({ users: safeUsers });
});

// Backup posts to JSON
app.post('/api/backup/posts', (req, res) => {
    db.all('SELECT * FROM pastes', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to backup posts' });
        }
        const backupFile = path.join(BACKUP_DIR, `posts_backup_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(rows, null, 2));
        res.json({ message: 'Backup created successfully', file: backupFile });
    });
});

// Auto-backup every hour
setInterval(() => {
    db.all('SELECT * FROM pastes', [], (err, rows) => {
        if (!err) {
            const backupFile = path.join(BACKUP_DIR, `posts_backup_${Date.now()}.json`);
            fs.writeFileSync(backupFile, JSON.stringify(rows, null, 2));
            console.log(`Auto-backup created: ${backupFile}`);
            // Keep only last 24 backups (24 hours)
            const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('posts_backup_')).sort().reverse();
            backups.slice(24).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
        }
    });
}, 3600000); // 1 hour

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api/pastes`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
