/*
        # Create RPC Function: get_route_card_stats

        1. New Functions
          - `get_route_card_stats(route_ids uuid[])`
            - Takes an array of route UUIDs.
            - Returns a table with `route_id`, `text_beta_count`, `video_beta_count`, `average_rating`, and `rating_count`.
            - Calculates text/video beta counts from `route_beta`.
            - Calculates average rating and count of ratings from `user_route_progress`.
            - Consolidates data needed for the route card display into a single call.

        2. Security
          - Defines the function with `SECURITY DEFINER` to ensure it can access required tables (`route_beta`, `user_route_progress`).
          - Grants execute permission to the `authenticated` role.

        3. Changes
          - Replaces `get_route_beta_counts_by_type`.
          - Adds average rating calculation.
      */
      CREATE OR REPLACE FUNCTION get_route_card_stats(route_ids uuid[])
      RETURNS TABLE(
          route_id uuid,
          text_beta_count bigint,
          video_beta_count bigint,
          average_rating double precision,
          rating_count bigint
      )
      LANGUAGE sql
      SECURITY DEFINER -- Important for accessing tables with RLS
      AS $$
        WITH BetaCounts AS (
          SELECT
            rb.route_id,
            SUM(CASE WHEN rb.beta_type = 'text' THEN 1 ELSE 0 END) AS text_count,
            SUM(CASE WHEN rb.beta_type = 'video' THEN 1 ELSE 0 END) AS video_count
          FROM route_beta rb
          WHERE rb.route_id = ANY(route_ids)
            AND rb.beta_type IN ('text', 'video')
          GROUP BY rb.route_id
        ),
        RatingStats AS (
          SELECT
            urp.route_id,
            AVG(urp.rating) AS avg_rating,
            COUNT(urp.rating) AS count_rating -- Count only non-null ratings
          FROM user_route_progress urp
          WHERE urp.route_id = ANY(route_ids)
            AND urp.rating IS NOT NULL
          GROUP BY urp.route_id
        )
        -- Use COALESCE to handle routes with no beta or ratings
        SELECT
          r.id AS route_id,
          COALESCE(bc.text_count, 0) AS text_beta_count,
          COALESCE(bc.video_count, 0) AS video_beta_count,
          rs.avg_rating AS average_rating, -- Can be NULL if no ratings
          COALESCE(rs.count_rating, 0) AS rating_count
        FROM unnest(route_ids) AS r(id) -- Ensure all requested route_ids are returned
        LEFT JOIN BetaCounts bc ON r.id = bc.route_id
        LEFT JOIN RatingStats rs ON r.id = rs.route_id;
      $$;

      -- Grant execution rights to the authenticated role
      GRANT EXECUTE ON FUNCTION get_route_card_stats(uuid[]) TO authenticated;

      -- Optional: Drop the old function if it's no longer needed
      -- DROP FUNCTION IF EXISTS get_route_beta_counts_by_type(uuid[]);