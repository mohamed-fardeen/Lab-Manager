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

async function initializeAdmin() {
  try {
    const admin = await db.collection('users').findOne({ rrn: 'ADMIN' });
    if (!admin) {
      await db.collection('users').insertOne({
        name: 'System Administrator',
        rrn: 'ADMIN',
        password: 'ADMIN_PROTOCOL_99',
        role: 'admin',
        created: Date.now()
      });
      console.log('Admin Initialize: Default admin account created (ADMIN/ADMIN_PROTOCOL_99)');
    }
  } catch (error) {
    console.error('Admin Init Error:', error);
  }
}

connectDB().then(async () => {
  await unifyDataTypes();
  await initializeAdmin();
});

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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { rrn, password } = req.body;
    const user = await db.collection('users').findOne({ rrn, password });
    if (user) {
      res.json({ success: true, user, isAdmin: user.role === 'admin' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid RRN or Access Protocol' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!user || user.password !== currentPassword) {
      return res.status(401).json({ error: 'Incorrect current access protocol' });
    }

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { password: newPassword } }
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

app.put('/api/folders/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await db.collection('folders').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name } }
    );
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

app.get('/api/files/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const folders = await db.collection('folders').find({ userId }).toArray();
    const folderIds = folders.map(f => f._id.toString());
    const files = await db.collection('files').find({ folderId: { $in: folderIds } }).toArray();
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

app.get('/api/records/raw/:id', async (req, res) => {
  console.log(`[GET] Fetching raw record for ID: ${req.params.id}`);
  try {
    const file = await db.collection('files').findOne({ _id: new ObjectId(req.params.id) });
    if (!file) {
      console.log(`[404] Record not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Record not found in database' });
    }
    res.json(file);
  } catch (error) {
    console.error(`[500] Error fetching record: ${error.message}`);
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

app.put('/api/files/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await db.collection('files').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name } }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files/clone', async (req, res) => {
  try {
    const { fileId, targetFolderId } = req.body;
    const originalFile = await db.collection('files').findOne({ _id: new ObjectId(fileId) });
    if (!originalFile) {
      return res.status(404).json({ error: 'File not found' });
    }
    const { _id, ...cloneData } = originalFile;
    cloneData.folderId = targetFolderId;
    cloneData.added = Date.now();
    const result = await db.collection('files').insertOne(cloneData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Collaboration
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await db.collection('messages').find().sort({ timestamp: 1 }).limit(100).toArray();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const message = req.body;
    message.timestamp = Date.now();
    // Handle migration from single file to array if needed
    if (message.file && !message.files) {
      message.files = [message.file];
    }
    const result = await db.collection('messages').insertOne(message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Endpoints
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await db.collection('users').find().toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/messages', async (req, res) => {
  try {
    await db.collection('messages').deleteMany({});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/messages/:id', async (req, res) => {
  try {
    await db.collection('messages').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/files/ai-create', async (req, res) => {
  console.log('AI-Create Request Received:', req.body);
  try {
    const { userId, filename, content, folderName, preferredFolderId } = req.body;

    if (!userId || !filename || !folderName) {
      return res.status(400).json({ error: 'Missing userId, filename, or folderName' });
    }

    // ── STEP 1: Determine canonical subfolder name based on file type ──────────
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const CODE_EXTS = ['py', 'js', 'ts', 'c', 'cpp', 'java', 'html', 'css', 'sh', 'sql', 'rb', 'go', 'rs', 'php', 'swift', 'kt', 'r', 'm'];
    const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp'];

    let canonicalSubfolder;
    if (CODE_EXTS.includes(ext)) {
      canonicalSubfolder = 'Program';
    } else if (IMAGE_EXTS.includes(ext)) {
      canonicalSubfolder = 'Screenshots';
    } else {
      canonicalSubfolder = 'Other as Screenshots';
    }
    // Also accept the AI's folder hint if it maps to a known subfolder type
    const hintLower = (folderName || '').toLowerCase();
    if (hintLower.includes('program') || hintLower.includes('code')) canonicalSubfolder = 'Program';
    else if (hintLower.includes('screenshot')) canonicalSubfolder = 'Screenshots';
    else if (hintLower.includes('other')) canonicalSubfolder = 'Other as Screenshots';
    console.log(`Canonical subfolder: "${canonicalSubfolder}" (file: ${filename})`);

    // ── STEP 2: Determine parent category ──────────────────────────────────────
    // Walk from the preferred folder up to the root category
    let parentCategoryId = null;
    if (preferredFolderId) {
      const prefFolder = await db.collection('folders').findOne({ _id: ObjectId.isValid(preferredFolderId) ? new ObjectId(preferredFolderId) : null, userId });
      if (prefFolder) {
        if (!prefFolder.parentId) {
          parentCategoryId = prefFolder._id.toString(); // it IS a root category
        } else {
          parentCategoryId = prefFolder.parentId.toString(); // go up one level
        }
      }
    }

    // ── STEP 3: Find the right subfolder under that parent ────────────────────
    let folder = null;
    if (parentCategoryId) {
      folder = await db.collection('folders').findOne({
        parentId: parentCategoryId,
        userId,
        name: { $regex: new RegExp(`^${canonicalSubfolder}$`, 'i') }
      });
      if (folder) console.log(`Found subfolder: ${folder.name} (${folder._id}) under parent ${parentCategoryId}`);
    }

    // ── STEP 4: Fallback — find ANY subfolder with that name for this user ─────
    if (!folder) {
      folder = await db.collection('folders').findOne({
        userId,
        parentId: { $exists: true },
        name: { $regex: new RegExp(`^${canonicalSubfolder}$`, 'i') }
      });
      if (folder) console.log(`Fallback: found subfolder ${folder.name} (${folder._id})`);
    }

    // ── STEP 5: Create the subfolder if it truly doesn't exist ────────────────
    if (!folder) {
      // Find the best parent category
      const CATEGORY_KEYWORDS = {
        'Algorithmic Design': ['algorithm', 'sort', 'search', 'tree', 'graph', 'binary', 'stack', 'queue', 'heap', 'dynamic', 'logic'],
        'Network Methodologies': ['network', 'socket', 'tcp', 'udp', 'http', 'protocol', 'client', 'server', 'packet', 'routing'],
        'Data Mining': ['data', 'csv', 'mining', 'database', 'sql', 'analysis', 'statistic', 'regression', 'cluster', 'pandas']
      };
      let bestParent = null;
      const fnameLower = filename.toLowerCase();
      for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(k => fnameLower.includes(k))) {
          bestParent = await db.collection('folders').findOne({ userId, name: { $regex: new RegExp(`^${catName}$`, 'i') }, parentId: { $exists: false } });
          if (bestParent) break;
        }
      }
      if (!bestParent) {
        // Default: Algorithmic Design
        bestParent = await db.collection('folders').findOne({ userId, parentId: { $exists: false } });
      }
      console.log(`Creating subfolder "${canonicalSubfolder}" under parent: ${bestParent ? bestParent.name : 'unknown'}`);
      const folderResult = await db.collection('folders').insertOne({
        name: canonicalSubfolder,
        userId,
        parentId: bestParent ? bestParent._id.toString() : null,
        created: Date.now()
      });
      folder = { _id: folderResult.insertedId, name: canonicalSubfolder };
    }

    // ── STEP 6: Determine MIME type from extension ────────────────────────────
    const mimeMap = {
      py: 'text/x-python', js: 'text/javascript', ts: 'text/typescript',
      html: 'text/html', css: 'text/css', c: 'text/x-c', cpp: 'text/x-c++',
      java: 'text/x-java', sh: 'text/x-sh', sql: 'text/x-sql',
      txt: 'text/plain', md: 'text/markdown', json: 'application/json',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml'
    };
    const mimeType = mimeMap[ext] || 'text/plain';

    const file = {
      name: filename,
      type: mimeType,
      size: content.length,
      data: Buffer.from(content).toString('base64'),
      added: Date.now(),
      folderId: folder._id.toString()
    };

    const result = await db.collection('files').insertOne(file);
    console.log(`File saved: ${filename} → folderId: ${folder._id}`);
    res.json({ success: true, fileId: result.insertedId, folderId: folder._id.toString(), subfolderUsed: folder.name });
  } catch (error) {
    console.error('ai-create error:', error);
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

    const activeCategory = folderId ?
      folders.find(f => f._id.toString() === folderId && !f.parentId) ||
      (() => { const sub = folders.find(f => f._id.toString() === folderId && f.parentId); return sub ? folders.find(f => f._id.toString() === sub.parentId) : null; })()
      : null;

    const systemPrompt = `You are "Lab-Bot", the Master System Controller for the Lab Manager Workspace.
    
    ### ⚡ MANDATORY PROTOCOL: FILE SAVING ⚡
    When the user asks you to create a file, code, or content, you MUST save it using this exact XML tag:
    <create_file filename="script.py" folder="Program">
    (file content here)
    </create_file>

    ### 📂 FILE ROUTING RULES (STRICT — always follow these):
    
    **RULE 1 — File Type determines the subfolder:**
    - CODE files (.py, .js, .ts, .c, .cpp, .java, .html, .css, .sh, .sql, any script) → folder="Program"
    - IMAGE files (.png, .jpg, .jpeg, .gif, .bmp, .svg) → folder="Screenshots"
    - ALL OTHER files (documents, .pdf, .txt, .md, .docx, notes, reports) → folder="Other as Screenshots"

    **RULE 2 — Subject determines the PARENT category:**
    - Algorithms, sorting, searching, data structures, logic → parent: "Algorithmic Design"
    - Networks, protocols, sockets, TCP/IP, HTTP, networking → parent: "Network Methodologies"
    - Data, databases, mining, CSV, analysis, statistics → parent: "Data Mining"
    - When unsure, default to the active category shown below.

    **EXAMPLE:** A Python binary search program → <create_file filename="binary_search.py" folder="Program">

    **RULE 3 — NEVER create a file at the root category level. ALWAYS use a subfolder.**
    
    #### 💬 CONVERSATION STYLE:
    - Confirm each save: "✅ Saved \`filename\` → [Parent Category] / [Subfolder]"

    [WORKSPACE STATE]
    User: ${user ? user.name : 'Guest'}
    Active Category: ${activeCategory ? activeCategory.name : 'None'}
    All Categories: ${folders.filter(f => !f.parentId).map(f => f.name).join(', ') || 'None'}
    Subfolders: ${folders.filter(f => f.parentId).map(f => f.name).join(', ') || 'None'}
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

// AI Record Generation (3 Parallel Streams)
app.post('/api/generate-record', async (req, res) => {
  try {
    const { programName, programNumber, date, language, inputType, algorithmType, constraints, userName, userRrn } = req.body;

    const basePrompt = `User: ${userName || 'Student'} (RRN: ${userRrn || 'Unknown'})
Program: ${programName}
Language: ${language}
Input Type: ${inputType}
Algorithm Type: ${algorithmType}
Constraints: ${constraints || 'None'}
IMPORTANT: The program must include logic to count 'comparisons' made during execution, and output the total number of comparisons perfectly.`;

    // Stream 1: Theory
    const p1 = fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `Generate JSON ONLY. Structure: { "aim": "", "algorithm": "" }. Rules: 
- Aim must explicitly be a full sentence starting with "To write a ${language} program to implement..."
- Algorithm must strictly follow user-selected type. 
- If 'pseudocode', use rigid programming pseudocode (e.g., Procedure, variables, BEGIN, IF, END, RETURN). NO plain english.
- If 'steps', use numbered plain english steps. 
- No markdown.` },
          { role: 'user', content: basePrompt }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      })
    });

    // Stream 2: Implementation
    const p2 = fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `Generate JSON ONLY. Structure: { "code": "", "output": "", "result": "" }. Rules:
- Code must perfectly match language and include comparison counting logic.
- If Input Type is "User Input (Dynamic)", the code MUST prompt the user for data at runtime via standard input methods (e.g. scanf, cin, input()). DO NOT hardcode array elements or values!
- Output MUST perfectly reflect a terminal execution of the code. 
- Output MUST have these exact lines at the very top (notice EXACTLY ONE blank line after RRN):
Name: ${userName || 'Student'}
RRN: ${userRrn || 'Unknown'}

(Execution output continues immediately here without large gaps)

- Result should be a standard 1-sentence academic conclusion (e.g. "Thus the program was executed successfully...").` },
          { role: 'user', content: basePrompt }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      })
    });

    // Stream 3: Viva Questions
    const p3 = fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `Generate JSON ONLY. Structure: { "vivaQuestions": [{ "question": "...", "answer": "..." }] }. Rules:
- Generate EXACTLY 5 viva questions.
- Questions must be directly related to the program asked.
- Answers MUST be concise, strictly 1-2 lines.` },
          { role: 'user', content: basePrompt }
        ],
        temperature: 0.6,
        response_format: { type: "json_object" }
      })
    });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    const parseJSON = async (resObj) => {
      const data = await resObj.json();
      if (data.error) throw new Error(data.error.message || 'Groq API Error');
      const text = data.choices[0].message.content;
      try {
        return JSON.parse(text);
      } catch (e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('Failed to parse AI response');
      }
    };

    const d1 = await parseJSON(r1);
    const d2 = await parseJSON(r2);
    const d3 = await parseJSON(r3);

    const result = {
      programNumber: programNumber || '',
      date: date || '',
      title: programName,
      aim: d1.aim || '',
      algorithm: d1.algorithm || '',
      code: d2.code || '',
      output: d2.output || '',
      result: d2.result || '',
      vivaQuestions: d3.vivaQuestions || []
    };

    res.json(result);
  } catch (error) {
    console.error('AI Multi-Stream Generation Error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));