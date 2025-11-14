-- Add occupied_by column to listings table
ALTER TABLE public.listings ADD COLUMN occupied_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
