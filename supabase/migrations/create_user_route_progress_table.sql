/*
      # Create user_route_progress table

      This migration creates the `user_route_progress` table to store individual user progress on specific routes.

      1.  **New Table:**
          - `user_route_progress`
            - `user_id` (uuid, foreign key -> auth.users.id, not null): The user this progress belongs to.
            - `route_id` (uuid, foreign key -> routes.id, not null): The route this progress is associated with.
            - `attempts` (integer, default: 0, not null): Number of attempts the user has logged.
            - `sent_at` (timestamptz, nullable): Timestamp when the user sent the route (null if not sent).
            - `rating` (smallint, nullable): User's personal rating (1-5 stars).
            - `notes` (text, default: '', not null): User's private notes about the climb.
            - `wishlist` (boolean, default: false, not null): Whether the route is on the user's wishlist.
            - `created_at` (timestamptz, default: now()): Timestamp of creation.
            - `updated_at` (timestamptz, default: now()): Timestamp of last update.

      2.  **Primary Key:**
          - Composite key on `(user_id, route_id)` to ensure unique progress entry per user per route.

      3.  **Foreign Keys:**
          - `user_route_progress.user_id` references `auth.users.id`.
          - `user_route_progress.route_id` references `routes.id`.

      4.  **Indexes:**
          - Index on `user_id`.
          - Index on `route_id`.

      5.  **Triggers:**
          - Add a trigger to automatically update the `updated_at` timestamp on any row update.

      6.  **Security:**
          - Enable Row Level Security (RLS) on the `user_route_progress` table.
          - Add policies allowing users to manage their *own* progress records (select, insert, update, delete).
    */

    -- Function to update updated_at column
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- 1. Create the user_route_progress table
    CREATE TABLE IF NOT EXISTS user_route_progress (
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
      attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
      sent_at timestamptz,
      rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
      notes text NOT NULL DEFAULT '',
      wishlist boolean NOT NULL DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      PRIMARY KEY (user_id, route_id) -- Composite primary key
    );

    -- Add comments for clarity
    COMMENT ON TABLE user_route_progress IS 'Stores individual user progress and interactions with specific routes.';
    COMMENT ON COLUMN user_route_progress.user_id IS 'Foreign key referencing the user.';
    COMMENT ON COLUMN user_route_progress.route_id IS 'Foreign key referencing the route.';
    COMMENT ON COLUMN user_route_progress.attempts IS 'Number of attempts logged by the user for this route.';
    COMMENT ON COLUMN user_route_progress.sent_at IS 'Timestamp when the user successfully sent the route (null if not sent).';
    COMMENT ON COLUMN user_route_progress.rating IS 'User''s personal difficulty rating for the route (1-5 stars).';
    COMMENT ON COLUMN user_route_progress.notes IS 'User''s private notes about the climb.';
    COMMENT ON COLUMN user_route_progress.wishlist IS 'Indicates if the user has added this route to their wishlist.';
    COMMENT ON COLUMN user_route_progress.created_at IS 'Timestamp when the progress record was first created.';
    COMMENT ON COLUMN user_route_progress.updated_at IS 'Timestamp when the progress record was last updated.';

    -- 2. Add indexes for faster lookups
    CREATE INDEX IF NOT EXISTS idx_user_route_progress_user_id ON user_route_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_route_progress_route_id ON user_route_progress(route_id);

    -- 3. Create trigger to automatically update updated_at
    DROP TRIGGER IF EXISTS set_timestamp ON user_route_progress; -- Drop existing trigger if it exists
    CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON user_route_progress
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

    -- 4. Enable Row Level Security (RLS)
    ALTER TABLE user_route_progress ENABLE ROW LEVEL SECURITY;

    -- 5. Create RLS policies
    -- Allow users to view their own progress
    CREATE POLICY "Allow users to view their own progress"
      ON user_route_progress
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    -- Allow users to insert their own progress records
    CREATE POLICY "Allow users to insert their own progress"
      ON user_route_progress
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    -- Allow users to update their own progress records
    CREATE POLICY "Allow users to update their own progress"
      ON user_route_progress
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Allow users to delete their own progress records (optional, consider if needed)
    CREATE POLICY "Allow users to delete their own progress"
      ON user_route_progress
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);