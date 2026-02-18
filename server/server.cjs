require('dotenv').config();

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // for large base64 files

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../dist')));

// API routes
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

connectDB();

const db = client.db('lab_manager');

// API endpoints

// Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.collection('users').find().toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    const result = await db.collection('users').insertOne(user);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Folders
app.get('/api/folders/:userId', async (req, res) => {
  try {
    const folders = await db.collection('folders').find({ userId: req.params.userId }).toArray();
    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/folders', async (req, res) => {
  try {
    const folder = req.body;
    const result = await db.collection('folders').insertOne(folder);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/folders/:id', async (req, res) => {
  try {
    const result = await db.collection('folders').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Files
app.get('/api/files/:folderId', async (req, res) => {
  try {
    const files = await db.collection('files').find({ folderId: req.params.folderId }).toArray();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files', async (req, res) => {
  try {
    const file = req.body;
    const result = await db.collection('files').insertOne(file);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/files/:id', async (req, res) => {
  try {
    const result = await db.collection('files').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));