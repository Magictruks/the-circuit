/*
        # Create RPC Function: get_filtered_routes

        1. New Functions
          - `get_filtered_routes(gym_id_in, search_term_in, location_id_in, grade_in, sort_option_in, page_size_in, page_offset_in)`
            - Takes parameters for filtering (gym, search, location, grade) and sorting (date, grade).
            - Takes pagination parameters (page size, offset).
            - Queries the `routes` table, joining `locations`.
            - Applies filters based on input parameters.
            - Applies sorting based on input parameters (date or grade).
            - Returns a paginated list of routes matching the criteria.

        2. Security
          - Defines the function with `SECURITY DEFINER`.
          - Grants execute permission to the `authenticated` role.

        3. Notes
          - Filtering by user status (sent, attempted, etc.) and sorting by average rating are NOT handled here to simplify the query, especially with pagination. These will be handled client-side after fetching the base filtered list.
          - The function returns basic route data including location name.
      */
      CREATE OR REPLACE FUNCTION get_filtered_routes(
          gym_id_in uuid,
          search_term_in text DEFAULT NULL,
          location_id_in uuid DEFAULT NULL,
          grade_in text DEFAULT NULL,
          sort_option_in text DEFAULT 'date_newest',
          page_size_in int DEFAULT 10,
          page_offset_in int DEFAULT 0
      )
      RETURNS TABLE (
          id uuid,
          gym_id uuid,
          name text,
          grade text,
          grade_color text,
          location_id uuid,
          setter text,
          date_set timestamptz,
          description text,
          image_url text,
          created_at timestamptz,
          removed_at timestamptz,
          location_name text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
          query_sql text;
          search_pattern text;
          order_clause text;
      BEGIN
          -- Base query
          query_sql := 'SELECT
                          r.id, r.gym_id, r.name, r.grade, r.grade_color, r.location_id,
                          r.setter, r.date_set, r.description, r.image_url, r.created_at, r.removed_at,
                          l.name AS location_name
                      FROM routes r
                      LEFT JOIN locations l ON r.location_id = l.id
                      WHERE r.gym_id = $1 AND r.removed_at IS NULL';

          -- Apply filters
          IF location_id_in IS NOT NULL THEN
              query_sql := query_sql || ' AND r.location_id = $2';
          ELSE
              query_sql := query_sql || ' AND $2 IS NULL'; -- Placeholder for parameter position
          END IF;

          IF grade_in IS NOT NULL THEN
              query_sql := query_sql || ' AND r.grade = $3';
          ELSE
              query_sql := query_sql || ' AND $3 IS NULL'; -- Placeholder
          END IF;

          IF search_term_in IS NOT NULL AND search_term_in <> '' THEN
              search_pattern := '%' || search_term_in || '%';
              query_sql := query_sql || ' AND (r.name ILIKE $4 OR r.grade ILIKE $4 OR l.name ILIKE $4)';
          ELSE
              query_sql := query_sql || ' AND $4 IS NULL'; -- Placeholder
          END IF;

          -- Apply sorting
          CASE sort_option_in
              WHEN 'grade_hardest' THEN
                  -- Requires a way to numerically compare grades, e.g., a helper function or complex CASE
                  -- For simplicity, we'll sort descending by the grade string itself for now.
                  -- A better approach would involve a grade-to-number mapping function.
                  order_clause := ' ORDER BY r.grade DESC NULLS LAST, r.date_set DESC';
              WHEN 'grade_easiest' THEN
                  order_clause := ' ORDER BY r.grade ASC NULLS FIRST, r.date_set DESC';
              WHEN 'date_newest' THEN
                  order_clause := ' ORDER BY r.date_set DESC';
              ELSE -- Default to date_newest
                  order_clause := ' ORDER BY r.date_set DESC';
          END CASE;

          query_sql := query_sql || order_clause;

          -- Apply pagination
          query_sql := query_sql || ' LIMIT $5 OFFSET $6';

          -- Execute the dynamic query
          RETURN QUERY EXECUTE query_sql
          USING gym_id_in, location_id_in, grade_in, search_pattern, page_size_in, page_offset_in;

      END;
      $$;

      -- Grant execution rights
      GRANT EXECUTE ON FUNCTION get_filtered_routes(uuid, text, uuid, text, text, int, int) TO authenticated;