-- Create/repair automatic profile provisioning from Supabase Auth -> public.users
-- Run this in Supabase SQL Editor.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_role text;
begin
  desired_role := coalesce(new.raw_user_meta_data ->> 'role', 'customer');
  if desired_role not in ('owner', 'employee', 'customer') then
    desired_role := 'customer';
  end if;

  insert into public.users (id, email, role)
  values (new.id, coalesce(new.email, ''), desired_role)
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

