/*
      # Add avatar_url to profiles table

      This migration adds an optional `avatar_url` column to the `profiles` table
      to store a link to the user's profile picture.

      1.  **Table Modified:**
          - `profiles`
            - **New Column:** `avatar_url` (text, nullable): Stores the URL for the user's avatar image.

      2.  **Notes:**
          - This column allows storing custom avatar URLs.
          - It's often kept in sync with the `raw_user_meta_data ->> 'avatar_url'` in `auth.users` via triggers or application logic, but this migration only adds the column structure.
    */

    -- Add the avatar_url column if it doesn't exist
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'avatar_url'
      ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url text NULL;
        RAISE NOTICE 'Column avatar_url added to profiles table.';
      ELSE
        RAISE NOTICE 'Column avatar_url already exists in profiles table.';
      END IF;
    END $$;