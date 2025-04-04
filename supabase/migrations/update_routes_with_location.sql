/*
      # Update Existing Routes with Default Location

      This migration assigns a default location ('Slab Wall') to existing routes
      within the specific gym ('0d0918cb-acc2-494b-9452-187d73cb23bf')
      that currently do not have a location assigned (`location_id IS NULL`).

      1.  **Target Gym**: `0d0918cb-acc2-494b-9452-187d73cb23bf`
      2.  **Target Location**: 'Slab Wall' (within the target gym)
      3.  **Action**: Updates the `location_id` column in the `routes` table.
      4.  **Condition**: Only updates routes where `gym_id` matches the target gym AND `location_id` is currently `NULL`.

      5.  **Notes**:
          - This uses a PL/pgSQL block to first find the ID of the 'Slab Wall' location for the specific gym and then uses that ID in the UPDATE statement.
          - This ensures that only routes without a location in the target gym are updated.
    */

    DO $$
    DECLARE
      target_gym_id UUID := '0d0918cb-acc2-494b-9452-187d73cb23bf';
      target_location_name TEXT := 'Slab Wall';
      selected_location_id UUID;
    BEGIN
      -- Find the ID of the 'Slab Wall' location for the target gym
      SELECT id INTO selected_location_id
      FROM locations
      WHERE gym_id = target_gym_id AND name = target_location_name
      LIMIT 1;

      -- If the location was found, update the routes in that gym
      IF selected_location_id IS NOT NULL THEN
        UPDATE routes
        SET location_id = selected_location_id
        WHERE gym_id = target_gym_id AND location_id IS NULL;

        RAISE NOTICE 'Updated routes in gym % to location % (%)', target_gym_id, target_location_name, selected_location_id;
      ELSE
        RAISE WARNING 'Location % not found for gym % - no routes updated.', target_location_name, target_gym_id;
      END IF;
    END $$;