const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function debug() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lab_manager';
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('lab_manager');

        const folder = await db.collection('folders').findOne({ name: 'Program' });
        if (folder) {
            console.log(`Folder [${folder.name}] has parentId: [${folder.parentId}] | Type: ${typeof folder.parentId}`);
        }

    } finally {
        await client.close();
    }
}

debug().catch(console.error);
