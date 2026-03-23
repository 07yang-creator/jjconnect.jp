-- Step 2: add access controls metadata to posts

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS access_tier TEXT[]
  DEFAULT ARRAY['T','CB','VB','B','S','W','WN','W1','W2','W3','S-writer','A'];

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS topic TEXT
  CHECK (topic IN ('finance','real_estate','misc','news','announcement','event'))
  DEFAULT 'misc';

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS brief TEXT;
