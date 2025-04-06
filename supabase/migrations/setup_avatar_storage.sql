/*
        # Setup Avatar Storage

        This script sets up the Supabase Storage bucket and Row Level Security (RLS) policies
        required for user avatar uploads.

        1.  **Create Bucket:**
            - Creates a public bucket named `avatars`. Public buckets allow read access via URLs without special tokens.

        2.  **Enable RLS:**
            - Ensures Row Level Security is enabled on the `storage.objects` table, which is crucial for the policies to take effect.

        3.  **Create Policies:**
            - **Public Read Access:** Allows anyone (`anon`, `authenticated`) to read objects (SELECT) from the `avatars` bucket. This is needed to display avatars.
            - **Authenticated Upload/Update:** Allows authenticated users to insert (upload) and update files in the `avatars` bucket *only if* the file name matches their user ID (`auth.uid()`). This restricts users to managing only their own avatar file.

        4.  **Notes:**
            - Assumes the file path/name convention will be just the `user_id` directly within the `avatars` bucket.
            - Run these commands in the Supabase SQL Editor.
      */

      -- 1. Create the public 'avatars' bucket if it doesn't exist
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif']) -- 5MB limit, common image types
      ON CONFLICT (id) DO NOTHING; -- Do nothing if bucket already exists

      -- 2. Ensure RLS is enabled on storage.objects (Might already be enabled by default)
      -- It's generally safe to run this, but double-check your Supabase project settings if unsure.
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

      -- 3. Create RLS Policies for the 'avatars' bucket

      -- Policy 1: Allow public read access to files in the 'avatars' bucket
      DROP POLICY IF EXISTS "Allow public read access on avatars" ON storage.objects;
      CREATE POLICY "Allow public read access on avatars"
          ON storage.objects
          FOR SELECT
          USING ( bucket_id = 'avatars' );

      -- Policy 2: Allow authenticated users to upload/update their own avatar file
      DROP POLICY IF EXISTS "Allow authenticated upload/update for own avatar" ON storage.objects;
      CREATE POLICY "Allow authenticated upload/update for own avatar"
          ON storage.objects
          FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' AND name = (auth.uid())::text );

      CREATE POLICY "Allow authenticated update for own avatar"
          ON storage.objects
          FOR UPDATE USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' AND name = (auth.uid())::text );

      -- Optional Policy 3: Allow authenticated users to delete their own avatar file (if needed)
      -- DROP POLICY IF EXISTS "Allow authenticated delete for own avatar" ON storage.objects;
      -- CREATE POLICY "Allow authenticated delete for own avatar"
      --     ON storage.objects
      --     FOR DELETE USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' AND name = (auth.uid())::text );

      -- Grant usage on storage schema to roles if not already granted (usually default)
      GRANT USAGE ON SCHEMA storage TO anon, authenticated;
      GRANT SELECT ON TABLE storage.buckets TO anon, authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.objects TO anon, authenticated; -- RLS policies will restrict actual access