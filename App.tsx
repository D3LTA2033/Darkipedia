import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface User {
  id: string;
  username: string;
  role: string;
}

interface Paste {
  id: string;
  title: string;
  content: string;
  category: string;
  date: string;
  user_id?: string;
  role: string;
  pinned: boolean;
  views: number;
  likes: number;
  tags: string[];
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    // Load user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
    loadPastes();
  }, []);

  const loadPastes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/pastes`);
      if (!response.ok) {
        throw new Error('Failed to fetch pastes');
      }
      const data = await response.json();
      setPastes(data);
    } catch (error) {
      console.error('Error loading pastes:', error);
      alert('Failed to load pastes. Make sure the server is running: npm start');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username: string, password: string, faCode?: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, faCode: faCode || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      setShowLogin(false);
      loadPastes();
    } catch (error: any) {
      alert(error.message || 'Login failed. Check console for details.');
      throw error;
    }
  };

  const handleSignup = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Signup failed');
      }

      const data = await response.json();
      // Auto login after signup
      setUser(data.user);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      setShowSignup(false);
      loadPastes();
    } catch (error: any) {
      alert(error.message || 'Signup failed. Check console for details.');
      throw error;
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const filteredPastes = pastes.filter(paste => {
    const matchesSearch = !searchTerm || 
      paste.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paste.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paste.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || paste.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(pastes.map(p => p.category).filter(Boolean)));

  return (
    <div className="App">
      <header className="header">
        <h1>DARKIPEDIA</h1>
        <div className="header-actions">
          {user ? (
            <div className="user-info">
              <span>{user.username}</span>
              <span className={`role-badge role-${user.role}`}>{user.role.toUpperCase()}</span>
              <button className="btn" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <>
              <button className="btn" onClick={() => setShowLogin(true)}>Login</button>
              <button className="btn" onClick={() => setShowSignup(true)}>Sign Up</button>
            </>
          )}
          <a href="/pages/paste.html" className="btn">New Paste</a>
        </div>
      </header>

      <div className="container">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search pastes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading pastes...</div>
        ) : filteredPastes.length === 0 ? (
          <div className="no-pastes">No pastes found</div>
        ) : (
          <div className="paste-list">
            {filteredPastes.map(paste => (
              <div key={paste.id} className={`paste-item ${paste.pinned ? 'pinned' : ''}`}>
                <div className="paste-left">
                  <div className="paste-title">
                    {paste.pinned && <span className="pin-icon">📌</span>}
                    <a href={`/pages/view.html?id=${paste.id}`}>{paste.title || 'Untitled'}</a>
                    {paste.role !== 'user' && (
                      <span className={`role-badge role-${paste.role}`}>
                        {paste.role.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="paste-meta">
                    <span>Category: {paste.category || 'Uncategorized'}</span>
                    <span>Date: {new Date(paste.date).toLocaleString()}</span>
                    <span>Views: {paste.views || 0}</span>
                    <span>Likes: {paste.likes || 0}</span>
                  </div>
                  {paste.tags.length > 0 && (
                    <div className="paste-tags">
                      {paste.tags.map(tag => (
                        <span key={tag} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="paste-content-preview">
                    {paste.content.substring(0, 100)}{paste.content.length > 100 ? '...' : ''}
                  </div>
                </div>
                <div className="paste-actions">
                  <button className="btn" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/pages/view.html?id=${paste.id}`);
                    alert('Link copied!');
                  }}>Copy Link</button>
                  {user && (
                    <button className="btn" onClick={async () => {
                      if (confirm('Delete this paste?')) {
                        try {
                          const response = await fetch(`${API_BASE}/pastes/${paste.id}`, {
                            method: 'DELETE'
                          });
                          if (response.ok) {
                            loadPastes();
                          } else {
                            alert('Failed to delete paste');
                          }
                        } catch (error) {
                          alert('Network error');
                        }
                      }
                    }}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
      )}

      {showSignup && (
        <SignupModal
          onClose={() => setShowSignup(false)}
          onSignup={handleSignup}
        />
      )}
    </div>
  );
}

function LoginModal({ onClose, onLogin }: { onClose: () => void; onLogin: (username: string, password: string, faCode?: string) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [faCode, setFaCode] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [loading, setLoading] = useState(false);

  const check2FA = async (username: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/check-2fa?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      setShow2FA(data.requires2FA);
    } catch (error) {
      // Ignore errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(username, password, faCode);
    } catch (error) {
      // Error already handled in onLogin
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal active" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>LOGIN</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (e.target.value) check2FA(e.target.value);
              }}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {show2FA && (
            <div className="form-group">
              <label>2FA Code</label>
              <input
                type="text"
                value={faCode}
                onChange={(e) => setFaCode(e.target.value)}
                className="fa-code-input"
                placeholder="Enter 2FA code"
                required
              />
            </div>
          )}
          <div className="modal-actions">
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SignupModal({ onClose, onSignup }: { onClose: () => void; onSignup: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await onSignup(username, password);
    } catch (error) {
      // Error already handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal active" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>SIGN UP</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password (min 8 characters)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
