-- ============================================================
-- MICHAELSON MMA — Supabase SQL Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text,
  date_of_birth date,
  medical_notes text,
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile; admin can read all
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admin can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admin can update all profiles" on public.profiles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Allow insert on signup" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, date_of_birth, medical_notes, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    (new.raw_user_meta_data->>'date_of_birth')::date,
    new.raw_user_meta_data->>'medical_notes',
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('8_per_month', 'unlimited_monthly')),
  start_date date not null,
  end_date date not null,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "Admin can view all subscriptions" on public.subscriptions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin can manage subscriptions" on public.subscriptions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- CLASSES
-- ============================================================
create table public.classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('MMA', 'בוקסינג', 'BJJ')),
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday
  start_time time not null,
  duration_minutes int not null default 60,
  max_capacity int not null default 25,
  is_recurring boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.classes enable row level security;

create policy "Anyone authenticated can view classes" on public.classes
  for select using (auth.uid() is not null);

create policy "Admin can manage classes" on public.classes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- CLASS OCCURRENCES
-- ============================================================
create table public.class_occurrences (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid not null references public.classes(id) on delete cascade,
  date date not null,
  is_cancelled boolean not null default false,
  override_capacity int, -- null = use class default
  created_at timestamptz not null default now(),
  unique(class_id, date)
);

alter table public.class_occurrences enable row level security;

create policy "Anyone authenticated can view occurrences" on public.class_occurrences
  for select using (auth.uid() is not null);

create policy "Admin can manage occurrences" on public.class_occurrences
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- BOOKINGS
-- ============================================================
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  occurrence_id uuid not null references public.class_occurrences(id) on delete cascade,
  booked_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique(user_id, occurrence_id)
);

alter table public.bookings enable row level security;

create policy "Users can view own bookings" on public.bookings
  for select using (auth.uid() = user_id);

create policy "Admin can view all bookings" on public.bookings
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can create own bookings" on public.bookings
  for insert with check (auth.uid() = user_id);

create policy "Users can cancel own bookings" on public.bookings
  for update using (auth.uid() = user_id);

create policy "Admin can manage all bookings" on public.bookings
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- View: occurrence with class info + booking count
create or replace view public.occurrence_details as
select
  co.id,
  co.class_id,
  co.date,
  co.is_cancelled,
  coalesce(co.override_capacity, c.max_capacity) as capacity,
  c.name,
  c.type,
  c.start_time,
  c.duration_minutes,
  c.day_of_week,
  count(b.id) filter (where b.cancelled_at is null) as booking_count
from public.class_occurrences co
join public.classes c on co.class_id = c.id
left join public.bookings b on b.occurrence_id = co.id
group by co.id, co.class_id, co.date, co.is_cancelled, co.override_capacity,
         c.max_capacity, c.name, c.type, c.start_time, c.duration_minutes, c.day_of_week;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get active subscription for a user
create or replace function public.get_active_subscription(p_user_id uuid)
returns table (
  id uuid,
  type text,
  start_date date,
  end_date date
) as $$
  select id, type, start_date, end_date
  from public.subscriptions
  where user_id = p_user_id
    and start_date <= current_date
    and end_date >= current_date
  order by end_date desc
  limit 1;
$$ language sql security definer;

-- Count bookings this week (Sun–Sat) for a user
create or replace function public.count_weekly_bookings(p_user_id uuid)
returns int as $$
declare
  week_start date;
  week_end date;
  cnt int;
begin
  -- Israeli week: Sunday is start
  week_start := date_trunc('week', current_date + interval '1 day')::date - interval '1 day';
  week_end := week_start + interval '6 days';

  select count(*)
  into cnt
  from public.bookings b
  join public.class_occurrences co on b.occurrence_id = co.id
  where b.user_id = p_user_id
    and b.cancelled_at is null
    and co.date between week_start and week_end;

  return coalesce(cnt, 0);
end;
$$ language plpgsql security definer;

-- Count bookings this calendar month for a user
create or replace function public.count_monthly_bookings(p_user_id uuid)
returns int as $$
declare
  cnt int;
begin
  select count(*)
  into cnt
  from public.bookings b
  join public.class_occurrences co on b.occurrence_id = co.id
  where b.user_id = p_user_id
    and b.cancelled_at is null
    and date_trunc('month', co.date) = date_trunc('month', current_date);

  return coalesce(cnt, 0);
end;
$$ language plpgsql security definer;

-- Generate occurrences for a recurring class for the next N weeks
create or replace function public.generate_occurrences(p_class_id uuid, p_weeks int default 8)
returns void as $$
declare
  cls record;
  target_date date;
  i int;
begin
  select * into cls from public.classes where id = p_class_id;

  for i in 0..((p_weeks * 7) - 1) loop
    target_date := current_date + i;
    if extract(dow from target_date) = cls.day_of_week then
      insert into public.class_occurrences (class_id, date)
      values (p_class_id, target_date)
      on conflict (class_id, date) do nothing;
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_bookings_user on public.bookings(user_id);
create index idx_bookings_occurrence on public.bookings(occurrence_id);
create index idx_occurrences_date on public.class_occurrences(date);
create index idx_occurrences_class on public.class_occurrences(class_id);
create index idx_subscriptions_user on public.subscriptions(user_id);

-- ============================================================
-- SAMPLE DATA (Optional — uncomment to seed)
-- ============================================================
-- Insert sample classes (after creating an admin user):
/*
insert into public.classes (name, type, day_of_week, start_time, duration_minutes, max_capacity, is_recurring)
values
  ('MMA למתחילים', 'MMA', 0, '09:00', 60, 20, true),
  ('MMA מתקדמים', 'MMA', 2, '19:00', 90, 15, true),
  ('בוקסינג בוקר', 'בוקסינג', 1, '07:00', 60, 25, true),
  ('בוקסינג ערב', 'בוקסינג', 3, '18:30', 60, 25, true),
  ('BJJ פתוח', 'BJJ', 0, '18:00', 90, 20, true),
  ('BJJ טכניקה', 'BJJ', 4, '20:00', 60, 15, true);
*/
