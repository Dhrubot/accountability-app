// Database schema (run in Supabase SQL editor)
/*
-- Cases table
CREATE TABLE cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  grade VARCHAR(50),
  photo_url TEXT,
  status VARCHAR(50) NOT NULL CHECK (status IN ('missing', 'injured', 'deceased', 'safe')),
  last_seen_location TEXT,
  last_seen_time TIMESTAMP,
  hospital_facility TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  description TEXT,
  verification_status VARCHAR(50) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  submission_ip INET,
  data_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Testimonies table
CREATE TABLE testimonies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  testimony TEXT NOT NULL,
  submitter_name VARCHAR(255),
  submitter_contact VARCHAR(255),
  submission_ip INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Security logs table
CREATE TABLE security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Policies for public read access
CREATE POLICY "Public read access for verified cases" ON cases
  FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Public read access for testimonies" ON testimonies
  FOR SELECT USING (true);

-- Policies for authenticated users (admins)
CREATE POLICY "Admin full access to cases" ON cases
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access to testimonies" ON testimonies
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin access to security logs" ON security_logs
  FOR ALL USING (auth.role() = 'authenticated');
*/