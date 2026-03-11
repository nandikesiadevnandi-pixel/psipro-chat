
-- Create system_settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Permissive: any authenticated user can read
CREATE POLICY "Authenticated users can read system_settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

-- Permissive: any authenticated user can update
CREATE POLICY "Authenticated users can update system_settings"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permissive: any authenticated user can insert (for initial setup)
CREATE POLICY "Authenticated users can insert system_settings"
  ON public.system_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anon to read (needed for Auth page to check before login)
CREATE POLICY "Anon can read system_settings"
  ON public.system_settings FOR SELECT
  TO anon
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row
INSERT INTO public.system_settings (registration_enabled) VALUES (true);
