/*
      # Remove Location Text Field from Routes

      This migration removes the redundant `location` text column from the `routes` table,
      as the location information is now managed via the `location_id` foreign key
      and the `locations` table.

      1.  **Table Modified**: `routes`
      2.  **Action**: `DROP COLUMN location`
      3.  **Safety**: Uses `IF EXISTS` to prevent errors if the column was already removed.

      4.  **WARNING**: This is a destructive change. Ensure all application code relying on the old `location` text field has been updated to use `location_id` or the joined `location_name` before applying this migration.
    */

    ALTER TABLE public.routes
    DROP COLUMN IF EXISTS location;

    COMMENT ON COLUMN public.routes.location_id IS 'Foreign key referencing the specific location/sector within the gym where the route is set. Replaces the old text-based location field.';