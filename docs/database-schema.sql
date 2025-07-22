-- =============================================
-- Onushondhan - COMPLETE MERGED SUPABASE SCHEMA
-- =============================================

-- First, clean up any existing tables and policies
DROP TABLE IF EXISTS cases, testimonies, verification_attempts, potential_duplicates, security_logs, admin_roles, admin_activity CASCADE;
DROP FUNCTION IF EXISTS detect_potential_duplicates() CASCADE;
DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS make_admin(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS has_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_table_access(TEXT) CASCADE;
DROP FUNCTION IF EXISTS validate_case_data() CASCADE;
DROP VIEW IF EXISTS admin_users_view, cases_summary CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For similarity function

-- =============================================
-- MAIN TABLES
-- =============================================

-- Enhanced Cases table with verification fields
CREATE TABLE cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'not_specified')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('missing', 'injured', 'deceased', 'safe')),
  
  -- Student Verification Fields
  student_id VARCHAR(100),
  class_grade VARCHAR(50),
  section VARCHAR(10),
  roll_number VARCHAR(50),
  school_name VARCHAR(255) DEFAULT 'Milestone School and College',
  
  -- Family Information (for verification)
  fathers_name VARCHAR(255),
  mothers_name VARCHAR(255),
  guardian_name VARCHAR(255),
  
  -- Identity Verification (optional)
  nid_last_4_digits VARCHAR(4), -- Only last 4 digits for privacy
  birth_certificate_number VARCHAR(100),
  
  -- Contact Information
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  emergency_contact VARCHAR(50),
  address TEXT,
  
  -- Location Information
  last_seen_location TEXT,
  last_seen_time TIMESTAMP,
  hospital_facility TEXT,
  room_ward_number VARCHAR(50),
  
  -- Additional Information
  description TEXT,
  medical_conditions TEXT,
  distinguishing_features TEXT,
  
  -- File Uploads
  photo_url TEXT,
  id_document_url TEXT, -- Student ID, birth certificate, etc.
  
  -- Verification System
  verification_status VARCHAR(50) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected', 'duplicate')),
  verification_method VARCHAR(100), -- 'student_id', 'family_contact', 'photo_match', 'hospital_record', etc.
  verification_notes TEXT,
  verified_by UUID REFERENCES auth.users(id), -- Now references Supabase auth
  verified_at TIMESTAMP,
  
  -- Submitter Information
  submitter_name VARCHAR(255),
  submitter_relationship VARCHAR(100), -- parent, sibling, friend, teacher, etc.
  submitter_contact VARCHAR(255),
  
  -- System Fields
  submission_ip INET,
  data_hash VARCHAR(64),
  priority_level INTEGER DEFAULT 1, -- 1=normal, 2=urgent, 3=critical
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Testimonies table
CREATE TABLE testimonies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  testimony TEXT NOT NULL,
  submitter_name VARCHAR(255),
  submitter_contact VARCHAR(255),
  relationship_to_person VARCHAR(100),
  submission_ip INET,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Verification attempts log
CREATE TABLE verification_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  verification_type VARCHAR(100), -- 'student_id_check', 'phone_verification', 'photo_match'
  attempted_by UUID REFERENCES auth.users(id),
  success BOOLEAN,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Duplicate detection table
CREATE TABLE potential_duplicates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id_1 UUID REFERENCES cases(id) ON DELETE CASCADE,
  case_id_2 UUID REFERENCES cases(id) ON DELETE CASCADE,
  similarity_score DECIMAL(3,2), -- 0.00 to 1.00
  matching_fields JSONB, -- which fields matched
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed_duplicate', 'different_people')),
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  -- Add constraint to prevent self-referencing
  CONSTRAINT check_not_same_case CHECK (case_id_1 != case_id_2)
);

-- Security logs table
CREATE TABLE security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ADMIN SYSTEM TABLES
-- =============================================

-- Admin roles table (works with Supabase Auth)
CREATE TABLE admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role VARCHAR(50) DEFAULT 'moderator' CHECK (role IN ('super_admin', 'admin', 'moderator')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin activity logs
CREATE TABLE admin_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50), -- 'case', 'user', 'system'
  target_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Cases table indexes
CREATE INDEX idx_cases_verification_status ON cases(verification_status);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_student_id ON cases(student_id);
CREATE INDEX idx_cases_phone ON cases(contact_phone);
CREATE INDEX idx_cases_name ON cases(name);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_submitter_contact ON cases(submitter_contact);

-- Other indexes
CREATE INDEX idx_testimonies_case_id ON testimonies(case_id);
CREATE INDEX IF NOT EXISTS idx_testimonies_verified ON testimonies(is_verified);
CREATE INDEX idx_potential_duplicates_pending ON potential_duplicates(status) WHERE status = 'pending';
CREATE INDEX idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON admin_roles(role);
CREATE INDEX IF NOT EXISTS idx_admin_roles_is_active ON admin_roles(is_active);
CREATE INDEX idx_admin_activity_admin_id ON admin_activity(admin_id);
CREATE INDEX idx_admin_activity_created_at ON admin_activity(created_at DESC);
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at DESC);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = user_uuid 
    AND role IN ('super_admin', 'admin', 'moderator')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check specific role level
CREATE OR REPLACE FUNCTION has_role(user_uuid UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_levels JSONB;
BEGIN
  -- Get user's role
  SELECT role INTO user_role 
  FROM admin_roles 
  WHERE user_id = user_uuid AND is_active = true;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Role hierarchy
  role_levels := '{"moderator": 1, "admin": 2, "super_admin": 3}';
  
  RETURN (role_levels->>user_role)::INTEGER >= (role_levels->>required_role)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to make someone admin (for setup) - IMPROVED VERSION
CREATE OR REPLACE FUNCTION make_admin(user_email TEXT, admin_role TEXT DEFAULT 'moderator')
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
  creator_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users 
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User not found: %', user_email;
    RETURN FALSE;
  END IF;
  
  -- Get creator ID, handle case where auth.uid() is NULL (initial setup)
  creator_id := COALESCE(auth.uid(), target_user_id);
  
  -- Insert or update admin role
  INSERT INTO admin_roles (user_id, role, is_active, created_by)
  VALUES (target_user_id, admin_role, true, creator_id)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = EXCLUDED.role, 
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current role (useful for frontend)
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM admin_roles 
  WHERE user_id = user_uuid AND is_active = true;
  
  RETURN COALESCE(user_role, 'public');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if table access is allowed (for debugging)
CREATE OR REPLACE FUNCTION check_table_access(table_name TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'user_id', auth.uid(),
    'user_role', get_user_role(),
    'is_admin', is_admin(),
    'auth_role', auth.role(),
    'table', table_name,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IMPROVED Function to detect potential duplicates
CREATE OR REPLACE FUNCTION detect_potential_duplicates()
RETURNS TRIGGER AS $$
BEGIN
  -- Only detect duplicates if this is a real submission (not a test)
  IF NEW.verification_status != 'unverified' OR NEW.submitter_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Detect potential duplicates
  INSERT INTO potential_duplicates (case_id_1, case_id_2, similarity_score, matching_fields)
  SELECT 
    NEW.id,
    c.id,
    GREATEST(
      CASE WHEN similarity(NEW.name, c.name) > 0.7 THEN 0.8 ELSE 0.0 END,
      CASE WHEN NEW.contact_phone = c.contact_phone AND NEW.contact_phone IS NOT NULL THEN 0.9 ELSE 0.0 END,
      CASE WHEN NEW.student_id = c.student_id AND NEW.student_id IS NOT NULL THEN 0.95 ELSE 0.0 END
    ) as similarity_score,
    jsonb_build_object(
      'name_similar', similarity(NEW.name, c.name) > 0.7,
      'phone_match', NEW.contact_phone = c.contact_phone AND NEW.contact_phone IS NOT NULL,
      'student_id_match', NEW.student_id = c.student_id AND NEW.student_id IS NOT NULL,
      'fathers_name_match', NEW.fathers_name = c.fathers_name AND NEW.fathers_name IS NOT NULL
    )
  FROM cases c
  WHERE c.id != NEW.id
    AND c.created_at > (NOW() - INTERVAL '30 days') -- Only check recent cases
    AND (
      similarity(NEW.name, c.name) > 0.7 OR
      (NEW.contact_phone IS NOT NULL AND NEW.contact_phone = c.contact_phone) OR
      (NEW.student_id IS NOT NULL AND NEW.student_id = c.student_id) OR
      (NEW.fathers_name IS NOT NULL AND NEW.fathers_name = c.fathers_name)
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Data validation function
CREATE OR REPLACE FUNCTION validate_case_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate phone number format (Bangladesh)
  IF NEW.contact_phone IS NOT NULL AND NEW.contact_phone !~ '^\+88[0-9]{11}$' AND NEW.contact_phone !~ '^[0-9]{11}$' THEN
    RAISE EXCEPTION 'Invalid phone number format. Use +88XXXXXXXXXXX or XXXXXXXXXXX';
  END IF;
  
  -- Validate age
  IF NEW.age IS NOT NULL AND (NEW.age < 1 OR NEW.age > 120) THEN
    RAISE EXCEPTION 'Age must be between 1 and 120';
  END IF;
  
  -- Validate student ID format if provided
  IF NEW.student_id IS NOT NULL AND LENGTH(NEW.student_id) < 3 THEN
    RAISE EXCEPTION 'Student ID must be at least 3 characters long';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Create trigger for duplicate detection
CREATE TRIGGER detect_duplicates_trigger
  AFTER INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION detect_potential_duplicates();

-- Add validation trigger
CREATE TRIGGER validate_case_data_trigger
  BEFORE INSERT OR UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION validate_case_data();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cases_updated_at 
  BEFORE UPDATE ON cases 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_roles_updated_at 
  BEFORE UPDATE ON admin_roles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE potential_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PUBLIC ACCESS POLICIES
-- =============================================

-- Public can read verified/pending cases
CREATE POLICY "public_read_verified_cases" ON cases
  FOR SELECT 
  USING (verification_status IN ('verified', 'pending'));

-- Public can submit new cases
CREATE POLICY "public_insert_cases" ON cases
  FOR INSERT 
  WITH CHECK (true);

-- Public can read testimonies for verified cases
CREATE POLICY "public_read_testimonies" ON testimonies
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = testimonies.case_id 
      AND cases.verification_status IN ('verified', 'pending')
    )
  );

-- Public can submit testimonies
CREATE POLICY "public_insert_testimonies" ON testimonies
  FOR INSERT 
  WITH CHECK (true);

-- =============================================
-- MODERATOR POLICIES (Basic Admin)
-- =============================================

-- Moderators can read all cases
CREATE POLICY "moderator_read_cases" ON cases
  FOR SELECT 
  USING (has_role(auth.uid(), 'moderator'));

-- Moderators can update cases (verification, notes)
CREATE POLICY "moderator_update_cases" ON cases
  FOR UPDATE 
  USING (has_role(auth.uid(), 'moderator'))
  WITH CHECK (has_role(auth.uid(), 'moderator'));

-- Moderators can read all testimonies
CREATE POLICY "moderator_read_testimonies" ON testimonies
  FOR SELECT 
  USING (has_role(auth.uid(), 'moderator'));

-- Moderators can verify testimonies
CREATE POLICY "moderator_update_testimonies" ON testimonies
  FOR UPDATE 
  USING (has_role(auth.uid(), 'moderator'))
  WITH CHECK (has_role(auth.uid(), 'moderator'));

-- Moderators can read verification attempts
CREATE POLICY "moderator_read_verification_attempts" ON verification_attempts
  FOR SELECT 
  USING (has_role(auth.uid(), 'moderator'));

-- Moderators can create verification attempts
CREATE POLICY "moderator_insert_verification_attempts" ON verification_attempts
  FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'moderator'));

-- Moderators can read potential duplicates
CREATE POLICY "moderator_read_duplicates" ON potential_duplicates
  FOR SELECT 
  USING (has_role(auth.uid(), 'moderator'));

-- Moderators can review duplicates
CREATE POLICY "moderator_update_duplicates" ON potential_duplicates
  FOR UPDATE 
  USING (has_role(auth.uid(), 'moderator'))
  WITH CHECK (has_role(auth.uid(), 'moderator'));

-- =============================================
-- ADMIN POLICIES (Enhanced Permissions)
-- =============================================

-- Admins can delete cases (moderators cannot)
CREATE POLICY "admin_delete_cases" ON cases
  FOR DELETE 
  USING (has_role(auth.uid(), 'admin'));

-- Admins can delete testimonies
CREATE POLICY "admin_delete_testimonies" ON testimonies
  FOR DELETE 
  USING (has_role(auth.uid(), 'admin'));

-- Admins can read security logs
CREATE POLICY "admin_read_security_logs" ON security_logs
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'));

-- Admins can read their own role and others
CREATE POLICY "admin_read_admin_roles" ON admin_roles
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin')
  );

-- Admins can read admin activity
CREATE POLICY "admin_read_admin_activity" ON admin_activity
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to insert logs through API
CREATE POLICY "admin_insert_admin_activity" ON admin_activity
  FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'moderator')); -- Even moderators can log activities

-- Admins can insert security logs
CREATE POLICY "admin_insert_security_logs" ON security_logs
  FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Users can read their own activity
CREATE POLICY "users_read_own_activity" ON admin_activity
  FOR SELECT 
  USING (admin_id = auth.uid());

-- =============================================
-- SUPER ADMIN POLICIES (Full Control)
-- =============================================

-- Super admins can manage admin roles
CREATE POLICY "super_admin_manage_admin_roles" ON admin_roles
  FOR ALL 
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Super admins can insert security logs
CREATE POLICY "super_admin_insert_security_logs" ON security_logs
  FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Super admins can insert admin activity logs
CREATE POLICY "super_admin_insert_admin_activity" ON admin_activity
  FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- =============================================
-- SERVICE ROLE POLICIES (Full Access for API)
-- =============================================

-- Service role has full access (for API operations)
CREATE POLICY "service_role_full_access_cases" ON cases
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_testimonies" ON testimonies
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_verification_attempts" ON verification_attempts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_duplicates" ON potential_duplicates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_security_logs" ON security_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_admin_roles" ON admin_roles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access_admin_activity" ON admin_activity
  FOR ALL USING (auth.role() = 'service_role');

-- Service role policies for logging
CREATE POLICY "service_role_insert_admin_activity" ON admin_activity
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_insert_security_logs" ON security_logs
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- HELPFUL VIEWS FOR COMMON QUERIES
-- =============================================

-- Admin users view
CREATE VIEW admin_users_view AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created_at,
  u.last_sign_in_at,
  ar.role,
  ar.is_active,
  ar.created_at as role_created_at,
  creator.email as created_by_email
FROM auth.users u
JOIN admin_roles ar ON u.id = ar.user_id
LEFT JOIN auth.users creator ON ar.created_by = creator.id
ORDER BY ar.created_at DESC;

-- Cases summary view
CREATE VIEW cases_summary AS
SELECT 
  verification_status,
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_24h,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_7d
FROM cases 
GROUP BY verification_status, status
ORDER BY verification_status, status;

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert enhanced test data
INSERT INTO cases (
  name, age, gender, status, student_id, class_grade, section, roll_number,
  fathers_name, mothers_name, contact_phone, verification_status, 
  verification_method, description, submitter_relationship
) VALUES 
(
  'Mohammad Rahman Khan', 15, 'male', 'missing', 'MS2024001', '10', 'A', '15',
  'Abdul Rahman Khan', 'Rashida Begum', '+8801712345678', 'verified',
  'student_id_verification', 'Last seen in classroom during break time', 'father'
),
(
  'Fatima Khatun', 16, 'female', 'safe', 'MS2024045', '11', 'B', '22',
  'Mohammad Ali', 'Salma Begum', '+8801987654321', 'verified',
  'hospital_confirmation', 'Found safe at United Hospital, minor injuries', 'mother'
),
(
  'Ahmed Hassan', 14, 'male', 'injured', 'MS2024089', '9', 'C', '08',
  'Hassan Ahmed', 'Nazma Khatun', '+8801555666777', 'pending',
  'family_contact', 'Injured, being treated at Dhaka Medical College', 'uncle'
),
(
  'Rashida Sultana', 17, 'female', 'deceased', 'MS2024156', '12', 'A', '31',
  'Sultan Ahmed', 'Rehana Begum', '+8801444555666', 'verified',
  'official_confirmation', 'Confirmed casualty, body identified by family', 'father'
),
(
  'Karim Uddin', 13, 'male', 'missing', NULL, '8', 'B', NULL,
  'Abdur Rahman', 'Fatema Begum', '+8801333444555', 'unverified',
  NULL, 'Family searching, no student ID available', 'brother'
);

-- Insert test testimonies
INSERT INTO testimonies (case_id, testimony, submitter_name, relationship_to_person) 
SELECT 
  id, 
  'I saw ' || name || ' during the incident. They were trying to help other students.',
  'Anonymous Witness',
  'classmate'
FROM cases 
WHERE name = 'Mohammad Rahman Khan';

-- =============================================
-- SETUP INSTRUCTIONS (COMMENTS)
-- =============================================

-- To create your first admin user:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create a new user with email and password
-- 3. Run: SELECT make_admin('your-email@example.com', 'super_admin');

-- To check your access level:
-- SELECT check_table_access('cases');

-- To view admin users:
-- SELECT * FROM admin_users_view;

-- To view case statistics:
-- SELECT * FROM cases_summary;
