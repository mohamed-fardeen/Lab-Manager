const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkIds() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    console.log('--- File Fields ---');
    const fileWithUserId = await db.collection('files').findOne({ userId: { $exists: true } });
    const fileWithoutUserId = await db.collection('files').findOne({ userId: { $exists: false } });
    
    console.log(`File with userId exists: ${!!fileWithUserId}`);
    console.log(`File without userId exists: ${!!fileWithoutUserId}`);

    console.log('--- Folder Fields ---');
    const folderSample = await db.collection('folders').findOne();
    console.log('Sample Folder:', JSON.stringify(folderSample, null, 2));

    const totalFiles = await db.collection('files').countDocuments();
    const filesWithUserId = await db.collection('files').countDocuments({ userId: { $exists: true } });
    console.log(`Total Files: ${totalFiles}`);
    console.log(`Files with direct userId: ${filesWithUserId}`);

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkIds();
