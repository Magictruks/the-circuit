/*
        # Create RPC Function: get_suggested_climbers

        1. New Functions
          - `get_suggested_climbers(user_id_in uuid, gym_id_in uuid, limit_in int)`
            - Takes the current user's ID, their active gym ID, and a limit.
            - Finds profiles (`p`) whose `current_gym_id` matches `gym_id_in` and are not the input user (`user_id_in`).
            - Excludes profiles that the input user already follows.
            - Calculates the total follower count for each remaining profile.
            - Orders the results by follower count (descending).
            - Limits the number of suggestions returned.
            - Returns the `user_id`, `display_name`, and `avatar_url` of the suggested climbers.

        2. Security
          - Defines the function with `SECURITY DEFINER`.
          - Grants execute permission to the `authenticated` role.

        3. Notes
          - This provides suggestions based on the user's *current* active gym.
          - Follower count is based on total followers, not just followers within that specific gym, due to schema limitations.
      */
      CREATE OR REPLACE FUNCTION get_suggested_climbers(
          user_id_in uuid,
          gym_id_in uuid,
          limit_in int DEFAULT 5
      )
      RETURNS TABLE (
          user_id uuid,
          display_name text,
          avatar_url text
      )
      LANGUAGE sql
      SECURITY DEFINER
      AS $$
        WITH PotentialSuggestions AS (
          -- Select users active in the target gym, excluding the current user
          SELECT
            p.user_id,
            p.display_name,
            p.avatar_url
          FROM profiles p
          WHERE p.current_gym_id = gym_id_in
            AND p.user_id <> user_id_in
            -- Exclude users the current user already follows
            AND NOT EXISTS (
              SELECT 1
              FROM user_follows uf
              WHERE uf.follower_id = user_id_in AND uf.following_id = p.user_id
            )
        ),
        FollowerCounts AS (
          -- Count total followers for potential suggestions
          SELECT
            f.following_id,
            COUNT(f.follower_id) as follower_count
          FROM user_follows f
          WHERE f.following_id IN (SELECT ps.user_id FROM PotentialSuggestions ps)
          GROUP BY f.following_id
        )
        -- Combine profile data with follower counts and order/limit
        SELECT
          ps.user_id,
          ps.display_name,
          ps.avatar_url
        FROM PotentialSuggestions ps
        LEFT JOIN FollowerCounts fc ON ps.user_id = fc.following_id
        ORDER BY COALESCE(fc.follower_count, 0) DESC, ps.display_name ASC -- Order by followers, then name
        LIMIT limit_in;
      $$;

      -- Grant execution rights
      GRANT EXECUTE ON FUNCTION get_suggested_climbers(uuid, uuid, int) TO authenticated;