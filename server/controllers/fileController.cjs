const supabaseAdmin = require('../config/supabaseAdmin.cjs');
const cloudinary = require('../config/cloudinary.cjs');

exports.uploadFile = async (req, res) => {
  try {
    const { folder_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (!folder_id) {
      return res.status(400).json({ success: false, message: 'folder_id is required' });
    }

    // 1. Verify folder ownership
    const { data: folder, error: folderError } = await supabaseAdmin
      .from('folders')
      .select('id')
      .eq('id', folder_id)
      .eq('user_id', req.user.id)
      .single();

    if (folderError || !folder) {
      return res.status(403).json({ success: false, message: 'Invalid folder or access denied' });
    }

    // 2. Upload to Cloudinary with Isolation and Sanitization
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
        uploadStream.end(file.buffer);
      });
    } catch (uploadError) {
      console.error('Cloudinary Upload Error:', uploadError);
      return res.status(500).json({ success: false, message: 'Failed to upload to Cloudinary' });
    }

    // 3. Store metadata in Supabase
    const { data: dbFile, error: dbError } = await supabaseAdmin
      .from('files')
      .insert([{
        name: file.originalname,
        file_type: file.mimetype,
        size: file.size,
        url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
        folder_id: folder_id,
        user_id: req.user.id,
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      // ROLLBACK: Delete from Cloudinary if DB fails
      await cloudinary.uploader.destroy(cloudinaryResult.public_id);
      return res.status(500).json({ success: false, message: 'Failed to save file metadata' });
    }

    res.status(201).json(dbFile);
  } catch (error) {
    console.error('General Upload Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during upload' });
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
