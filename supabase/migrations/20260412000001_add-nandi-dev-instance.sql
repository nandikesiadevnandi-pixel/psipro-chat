-- Migration: Add NandiDev WhatsApp instance
-- Run this in Supabase SQL Editor to register the NandiDev Evolution GO instance

DO $$
DECLARE
  v_instance_id uuid := '11111111-aaaa-bbbb-cccc-000000000002';
  v_existing_id uuid;
BEGIN
  -- Check if already exists
  SELECT id INTO v_existing_id
  FROM public.whatsapp_instances
  WHERE instance_name = 'NandiDev'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RAISE NOTICE 'NandiDev instance already exists with id: %', v_existing_id;
    RETURN;
  END IF;

  -- Insert instance
  INSERT INTO public.whatsapp_instances (
    id,
    name,
    instance_name,
    status,
    provider_type,
    instance_id_external,
    phone_number,
    created_at,
    updated_at
  ) VALUES (
    v_instance_id,
    'NandiDev',
    'NandiDev',
    'connected',
    'self_hosted',
    '725369c4-9c92-41f9-9489-d6cf79033a0f',
    '555496246565',
    NOW(),
    NOW()
  );

  -- Insert secrets
  INSERT INTO public.whatsapp_instance_secrets (
    instance_id,
    api_key,
    api_url
  ) VALUES (
    v_instance_id,
    'd62527fc-99ea-4fd7-988a-6759cc3676db',
    'https://evo-proxy-production.up.railway.app'
  );

  RAISE NOTICE 'NandiDev instance created successfully with id: %', v_instance_id;
END;
$$;
