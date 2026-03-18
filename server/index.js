const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db'); // Initialize DB on startup

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/events', require('./routes/events'));
app.use('/api/picks', require('./routes/picks'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve built React frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`PickEms server running on port ${PORT}`);
});