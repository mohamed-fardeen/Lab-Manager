require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import Modular Routes
const folderRoutes = require('./routes/folderRoutes.cjs');
const fileRoutes = require('./routes/fileRoutes.cjs');
const messageRoutes = require('./routes/messageRoutes.cjs');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Static files (React build)
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'Supabase', environment: process.env.NODE_ENV || 'development' });
});

// Catch-all: serve React frontend for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    // Do not leak raw error.message in production
  });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Secure Backend Running on port ${PORT}`);
    console.log(`📁 Database: Supabase PostgreSQL (via Service Role)`);
    console.log(`🔐 Identity: Supabase JWT (via Anon Key)`);
});