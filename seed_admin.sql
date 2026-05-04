-- AUTO-SEEDER SCRIPT
-- This script will make 'admin@magic.com' an admin without manual UUID copying.

-- 1. Ensure the user exists in Auth (You created it via the Seeder Page or Dashboard)
-- 2. Run this script to create/update the profile.

INSERT INTO public.profiles (id, email, username, full_name, avatar_url, role)
SELECT 
    id, 
    email, 
    'admin', 
    'Magic Admin', 
    'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', 
    'admin'
FROM auth.users
WHERE email = 'admin@magic.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- If the above inserted 0 rows, it means the user 'admin@magic.com' does not exist in Authentication yet.

