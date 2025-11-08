const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'pastes.db');
const USERS_FILE = path.join(__dirname, 'users.json');
const BACKUP_DIR = path.join(__dirname, 'backups');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
[BACKUP_DIR, UPLOADS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Initialize users.json if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// Password hashing
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'darkipedia_salt_2024').digest('hex');
}

// Load/save users
function loadUsers() {
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (err) {
        return { users: [] };
    }
}

function saveUsers(usersData) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
        const backupFile = path.join(BACKUP_DIR, `users_backup_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(usersData, null, 2));
        const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('users_backup_')).sort().reverse();
        backups.slice(10).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
        return true;
    } catch (err) {
        console.error('Error saving users:', err);
        return false;
    }
}

// Enhanced middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Database initialization
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        
        // Enhanced pastes table
        db.run(`CREATE TABLE IF NOT EXISTS pastes (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT NOT NULL,
            category TEXT,
            date TEXT NOT NULL,
            user_id TEXT,
            role TEXT DEFAULT 'user',
            pinned INTEGER DEFAULT 0,
            views INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            tags TEXT,
            language TEXT,
            is_private INTEGER DEFAULT 0,
            expires_at TEXT,
            image_url TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating pastes table:', err.message);
            } else {
                console.log('Pastes table ready');
                // Add new columns safely (ignore errors if column already exists)
                const columnsToAdd = [
                    { name: 'role', def: 'TEXT DEFAULT "user"' },
                    { name: 'user_id', def: 'TEXT' },
                    { name: 'pinned', def: 'INTEGER DEFAULT 0' },
                    { name: 'views', def: 'INTEGER DEFAULT 0' },
                    { name: 'likes', def: 'INTEGER DEFAULT 0' },
                    { name: 'tags', def: 'TEXT' },
                    { name: 'language', def: 'TEXT' },
                    { name: 'is_private', def: 'INTEGER DEFAULT 0' },
                    { name: 'expires_at', def: 'TEXT' },
                    { name: 'image_url', def: 'TEXT' }
                ];
                
                columnsToAdd.forEach(({ name, def }) => {
                    db.run(`ALTER TABLE pastes ADD COLUMN ${name} ${def}`, (err) => {
                        // Ignore "duplicate column" errors
                        if (err && !err.message.includes('duplicate column name')) {
                            // Column might already exist, which is fine
                        }
                    });
                });
            }
        });

        // Comments table
        db.run(`CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            paste_id TEXT NOT NULL,
            user_id TEXT,
            username TEXT,
            content TEXT NOT NULL,
            date TEXT NOT NULL,
            FOREIGN KEY (paste_id) REFERENCES pastes(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) console.error('Error creating comments table:', err.message);
        });

        // Likes table
        db.run(`CREATE TABLE IF NOT EXISTS likes (
            id TEXT PRIMARY KEY,
            paste_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            UNIQUE(paste_id, user_id),
            FOREIGN KEY (paste_id) REFERENCES pastes(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) console.error('Error creating likes table:', err.message);
        });

        // User profiles table
        db.run(`CREATE TABLE IF NOT EXISTS user_profiles (
            user_id TEXT PRIMARY KEY,
            bio TEXT,
            avatar TEXT,
            theme TEXT DEFAULT 'dark',
            created_at TEXT NOT NULL,
            last_seen TEXT
        )`, (err) => {
            if (err) console.error('Error creating user_profiles table:', err.message);
        });

        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TEXT NOT NULL
        )`, (err) => {
            if (err) console.error('Error creating users table:', err.message);
        });
    }
});

// Helper function to get role priority
function getRolePriority(role) {
    const priorities = { 'founder': 4, 'staff': 3, 'manager': 2, 'user': 1 };
    return priorities[role] || 0;
}

// API Routes

// GET all pastes (enhanced with filtering and sorting)
app.get('/api/pastes', (req, res) => {
    try {
        const { search, category, tag, user_id, sort = 'default' } = req.query;
        let query = 'SELECT * FROM pastes WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        if (category && category !== 'all') {
            query += ' AND category = ?';
            params.push(category);
        }
        if (tag) {
            query += ' AND tags LIKE ?';
            params.push(`%${tag}%`);
        }
        if (user_id) {
            query += ' AND user_id = ?';
            params.push(user_id);
        }

        // Remove expired pastes (only if expires_at is set and in the past)
        query += ' AND (expires_at IS NULL OR expires_at = "" OR datetime(expires_at) > datetime("now"))';

        // Sorting
        if (sort === 'views') {
            query += ' ORDER BY COALESCE(views, 0) DESC, date DESC';
        } else if (sort === 'likes') {
            query += ' ORDER BY COALESCE(likes, 0) DESC, date DESC';
        } else {
            query += ` ORDER BY COALESCE(pinned, 0) DESC, 
                CASE role WHEN 'founder' THEN 4 WHEN 'staff' THEN 3 WHEN 'manager' THEN 2 ELSE 1 END DESC, 
                date DESC`;
        }

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error fetching pastes:', err);
                return res.status(500).json({ error: 'Failed to fetch pastes: ' + err.message });
            }
            const pastes = (rows || []).map(row => ({
                ...row,
                pinned: row.pinned === 1 || row.pinned === '1',
                is_private: row.is_private === 1 || row.is_private === '1',
                views: parseInt(row.views) || 0,
                likes: parseInt(row.likes) || 0,
                tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(t => t) : []
            }));
            res.json(pastes);
        });
    } catch (error) {
        console.error('Error in GET /api/pastes:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// GET single paste with views increment
app.get('/api/pastes/:id', (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: 'Paste ID is required' });
        }
        
        db.get('SELECT * FROM pastes WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Error fetching paste:', err);
                return res.status(500).json({ error: 'Failed to fetch paste: ' + err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'Paste not found' });
            }
            
            // Increment views (non-blocking)
            db.run('UPDATE pastes SET views = COALESCE(views, 0) + 1 WHERE id = ?', [id], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating views:', updateErr);
                }
            });
            
            const paste = {
                ...row,
                pinned: row.pinned === 1 || row.pinned === '1',
                is_private: row.is_private === 1 || row.is_private === '1',
                views: (parseInt(row.views) || 0) + 1,
                likes: parseInt(row.likes) || 0,
                tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(t => t) : []
            };
            res.json(paste);
        });
    } catch (error) {
        console.error('Error in GET /api/pastes/:id:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// POST create new paste
app.post('/api/pastes', (req, res) => {
    try {
        const { id, title, content, category, date, user_id, role, tags, language, is_private, expires_at } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        if (!id) {
            return res.status(400).json({ error: 'ID is required' });
        }

        const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');

        db.run(
            'INSERT INTO pastes (id, title, content, category, date, user_id, role, pinned, tags, language, is_private, expires_at, views, likes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, title || 'Untitled', content, category || 'Uncategorized', date || new Date().toISOString(), 
             user_id || null, role || 'user', 0, tagsStr, language || null, is_private ? 1 : 0, expires_at || null, 0, 0],
            function(err) {
                if (err) {
                    console.error('Error creating paste:', err);
                    if (err.message.includes('UNIQUE constraint')) {
                        return res.status(409).json({ error: 'Paste ID already exists' });
                    }
                    return res.status(500).json({ error: 'Failed to create paste: ' + err.message });
                }
                res.status(201).json({ 
                    id, 
                    title: title || 'Untitled', 
                    content, 
                    category: category || 'Uncategorized', 
                    date: date || new Date().toISOString(),
                    user_id: user_id || null,
                    role: role || 'user',
                    pinned: false,
                    views: 0,
                    likes: 0,
                    tags: tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [],
                    image_url: null
                });
            }
        );
    } catch (error) {
        console.error('Error in POST /api/pastes:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// DELETE paste
app.delete('/api/pastes/:id', (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ error: 'Paste ID is required' });
        }
        
        db.run('DELETE FROM pastes WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Error deleting paste:', err);
                return res.status(500).json({ error: 'Failed to delete paste: ' + err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Paste not found' });
            }
            res.json({ message: 'Paste deleted successfully' });
        });
    } catch (error) {
        console.error('Error in DELETE /api/pastes/:id:', error);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// PIN/UNPIN paste
app.post('/api/pastes/:id/pin', (req, res) => {
    const id = req.params.id;
    const { pinned, role } = req.body;
    
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

// LIKE/UNLIKE paste
app.post('/api/pastes/:id/like', (req, res) => {
    const id = req.params.id;
    const { user_id } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if already liked
    db.get('SELECT * FROM likes WHERE paste_id = ? AND user_id = ?', [id, user_id], (err, like) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to check like status' });
        }

        if (like) {
            // Unlike
            db.run('DELETE FROM likes WHERE paste_id = ? AND user_id = ?', [id, user_id], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to unlike' });
                db.run('UPDATE pastes SET likes = COALESCE(likes, 0) - 1 WHERE id = ?', [id]);
                res.json({ liked: false, message: 'Unliked successfully' });
            });
        } else {
            // Like
            const likeId = crypto.randomBytes(16).toString('hex');
            db.run('INSERT INTO likes (id, paste_id, user_id, date) VALUES (?, ?, ?, ?)', 
                [likeId, id, user_id, new Date().toISOString()], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to like' });
                db.run('UPDATE pastes SET likes = COALESCE(likes, 0) + 1 WHERE id = ?', [id]);
                res.json({ liked: true, message: 'Liked successfully' });
            });
        }
    });
});

// GET comments for a paste
app.get('/api/pastes/:id/comments', (req, res) => {
    const id = req.params.id;
    db.all('SELECT * FROM comments WHERE paste_id = ? ORDER BY date ASC', [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch comments' });
        }
        res.json(rows);
    });
});

// POST comment on a paste
app.post('/api/pastes/:id/comments', (req, res) => {
    const id = req.params.id;
    const { user_id, username, content } = req.body;
    
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    const commentId = crypto.randomBytes(16).toString('hex');
    db.run('INSERT INTO comments (id, paste_id, user_id, username, content, date) VALUES (?, ?, ?, ?, ?, ?)',
        [commentId, id, user_id || null, username || 'Anonymous', content, new Date().toISOString()],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create comment' });
            }
            res.status(201).json({ 
                id: commentId, 
                paste_id: id, 
                user_id, 
                username: username || 'Anonymous', 
                content, 
                date: new Date().toISOString() 
            });
        }
    );
});

// DELETE comment
app.delete('/api/comments/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM comments WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete comment' });
        }
        res.json({ message: 'Comment deleted successfully' });
    });
});

// AUTHENTICATION ROUTES

// GET check 2FA
app.get('/api/auth/check-2fa', (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.json({ requires2FA: false });
    }
    const usersData = loadUsers();
    const user = usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
        return res.json({ requires2FA: false });
    }
    const requires2FA = user.fa_code && ['founder', 'staff', 'manager'].includes(user.role);
    res.json({ requires2FA });
});

// POST login
app.post('/api/auth/login', (req, res) => {
    const { username, password, faCode } = req.body;
    
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
    
    if (user.fa_code && ['founder', 'staff', 'manager'].includes(user.role)) {
        if (!faCode || faCode.trim() !== user.fa_code) {
            return res.status(401).json({ 
                error: 'Invalid 2FA code',
                requires2FA: true
            });
        }
    }
    
    // Update last seen
    db.run('UPDATE user_profiles SET last_seen = ? WHERE user_id = ?', 
        [new Date().toISOString(), user.id], () => {});
    
    res.json({ 
        message: 'Login successful',
        user: {
            id: user.id,
            username: user.username,
            role: user.role
        }
    });
});

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
        db.run('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
            [userId, username, passwordHash, 'user', newUser.created_at], (err) => {
            if (err) console.error('Error saving user to database:', err);
        });
        
        // Create user profile
        db.run('INSERT INTO user_profiles (user_id, created_at, last_seen) VALUES (?, ?, ?)',
            [userId, new Date().toISOString(), new Date().toISOString()], () => {});
        
        res.status(201).json({ message: 'User created successfully', user: { id: userId, username, role: 'user' } });
    } else {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// GET user profile
app.get('/api/users/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM user_profiles WHERE user_id = ?', [id], (err, profile) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch profile' });
        }
        res.json(profile || { user_id: id, bio: '', avatar: '', theme: 'dark' });
    });
});

// UPDATE user profile
app.put('/api/users/:id', (req, res) => {
    const id = req.params.id;
    const { bio, avatar, theme } = req.body;
    
    db.run('INSERT OR REPLACE INTO user_profiles (user_id, bio, avatar, theme, last_seen) VALUES (?, ?, ?, ?, ?)',
        [id, bio || '', avatar || '', theme || 'dark', new Date().toISOString()],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update profile' });
            }
            res.json({ message: 'Profile updated successfully' });
        }
    );
});

// Auto-backup every hour
setInterval(() => {
    db.all('SELECT * FROM pastes', [], (err, rows) => {
        if (!err) {
            const backupFile = path.join(BACKUP_DIR, `posts_backup_${Date.now()}.json`);
            fs.writeFileSync(backupFile, JSON.stringify(rows, null, 2));
            console.log(`Auto-backup created: ${backupFile}`);
            const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('posts_backup_')).sort().reverse();
            backups.slice(24).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
        }
    });
}, 3600000);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api/pastes`);
    console.log(`💾 Database: ${DB_PATH}`);
    console.log(`✅ Server ready! Start React app with: cd frontend && npm start`);
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

