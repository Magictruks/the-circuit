/*
      # Create RPC Function: get_route_comment_counts

      This migration creates a PostgreSQL function to efficiently count comments for multiple routes.

      1.  **New Function:**
          -   `get_route_comment_counts(route_ids uuid[])`
              -   **Input:** An array of route UUIDs (`route_ids`).
              -   **Output:** A table containing `route_id` (uuid) and `count` (bigint), representing the number of comments for each input route ID.
              -   **Logic:** Counts comments from the `route_comments` table, grouped by `route_id`, for the provided list of route IDs.

      2.  **Purpose:**
          -   Allows fetching comment counts for multiple routes in a single database call, improving performance compared to fetching counts individually.
    */

    CREATE OR REPLACE FUNCTION get_route_comment_counts(route_ids uuid[])
    RETURNS TABLE(route_id uuid, count bigint)
    LANGUAGE sql
    STABLE -- Indicates the function cannot modify the database and always returns the same results for the same arguments within a single transaction
    AS $$
      SELECT
        rc.route_id,
        count(rc.id)
      FROM route_comments rc
      WHERE rc.route_id = ANY(route_ids)
      GROUP BY rc.route_id;
    $$;