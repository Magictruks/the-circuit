/*
      # Create RPC Function: get_route_beta_counts

      This migration creates a PostgreSQL function to efficiently count beta entries for multiple routes.

      1.  **New Function:**
          -   `get_route_beta_counts(route_ids uuid[])`
              -   **Input:** An array of route UUIDs (`route_ids`).
              -   **Output:** A table containing `route_id` (uuid) and `count` (bigint), representing the number of beta entries for each input route ID.
              -   **Logic:** Counts beta entries from the `route_beta` table, grouped by `route_id`, for the provided list of route IDs.

      2.  **Purpose:**
          -   Allows fetching beta counts for multiple routes in a single database call, improving performance compared to fetching counts individually.
    */

    CREATE OR REPLACE FUNCTION get_route_beta_counts(route_ids uuid[])
    RETURNS TABLE(route_id uuid, count bigint)
    LANGUAGE sql
    STABLE -- Indicates the function cannot modify the database and always returns the same results for the same arguments within a single transaction
    AS $$
      SELECT
        rb.route_id,
        count(rb.id)
      FROM route_beta rb
      WHERE rb.route_id = ANY(route_ids)
      GROUP BY rb.route_id;
    $$;