/*
      # Create routes table

      This migration creates the `routes` table to store information about climbing routes within gyms.

      1.  **New Table:**
          - `routes`
            - `id` (uuid, primary key, default: gen_random_uuid()): Unique identifier for the route.
            - `gym_id` (uuid, foreign key -> gyms.id, not null): The gym this route belongs to.
            - `name` (text, not null): The name of the route.
            - `grade` (text, not null): The difficulty grade (e.g., "V5", "5.11a").
            - `grade_color` (text, not null): Identifier for the hold color (e.g., 'accent-red').
            - `location` (text, not null): Specific wall or area within the gym.
            - `setter` (text): Name of the route setter (optional).
            - `date_set` (timestamptz, not null, default: now()): When the route was set.
            - `description` (text): Optional description of the route.
            - `image_url` (text): Optional URL for a photo of the route.
            - `created_at` (timestamptz, default: now()): Timestamp of creation.

      2.  **Foreign Keys:**
          - `routes.gym_id` references `gyms.id`.

      3.  **Indexes:**
          - Index on `gym_id` for faster lookups by gym.

      4.  **Security:**
          - Enable Row Level Security (RLS) on the `routes` table.
          - Add policy `Allow authenticated read access to routes`: Allows any authenticated user to read all routes. (Further policies for write access can be added later).
    */

    -- 1. Create the routes table
    CREATE TABLE IF NOT EXISTS routes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      gym_id uuid NOT NULL REFERENCES gyms(id) ON DELETE CASCADE, -- Link to gyms table, cascade delete if gym is deleted
      name text NOT NULL,
      grade text NOT NULL,
      grade_color text NOT NULL,
      location text NOT NULL,
      setter text,
      date_set timestamptz NOT NULL DEFAULT now(),
      description text,
      image_url text,
      created_at timestamptz DEFAULT now()
    );

    -- Add comments to columns for clarity in database introspection tools
    COMMENT ON COLUMN routes.id IS 'Unique identifier for the route.';
    COMMENT ON COLUMN routes.gym_id IS 'The gym this route belongs to.';
    COMMENT ON COLUMN routes.name IS 'The name of the route.';
    COMMENT ON COLUMN routes.grade IS 'The difficulty grade (e.g., "V5", "5.11a").';
    COMMENT ON COLUMN routes.grade_color IS 'Identifier for the hold color (e.g., ''accent-red'').';
    COMMENT ON COLUMN routes.location IS 'Specific wall or area within the gym.';
    COMMENT ON COLUMN routes.setter IS 'Name of the route setter (optional).';
    COMMENT ON COLUMN routes.date_set IS 'When the route was set.';
    COMMENT ON COLUMN routes.description IS 'Optional description of the route.';
    COMMENT ON COLUMN routes.image_url IS 'Optional URL for a photo of the route.';
    COMMENT ON COLUMN routes.created_at IS 'Timestamp of creation.';


    -- 2. Add indexes
    CREATE INDEX IF NOT EXISTS idx_routes_gym_id ON routes(gym_id);

    -- 3. Enable Row Level Security (RLS)
    ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

    -- 4. Create RLS policies
    -- Allow authenticated users to read all routes for now
    CREATE POLICY "Allow authenticated read access to routes"
      ON routes
      FOR SELECT
      TO authenticated
      USING (true);

    -- Placeholder policies for future implementation (adjust roles/conditions as needed)
    -- Example: Allow users with 'setter' role in a specific gym to create routes for that gym
    -- CREATE POLICY "Allow setters to create routes for their gym"
    --   ON routes
    --   FOR INSERT
    --   TO authenticated -- Or a specific role like 'setter_role'
    --   WITH CHECK (
    --     -- Check if the user is a setter for the target gym_id
    --     -- This requires a way to link users/roles to gyms, e.g., a 'gym_members' table
    --     auth.uid() IN (SELECT user_id FROM gym_members WHERE gym_id = routes.gym_id AND role = 'setter')
    --   );

    -- Example: Allow setters to update/delete routes they created or manage for their gym
    -- CREATE POLICY "Allow setters to update/delete routes for their gym"
    --   ON routes
    --   FOR UPDATE, DELETE
    --   TO authenticated -- Or a specific role like 'setter_role'
    --   USING (
    --     -- Check if the user is a setter for the target gym_id
    --     auth.uid() IN (SELECT user_id FROM gym_members WHERE gym_id = routes.gym_id AND role = 'setter')
    --   );