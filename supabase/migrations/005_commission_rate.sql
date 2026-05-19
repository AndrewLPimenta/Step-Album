-- Add per-user commission rate (nullable; NULL means use system default)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS commission_rate numeric(6,4) DEFAULT NULL;
