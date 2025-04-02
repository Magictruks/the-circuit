/*
      # Create route_beta_votes table and handle_beta_vote function

      This migration adds voting functionality for route beta.

      1.  **New Table:**
          - `route_beta_votes`
            - `beta_id` (uuid, foreign key -> route_beta.id, not null): The beta entry being voted on.
            - `user_id` (uuid, foreign key -> auth.users.id, not null): The user casting the vote.
            - `vote_value` (smallint, not null, check: [-1, 1]): The vote value (1 for upvote, -1 for downvote).
            - `created_at` (timestamptz, default: now()): Timestamp of vote creation.

      2.  **Primary Key:**
          - Composite key on `(beta_id, user_id)` to ensure one vote per user per beta.

      3.  **Foreign Keys:**
          - `route_beta_votes.beta_id` references `route_beta.id`.
          - `route_beta_votes.user_id` references `auth.users.id`.

      4.  **Indexes:**
          - Index on `user_id`.

      5.  **New Function:**
          - `handle_beta_vote(beta_id_in uuid, vote_value_in smallint)`:
            - Takes the beta ID and the new vote value (1 for up, -1 for down, 0 to remove vote).
            - Gets the current user's ID (`auth.uid()`).
            - Atomically inserts, updates, or deletes the vote in `route_beta_votes`.
            - Calculates the change in the `upvotes` count for the corresponding `route_beta` entry.
            - Updates the `route_beta.upvotes` count.
            - Returns the new upvote count.

      6.  **Security:**
          - Enable Row Level Security (RLS) on `route_beta_votes`.
          - Policies allow users to manage their *own* votes (read all to check own vote, insert/update/delete own).
    */

    -- 1. Create the route_beta_votes table
    CREATE TABLE IF NOT EXISTS route_beta_votes (
      beta_id uuid NOT NULL REFERENCES route_beta(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      vote_value smallint NOT NULL CHECK (vote_value IN (-1, 1)), -- 1 for upvote, -1 for downvote
      created_at timestamptz DEFAULT now(),
      PRIMARY KEY (beta_id, user_id) -- One vote per user per beta item
    );

    -- Add comments
    COMMENT ON TABLE route_beta_votes IS 'Stores user votes (up/down) on specific route beta entries.';
    COMMENT ON COLUMN route_beta_votes.beta_id IS 'Foreign key referencing the route_beta entry being voted on.';
    COMMENT ON COLUMN route_beta_votes.user_id IS 'Foreign key referencing the user who cast the vote.';
    COMMENT ON COLUMN route_beta_votes.vote_value IS 'The value of the vote: 1 for an upvote, -1 for a downvote.';
    COMMENT ON COLUMN route_beta_votes.created_at IS 'Timestamp when the vote was cast.';

    -- 2. Add index
    CREATE INDEX IF NOT EXISTS idx_route_beta_votes_user_id ON route_beta_votes(user_id);

    -- 3. Enable RLS for the new table
    ALTER TABLE route_beta_votes ENABLE ROW LEVEL SECURITY;

    -- 4. RLS Policies for route_beta_votes
    -- Allow users to read all votes (needed to check their own vote status)
    CREATE POLICY "Allow authenticated read access to votes"
      ON route_beta_votes
      FOR SELECT
      TO authenticated
      USING (true);

    -- Allow users to insert their own vote
    CREATE POLICY "Allow users to insert their own vote"
      ON route_beta_votes
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    -- Allow users to update their own vote (e.g., change from up to down)
    CREATE POLICY "Allow users to update their own vote"
      ON route_beta_votes
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Allow users to delete their own vote (unvote)
    CREATE POLICY "Allow users to delete their own vote"
      ON route_beta_votes
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);


    -- 5. Create the function to handle voting and update counts atomically
    CREATE OR REPLACE FUNCTION handle_beta_vote(beta_id_in uuid, vote_value_in smallint)
    RETURNS integer -- Returns the new upvote count for the beta item
    LANGUAGE plpgsql
    SECURITY DEFINER -- Important: Allows the function to update counts despite RLS
    AS $$
    DECLARE
      current_user_id uuid := auth.uid();
      existing_vote smallint;
      vote_delta integer := 0;
      new_upvote_count integer;
    BEGIN
      -- Check if user already voted on this item
      SELECT vote_value INTO existing_vote
      FROM route_beta_votes
      WHERE beta_id = beta_id_in AND user_id = current_user_id;

      IF vote_value_in = 0 THEN -- Request to remove vote
        IF existing_vote IS NOT NULL THEN
          -- User is removing their vote
          DELETE FROM route_beta_votes WHERE beta_id = beta_id_in AND user_id = current_user_id;
          vote_delta := -1 * existing_vote; -- Subtract the value of the removed vote
        END IF;
        -- If no existing vote, do nothing for removal request

      ELSE -- Request to add or change vote (vote_value_in is 1 or -1)
        IF existing_vote IS NULL THEN
          -- New vote
          INSERT INTO route_beta_votes (beta_id, user_id, vote_value)
          VALUES (beta_id_in, current_user_id, vote_value_in);
          vote_delta := vote_value_in; -- Add the new vote value
        ELSIF existing_vote <> vote_value_in THEN
          -- Changing vote (e.g., up to down, or down to up)
          UPDATE route_beta_votes
          SET vote_value = vote_value_in
          WHERE beta_id = beta_id_in AND user_id = current_user_id;
          -- Delta is the difference: new_vote - old_vote
          -- e.g., up(1) to down(-1) => -1 - 1 = -2 delta
          -- e.g., down(-1) to up(1) => 1 - (-1) = +2 delta
          vote_delta := vote_value_in - existing_vote;
        END IF;
        -- If existing_vote = vote_value_in, do nothing (clicking upvote again)

      END IF;

      -- Update the upvotes count on the route_beta table if delta is not 0
      IF vote_delta <> 0 THEN
        UPDATE route_beta
        SET upvotes = upvotes + vote_delta -- Only tracking upvotes for now
        WHERE id = beta_id_in
        RETURNING upvotes INTO new_upvote_count;
      ELSE
        -- If no change, just get the current count
        SELECT upvotes INTO new_upvote_count FROM route_beta WHERE id = beta_id_in;
      END IF;

      RETURN COALESCE(new_upvote_count, 0); -- Return new count or 0 if beta somehow doesn't exist

    END;
    $$;