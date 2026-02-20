const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function debug() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lab_manager';
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('lab_manager');

        const fardeen = await db.collection('users').findOne({ name: 'Fardeen' });
        const userId = fardeen._id.toString();

        console.log(`--- FOLDER AUDIT FOR FARDEEN ---`);
        const folders = await db.collection('folders').find({ userId: userId, name: /Algorithmic Design/i }).toArray();

        for (const folder of folders) {
            const files = await db.collection('files').find({
                $or: [{ folderId: String(folder._id) }, { folderId: folder._id }]
            }).toArray();
            console.log(`Folder: [${folder.name}] | ID: [${folder._id}] | Files: ${files.length}`);
            files.forEach(f => console.log(`  - ${f.name}`));
        }

    } finally {
        await client.close();
    }
}

debug().catch(console.error);
