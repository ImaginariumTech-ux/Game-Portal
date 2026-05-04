# Admin Seeding Setup

## Required Environment Variable

To enable admin seeding, you need to add your **Supabase Service Role Key** to your `.env.local` file.

### How to Get Your Service Role Key

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Project Settings** → **API**
4. Under **Project API keys**, find the `service_role` key
5. Copy the key value

### Add to .env.local

Add this line to your `.env.local` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Your complete `.env.local` should look like:

```env
NEXT_PUBLIC_SUPABASE_URL=https://etschqfatclugukntchl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Restart Dev Server

After adding the environment variable, **restart your dev server**:

```bash
# Stop the current server (Ctrl+C in the terminal)
# Then restart:
npm run dev
```

## Security Note

⚠️ **IMPORTANT**: The service role key bypasses all Row Level Security (RLS) policies. 

- **NEVER** expose this key to the client side
- **NEVER** commit this key to version control
- Only use it in server-side code (API routes, server components)
- Keep your `.env.local` file in `.gitignore`

## Usage

Once configured, navigate to `/magicadmins/seed` to create your first admin user.
