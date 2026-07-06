require('dotenv').config();
const supabase = require('../config/supabaseAdmin.cjs');

async function inspect() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'files';
    `
  });
  
  if (error) {
    console.error('Error fetching columns:', error);
    // Fallback: try fetching one row
    const { data: row, error: rowError } = await supabase.from('files').select('*').limit(1);
    if (rowError) console.error('Row fetch error:', rowError);
    else console.log('Sample row columns:', Object.keys(row[0]));
  } else {
    console.log('Columns:', data);
  }
}

inspect();
