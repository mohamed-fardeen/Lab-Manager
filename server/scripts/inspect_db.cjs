const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkDb() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    console.log('--- Collections ---');
    const collections = await db.listCollections().toArray();
    console.log(collections.map(c => c.name));

    const usersCount = await db.collection('users').countDocuments();
    const foldersCount = await db.collection('folders').countDocuments();
    const filesCount = await db.collection('files').countDocuments();

    console.log(`Users: ${usersCount}`);
    console.log(`Folders: ${foldersCount}`);
    console.log(`Files: ${filesCount}`);

    if (filesCount > 0) {
      const sampleFile = await db.collection('files').findOne();
      console.log('--- Sample File ---');
      console.log(JSON.stringify({
        ...sampleFile,
        data: sampleFile.data ? `${sampleFile.data.substring(0, 50)}...` : null
      }, null, 2));
    }

    if (usersCount > 0) {
        const sampleUser = await db.collection('users').findOne();
        console.log('--- Sample User ---');
        console.log(JSON.stringify(sampleUser, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkDb();
