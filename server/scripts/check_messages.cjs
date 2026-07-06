const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMessages() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    const count = await db.collection('messages').countDocuments();
    console.log(`Total Messages in MongoDB: ${count}`);

    if (count > 0) {
      const sample = await db.collection('messages').findOne();
      console.log('Sample Message:', JSON.stringify(sample, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkMessages();
