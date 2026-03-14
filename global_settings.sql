-- Enable Realtime for the table first
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

-- Create the Global Settings Table
CREATE TABLE public.global_settings (
    id int8 PRIMARY KEY,
    active_theme text DEFAULT 'default'::text,
    audio_url text,
    announcement_url text,
    primary_color text DEFAULT '#ba1c16'::text,
    secondary_color text DEFAULT '#face10'::text,
    bg_image_url text,
    custom_logo_url text,
    updated_at timestamptz DEFAULT now()
);

-- Insert the default configuration row
INSERT INTO public.global_settings (id, active_theme, audio_url, announcement_url, primary_color, secondary_color, bg_image_url, custom_logo_url)
VALUES (1, 'default', '', '', '#ba1c16', '#face10', '', '')
ON CONFLICT (id) DO NOTHING;

-- Enable Realtime for global_settings so connected clients can listen to changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_settings;

-- Set up Row Level Security (RLS)
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the settings
CREATE POLICY "Enable read access for all users" ON public.global_settings
    AS PERMISSIVE FOR SELECT
    TO public
    USING (true);

-- Allow admins (authenticated users) to update settings
CREATE POLICY "Enable update for authenticated users only" ON public.global_settings
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow admins to insert if the row doesn't exist
CREATE POLICY "Enable insert for authenticated users only" ON public.global_settings
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Add Payment Gateway Midtrans Columns
ALTER TABLE public.global_settings
ADD COLUMN IF NOT EXISTS payment_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_amount int4 DEFAULT 15000,
ADD COLUMN IF NOT EXISTS midtrans_client_key text,
ADD COLUMN IF NOT EXISTS is_midtrans_production boolean DEFAULT false;
