import pkg from 'pg';
const { Client } = pkg;

const directUrl = "postgresql://postgres.uehtbtbjovutevqovaum:oXZl7rwVq9xO4oUC@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

async function testConnection() {
    const client = new Client({
        connectionString: directUrl,
    });
    try {
        console.log('Attempting to connect to DIRECT_URL...');
        await client.connect();
        console.log('Connection successful!');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('Connection failed:', err.message);
    }
}

testConnection();
