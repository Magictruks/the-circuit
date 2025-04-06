/*
        # Create RPC Function: get_route_beta_counts_by_type

        1. New Functions
          - `get_route_beta_counts_by_type(route_ids uuid[])`
            - Takes an array of route UUIDs.
            - Returns a table with `route_id`, `beta_type`, and `count` for each route and beta type ('text', 'video').
            - This allows fetching counts for multiple routes efficiently, grouped by type.

        2. Security
          - Defines the function with `SECURITY DEFINER` to ensure it can access the `route_beta` table.
          - Grants execute permission to the `authenticated` role.

        3. Changes
          - This replaces the previous `get_route_beta_counts` function logic by providing counts broken down by type.
      */

      CREATE OR REPLACE FUNCTION get_route_beta_counts_by_type(route_ids uuid[])
      RETURNS TABLE(route_id uuid, beta_type text, count bigint)
      LANGUAGE plpgsql
      SECURITY DEFINER -- Important for accessing tables with RLS
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          rb.route_id,
          rb.beta_type,
          COUNT(rb.id) as count
        FROM
          route_beta rb
        WHERE
          rb.route_id = ANY(route_ids)
          AND rb.beta_type IN ('text', 'video') -- Only count text and video types
        GROUP BY
          rb.route_id, rb.beta_type;
      END;
      $$;

      -- Grant execution rights to the authenticated role
      GRANT EXECUTE ON FUNCTION get_route_beta_counts_by_type(uuid[]) TO authenticated;