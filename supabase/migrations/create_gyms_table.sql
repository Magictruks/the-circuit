/*
      # Create Gyms Table

      This migration creates the `gyms` table to store information about climbing gyms.

      1. New Tables
         - `gyms`
           - `id` (uuid, primary key): Unique identifier for the gym.
           - `created_at` (timestamptz): Timestamp of when the gym was added. Defaults to the current time.
           - `name` (text, not null): The official name of the climbing gym.
           - `city` (text): The city where the gym is located.
           - `state` (text): The state or province where the gym is located.
           - `country` (text): The country where the gym is located.

      2. Security
         - Enables Row Level Security (RLS) on the `gyms` table.
         - Creates a policy allowing authenticated users to read all gym data. This is generally safe as gym information is public.
         - Creates a policy allowing users with a specific 'admin' role (future implementation) to perform all actions (insert, update, delete). This is commented out initially.

      3. Indexes
         - Adds an index on the `name` column for faster searching.
         - Adds an index on `city`, `state`, `country` for location-based searches.

      4. Notes
         - The `id` uses `gen_random_uuid()` for unique identifiers.
         - Default values are set for `created_at`.
         - RLS is enabled by default for security. Read access is granted broadly, while write access will require specific roles later.
    */

    -- 1. Create Table
    CREATE TABLE IF NOT EXISTS public.gyms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now(),
      name text NOT NULL,
      city text,
      state text, -- State or Province
      country text
    );

    -- 2. Enable RLS
    ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

    -- 3. Create RLS Policies
    -- Policy: Allow authenticated users to read all gyms
    CREATE POLICY "Allow authenticated read access to gyms"
      ON public.gyms
      FOR SELECT
      TO authenticated
      USING (true);

    -- Policy: Allow all actions for admins (Requires admin role setup - commented out initially)
    /*
    CREATE POLICY "Allow admin full access"
      ON public.gyms
      FOR ALL
      TO authenticated -- Replace with specific admin role if created
      USING (
        -- Add logic here to check if the user has an 'admin' role
        -- e.g., EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
        false -- Placeholder: Deny by default until admin role is implemented
      )
      WITH CHECK (
        -- Add logic here to check if the user has an 'admin' role
        false -- Placeholder: Deny by default until admin role is implemented
      );
    */

    -- 4. Add Indexes
    CREATE INDEX IF NOT EXISTS idx_gyms_name ON public.gyms (name);
    CREATE INDEX IF NOT EXISTS idx_gyms_location ON public.gyms (city, state, country);

    -- 5. Add comments on columns for clarity
    COMMENT ON TABLE public.gyms IS 'Stores information about climbing gyms.';
    COMMENT ON COLUMN public.gyms.id IS 'Unique identifier for the gym.';
    COMMENT ON COLUMN public.gyms.name IS 'Official name of the climbing gym.';
    COMMENT ON COLUMN public.gyms.city IS 'City where the gym is located.';
    COMMENT ON COLUMN public.gyms.state IS 'State or province where the gym is located.';
    COMMENT ON COLUMN public.gyms.country IS 'Country where the gym is located.';