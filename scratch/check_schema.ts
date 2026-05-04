import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://etschqfatclugukntchl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0c2NocWZhdGNsdWd1a250Y2hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYzNTIyNiwiZXhwIjoyMDg2MjExMjI2fQ.j576G4pjxu0COFWzflfbUBc2x0nve8gy2bkHQk3lKyQ'
);

async function checkSchema() {
  console.log('Checking games...');
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error reading games:', error);
  } else {
    console.log('Columns in games:', Object.keys(data[0] || {}));
    if (data.length > 0) {
      console.log('Sample data:', data[0]);
    }
  }
}

checkSchema();
