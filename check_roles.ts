import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmins() {
    const { data, error } = await supabase.from('profiles').select('id, email, role, full_name');
    if (error) {
        console.error("Error fetching profiles:", error);
    } else {
        console.log("All profiles:");
        console.table(data);
    }
}

checkAdmins();
