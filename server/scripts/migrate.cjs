require('dotenv').config();
const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

// --- CONFIGURATION ---
const {
  MONGODB_URI,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables. Check your .env file.');
  process.exit(1);
}

// --- INITIALIZATION ---
const mongo = new MongoClient(MONGODB_URI);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const DRY_RUN = process.argv.includes('--dry-run');

// --- STATS & MAPS ---
const stats = {
  users: 0,
  folders: 0,
  files: 0,
  skipped: 0,
  failed: 0,
};

const userMap = new Map(); // mongo_id -> supabase_id
const folderMap = new Map(); // mongo_id -> supabase_id
const folderToUserMap = new Map(); // mongo_folder_id -> supabase_user_id

// --- UTILS ---
const log = (type, msg, data = '') => {
  const emoji = { SUCCESS: '✅', FAILED: '❌', SKIPPED: '⏭️', INFO: 'ℹ️' };
  console.log(`${emoji[type] || '🔹'} [${type}] ${msg}`, data ? `- ${data}` : '');
};

const withRetry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      log('INFO', `Retrying operation... (${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
};

const sanitizeName = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 50);
};

// --- MAIN MIGRATION ---
(async () => {
  try {
    log('INFO', `Starting Migration... ${DRY_RUN ? '(DRY RUN MODE)' : ''}`);
    await mongo.connect();
    const db = mongo.db(); // Uses DB from URI or specify name

    // 1️⃣ PHASE 1: USER MAPPING (via rrn)
    log('INFO', 'Phase 1/3: Mapping Users...');
    const users = await db.collection('users').find().toArray();
    for (const u of users) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('rrn', u.rrn)
        .maybeSingle();

      if (profile) {
        userMap.set(u._id.toString(), profile.id);
        stats.users++;
        log('SUCCESS', `User mapped: ${u.rrn}`, profile.id);
      } else {
        stats.skipped++;
        log('SKIPPED', `User not found in Supabase: ${u.rrn}`);
      }
    }

    // 2️⃣ PHASE 2: FOLDERS (Hierarchy Safe)
    log('INFO', 'Phase 2/3: Migrating Folders...');
    const mongoFolders = await db.collection('folders').find().toArray();
    let unresolved = [...mongoFolders];
    let pass = 1;

    while (unresolved.length > 0) {
      log('INFO', `Processing Folders (Pass ${pass})...`);
      const nextBatch = [];
      let migratedInThisPass = 0;

      for (const f of unresolved) {
        const supabaseUserId = userMap.get(f.userId?.toString());
        if (!supabaseUserId) {
          stats.skipped++;
          continue; // User doesn't exist in Supabase
        }

        // Logic for parent mapping
        const mongoParentId = f.parentId?.toString();
        const supabaseParentId = mongoParentId ? folderMap.get(mongoParentId) : null;

        if (mongoParentId && !supabaseParentId) {
          // Parent not migrated yet, try in next pass
          nextBatch.push(f);
          continue;
        }

        // Check for Duplicates (Idempotency)
        const { data: existing } = await supabase
          .from('folders')
          .select('id')
          .eq('name', f.name)
          .eq('user_id', supabaseUserId)
          .eq('parent_id', supabaseParentId)
          .maybeSingle();

        if (existing) {
          folderMap.set(f._id.toString(), existing.id);
          folderToUserMap.set(f._id.toString(), supabaseUserId);
          stats.skipped++;
          migratedInThisPass++;
          log('SKIPPED', `Folder exists: ${f.name}`);
          continue;
        }

        if (!DRY_RUN) {
          const { data: newFolder, error } = await withRetry(() => 
            supabase.from('folders').insert({
              name: f.name,
              user_id: supabaseUserId,
              parent_id: supabaseParentId,
              type: 'category'
            }).select().single()
          );

          if (error) {
            log('FAILED', `Folder insert failed: ${f.name}`, error.message);
            stats.failed++;
            continue;
          }
          folderMap.set(f._id.toString(), newFolder.id);
          folderToUserMap.set(f._id.toString(), supabaseUserId);
        } else {
          folderMap.set(f._id.toString(), `DRY_RUN_ID_${f._id}`);
          folderToUserMap.set(f._id.toString(), supabaseUserId);
        }

        stats.folders++;
        migratedInThisPass++;
        log('SUCCESS', `Folder migrated: ${f.name}`);
      }

      if (migratedInThisPass === 0 && nextBatch.length > 0) {
        log('FAILED', `Deadlock in folder migration. ${nextBatch.length} folders have missing parents.`);
        stats.failed += nextBatch.length;
        break;
      }

      unresolved = nextBatch;
      pass++;
    }

    // 3️⃣ PHASE 3: FILES (Sequential & Memory Safe)
    log('INFO', 'Phase 3/3: Migrating Files...');
    const fileCursor = db.collection('files').find(); // Using Cursor for memory safety

    while (await fileCursor.hasNext()) {
      const file = await fileCursor.next();
      
      try {
        const mongoFolderId = file.folderId?.toString();
        const mongoUserId = file.userId?.toString();

        const supabaseFolderId = folderMap.get(mongoFolderId);
        let supabaseUserId = userMap.get(mongoUserId);

        // Fallback to folder owner if file.userId is missing
        if (!supabaseUserId && mongoFolderId) {
          supabaseUserId = folderToUserMap.get(mongoFolderId);
        }

        if (!supabaseFolderId) {
          log('FAILED', `Missing folder mapping for file: ${file.name}`, `folderId: ${mongoFolderId}`);
          stats.failed++;
          continue;
        }

        if (!supabaseUserId) {
          log('FAILED', `Missing user mapping for file: ${file.name}`, `folderId: ${mongoFolderId}, userId: ${mongoUserId}`);
          stats.failed++;
          continue;
        }

        // Check for Duplicates
        const { data: existingFile } = await supabase
          .from('files')
          .select('id')
          .eq('name', file.name)
          .eq('folder_id', supabaseFolderId)
          .eq('user_id', supabaseUserId)
          .maybeSingle();

        if (existingFile) {
          stats.skipped++;
          log('SKIPPED', `File already exists: ${file.name}`);
          continue;
        }

        // Processing Base64
        const buffer = Buffer.from(file.data, 'base64');
        const safeName = sanitizeName(file.name);
        
        let uploadResult = null;

        if (!DRY_RUN) {
          // Cloudinary Upload
          uploadResult = await withRetry(() => 
            new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  folder: `lab_manager/${supabaseUserId}`,
                  resource_type: 'auto',
                  public_id: `${Date.now()}-${safeName}`,
                  use_filename: true,
                  unique_filename: true,
                },
                (err, res) => (err ? reject(err) : resolve(res))
              );
              streamifier.createReadStream(buffer).pipe(stream);
            })
          );

          // Supabase Insert
          const { data: dbFile, error: dbError } = await withRetry(() =>
            supabase.from('files').insert({
              name: file.name,
              file_type: file.type,
              size: file.size,
              url: uploadResult.secure_url,
              public_id: uploadResult.public_id,
              folder_id: supabaseFolderId,
              user_id: supabaseUserId,
            }).select().single()
          );

          if (dbError) {
             // ROLLBACK
             log('INFO', `Supabase error, performing rollback for: ${file.name}`);
             await cloudinary.uploader.destroy(uploadResult.public_id);
             throw dbError;
          }
        }

        stats.files++;
        log('SUCCESS', `File migrated: ${file.name}`);

      } catch (err) {
        stats.failed++;
        log('FAILED', `File migration failed: ${file.name}`, err.message);
      }
    }

    // --- FINAL SUMMARY ---
    console.log('\n' + '='.repeat(30));
    console.log('🚀 MIGRATION SUMMARY');
    console.log('='.repeat(30));
    console.log(`Total Users:            ${stats.users}`);
    console.log(`Total Folders Migrated: ${stats.folders}`);
    console.log(`Total Files Migrated:   ${stats.files}`);
    console.log(`Total Skipped:          ${stats.skipped}`);
    console.log(`Total Failed:           ${stats.failed}`);
    console.log('='.repeat(30) + '\n');

    process.exit(0);

  } catch (err) {
    console.error('💥 FATAL ERROR DURING MIGRATION:', err);
    process.exit(1);
  } finally {
    await mongo.close();
  }
})();
