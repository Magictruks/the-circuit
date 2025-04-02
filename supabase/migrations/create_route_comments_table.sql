/*
      # Create route_comments table

      This migration creates the `route_comments` table to store user comments on specific routes.

      1.  **New Table:**
          - `route_comments`
            - `id` (uuid, primary key, default: gen_random_uuid()): Unique identifier for the comment.
            - `route_id` (uuid, foreign key -> routes.id, not null): The route this comment belongs to.
            - `user_id` (uuid, foreign key -> auth.users.id, not null): The user who posted the comment.
            - `comment_text` (text, not null): The content of the comment.
            - `created_at` (timestamptz, default: now()): Timestamp of creation.
            - `updated_at` (timestamptz, default: now()): Timestamp of last update.

      2.  **Foreign Keys:**
          - `route_comments.route_id` references `routes.id` (ON DELETE CASCADE).
          - `route_comments.user_id` references `auth.users.id` (ON DELETE CASCADE).

      3.  **Indexes:**
          - Index on `route_id` for faster comment lookups per route.
          - Index on `user_id` for potential future lookups by user.

      4.  **Triggers:**
          - Use the existing `trigger_set_timestamp` function (created in user_route_progress migration) to automatically update the `updated_at` timestamp on row updates.

      5.  **Security:**
          - Enable Row Level Security (RLS) on the `route_comments` table.
          - Policy 1: Allow authenticated users to read all comments for any route.
          - Policy 2: Allow authenticated users to insert comments, checking they own the user_id.
          - Policy 3: Allow users to update *only* their own comments.
          - Policy 4: Allow users to delete *only* their own comments.
    */

    -- Ensure the timestamp function exists (it should from previous migration)
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- 1. Create the route_comments table
    CREATE TABLE IF NOT EXISTS route_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      comment_text text NOT NULL CHECK (comment_text <> ''), -- Ensure comment is not empty
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Add comments for clarity
    COMMENT ON TABLE route_comments IS 'Stores user comments posted on specific climbing routes.';
    COMMENT ON COLUMN route_comments.id IS 'Unique identifier for the comment.';
    COMMENT ON COLUMN route_comments.route_id IS 'Foreign key referencing the route being commented on.';
    COMMENT ON COLUMN route_comments.user_id IS 'Foreign key referencing the user who posted the comment.';
    COMMENT ON COLUMN route_comments.comment_text IS 'The actual text content of the comment.';
    COMMENT ON COLUMN route_comments.created_at IS 'Timestamp when the comment was created.';
    COMMENT ON COLUMN route_comments.updated_at IS 'Timestamp when the comment was last updated.';

    -- 2. Add indexes
    CREATE INDEX IF NOT EXISTS idx_route_comments_route_id ON route_comments(route_id);
    CREATE INDEX IF NOT EXISTS idx_route_comments_user_id ON route_comments(user_id);

    -- 3. Create trigger to automatically update updated_at
    DROP TRIGGER IF EXISTS set_timestamp ON route_comments; -- Drop existing trigger if it exists for this table
    CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON route_comments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

    -- 4. Enable Row Level Security (RLS)
    ALTER TABLE route_comments ENABLE ROW LEVEL SECURITY;

    -- 5. Create RLS policies
    -- Allow authenticated users to read all comments
    CREATE POLICY "Allow authenticated read access to comments"
      ON route_comments
      FOR SELECT
      TO authenticated
      USING (true); -- Anyone logged in can read comments

    -- Allow users to insert their own comments
    CREATE POLICY "Allow users to insert their own comments"
      ON route_comments
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id); -- User can only insert comments as themselves

    -- Allow users to update their own comments
    CREATE POLICY "Allow users to update their own comments"
      ON route_comments
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id) -- User can only update comments they own
      WITH CHECK (auth.uid() = user_id);

    -- Allow users to delete their own comments
    CREATE POLICY "Allow users to delete their own comments"
      ON route_comments
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id); -- User can only delete comments they own