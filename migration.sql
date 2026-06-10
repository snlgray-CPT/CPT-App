-- Run this SQL on your Supabase SQL editor to add VolunGrader fields

-- 1. Update volunteers table
ALTER TABLE volunteers 
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS privilege TEXT,
ADD COLUMN IF NOT EXISTS last_convention_date DATE,
ADD COLUMN IF NOT EXISTS assignment_held TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS recommended_for_committee_assistant BOOLEAN DEFAULT FALSE;

-- 2. Update evaluations table
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS recommendation TEXT,
ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ DEFAULT NOW();
