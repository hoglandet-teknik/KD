import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;

// Database setup
const db = new Database('share.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());

// API Routes
app.post('/api/share', (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string' || code.trim() === '') {
      return res.status(400).json({ error: 'No code provided' });
    }

    // Validate size (50KB)
    if (Buffer.byteLength(code, 'utf8') > 50 * 1024) {
      return res.status(413).json({ error: 'Code too large (max 50KB)' });
    }

    // Generate a short ID (8 chars)
    const id = Math.random().toString(36).substring(2, 10);

    const stmt = db.prepare('INSERT INTO shares (id, code) VALUES (?, ?)');
    stmt.run(id, code);

    res.json({ id });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

app.get('/api/share', (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Missing id' });
    }

    const stmt = db.prepare('SELECT code FROM shares WHERE id = ?');
    const row = stmt.get(id) as { code: string } | undefined;

    if (!row) {
      return res.status(404).json({ error: 'not_found' });
    }

    res.json({ code: row.code });
  } catch (error) {
    console.error('Retrieve error:', error);
    res.status(500).json({ error: 'Failed to retrieve code' });
  }
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving (not strictly needed for this preview but good practice)
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
