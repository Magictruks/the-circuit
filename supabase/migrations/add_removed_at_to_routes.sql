/*
          # Add removed_at column to routes table

          This migration adds a timestamp column to track when a route is removed from the gym walls.

          1. Changes
             - Add `removed_at` column (timestamptz, nullable) to the `routes` table.
        */

        -- Add the removed_at column to the routes table
        -- It's nullable because routes are not removed by default.
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'routes' AND column_name = 'removed_at'
          ) THEN
            ALTER TABLE public.routes ADD COLUMN removed_at timestamptz NULL;
            RAISE NOTICE 'Column removed_at added to routes table.';
          ELSE
            RAISE NOTICE 'Column removed_at already exists in routes table.';
          END IF;
        END $$;

        -- Optional: Add an index for potentially filtering on removed_at
        CREATE INDEX IF NOT EXISTS idx_routes_removed_at ON public.routes (removed_at);