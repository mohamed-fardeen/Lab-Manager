require('dotenv').config();
const supabase = require('../config/supabaseAdmin.cjs');
const path = require('path');
const https = require('https');

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Fetches content from a URL as text.
 * @param {string} url 
 * @returns {Promise<string>}
 */
async function fetchContent(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', (err) => reject(err));
    }).on('error', (err) => reject(err));
  });
}

async function backfill() {
  console.log(`🚀 Starting Backfill Metadata ${DRY_RUN ? '(DRY RUN)' : ''}...`);

  // Step 1: Fetch files and folders
  console.log('Fetching files and folders...');
  const { data: files, error: filesError } = await supabase
    .from('files')
    .select('id, name, file_type, url, folder_id, language, tags, content');

  if (filesError) {
    console.error('Error fetching files:', filesError);
    return;
  }

  const { data: folders, error: foldersError } = await supabase
    .from('folders')
    .select('id, name, parent_id');

  if (foldersError) {
    console.error('Error fetching folders:', foldersError);
    return;
  }

  const folderMap = new Map(folders.map(f => [f.id, f]));

  const BATCH_SIZE = 50;
  let processed = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing batch ${i / BATCH_SIZE + 1} (${batch.length} files)...`);

    for (const file of batch) {
      processed++;

      // Skip if already has metadata (per rules: DO NOT overwrite existing data)
      if (file.language && file.tags && file.content) {
        skipped++;
        continue;
      }

      const ext = path.extname(file.name).toLowerCase();
      
      // Step 2: Language Detection
      const languageMap = {
        '.py': 'python',
        '.c': 'c',
        '.cpp': 'cpp',
        '.js': 'javascript'
      };
      const language = languageMap[ext] || null;

      // Step 3: Tag Generation (Final Logic)
      const folder = folderMap.get(file.folder_id);
      const parentFolder = folder && folder.parent_id ? folderMap.get(folder.parent_id) : null;
      const subjectName = parentFolder ? parentFolder.name : (folder ? folder.name : ''); // Subject is parent, or folder if no parent

      const formatTag = (str) => str ? str.toLowerCase().replace(/\s+/g, '-') : '';
      
      let fileTypeCategory = 'other';
      if (file.file_type === 'application/pdf') fileTypeCategory = 'record';
      else if (language) fileTypeCategory = 'program';
      else if (file.file_type.startsWith('image/')) fileTypeCategory = 'screenshot';

      // Keywords from filename
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
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

      // ONLY process program files for now (Rule: ignore documents and screenshots)
      if (!language) {
        skipped++;
        continue;
      }

      const tags = Array.from(finalTagsSet);

      // Step 4: Content Extraction (ONLY for program files - Rule 5)
      let content = file.content;
      if (!content && language) {
        // Fetch program code from Cloudinary
        try {
          console.log(`   🔍 Fetching content for ${file.name}...`);
          const rawContent = await fetchContent(file.url);
          // DO NOT store large content
          content = rawContent.length > 50000 ? rawContent.substring(0, 50000) : rawContent;
        } catch (err) {
          console.warn(`   ⚠️ Failed to fetch content for ${file.name}:`, err.message);
        }
      }

      // Step 5: Update Updates (ONLY if NULL)
      const updates = {};
      if (file.language === null) updates.language = language;
      if (file.tags === null) updates.tags = tags;
      if (file.content === null) updates.content = content;

      if (Object.keys(updates).length > 0) {
        if (DRY_RUN) {
          console.log(`   [DRY RUN] Would update ${file.name}:`, JSON.stringify(updates));
          updated++;
        } else {
          const { error: updateError } = await supabase
            .from('files')
            .update(updates)
            .eq('id', file.id);

          if (updateError) {
            console.error(`   ❌ Failed to update ${file.name}:`, updateError.message);
          } else {
            console.log(`   ✅ Updated ${file.name}`);
            updated++;
          }
        }
      } else {
        skipped++;
      }
    }
  }

  console.log(`\n--- Backfill Finished ---`);
  console.log(`Total Files: ${files.length}`);
  console.log(`Processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

backfill();
