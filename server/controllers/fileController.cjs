const supabaseAdmin = require('../config/supabaseAdmin.cjs');
const cloudinary = require('../config/cloudinary.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const pdfParse = require('pdf-parse');

const execPromise = util.promisify(exec);

exports.uploadFile = async (req, res) => {
  let tempInputPath = null;
  let tempOutputPath = null;

  try {
    const { folder_id, edited_content } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file or data provided' });
    }

    if (!folder_id) {
      return res.status(400).json({ success: false, message: 'folder_id is required' });
    }

    // 8. File Size Limit (e.g., > 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File exceeds 20MB limit' });
    }

    // 1. Verify folder ownership and get hierarchy
    const { data: folder, error: folderError } = await supabaseAdmin
      .from('folders')
      .select('id, name, parent_id')
      .eq('id', folder_id)
      .eq('user_id', req.user.id)
      .single();

    if (folderError || !folder) {
      return res.status(403).json({ success: false, message: 'Invalid folder or access denied' });
    }

    let subjectName = '';
    let experimentName = folder.name;
    if (folder.parent_id) {
      const { data: parentFolder } = await supabaseAdmin
        .from('folders')
        .select('name')
        .eq('id', folder.parent_id)
        .single();
      if (parentFolder) subjectName = parentFolder.name;
    }

    const formatTag = (str) => str ? str.toLowerCase().replace(/\s+/g, '-') : '';

    // Language Detection
    const ext = path.extname(file.originalname).toLowerCase();
    const languageMap = {
      '.py': 'python',
      '.c': 'c',
      '.cpp': 'cpp',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.java': 'java',
      '.html': 'html',
      '.css': 'css',
      '.json': 'json',
      '.sql': 'sql',
      '.md': 'markdown',
      '.txt': 'text',
      '.sh': 'bash'
    };
    const language = languageMap[ext] || null;

    let finalBuffer = file.buffer;
    let extractedText = '';
    let content = null;
    let status = 'completed';
    let fileTypeCategory = 'other';

    // 9. MIME Validation (Only run OCR for application/pdf)
    if (file.mimetype === 'application/pdf') {
      fileTypeCategory = 'record';
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
      tempInputPath = path.join(os.tmpdir(), `input-${timestamp}-${safeName}`);
      tempOutputPath = path.join(os.tmpdir(), `output-${timestamp}-${safeName}`);

      try {
        // 1. File Handling: Save uploaded file buffer to temp path
        fs.writeFileSync(tempInputPath, file.buffer);

        // 2 & 3. OCR Execution & Timeout Protection
        // Timeout is set to 60s (60000ms), and maxBuffer is increased to handle large CLI outputs
        const cmd = `ocrmypdf --skip-text --deskew --optimize 1 -l eng "${tempInputPath}" "${tempOutputPath}"`;
        await execPromise(cmd, { timeout: 60000, maxBuffer: 1024 * 1024 * 10 });

        // If success, read the new OCR processed output buffer
        finalBuffer = fs.readFileSync(tempOutputPath);

        // 4. Text Extraction
        const data = await pdfParse(finalBuffer);
        extractedText = data.text;
      } catch (ocrError) {
        // 7. Error Handling (VERY IMPORTANT)
        console.error('OCR Processing Failed:', ocrError);
        // Fallback to original buffer
        finalBuffer = file.buffer;
        status = 'failed';
        extractedText = ''; // No extracted text due to failure
      }
    } else if (language) {
      fileTypeCategory = 'program';
      content = file.buffer.toString('utf-8');
      if (content.length > 50000) content = content.substring(0, 50000); // 50KB limit for search
    } else if (file.mimetype.startsWith('image/')) {
      fileTypeCategory = 'screenshot';
    }

    // Keywords from filename
    const baseName = file.originalname.substring(0, file.originalname.lastIndexOf('.')) || file.originalname;
    const keywords = baseName
      .toLowerCase()
      .split(/[\s_\-]+/)
      .filter(word => word.length >= 3)
      .map(word => word.replace(/[^a-z0-9]/g, ''));

    // Final Tags Construction
    const finalTagsSet = new Set();
    if (subjectName) finalTagsSet.add(formatTag(subjectName));
    finalTagsSet.add(fileTypeCategory);
    if (language) finalTagsSet.add(language);
    
    // Add keywords until max 6 tags total
    for (const kw of keywords) {
      if (finalTagsSet.size >= 6) break;
      if (kw) finalTagsSet.add(kw);
    }

    const tags = Array.from(finalTagsSet);

    // If it's a PDF, we store the extracted OCR text in the search content column
    if (file.mimetype === 'application/pdf' && extractedText) {
      content = extractedText.length > 50000 ? extractedText.substring(0, 50000) : extractedText;
    }

    // 5. Upload File (either processed PDF or original file) to Cloudinary
    let cloudinaryResult;
    try {
      const safeName = file.originalname
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 50);

      cloudinaryResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: `lab_manager/${req.user.id}`,
            public_id: `${Date.now()}-${safeName}`,
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(finalBuffer); // Stream the (processed or original) buffer
      });
    } catch (uploadError) {
      console.error('Cloudinary Upload Error:', uploadError);
      return res.status(500).json({ success: false, message: 'Failed to upload to Cloudinary' });
    }

    // 6. Database Updates
    const { data: dbFile, error: dbError } = await supabaseAdmin
      .from('files')
      .insert([{
        name: file.originalname,
        file_type: file.mimetype,
        size: finalBuffer.length, // Updated size (optimized PDF could be smaller)
        url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
        folder_id: folder_id,
        user_id: req.user.id,
        extracted_text: extractedText,
        status: status,
        edited_content: edited_content ? JSON.parse(edited_content) : null,
        language: language,
        tags: tags,
        content: content
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      // ROLLBACK: Delete from Cloudinary if DB fails
      await cloudinary.uploader.destroy(cloudinaryResult.public_id);
      return res.status(500).json({ success: false, message: 'Failed to save file metadata' });
    }

    // 9. Return Proper Response
    res.status(201).json({
      status: status,
      file_url: dbFile.url,
      extracted_text: dbFile.extracted_text,
      id: dbFile.id,
      ...dbFile // Return the rest of the metadata
    });

  } catch (error) {
    console.error('General Upload Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during upload' });
  } finally {
    // 10. Cleanup
    if (tempInputPath && fs.existsSync(tempInputPath)) {
      try { fs.unlinkSync(tempInputPath); } catch (e) { console.error('Cleanup Error (Input):', e); }
    }
    if (tempOutputPath && fs.existsSync(tempOutputPath)) {
      try { fs.unlinkSync(tempOutputPath); } catch (e) { console.error('Cleanup Error (Output):', e); }
    }
  }
};

exports.getFilesByFolder = async (req, res) => {
  try {
    const { folderId } = req.params;

    // Verify folder ownership first
    const { data: folder, error: folderError } = await supabaseAdmin
      .from('folders')
      .select('id')
      .eq('id', folderId)
      .eq('user_id', req.user.id)
      .single();

    if (folderError || !folder) {
      return res.status(403).json({ success: false, message: 'Access denied to this folder' });
    }

    const { data, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('folder_id', folderId);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get Files Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch files' });
  }
};

exports.getAllFiles = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get All Files Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch all records' });
  }
};

exports.renameFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const { data, error } = await supabaseAdmin
      .from('files')
      .update({ name })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Rename File Error:', error);
    res.status(500).json({ success: false, message: 'Failed to rename file' });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('files')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete File Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
};

exports.cloneFile = async (req, res) => {
  try {
    const { fileId, targetFolderId } = req.body;

    if (!fileId || !targetFolderId) {
      return res.status(400).json({ success: false, message: 'fileId and targetFolderId are required' });
    }

    // 1. Fetch source file metadata (can be from any user)
    const { data: sourceFile, error: sourceError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (sourceError || !sourceFile) {
      return res.status(404).json({ success: false, message: 'Source record not found' });
    }

    // 2. Verify target folder ownership
    const { data: folder, error: folderError } = await supabaseAdmin
      .from('folders')
      .select('id')
      .eq('id', targetFolderId)
      .eq('user_id', req.user.id)
      .single();

    if (folderError || !folder) {
      return res.status(403).json({ success: false, message: 'Invalid destination folder' });
    }

    // 3. Create a NEW file record for the current user
    const { data: clonedFile, error: cloneError } = await supabaseAdmin
      .from('files')
      .insert([{
        name: sourceFile.name,
        file_type: sourceFile.file_type,
        size: sourceFile.size,
        url: sourceFile.url,
        public_id: sourceFile.public_id,
        folder_id: targetFolderId,
        user_id: req.user.id,
        edited_content: sourceFile.edited_content,
      }])
      .select()
      .single();

    if (cloneError) throw cloneError;
    
    res.status(201).json({ success: true, data: clonedFile });
  } catch (error) {
    console.error('Clone File Error:', error);
    res.status(500).json({ success: false, message: 'Synchronization protocol failed' });
  }
};

/**
 * Convert raw OCR text into structured HTML
 */
function convertToHTML(text) {
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let html = '<div class="lab-document">';
  
  lines.forEach(line => {
    // Detect headings (Aim, Theory, Procedure, Program, Output, Result)
    if (line.match(/^(Aim|Theory|Procedure|Program|Algorithm|Output|Result|Observation|Conclusion)/i)) {
      html += `<h2 style="color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px; font-family: sans-serif;">${line}</h2>`;
    } 
    // Detect Experiment Number
    else if (line.match(/^Exp(eriment)?\s*No:?\s*\d+/i)) {
      html += `<h1 style="text-align: center; color: #1e3a8a; margin-bottom: 32px; font-family: sans-serif;">${line}</h1>`;
    }
    // Normal paragraphs
    else {
      html += `<p style="line-height: 1.6; margin-bottom: 16px; color: #334155; font-family: serif; font-size: 11pt;">${line}</p>`;
    }
  });

  html += '</div>';
  return html;
}

/**
 * Process OCR and return structured HTML
 */
exports.processOcrOnly = async (req, res) => {
  let tempInputPath = null;
  let tempOutputPath = null;

  try {
    console.log('--- OCR DEBUG START ---');
    console.log('Headers:', req.headers['content-type']);
    console.log('Body Keys:', Object.keys(req.body || {}));
    console.log('File Present:', !!req.file);
    
    // 0. Support direct text conversion (from client-side OCR)
    if (req.body.text && req.body.text.trim().length > 0) {
      console.log('Direct Text Mode Activated');
      const htmlContent = convertToHTML(req.body.text);
      return res.json({ success: true, html: htmlContent, text: req.body.text });
    }

    const file = req.file;
    if (!file) {
      console.warn('OCR FAIL: No file or text in request');
      return res.status(400).json({ 
        success: false, 
        message: 'No file or text provided',
        debug_body_keys: Object.keys(req.body || {}),
        debug_has_file: !!req.file
      });
    }
    console.log('File Mode Activated:', file.originalname);

    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
    tempInputPath = path.join(os.tmpdir(), `ocr-in-${timestamp}-${safeName}`);
    tempOutputPath = path.join(os.tmpdir(), `ocr-out-${timestamp}-${safeName}`);

    fs.writeFileSync(tempInputPath, file.buffer);

    let textToParse = '';
    
    // Attempt High-Fidelity OCR
    try {
      const cmd = `ocrmypdf --skip-text --deskew "${tempInputPath}" "${tempOutputPath}"`;
      await execPromise(cmd, { timeout: 45000 }); // 45s timeout
      if (fs.existsSync(tempOutputPath)) {
        const ocrBuffer = fs.readFileSync(tempOutputPath);
        const parsed = await pdfParse(ocrBuffer);
        textToParse = parsed.text;
      }
    } catch (ocrErr) {
      console.warn('High-fidelity OCR failed or timed out, falling back to basic extraction:', ocrErr.message);
      // Fallback: Use basic pdf-parse on original buffer
      const parsed = await pdfParse(file.buffer);
      textToParse = parsed.text;
    }

    if (!textToParse || textToParse.trim().length === 0) {
      return res.status(422).json({ success: false, message: 'Could not extract any readable text from this PDF.' });
    }

    const htmlContent = convertToHTML(textToParse);

    res.json({
      success: true,
      html: htmlContent,
      text: textToParse
    });

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ success: false, message: 'OCR process failed' });
  } finally {
    if (tempInputPath && fs.existsSync(tempInputPath)) try { fs.unlinkSync(tempInputPath); } catch (e) {}
    if (tempOutputPath && fs.existsSync(tempOutputPath)) try { fs.unlinkSync(tempOutputPath); } catch (e) {}
  }
};

/**
 * Export edited HTML back to PDF using Puppeteer
 */
exports.exportToPdf = async (req, res) => {
  let browser = null;
  try {
    const { pages, html, filename } = req.body;
    
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    let finalHtml = '';
    
    if (pages && Array.isArray(pages)) {
      // High-Fidelity Multi-Page Reconstruction
      finalHtml = `
        <html>
          <head>
            <style>
              body { margin: 0; padding: 0; background: #fff; }
              .page { 
                position: relative; 
                margin: 0; 
                padding: 0; 
                page-break-after: always;
                overflow: hidden;
              }
              .block { 
                position: absolute; 
                line-height: 1; 
                white-space: nowrap;
                color: #000;
              }
              @media print {
                .page { page-break-after: always; }
              }
            </style>
          </head>
          <body>
            ${pages.map(p => `
              <div class="page" style="width: ${p.width}px; height: ${p.height}px; background-image: url(${p.image}); background-size: 100% 100%;">
                ${p.blocks.map(b => `
                  <div class="block" style="
                    left: ${b.x}px; 
                    top: ${b.y}px; 
                    font-size: ${b.fontSize}px;
                    font-family: 'Times New Roman', serif;
                    font-weight: ${b.isBold ? 'bold' : 'normal'};
                  ">${b.text}</div>
                `).join('')}
              </div>
            `).join('')}
          </body>
        </html>
      `;
    } else {
      // Legacy HTML flow mode
      finalHtml = `
        <html>
          <head>
            <style>
              body { padding: 40px; font-family: serif; }
              @page { margin: 1in; }
              h1, h2 { font-family: sans-serif; }
              p { margin-bottom: 1em; }
            </style>
          </head>
          <body>${html}</body>
        </html>
      `;
    }

    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });
    
    const pdfOptions = pages ? {
      width: pages[0].width + 'px',
      height: pages[0].height + 'px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    } : {
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    };

    const pdfBuffer = await page.pdf(pdfOptions);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'export.pdf'}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF Export Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  } finally {
    if (browser) await browser.close();
  }
};

// Save overlay edits for a file (stores block positions + text in DB)
exports.saveOverlay = async (req, res) => {
  try {
    const { id } = req.params;
    const { blocks } = req.body;

    if (!blocks || !Array.isArray(blocks)) {
      return res.status(400).json({ success: false, message: 'blocks array is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('files')
      .update({ edited_content: { blocks } })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('id, edited_content')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Save Overlay Error:', error);
    res.status(500).json({ success: false, message: 'Failed to save overlay' });
  }
};

// Load saved overlay edits for a file
exports.getOverlay = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('files')
      .select('edited_content')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    res.json({ success: true, blocks: data?.edited_content?.blocks || [] });
  } catch (error) {
    console.error('Get Overlay Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load overlay' });
  }
};

exports.searchFiles = async (req, res) => {
  try {
    const { q, language, type, tag } = req.query;

    let query = supabaseAdmin
      .from('files')
      .select('*')
      .eq('user_id', req.user.id);

    if (q) {
      // Search in name, content, language, and tags
      query = query.or(`name.ilike.%${q}%,content.ilike.%${q}%,language.ilike.%${q}%,tags.cs.{${q}}`);
    }

    if (language) {
      query = query.eq('language', language);
    }

    if (type) {
      if (type === 'record') {
        query = query.or(`tags.cs.{${type}},file_type.eq.application/pdf`);
      } else if (type === 'screenshot') {
        query = query.or(`tags.cs.{${type}},file_type.ilike.image/%`);
      } else {
        query = query.contains('tags', [type]);
      }
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Search error:', error);
      return res.status(500).json({ success: false, message: 'Search failed' });
    }

    res.json(data);
  } catch (error) {
    console.error('Search exception:', error);
    res.status(500).json({ success: false, message: 'Internal server error during search' });
  }
};
