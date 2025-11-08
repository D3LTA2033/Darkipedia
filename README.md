# Darkipedia - Anonymous Paste Platform

A secure, anonymous paste platform with shared storage across all browsers and devices.

## Features

- 🚀 Create and share anonymous pastes
- 🔒 Privacy-first design with anti-bot captcha
- 🌐 Shared storage - pastes visible across all browsers
- 📱 Responsive design
- ⚡ Fast and lightweight
- 👑 Role-based system (Founder, Staff, Manager, User)
- 📌 Pin posts (Founder, Staff, Manager can pin)
- 🔐 User authentication with signup/login
- 🎨 Doxbin-inspired dark theme
- 💾 Automatic backups to JSON files
- 🏷️ Role badges on posts
- 📊 Post sorting: Pinned Founder > Staff > Manager > Regular posts

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Initialize default users (founder, staff, manager):
```bash
npm run init-users
```

This will create default accounts with complex passwords:
- **Founder**: username=`founder`, password=`F0und3r@2024!XyZ#Secure`
- **Staff**: username=`staff1`, password=`St@ff$2024!AbC#Secure`
- **Manager**: username=`manager1`, password=`M@n@g3r$2024!DeF#Secure`

**⚠️ IMPORTANT: Change these passwords after first login!**

3. Start the server:
```bash
npm start
```

The server will start on `http://localhost:3000` by default.

4. Access the site:
- First time visitors will see a loading page with anti-bot captcha
- After verification, you can browse pastes
- Login with your credentials to create pastes with your role

### Environment Variables

You can set the `PORT` environment variable to change the server port:
```bash
PORT=8080 npm start
```

## Project Structure

- `server.js` - Express server with SQLite database
- `index.html` - Main page showing all pastes
- `pages/paste.html` - Create new paste page
- `pages/view.html` - View individual paste page
- `js/paste.js` - Paste creation logic
- `pastes.db` - SQLite database (created automatically)

## API Endpoints

- `GET /api/pastes` - Get all pastes
- `GET /api/pastes/:id` - Get a specific paste
- `POST /api/pastes` - Create a new paste
- `DELETE /api/pastes/:id` - Delete a paste

## Database

The application uses SQLite for data storage. The database file (`pastes.db`) is created automatically when you first run the server.

## Notes

- Pastes are stored in a SQLite database, making them accessible across all browsers and devices
- The database file is created in the project root directory
- Make sure to back up `pastes.db` if you want to preserve your data

## Development

For development, you can use nodemon for auto-reloading:

```bash
npm install -g nodemon
nodemon server.js
```

## License

ISC

