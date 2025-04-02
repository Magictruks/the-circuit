/*
      # Create route_beta table

      This migration creates the `route_beta` table to store community-submitted beta (tips, videos, drawings) for specific routes.

      1.  **New Table:**
          - `route_beta`
            - `id` (uuid, primary key, default: gen_random_uuid()): Unique identifier for the beta entry.
            - `route_id` (uuid, foreign key -> routes.id, not null): The route this beta is for.
            - `user_id` (uuid, foreign key -> auth.users.id, not null): The user who submitted the beta.
            - `beta_type` (text, not null, check: ['text', 'video', 'drawing']): Type of beta content.
            - `text_content` (text, nullable): Content if beta_type is 'text'.
            - `content_url` (text, nullable): URL to the uploaded file (video/drawing) in Supabase Storage if beta_type is 'video' or 'drawing'.
            - `key_move` (text, nullable): Optional tag indicating which part of the route this beta applies to (e.g., 'start', 'crux', 'topout').
            - `upvotes` (integer, default: 0, not null): Number of upvotes (future feature).
            - `created_at` (timestamptz, default: now()): Timestamp of creation.
            - `updated_at` (timestamptz, default: now()): Timestamp of last update.

      2.  **Constraints:**
          - Check constraint on `beta_type`.
          - Check constraint ensuring either `text_content` or `content_url` is provided based on `beta_type`.

      3.  **Foreign Keys:**
          - `route_beta.route_id` references `routes.id` (ON DELETE CASCADE).
          - `route_beta.user_id` references `auth.users.id` (ON DELETE CASCADE).

      4.  **Indexes:**
          - Index on `route_id` and `beta_type` for efficient filtering.
          - Index on `user_id`.

      5.  **Triggers:**
          - Use the existing `trigger_set_timestamp` function to update `updated_at`.

      6.  **Security:**
          - Enable Row Level Security (RLS).
          - Policy 1: Allow authenticated users to read all beta.
          - Policy 2: Allow authenticated users to insert their own beta.
          - Policy 3: Allow users to update *only* their own beta.
          - Policy 4: Allow users to delete *only* their own beta.
    */

    -- Ensure the timestamp function exists
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- 1. Create the route_beta table
    CREATE TABLE IF NOT EXISTS route_beta (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      beta_type text NOT NULL CHECK (beta_type IN ('text', 'video', 'drawing')),
      text_content text,
      content_url text, -- URL for video/drawing in Supabase Storage
      key_move text, -- Optional tag like 'start', 'crux', 'topout'
      upvotes integer NOT NULL DEFAULT 0 CHECK (upvotes >= 0),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),

      -- Ensure content matches type
      CONSTRAINT check_beta_content CHECK (
        (beta_type = 'text' AND text_content IS NOT NULL AND content_url IS NULL) OR
        (beta_type IN ('video', 'drawing') AND content_url IS NOT NULL AND text_content IS NULL)
      )
    );

    -- Add comments
    COMMENT ON TABLE route_beta IS 'Stores community-submitted beta (tips, videos, drawings) for routes.';
    COMMENT ON COLUMN route_beta.beta_type IS 'Type of beta content: ''text'', ''video'', or ''drawing''.';
    COMMENT ON COLUMN route_beta.text_content IS 'Text content if beta_type is ''text''.';
    COMMENT ON COLUMN route_beta.content_url IS 'URL to uploaded file in Storage if beta_type is ''video'' or ''drawing''.';
    COMMENT ON COLUMN route_beta.key_move IS 'Optional tag for the part of the route the beta applies to.';
    COMMENT ON COLUMN route_beta.upvotes IS 'Number of upvotes received (for future implementation).';

    -- 2. Add indexes
    CREATE INDEX IF NOT EXISTS idx_route_beta_route_id_type ON route_beta(route_id, beta_type);
    CREATE INDEX IF NOT EXISTS idx_route_beta_user_id ON route_beta(user_id);

    -- 3. Create trigger for updated_at
    DROP TRIGGER IF EXISTS set_timestamp ON route_beta;
    CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON route_beta
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

    -- 4. Enable Row Level Security (RLS)
    ALTER TABLE route_beta ENABLE ROW LEVEL SECURITY;

    -- 5. Create RLS policies
    -- Allow authenticated users to read all beta
    CREATE POLICY "Allow authenticated read access to beta"
      ON route_beta
      FOR SELECT
      TO authenticated
      USING (true);

    -- Allow users to insert their own beta
    CREATE POLICY "Allow users to insert their own beta"
      ON route_beta
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    -- Allow users to update their own beta
    CREATE POLICY "Allow users to update their own beta"
      ON route_beta
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Allow users to delete their own beta
    CREATE POLICY "Allow users to delete their own beta"
      ON route_beta
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);