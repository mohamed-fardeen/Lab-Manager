require('dotenv').config();
const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');

const {
  MONGODB_URI,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

const mongo = new MongoClient(MONGODB_URI);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function cleanFilename(name) {
    if (!name) return 'unnamed_record';
    // Remove known timestamp patterns (e.g., 1776679348123-)
    let clean = name.replace(/^\d+-/, '');
    // Restore extensions if they were converted to underscores (e.g., _py -> .py)
    const extensions = ['.py', '.txt', '.js', '.json', '.html', '.css', '.md'];
    extensions.forEach(ext => {
        const underscoreExt = ext.replace('.', '_'); // e.g. _py
        if (clean.endsWith(underscoreExt)) {
            clean = clean.slice(0, -underscoreExt.length) + ext;
        }
    });
    return clean;
}

(async () => {
    try {
        console.log('🚀 Starting Message Migration (V5 - Interactive Share Blocks)...');
        await mongo.connect();
        const db = mongo.db();

        // 1. Fetch Lookups
        console.log('Fetching Supabase data for mapping...');
        const { data: supabaseProfiles } = await supabase.from('profiles').select('id, rrn');
        const { data: supabaseFiles } = await supabase.from('files').select('id, name, url, user_id');
        
        // Map: rrn -> supabaseUserId
        const profileMap = new Map();
        supabaseProfiles.forEach(p => profileMap.set(p.rrn, p.id));

        // Map: supabaseUserId:filename -> {url, id}
        const fileLinkMap = new Map();
        supabaseFiles.forEach(f => fileLinkMap.set(`${f.user_id}:${f.name}`, { url: f.url, id: f.id }));

        // Map: mongoUserId -> supabaseUserId
        const mongoUsers = await db.collection('users').find().toArray();
        const userMap = new Map();
        for (const u of mongoUsers) {
            const sid = profileMap.get(u.rrn);
            if (sid) userMap.set(u._id.toString(), sid);
        }

        // 2. Clear existing messages
        console.log('Cleaning up existing Supabase messages...');
        await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // 3. Fetch MongoDB Messages
        const mongoMessages = await db.collection('messages').find().toArray();
        console.log(`Found ${mongoMessages.length} messages in MongoDB.`);

        let success = 0;
        let failed = 0;

        for (const m of mongoMessages) {
            const supabaseUserId = userMap.get(m.senderId?.toString());
            
            let content = m.content || '';
            let interactiveShares = '';

            if (m.files && m.files.length > 0) {
                m.files.forEach(f => {
                    // Try to find the file in Supabase
                    const fileInfo = fileLinkMap.get(`${supabaseUserId}:${f.name}`);
                    if (fileInfo) {
                        const displayName = cleanFilename(f.name);
                        // Structured Tag: [[SHARE:DisplayName|URL|SupabaseID]]
                        interactiveShares += `\n[[SHARE:${displayName}|${fileInfo.url}|${fileInfo.id}]]`;
                    } else {
                        interactiveShares += `\n\n*📎 Shared Record: ${f.name} (Archives only)*`;
                    }
                });
            }

            const messageData = {
                sender_id: supabaseUserId || null,
                content: (content + interactiveShares).trim(),
                created_at: new Date(m.timestamp).toISOString()
            };

            const { error } = await supabase.from('messages').insert(messageData);
            
            if (error) {
                console.error(`❌ Failed: ${m._id} - ${error.message}`);
                failed++;
            } else {
                success++;
            }
        }

        console.log('\n--- Migration Finished ---');
        console.log(`Success: ${success}`);
        console.log(`Failed: ${failed}`);

        process.exit(0);

    } catch (err) {
        console.error('Fatal Migration Error:', err);
        process.exit(1);
    } finally {
        await mongo.close();
    }
})();
