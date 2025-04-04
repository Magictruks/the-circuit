/*
      # Add Location ID to Routes Table

      This migration links the `routes` table to the new `locations` table.

      1.  **Modify Table: `routes`**
          - Adds a new column `location_id` (UUID).
          - This column is nullable to accommodate existing routes that may not have a location assigned yet.
          - Establishes a foreign key relationship between `routes.location_id` and `locations.id`.
          - `ON DELETE SET NULL`: If a location is deleted, routes associated with it will have their `location_id` set to NULL, rather than deleting the route.

      2.  **Indexes**
          - Adds an index on the new `location_id` column in the `routes` table for efficient querying of routes within a specific location.

      3.  **Notes**
          - The original `location` (TEXT) column in the `routes` table is *not* removed to prevent data loss for existing routes. A separate process or migration would be needed to populate the new `location_id` based on the old text values if desired.
    */

    -- 1. Add the location_id column to routes
    -- Ensure this runs *after* the locations table is successfully created.
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'routes' AND column_name = 'location_id'
      ) THEN
        ALTER TABLE public.routes
        ADD COLUMN location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL; -- Set null if location is deleted

        -- Add comment for clarity
        COMMENT ON COLUMN public.routes.location_id IS 'Foreign key referencing the specific location/sector within the gym where the route is set.';
      END IF;
    END $$;

    -- 2. Add index for faster lookups by location
    CREATE INDEX IF NOT EXISTS idx_routes_location_id ON public.routes(location_id);