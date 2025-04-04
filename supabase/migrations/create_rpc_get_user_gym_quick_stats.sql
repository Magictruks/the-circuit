/*
      # Create RPC Function for User Gym Quick Stats

      This migration creates two PostgreSQL functions:

      1. `get_v_grade_value(grade TEXT)`:
         - **Purpose**: Parses a V-grade string (e.g., "V5", "V3-V5") and returns its numerical value for sorting. Handles ranges by taking the higher number. Returns -1 for non-V grades or invalid formats.
         - **Input**: `grade` (TEXT) - The grade string to parse.
         - **Output**: `INT` - The numerical value of the V-grade, or -1.

      2. `get_user_gym_quick_stats(user_id_in UUID, gym_id_in UUID)`:
         - **Purpose**: Calculates quick statistics for a specific user within a specific gym for the current calendar month.
         - **Input**:
           - `user_id_in` (UUID): The ID of the user.
           - `gym_id_in` (UUID): The ID of the gym.
         - **Output**: `JSON` - A JSON object containing the following keys:
           - `sendsThisMonth` (INT): Count of routes sent by the user in the specified gym this month.
           - `highestGradeSent` (TEXT): The highest V-grade sent by the user in the specified gym (all time). Returns NULL if no sends recorded.
           - `betaAddedThisMonth` (INT): Count of beta items added by the user in the specified gym this month.
         - **Dependencies**: Relies on the `get_v_grade_value` helper function. Requires `user_route_progress`, `routes`, and `route_beta` tables with appropriate columns (`user_id`, `gym_id`, `sent_at`, `grade`, `created_at`).

      ## Changes
      - Creates helper function `get_v_grade_value`.
      - Creates main RPC function `get_user_gym_quick_stats`.
    */

    -- Helper function to parse V-grades (needed by the main function)
    CREATE OR REPLACE FUNCTION get_v_grade_value(grade TEXT)
    RETURNS INT
    LANGUAGE plpgsql
    IMMUTABLE -- Function output depends only on input arguments
    AS $$
    DECLARE
        num_part TEXT;
        range_parts TEXT[];
        numeric_value INT;
    BEGIN
        -- Return -1 immediately if input is null, empty, or doesn't start with 'V' (case-insensitive)
        IF grade IS NULL OR grade = '' OR upper(grade) NOT LIKE 'V%' THEN
            RETURN -1;
        END IF;

        -- Extract the part after 'V'
        num_part := substring(upper(grade) from 2); -- Use upper for consistency

        -- Handle potential ranges like V3-V5 by taking the last number part
        range_parts := string_to_array(num_part, '-');
        num_part := range_parts[array_length(range_parts, 1)];

        -- Attempt to convert the extracted part to an integer
        BEGIN
            numeric_value := num_part::INT;
        EXCEPTION WHEN others THEN
            -- Return -1 if conversion fails (e.g., 'V?', 'VFUNKY')
            RETURN -1;
        END;

        RETURN numeric_value;
    END;
    $$;

    -- Main function to get stats
    CREATE OR REPLACE FUNCTION get_user_gym_quick_stats(user_id_in UUID, gym_id_in UUID)
    RETURNS json -- Return JSON for easier client-side handling
    LANGUAGE plpgsql
    AS $$
    DECLARE
        start_of_month TIMESTAMPTZ;
        end_of_month TIMESTAMPTZ;
        sends_count INT;
        beta_count INT;
        highest_grade_val TEXT; -- Renamed variable
        max_grade_value INT; -- To store the numeric value for sorting
    BEGIN
        -- Calculate the start and end of the current calendar month
        start_of_month := date_trunc('month', now());
        -- Calculate end of month precisely to avoid issues with month lengths
        end_of_month := date_trunc('month', now()) + interval '1 month' - interval '1 microsecond';

        -- 1. Calculate Sends This Month for the specified user and gym
        SELECT count(*)
        INTO sends_count
        FROM user_route_progress urp
        JOIN routes r ON urp.route_id = r.id
        WHERE urp.user_id = user_id_in
          AND r.gym_id = gym_id_in
          AND urp.sent_at IS NOT NULL
          AND urp.sent_at BETWEEN start_of_month AND end_of_month; -- Use BETWEEN for clarity

        -- 2. Calculate Highest Grade Sent by the user in this gym (all time)
        -- Selects the grade with the highest numerical value. If ties, orders by text DESC (e.g., V10- before V10)
        SELECT r.grade, get_v_grade_value(r.grade) as grade_val
        INTO highest_grade_val, max_grade_value -- Store both the text grade and its value
        FROM user_route_progress urp
        JOIN routes r ON urp.route_id = r.id
        WHERE urp.user_id = user_id_in
          AND r.gym_id = gym_id_in
          AND urp.sent_at IS NOT NULL
        ORDER BY grade_val DESC, r.grade DESC -- Primary sort by numeric value, secondary by text
        LIMIT 1; -- Get only the top one

        -- highest_grade_val will be NULL if no sends are found

        -- 3. Calculate Beta Added This Month by the user in this gym
        SELECT count(*)
        INTO beta_count
        FROM route_beta rb
        JOIN routes r ON rb.route_id = r.id -- Join required to filter by gym_id
        WHERE rb.user_id = user_id_in
          AND r.gym_id = gym_id_in -- Filter based on the route's gym
          AND rb.created_at BETWEEN start_of_month AND end_of_month;

        -- Return the results as a JSON object
        RETURN json_build_object(
            'sendsThisMonth', COALESCE(sends_count, 0), -- Use COALESCE to ensure 0 instead of NULL
            'highestGradeSent', highest_grade_val, -- Keep as NULL if no sends
            'betaAddedThisMonth', COALESCE(beta_count, 0)
        );
    END;
    $$;