const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.updatePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: 'New password must be at least 8 characters long' 
            });
        }

        // 🚀 Use Supabase Admin to force update the password
        // Note: For production, you might want to verify the currentPassword first
        // by attempting a sign-in with the user's email.
        
        const { data, error } = await supabase.auth.admin.updateUserById(id, {
            password: newPassword
        });

        if (error) {
            console.error('Password update error:', error);
            return res.status(500).json({ 
                success: false, 
                message: error.message || 'Failed to update password' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Access Protocol updated successfully' 
        });
    } catch (error) {
        console.error('User Controller Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};
