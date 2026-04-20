-- Assign unique BVA membership numbers in format 26XXXX.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_number TEXT;

CREATE SEQUENCE IF NOT EXISTS public.membership_number_seq
  MINVALUE 0
  MAXVALUE 9999
  START 0
  INCREMENT 1;

CREATE OR REPLACE FUNCTION public.assign_membership_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.membership_number IS NULL OR btrim(NEW.membership_number) = '' THEN
    NEW.membership_number := '26' || lpad(nextval('public.membership_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_membership_number ON public.profiles;
CREATE TRIGGER trg_assign_membership_number
  BEFORE INSERT OR UPDATE OF membership_number ON public.profiles
  FOR EACH ROW
  WHEN (NEW.membership_number IS NULL OR btrim(NEW.membership_number) = '')
  EXECUTE FUNCTION public.assign_membership_number();

UPDATE public.profiles
SET membership_number = NULL
WHERE membership_number IS NULL OR btrim(membership_number) = '';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_membership_number_key
  ON public.profiles (membership_number)
  WHERE membership_number IS NOT NULL;