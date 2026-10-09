# Supabase setup

The app is local-first. It continues saving to the browser when Supabase is unavailable and automatically backs up changes after an authenticated user connects.

1. Create a Supabase project.
2. Open **SQL Editor**, paste the contents of `supabase/migrations/001_user_workout_data.sql`, and run it once.
3. In **Authentication → URL Configuration**, set the production Vercel URL as the Site URL. Add `http://127.0.0.1:5173/**` as an additional redirect URL for local development.
4. In **Authentication → Sign In / Providers**, keep Email enabled. To support the “Continue with Google” button, enable Google and add a Google OAuth client ID and secret. In Google Cloud, use the Supabase callback URL shown on that provider screen as the authorized redirect URI.
5. Copy the Project URL and Publishable key from the Supabase project settings.
6. Add these variables locally and in the Vercel project:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

7. Redeploy after adding the Vercel variables.
8. Open the app and sign in with an email/password account or Google. Email confirmation behavior follows the setting in **Authentication → Sign In / Providers → Email**.

The publishable key is designed for browser use. Access to workout data is enforced by authentication and row-level security. Never place a Supabase service-role key in a `VITE_` variable or browser code.

Each user has one private JSON workout document in `public.user_workout_data`. It includes routines, variations, sessions, order snapshots, sets, comments, and the unfinished draft. The app uploads the existing device copy when that user has no cloud record; returning devices choose the newer local or cloud copy. A browser belonging to a different previously signed-in user starts with a clean routine instead of uploading the other user’s local data.
