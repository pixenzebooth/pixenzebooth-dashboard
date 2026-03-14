-- 1. Create LUTs table
create table public.luts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  storage_path text not null,
  thumbnail_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.luts enable row level security;

-- 3. Create Policy (Allow read for everyone, write for authenticated admin)
-- Adjust based on your auth setup. Assuming public read, admin write.
create policy "Enable read access for all users" on public.luts for select using (true);

create policy "Enable insert for authenticated users only" on public.luts for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only" on public.luts for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only" on public.luts for delete using (auth.role() = 'authenticated');

-- 4. Create Storage Bucket 'luts'
-- Note: 'storage.buckets' insert might require superuser or dashboard, but usually works with proper permissions.
-- If this fails, create the bucket manually in the dashboard named 'luts' and make it public.
insert into storage.buckets (id, name, public) values ('luts', 'luts', true);

-- 5. Storage Policies
create policy "Give public access to luts" on storage.objects for select using ( bucket_id = 'luts' );

create policy "Enable insert for authenticated users" on storage.objects for insert with check ( bucket_id = 'luts' and auth.role() = 'authenticated' );

create policy "Enable update/delete for authenticated users" on storage.objects for update using ( bucket_id = 'luts' and auth.role() = 'authenticated' );
