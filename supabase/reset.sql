-- Step 1: Drop trigger first
drop trigger if exists on_auth_user_created on auth.users;

-- Step 2: Drop functions
drop function if exists public.handle_new_user() cascade;
drop function if exists public.get_active_subscription(uuid) cascade;
drop function if exists public.count_weekly_bookings(uuid) cascade;
drop function if exists public.count_monthly_bookings(uuid) cascade;
drop function if exists public.generate_occurrences(uuid, int) cascade;

-- Step 3: Drop view
drop view if exists public.occurrence_details cascade;

-- Step 4: Drop tables in order (child first)
drop table if exists public.bookings cascade;
drop table if exists public.class_occurrences cascade;
drop table if exists public.classes cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.profiles cascade;
