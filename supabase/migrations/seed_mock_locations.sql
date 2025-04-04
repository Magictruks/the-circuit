/*
      # Seed Mock Locations for Specific Gym

      This migration adds several mock location/sector entries to the `locations` table
      for the gym with ID `0d0918cb-acc2-494b-9452-187d73cb23bf`.

      1.  **Target Gym**: `0d0918cb-acc2-494b-9452-187d73cb23bf`
      2.  **Mock Locations Added**:
          - Slab Wall
          - Overhang Cave
          - Training Area
          - Comp Wall
          - The Prow

      3.  **Notes**:
          - Uses `INSERT INTO ... ON CONFLICT (gym_id, name) DO NOTHING` to prevent duplicate entries if this script is run multiple times.
    */

    INSERT INTO locations (gym_id, name, description)
    VALUES
      ('0d0918cb-acc2-494b-9452-187d73cb23bf', 'Slab Wall', 'Gentle angle, focus on footwork and balance.'),
      ('0d0918cb-acc2-494b-9452-187d73cb23bf', 'Overhang Cave', 'Steep section requiring power and body tension.'),
      ('0d0918cb-acc2-494b-9452-187d73cb23bf', 'Training Area', 'Includes campus board, hangboards, and system wall.'),
      ('0d0918cb-acc2-494b-9452-187d73cb23bf', 'Comp Wall', 'Steep competition-style wall with dynamic routes.'),
      ('0d0918cb-acc2-494b-9452-187d73cb23bf', 'The Prow', 'Prominent feature wall with varied angles.')
    ON CONFLICT (gym_id, name) DO NOTHING;