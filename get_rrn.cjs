const { MongoClient } = require('mongodb');
require('dotenv').config();
async function run() {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('lab_manager');
    const user = await db.collection('users').findOne({ name: /Fardeen/i });
    console.log(JSON.stringify(user));
    await client.close();
}
run();
