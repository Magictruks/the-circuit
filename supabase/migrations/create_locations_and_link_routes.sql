/*
      # Create Locations Table and Link to Routes

      This migration introduces the Locations (Sectors) concept and links routes to them.

      1.  **New Table: `locations`**
          - Stores distinct locations/sectors within each gym.
          - `id`: UUID, Primary Key
          - `gym_id`: UUID, Foreign Key to `gyms`, NOT NULL, ON DELETE CASCADE
          - `name`: TEXT, NOT NULL (Unique per gym)
          - `description`: TEXT, NULLABLE
          - `created_at`: TIMESTAMPTZ, Default NOW()
          - **Index**: On `gym_id`
          - **RLS**: Enabled, with a policy allowing authenticated reads.

      2.  **Modify Table: `routes`**
          - Adds `location_id`: UUID, NULLABLE
          - Foreign Key: `location_id` references `locations(id)`
          - `ON DELETE SET NULL`: If a location is deleted, associated routes' `location_id` becomes NULL.
          - **Index**: On `location_id`

      3.  **Notes**
          - This combines the creation and linking steps into one transaction to avoid timing errors.
          - The original `location` (TEXT) column in `routes` remains for backward compatibility.
    */

    -- 1. Create locations table
    CREATE TABLE IF NOT EXISTS locations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
      name text NOT NULL CHECK (char_length(name) > 0),
      description text,
      created_at timestamptz DEFAULT now(),
      UNIQUE (gym_id, name)
    );

    COMMENT ON TABLE locations IS 'Stores distinct climbing locations or sectors within a specific gym.';
    COMMENT ON COLUMN locations.name IS 'Name of the location/sector (e.g., Slab Wall, Overhang Cave). Unique per gym.';
    COMMENT ON COLUMN locations.gym_id IS 'The gym this location belongs to.';

    CREATE INDEX IF NOT EXISTS idx_locations_gym_id ON locations(gym_id);

    ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Allow authenticated read access to locations"
      ON locations
      FOR SELECT
      TO authenticated
      USING (true);

    -- 2. Add the location_id column to routes (now guaranteed that 'locations' exists)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'routes' AND column_name = 'location_id'
      ) THEN
        ALTER TABLE public.routes
        ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;

        COMMENT ON COLUMN public.routes.location_id IS 'Foreign key referencing the specific location/sector within the gym where the route is set.';
      END IF;
    END $$;

    -- Add index for faster lookups by location
    CREATE INDEX IF NOT EXISTS idx_routes_location_id ON public.routes(location_id);