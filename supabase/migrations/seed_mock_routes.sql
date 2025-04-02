/*
      # Seed Mock Route Data

      This script inserts mock climbing routes into the `routes` table for a specific gym.

      1.  **Target Gym:**
          - Inserts routes associated with `gym_id = '0d0918cb-acc2-494b-9452-187d73cb23bf'`.

      2.  **Data Inserted:**
          - Inserts 6 mock routes with details like name, grade, color, location, setter, date set, description, and image URL based on the provided placeholder data.
          - Fields like `status` and `betaAvailable` from the original mock data are omitted as they are not columns in the `routes` table.
    */

    -- Define the target gym ID
    DO $$
    DECLARE
        target_gym_id uuid := '0d0918cb-acc2-494b-9452-187d73cb23bf';
    BEGIN
        -- Insert mock routes only if the target gym exists
        IF EXISTS (SELECT 1 FROM gyms WHERE id = target_gym_id) THEN

            INSERT INTO routes (gym_id, name, grade, grade_color, location, setter, date_set, description, image_url)
            VALUES
                (target_gym_id, 'Crimson Dyno', 'V5', 'accent-red', 'Overhang Cave', 'Admin', '2024-03-10T00:00:00Z', 'Explosive move off the starting holds to a big jug.', 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
                (target_gym_id, 'Blue Traverse', 'V3', 'accent-blue', 'Slab Wall', 'Admin', '2024-03-08T00:00:00Z', 'Technical footwork required on small holds.', NULL),
                (target_gym_id, 'Sunshine Arete', 'V4', 'accent-yellow', 'Main Boulder', 'Jane D.', '2024-03-05T00:00:00Z', 'Balancey moves up the arete feature.', 'https://images.unsplash.com/photo-1610414870675-5579095849e1?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'),
                (target_gym_id, 'Green Slab Master', 'V2', 'brand-green', 'Slab Wall', 'Admin', '2024-03-01T00:00:00Z', NULL, NULL),
                (target_gym_id, 'Purple Pain', 'V6', 'accent-purple', 'Overhang Cave', 'Mike R.', '2024-02-28T00:00:00Z', NULL, NULL),
                (target_gym_id, 'The Gray Crack', 'V1', 'brand-gray', 'Training Area', 'Admin', '2024-02-25T00:00:00Z', NULL, NULL);
            -- Removed ON CONFLICT clause

        ELSE
            RAISE NOTICE 'Target gym with ID % not found. Skipping route insertion.', target_gym_id;
        END IF;
    END $$;