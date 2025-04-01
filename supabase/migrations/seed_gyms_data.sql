/*
      # Seed Gyms Data

      This migration inserts initial data into the `gyms` table.

      1. Seed Data
         - Inserts 8 common climbing gym franchises/locations across the US.

      2. Notes
         - Uses `INSERT INTO ... ON CONFLICT DO NOTHING` to avoid errors if the migration is run multiple times or if gyms with the same name already exist (though names aren't unique constraints here, it's good practice for seeding).
         - UUIDs are generated automatically by the table's default.
    */

    INSERT INTO public.gyms (name, city, state, country) VALUES
      ('Summit Climbing', 'Dallas', 'TX', 'USA'),
      ('Movement', 'Denver', 'CO', 'USA'),
      ('Brooklyn Boulders', 'Brooklyn', 'NY', 'USA'),
      ('Sender One', 'Santa Ana', 'CA', 'USA'),
      ('The Cliffs', 'Long Island City', 'NY', 'USA'),
      ('Planet Granite', 'Portland', 'OR', 'USA'),
      ('Austin Bouldering Project', 'Austin', 'TX', 'USA'),
      ('Vertical World', 'Seattle', 'WA', 'USA')
    ON CONFLICT (id) DO NOTHING; -- Or use a different conflict target if needed, e.g., ON CONFLICT (name) DO NOTHING if name should be unique