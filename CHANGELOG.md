# Changelog - Major Update

## New Features

### 🎨 Doxbin-Inspired Design
- Complete redesign with dark black background (#000000)
- Green monospace text (#00ff00) for terminal aesthetic
- Minimal, text-focused layout
- Removed colorful gradients in favor of simple, clean design

### 🔐 Authentication System
- **Sign Up**: Users can create accounts
- **Login**: Username/password authentication
- **User Storage**: Passwords hashed and stored in `users.json`
- **Automatic Backups**: User accounts backed up on every change
- **Session Management**: Client-side session using localStorage

### 👥 Role-Based System
- **Founder**: Highest privilege (red badge)
- **Staff**: High privilege (yellow badge)
- **Manager**: Medium privilege (orange badge)
- **User**: Regular users (no badge)
- Complex default passwords stored securely
- Role badges displayed on posts

### 📌 Pin Functionality
- Founder, Staff, and Managers can pin posts
- Pinned posts appear at the top
- Pin icon (📌) displayed on pinned posts
- Posts sorted: Pinned Founder > Staff > Manager > Regular posts

### 🤖 Anti-Bot System
- Loading page with 6-digit random number captcha
- Users must enter code before accessing site
- Captcha verification stored in sessionStorage (1 hour validity)
- Auto-redirect to loading page if verification expired

### 💾 Backup System
- **Automatic Backups**: Posts backed up every hour
- **User Backups**: User accounts backed up on every change
- **Backup Location**: `backups/` directory
- **Retention**: Last 24 post backups, last 10 user backups
- **Manual Backup**: API endpoint for manual backups

### 🗄️ Database Updates
- Added `user_id` field to pastes
- Added `role` field to pastes
- Added `pinned` field to pastes
- Migration script for old data
- Users table in database (synced with JSON)

## Technical Changes

### Backend (`server.js`)
- Added authentication endpoints (`/api/auth/login`, `/api/auth/signup`)
- Added pin/unpin endpoint (`/api/pastes/:id/pin`)
- Updated post sorting (pinned > role > date)
- Added automatic backup system
- Improved database schema with migrations

### Frontend
- Complete redesign of `index.html` with doxbin styling
- Added login/signup modals
- Added role badges and pin indicators
- Updated post rendering with new features
- Added captcha verification checks

### Files Added
- `loading.html` - Anti-bot captcha page
- `init_users.js` - Initialize default users script
- `users.json` - User accounts storage (auto-generated)
- `SETUP.md` - Setup instructions
- `CHANGELOG.md` - This file

### Files Modified
- `index.html` - Complete redesign
- `server.js` - Added authentication, pinning, backups
- `js/paste.js` - Added user info to paste creation
- `pages/view.html` - Added captcha check and role badges
- `pages/paste.html` - Added captcha check
- `package.json` - Added init-users script
- `README.md` - Updated with new features
- `.gitignore` - Added backups and users.json

## Breaking Changes

- Old `localStorage`-based storage removed
- All data now stored in SQLite database
- Authentication required for posting with roles
- Captcha required before accessing site

## Migration Guide

1. **Backup old data**: Export any pastes from localStorage if needed
2. **Run init-users**: `npm run init-users` to create default accounts
3. **Start server**: `npm start` to start the new server
4. **Access site**: Go to `http://localhost:3000`
5. **Complete captcha**: Enter 6-digit code on loading page
6. **Login**: Use default credentials to login
7. **Change passwords**: Update default passwords immediately

## Default Credentials

- **Founder**: `founder` / `F0und3r@2024!XyZ#Secure`
- **Staff**: `staff1` / `St@ff$2024!AbC#Secure`
- **Manager**: `manager1` / `M@n@g3r$2024!DeF#Secure`

⚠️ **Change these passwords immediately after first login!**

## Next Steps

1. Change default passwords
2. Create additional user accounts as needed
3. Pin important posts
4. Monitor backups in `backups/` directory
5. Customize styling if needed

