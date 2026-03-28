-- Run in Supabase Dashboard → SQL → New query (postgres superuser).
-- Removes the 12 V&V test auth users from 2025-03-27. FKs CASCADE to public.profiles, posts, etc.
-- If this errors, copy the message from Logs → Postgres and fix schema/data first.

DELETE FROM auth.users
WHERE id IN (
  '0f5b2f37-c2d9-4b13-a664-bc8befdde11b',
  '4971391f-9f08-44ec-a2fe-537f4256eef3',
  '7929e686-166b-41e8-b116-0fe58fe95ede',
  '8552fc1c-bf5a-4970-af55-14a9cd017fa6',
  '8f800381-c12f-48d2-88f8-c0fa3b237509',
  '992ffe2a-7239-4858-8d61-c35d92d6a797',
  'c44d12f9-5919-4c1f-96e9-449de125374a',
  'd26b61a7-5cd5-43aa-9e78-f01052810329',
  'da745da5-176e-4a68-9076-25d668c6aa01',
  'e374cd2f-ef70-4749-a3d5-407c1ad184e0',
  'f1fc5cf4-bb8c-4a79-8127-842f6b97b83a',
  'f8c96911-ad4a-4b66-9da6-fad1b196362b'
);
