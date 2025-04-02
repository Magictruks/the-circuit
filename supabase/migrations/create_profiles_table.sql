/*
      # Create profiles table and related triggers (v2 - Fix moddatetime)

      This migration creates the `profiles` table to store user-specific settings
      and preferences, such as selected gyms and display name. It also sets up
      RLS policies and triggers for automatic row creation and timestamp updates.

      **Changes in v2:** Replaced the dependency on the `moddatetime()` extension
      with a custom trigger function (`set_updated_at_timestamp`) to update the
      `updated_at` column.

      1. New Tables
         - `profiles`
           - `user_id` (uuid, primary key, foreign key -> auth.users.id): Links to the authenticated user. Set up with ON DELETE CASCADE.
           - `display_name` (text): User's chosen display name. Defaults to an empty string.
           - `selected_gym_ids` (uuid[]): Array of gym IDs the user has favourited/selected. Defaults to an empty array.
           - `current_gym_id` (uuid, foreign key -> gyms.id): The gym currently active in the user's UI. Can be NULL if no gym is active. Set up with ON DELETE SET NULL.
           - `created_at` (timestamptz): Timestamp of when the metadata row was created.
           - `updated_at` (timestamptz): Timestamp of the last update to the metadata row.

      2. New Functions & Triggers
         - `handle_new_user()`: Trigger function to automatically insert a new row into `profiles` when a user is created in `auth.users`. It copies the `display_name` from `raw_user_meta_data` if available.
         - `create_profiles_trigger`: Trigger that executes `handle_new_user()` after an insert on `auth.users`.
         - `handle_update_profiles()`: Trigger function to automatically update the `display_name` in `profiles` when `raw_user_meta_data` in `auth.users` is updated.
         - `update_profiles_trigger`: Trigger that executes `handle_update_profiles()` after an update on `auth.users`.
         - `set_updated_at_timestamp()`: Custom trigger function to set `updated_at = now()` before an update on `profiles`.
         - `set_profiles_updated_at`: Trigger that executes `set_updated_at_timestamp()` before an update on `profiles`.

      3. Security
         - Enable RLS on `profiles` table.
         - Policy "Users can view their own metadata": Allows authenticated users to select their own row.
         - Policy "Users can insert their own metadata": Allows authenticated users to insert a row corresponding to their own `user_id`. (Primarily for the trigger function).
         - Policy "Users can update their own metadata": Allows authenticated users to update their own row.
         - Policy "Users can delete their own metadata": Allows authenticated users to delete their own row. (Handles user deletion cascade).

      4. Indexes
         - Index on `current_gym_id` for faster lookups based on the active gym.

      5. Important Notes
         - The `user_id` column references `auth.users.id` and uses `ON DELETE CASCADE` so that if a user is deleted from the authentication system, their corresponding metadata is also automatically removed.
         - The `current_gym_id` column references `gyms.id` and uses `ON DELETE SET NULL` so that if a gym is deleted, the user's `current_gym_id` is set to NULL instead of causing an error or deleting the user metadata.
    */

    -- 1. Create profiles Table
    CREATE TABLE IF NOT EXISTS public.profiles (
        user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        display_name text NOT NULL DEFAULT '',
        selected_gym_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
        current_gym_id uuid NULL REFERENCES public.gyms(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- 2. Create Indexes
    CREATE INDEX IF NOT EXISTS idx_profiles_current_gym_id ON public.profiles(current_gym_id);

    -- 3. Enable RLS
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    -- 4. Create Trigger Function & Trigger for New User Signup
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER SET search_path = public
    AS $$
    BEGIN
      INSERT INTO public.profiles (user_id, display_name)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', '') -- Use display_name from metadata if present
      );
      RETURN NEW;
    END;
    $$;

    -- Drop trigger if it exists before creating
    DROP TRIGGER IF EXISTS create_profiles_trigger ON auth.users;

    CREATE TRIGGER create_profiles_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

    -- 5. Create Trigger Function & Trigger for User Update (Sync display_name)
    CREATE OR REPLACE FUNCTION public.handle_update_profiles()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER SET search_path = public
    AS $$
    BEGIN
      -- Check if raw_user_meta_data or display_name within it has changed
      IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data AND
         NEW.raw_user_meta_data->>'display_name' IS DISTINCT FROM OLD.raw_user_meta_data->>'display_name' THEN
          UPDATE public.profiles
          SET display_name = COALESCE(NEW.raw_user_meta_data->>'display_name', '')
          WHERE user_id = NEW.id;
      END IF;
      RETURN NEW;
    END;
    $$;

    -- Drop trigger if it exists before creating
    DROP TRIGGER IF EXISTS update_profiles_trigger ON auth.users;

    CREATE TRIGGER update_profiles_trigger
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_update_profiles();


    -- 6. Create Trigger Function & Trigger for updated_at timestamp (Custom Function)
    CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;

    -- Drop trigger if it exists before creating
    DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

    CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp(); -- Use the custom function

    -- 7. Create RLS Policies
    DROP POLICY IF EXISTS "Users can view their own metadata" ON public.profiles;
    CREATE POLICY "Users can view their own metadata"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert their own metadata" ON public.profiles;
    CREATE POLICY "Users can insert their own metadata"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update their own metadata" ON public.profiles;
    CREATE POLICY "Users can update their own metadata"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can delete their own metadata" ON public.profiles;
    CREATE POLICY "Users can delete their own metadata"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
