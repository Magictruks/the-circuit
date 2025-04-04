/*
      # Create Locations Table

      This migration introduces the concept of Locations (or Sectors) within a Gym.

      1.  **New Table: `locations`**
          - Stores distinct locations/sectors within each gym.
          - `id`: Unique identifier for the location.
          - `gym_id`: Foreign key linking the location to its gym.
          - `name`: The name of the location (e.g., "Slab Wall", "Overhang Cave").
          - `description`: Optional description of the location.
          - `created_at`: Timestamp of creation.

      2.  **Indexes**
          - Adds an index on `gym_id` in the `locations` table for efficient querying of locations within a specific gym.

      3.  **Security**
          - Enables Row Level Security (RLS) on the `locations` table.
          - Adds a basic policy allowing any authenticated user to read all locations. More specific policies might be needed later depending on application requirements (e.g., only members of a gym can see its locations).
    */

    -- 1. Create locations table
    CREATE TABLE IF NOT EXISTS locations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE, -- Link to gyms, cascade delete if gym is deleted
      name text NOT NULL CHECK (char_length(name) > 0), -- Ensure name is not empty
      description text,
      created_at timestamptz DEFAULT now(),

      -- Ensure location names are unique within the same gym
      UNIQUE (gym_id, name)
    );

    -- Add comment for clarity
    COMMENT ON TABLE locations IS 'Stores distinct climbing locations or sectors within a specific gym.';
    COMMENT ON COLUMN locations.name IS 'Name of the location/sector (e.g., Slab Wall, Overhang Cave). Unique per gym.';
    COMMENT ON COLUMN locations.gym_id IS 'The gym this location belongs to.';

    -- 2. Add index for faster lookups by gym
    CREATE INDEX IF NOT EXISTS idx_locations_gym_id ON locations(gym_id);

    -- 3. Enable RLS and add basic read policy
    ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

    -- Allow authenticated users to read all locations for now
    -- TODO: Potentially restrict this later based on user's gym membership/selection
    CREATE POLICY "Allow authenticated read access to locations"
      ON locations
      FOR SELECT
      TO authenticated
      USING (true);