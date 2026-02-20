require('dotenv').config();

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
let pdfParse;
try {
  pdfParse = require('pdf-parse').PDFParse;
} catch (e) {
  console.log('pdf-parse not found, PDF text extraction disabled');
}

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

// Data Migration / Type Unification on startup
async function unifyDataTypes() {
  try {
    const files = await db.collection('files').find({}).toArray();
    let updatedCount = 0;
    for (const file of files) {
      if (file.folderId && typeof file.folderId !== 'string') {
        await db.collection('files').updateOne(
          { _id: file._id },
          { $set: { folderId: file.folderId.toString() } }
        );
        updatedCount++;
      }
    }
    if (updatedCount > 0) console.log(`Data Unification: normalized ${updatedCount} file folderId fields to strings.`);

    // Normalize folders parentId
    const folders = await db.collection('folders').find({}).toArray();
    let folderUpdates = 0;
    for (const folder of folders) {
      if (folder.parentId && typeof folder.parentId !== 'string') {
        await db.collection('folders').updateOne(
          { _id: folder._id },
          { $set: { parentId: folder.parentId.toString() } }
        );
        folderUpdates++;
      }
    }
    if (folderUpdates > 0) console.log(`Data Unification: normalized ${folderUpdates} folder parentId fields to strings.`);
  } catch (error) {
    console.error('Data Unification Error:', error);
  }
}

connectDB().then(unifyDataTypes);

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

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { name } }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
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
    const { folderId } = req.params;
    // Query for folderId as either a string OR an ObjectId
    const queryItems = [{ folderId: folderId }];
    if (ObjectId.isValid(folderId)) {
      queryItems.push({ folderId: new ObjectId(folderId) });
    }
    const query = { $or: queryItems };
    const files = await db.collection('files').find(query).toArray();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files', async (req, res) => {
  try {
    const file = req.body;
    // Ensure folderId is always a string for AI/UI consistency
    if (file.folderId && typeof file.folderId !== 'string') {
      file.folderId = file.folderId.toString();
    }
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

app.post('/api/files/ai-create', async (req, res) => {
  console.log('AI-Create Request Received:', req.body);
  try {
    const { userId, filename, content, folderName, preferredFolderId } = req.body;

    if (!userId || !filename || !folderName) {
      console.error('Missing required fields for AI file creation');
      return res.status(400).json({ error: 'Missing userId, filename, or folderName' });
    }

    let folder = null;

    // 1. Try to use the preferred folder if it matches the name
    if (preferredFolderId && ObjectId.isValid(preferredFolderId)) {
      const prefFolder = await db.collection('folders').findOne({ _id: new ObjectId(preferredFolderId), userId });
      if (prefFolder && prefFolder.name.toLowerCase() === folderName.toLowerCase()) {
        folder = prefFolder;
        console.log(`Using preferred folder: ${folder.name} (${folder._id})`);
      }
    }

    // 1.5 Try to find a subfolder of the preferred folder that matches the name
    if (!folder && preferredFolderId) {
      folder = await db.collection('folders').findOne({
        parentId: preferredFolderId.toString(),
        userId,
        name: { $regex: new RegExp(`^${folderName}$`, 'i') }
      });
      if (folder) console.log(`Found matching subfolder: ${folder.name} (${folder._id}) from preferred parent`);
    }

    // 2. Search for existing folder by name for this user
    if (!folder) {
      folder = await db.collection('folders').findOne({
        userId,
        name: { $regex: new RegExp(`^${folderName}$`, 'i') }
      });
      if (folder) console.log(`Found existing folder by name: ${folder.name} (${folder._id})`);
    }

    // 3. Create new folder if still not found
    if (!folder) {
      console.log(`Creating new folder: ${folderName}`);
      const folderResult = await db.collection('folders').insertOne({
        name: folderName,
        userId,
        created: Date.now()
      });
      folder = { _id: folderResult.insertedId, name: folderName };
    }

    const file = {
      name: filename,
      type: 'text/plain', // Default to plain text, frontend/extension can refine
      size: content.length,
      data: Buffer.from(content).toString('base64'),
      added: Date.now(),
      folderId: folder._id.toString()
    };

    const result = await db.collection('files').insertOne(file);
    res.json({ success: true, fileId: result.insertedId, folderId: folder._id.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Chat
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, userId, folderId, model: requestedModel, history } = req.body;

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    const folders = await db.collection('folders').find({ userId }).toArray();

    // Focus on folders relevant to the current view or all if none
    const folderIds = folderId ? [folderId] : folders.map(f => f._id.toString());

    const files = await db.collection('files').find({
      folderId: { $in: folderIds }
    }).toArray();

    let textContext = "";
    let imagesForVision = [];

    for (const file of files) {
      if (file.type.startsWith('image/') && imagesForVision.length < 3) {
        imagesForVision.push({
          type: "image_url",
          image_url: { url: `data:${file.type};base64,${file.data}` }
        });
      } else if (file.type === 'application/pdf' && pdfParse) {
        try {
          const buffer = Buffer.from(file.data, 'base64');
          console.log(`Attempting to parse PDF: ${file.name}, size: ${buffer.length} bytes`);
          const parser = new pdfParse({ data: buffer });
          const pdfData = await parser.getText();
          console.log(`Successfully parsed PDF: ${file.name}`);
          textContext += `\n--- START PDF: ${file.name} ---\n${pdfData.text.substring(0, 5000)}\n--- END PDF ---\n`;
        } catch (err) {
          console.error(`Error reading PDF ${file.name}:`, err);
          textContext += `\n[Error reading PDF ${file.name}]\n`;
        }
      } else if (file.type.includes('text') || file.type.includes('json') || file.type.includes('javascript') || file.type.includes('typescript')) {
        const text = Buffer.from(file.data, 'base64').toString('utf8');
        textContext += `\n--- START FILE: ${file.name} ---\n${text.substring(0, 5000)}\n--- END FILE ---\n`;
      }
    }

    const activeFolder = folderId ? folders.find(f => f._id.toString() === folderId) : null;

    const systemPrompt = `You are "Lab-Bot", the Master System Controller for the Lab Manager Workspace.
    
    ### ⚡ MANDATORY PROTOCOL: SYSTEM WRITE CAPABILITY ⚡
    1. STATUS: You ARE connected to the filesystem. 
    2. CAPABILITY: You HAVE the power to create, save, and organize files.
    3. FORBIDDEN: NEVER say "I am a language model" or "I cannot create files".
    4. ACTION: When code or content is requested, YOU MUST AUTOMATICALLY SAVE IT using the tag below.

    #### 🛠️ FILE CREATION SYNTAX (REQUIRED):
    <create_file filename="script.py" folder="${activeFolder ? activeFolder.name : 'Folder Name'}">
    (content here)
    </create_file>

    #### 📂 SMART ORGANIZATION:
    - **PRIORITY 1:** If the user is viewing a folder (see "Active Category" below), SAVE FILES THERE by default.
    - **PRIORITY 2:** Check "Existing Categories" below. If one matches the scope, use it.
    - **PRIORITY 3:** If no folder fits, create a logical one.

    #### 💬 CONVERSATION STYLE:
    - Act like a high-level system interface.
    - Confirm the save: "System Update: File 'name.ext' has been locked into the '${activeFolder ? activeFolder.name : 'Folder'}' category."

    [WORKSPACE STATE]
    User: ${user ? user.name : 'Guest'}
    Active Category: ${activeFolder ? activeFolder.name : 'None (Root View)'}
    Existing Categories: ${folders.filter(f => !f.parentId).map(f => f.name).join(', ') || 'None'}
    Current Files: ${files.map(f => f.name).join(', ')}
    `;

    const isVisionModel = requestedModel && requestedModel.includes('vision');
    const model = requestedModel || (imagesForVision.length > 0 ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile');

    const userContent = [
      { type: "text", text: message }
    ];
    // Only send images if we are using a vision model
    if (imagesForVision.length > 0 && (isVisionModel || !requestedModel)) {
      userContent.push(...imagesForVision);
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userContent }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'Groq API Error');
    }
    res.json({ message: data.choices[0].message.content });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));