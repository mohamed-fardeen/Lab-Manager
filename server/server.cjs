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

app.post('/api/files/ai-create', async (req, res) => {
  try {
    const { userId, filename, content, folderName } = req.body;

    // Find or create the folder
    let folder = await db.collection('folders').findOne({ userId, name: folderName });

    if (!folder) {
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
    res.json({ success: true, fileId: result.insertedId, folderId: folder._id });
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

    const systemPrompt = `You are "Lab-Bot", a high-end AI Lab Assistant for the Lab Works Manager.
    
    Current User Profile:
    - Name: ${user ? user.name : 'Guest User'}
    
    Workspace Context:
    - Lab Categories: ${folders.filter(f => !f.parentId).map(f => f.name).join(', ') || 'None created yet'}
    - Files Metadata: ${files.map(f => `${f.name} (${f.type})`).join(', ')}
    
    File Contents Provided:
    ${textContext || 'No readable text content available in current context.'}
    
    Instructions:
    1. If image data is provided in the message history, analyze the visual content to answer.
    2. Use the provided text contents from files to answer complex technical questions.
    3. Be professional and concise.
    4. POWERFUL FEATURE: You can automatically create files in the user's workspace.
       To create a file, use the following syntax anywhere in your response:
       <create_file filename="name_of_file.ext" folder="folder_name">
       content of the file
       </create_file>
       If the folder doesn't exist, I will create it. Choose logical folder names like "Scripts", "Notes", "Code", etc.
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