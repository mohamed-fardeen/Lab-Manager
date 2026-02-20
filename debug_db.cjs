const { MongoClient } = require('mongodb');

async function debug() {
    const uri = 'mongodb+srv://mohamedfardeen1234_db_user:kWWlBhn2ATPIMdjH@cluster0.vvuz2r9.mongodb.net/';
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('lab_manager');

        const fardeen = await db.collection('users').findOne({ name: 'Fardeen' });
        const userId = fardeen._id.toString();

        // Only get subfolders (those that have a parentId)
        const subFolders = await db.collection('folders').find({ userId, parentId: { $exists: true } }).toArray();
        console.log('SUBFOLDERS:');
        subFolders.forEach(f => {
            console.log(JSON.stringify({ name: f.name, parentId: f.parentId }));
        });
    } finally {
        await client.close();
    }
}
debug().catch(console.error);
