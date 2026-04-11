-- Keep public.users.name in sync with Auth display name and backfill bad rows.
-- Run in Supabase SQL Editor (service role / dashboard).

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;

-- Backfill when name is missing, empty, or mistakenly equals email
UPDATE public.users u
SET name = meta.name
FROM (
  SELECT
    id,
    NULLIF(trim(both FROM coalesce(raw_user_meta_data ->> 'name', '')), '') AS name
  FROM auth.users
) AS meta
WHERE meta.id = u.id
  AND meta.name IS NOT NULL
  AND (
    u.name IS NULL
    OR trim(both FROM u.name) = ''
    OR lower(trim(both FROM u.name)) = lower(trim(both FROM u.email))
  );

-- Replace signup trigger: persist role + optional display name from user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired_role text;
  meta_name text;
BEGIN
  desired_role := coalesce(new.raw_user_meta_data ->> 'role', 'customer');
  IF desired_role NOT IN ('owner', 'employee', 'customer') THEN
    desired_role := 'customer';
  END IF;

  meta_name := NULLIF(trim(both FROM coalesce(new.raw_user_meta_data ->> 'name', '')), '');

  INSERT INTO public.users (id, email, role, name)
  VALUES (new.id, coalesce(new.email, ''), desired_role, meta_name)
  ON CONFLICT (id) DO UPDATE
    SET email = excluded.email,
        role = excluded.role,
        name = CASE
          WHEN trim(both FROM coalesce(public.users.name, '')) = ''
            OR lower(trim(both FROM public.users.name)) = lower(trim(both FROM public.users.email))
          THEN coalesce(excluded.name, public.users.name)
          ELSE public.users.name
        END,
        updated_at = now();

  RETURN new;
END;
$$;
