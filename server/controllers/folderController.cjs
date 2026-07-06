const supabaseAdmin = require('../config/supabaseAdmin.cjs');

exports.getFolders = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('folders')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Get Folders Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch folders' });
  }
};

exports.createFolder = async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    // VALIDATION: If parent_id is provided, verify it belongs to the user
    if (parent_id) {
      const { data: parentFolder, error: parentError } = await supabaseAdmin
        .from('folders')
        .select('id, type')
        .eq('id', parent_id)
        .eq('user_id', req.user.id)
        .single();

      if (parentError || !parentFolder) {
        return res.status(403).json({
          success: false,
          message: 'Invalid parent folder: Access denied or folder does not exist'
        });
      }
    }

    // `type` is NOT NULL on the folders table. Root folders are 'subject';
    // anything nested under a parent is 'category'. The DB CHECK constraint
    // only allows these two values.
    const folderType = parent_id ? 'category' : 'subject';

    const { data, error } = await supabaseAdmin
      .from('folders')
      .insert([{
        name,
        user_id: req.user.id,
        parent_id: parent_id || null,
        type: folderType,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Create Folder Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create folder' });
  }
};

exports.updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const { data, error } = await supabaseAdmin
      .from('folders')
      .update({ name })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(403).json({ success: false, message: 'Access denied or folder not found' });
    
    res.json(data);
  } catch (error) {
    console.error('Update Folder Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update folder' });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;

    // We use the database's ON DELETE CASCADE for subfolders and files.
    // However, we MUST still verify ownership of the root folder being deleted.
    const { error } = await supabaseAdmin
      .from('folders')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Folder and its contents deleted successfully' });
  } catch (error) {
    console.error('Delete Folder Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete folder' });
  }
};
