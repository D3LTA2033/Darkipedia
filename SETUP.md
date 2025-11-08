# Darkipedia Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize default users:**
   ```bash
   npm run init-users
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access the site:**
   - Open `http://localhost:3000` in your browser
   - You'll see the loading page with captcha
   - Enter the 6-digit code to proceed

## Default User Accounts

After running `npm run init-users`, you'll have these accounts:

| Username | Password | Role |
|----------|----------|------|
| founder | F0und3r@2024!XyZ#Secure | Founder |
| staff1 | St@ff$2024!AbC#Secure | Staff |
| manager1 | M@n@g3r$2024!DeF#Secure | Manager |

**⚠️ CHANGE THESE PASSWORDS IMMEDIATELY AFTER FIRST LOGIN!**

## Features

### Authentication
- **Sign Up**: Anyone can create an account
- **Login**: Users can login with username/password
- **Roles**: Founder, Staff, Manager, User
- **Password Storage**: Hashed passwords in `users.json` (backed up automatically)

### Post Management
- **Create Posts**: Logged-in users create posts with their role
- **Pin Posts**: Founder, Staff, and Managers can pin posts
- **Delete Posts**: Users can delete their own posts
- **Role Badges**: Posts show role badges (Founder=Red, Staff=Yellow, Manager=Orange)

### Post Sorting
Posts are automatically sorted by:
1. Pinned posts first
2. Then by role priority: Founder > Staff > Manager > User
3. Then by date (newest first)

### Anti-Bot System
- Loading page with 6-digit captcha
- Captcha verification stored in sessionStorage (1 hour validity)
- Required before accessing main site

### Backups
- **Automatic Backups**: Posts backed up every hour to `backups/` directory
- **User Backups**: User accounts backed up on every change
- **Manual Backup**: Use `/api/backup/posts` endpoint

## File Structure

```
Darkipedia/
├── server.js           # Main server file
├── init_users.js       # Initialize default users
├── users.json          # User accounts (auto-generated)
├── pastes.db           # SQLite database (auto-generated)
├── backups/            # Backup directory (auto-generated)
│   ├── users_backup_*.json
│   └── posts_backup_*.json
├── loading.html        # Loading page with captcha
├── index.html          # Main page
├── pages/
│   ├── paste.html      # Create paste page
│   └── view.html       # View paste page
└── js/
    └── paste.js        # Paste creation logic
```

## API Endpoints

### Posts
- `GET /api/pastes` - Get all pastes (sorted)
- `GET /api/pastes/:id` - Get single paste
- `POST /api/pastes` - Create new paste
- `DELETE /api/pastes/:id` - Delete paste
- `POST /api/pastes/:id/pin` - Pin/unpin paste (requires role)

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login user
- `GET /api/users` - Get all users (for admin)

### Backups
- `POST /api/backup/posts` - Manual backup of posts

## Security Notes

1. **Passwords**: Stored as SHA-256 hashes (add salt for production)
2. **Captcha**: Simple number-based (consider upgrading for production)
3. **Session**: Uses localStorage for client-side session (consider JWT for production)
4. **Backups**: Stored in plain JSON (encrypt for production)

## Customization

### Change Default Passwords
Edit `init_users.js` and change the password strings, then run `npm run init-users` again.

### Change Server Port
Set environment variable:
```bash
PORT=8080 npm start
```

### Modify Role Permissions
Edit `server.js` in the pin endpoint to change which roles can pin posts.

## Troubleshooting

### Database Errors
If you get database errors, delete `pastes.db` and restart the server (data will be lost).

### Users Not Loading
Check that `users.json` exists and has valid JSON. Run `npm run init-users` to recreate.

### Captcha Not Working
Clear browser sessionStorage and reload the page.

### Posts Not Showing
Check browser console for API errors. Ensure server is running on correct port.

