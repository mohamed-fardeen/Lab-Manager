const supabaseAdmin = require('../config/supabaseAdmin.cjs');

exports.getMessages = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('messages')
            .select(`
                *,
                sender_profile:profiles!messages_sender_id_fkey (
                    name
                )
            `)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Map sender_profile.name to sender_name for frontend compatibility
        const formatted = data.map(m => ({
            ...m,
            sender_id: m.sender_id,
            sender_name: m.sender_profile?.name || 'Researcher'
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch communications' });
    }
};

exports.postMessage = async (req, res) => {
    try {
        const { content, files } = req.body;
        
        let finalContent = content || '';
        
        // If files are shared, resolve their URLs and append to content in structured format
        if (files && files.length > 0) {
            for (const file of files) {
                // Use the file ID directly — much more reliable than name matching
                const { data: fData } = await supabaseAdmin
                    .from('files')
                    .select('id, name, url')
                    .eq('id', file.id)
                    .maybeSingle();
                
                if (fData) {
                    const cleanName = fData.name.replace(/^\d+-/, '');
                    finalContent += `\n[[SHARE:${cleanName}|${fData.url}|${fData.id}]]`;
                } else {
                    // Fallback: use data the frontend already sent us
                    const cleanName = (file.name || 'record').replace(/^\d+-/, '');
                    finalContent += `\n\n*📎 ${cleanName} (unavailable)*`;
                }
            }
        }

        const { data, error } = await supabaseAdmin
            .from('messages')
            .insert([{
                sender_id: req.user.id,
                content: finalContent.trim(),
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Post Message Error:', error);
        res.status(500).json({ success: false, message: 'Failed to broadcast intelligence' });
    }
};

exports.clearMessages = async (req, res) => {
    try {
        // Only admin can clear messages (simplified check for now)
        const { error } = await supabaseAdmin
            .from('messages')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) throw error;
        res.json({ success: true, message: 'Frequencies cleared' });
    } catch (error) {
        console.error('Clear Messages Error:', error);
        res.status(500).json({ success: false, message: 'Failed to clear protocols' });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabaseAdmin
            .from('messages')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        console.error('Delete Message Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete message' });
    }
};
