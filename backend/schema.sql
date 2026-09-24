-- =========================================================
-- MoiDoctar Supabase PostgreSQL Schema Migration
-- Run this in your Supabase SQL Editor to initialize all tables
-- =========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    user_name TEXT NOT NULL,
    hashed_password TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    phone TEXT,
    demographics JSONB DEFAULT '{
        "gender": null,
        "age": null,
        "currentCondition": null,
        "bloodType": null,
        "country": null
    }'::jsonb,
    preference JSONB DEFAULT '{
        "emailNotification": true,
        "smsAlert": false,
        "twoFactorAuth": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    last_login TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 2. Medications Table
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    time TEXT NOT NULL,
    frequent TEXT DEFAULT 'morning' CHECK (frequent IN ('morning', 'afternoon', 'night')),
    supply TEXT DEFAULT '30',
    status BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    stopped_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_medications_user_id ON public.medications (user_id);

-- 3. Symptoms Table
CREATE TABLE IF NOT EXISTS public.symptoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    symptom_name TEXT,
    severity TEXT,
    notes TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    logged_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_symptoms_user_id ON public.symptoms (user_id);

-- 4. Triage Sessions Table
CREATE TABLE IF NOT EXISTS public.triage_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    symptoms TEXT[] NOT NULL DEFAULT '{}',
    duration TEXT DEFAULT 'Recent',
    severity TEXT DEFAULT 'Moderate' CHECK (severity IN ('Mild', 'Moderate', 'Severe')),
    urgency_level TEXT DEFAULT 'Moderate' CHECK (urgency_level IN ('Emergency', 'Urgent', 'Non-Urgent', 'Stable', 'Moderate')),
    action_plan TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_triage_sessions_user_id ON public.triage_sessions (user_id);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    read BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);

-- 6. Optional: Insert initial demo user
INSERT INTO public.users (
    email,
    user_name,
    hashed_password,
    is_verified,
    role,
    demographics,
    preference
) VALUES (
    'alex.morgan@moidoctar.com',
    'Alex Morgan',
    '$2b$12$e8kPqg11mFm9f8zI8GqN6u3Wf6IqF2.s3G1h6j4K5l7M8n9O0P1Qq', -- Password: Password123!
    TRUE,
    'user',
    '{"gender": "Female", "age": "29", "bloodType": "O+", "country": "United States"}'::jsonb,
    '{"emailNotification": true, "smsAlert": false, "twoFactorAuth": false}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Generic key/value settings (AI API key pool, per-user AI memory).
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
