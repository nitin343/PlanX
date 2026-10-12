-- ========================================================
-- PLANX — Supabase Database Schema
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query -> Run)
-- ========================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    wake_time TIME DEFAULT '05:00',
    sleep_time TIME DEFAULT '23:00',
    work_start TIME DEFAULT '09:00',
    work_end TIME DEFAULT '18:00',
    family_start TIME DEFAULT '18:30',
    family_end TIME DEFAULT '20:00',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    ai_tone TEXT DEFAULT 'aggressive', -- 'aggressive' | 'coach' | 'tactical'
    streak_count INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    total_score INT DEFAULT 0,
    gemini_api_key TEXT,               -- optional user override
    siemens_endpoint TEXT,
    siemens_api_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daily Plans Table
CREATE TABLE IF NOT EXISTS public.daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    must_win TEXT,
    should_do TEXT[] DEFAULT '{}',
    could_do TEXT[] DEFAULT '{}',
    ai_motivation TEXT,
    status TEXT DEFAULT 'active', -- 'active' | 'completed' | 'reviewed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, plan_date)
);

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.daily_plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'must_win', -- 'must_win' | 'should_do' | 'could_do'
    category TEXT DEFAULT 'work',    -- 'work' | 'skills' | 'health' | 'personal'
    status TEXT DEFAULT 'pending',    -- 'pending' | 'in_progress' | 'completed' | 'skipped'
    estimated_minutes INT DEFAULT 45,
    actual_minutes INT DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Goals Table (21-Day / 90-Day sprints)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'career',   -- 'career' | 'health' | 'skills' | 'discipline'
    duration_type TEXT DEFAULT '21_day', -- '21_day' | '90_day' | 'custom'
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '21 days'),
    target_metric TEXT,
    current_value NUMERIC DEFAULT 0,
    target_value NUMERIC DEFAULT 21,
    status TEXT DEFAULT 'active',    -- 'active' | 'completed' | 'failed' | 'paused'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Habits & Habit Logs Table
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily',  -- 'daily' | 'weekdays' | 'custom'
    current_streak INT DEFAULT 0,
    best_streak INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT false,
    notes TEXT,
    UNIQUE(habit_id, log_date)
);

-- 6. Day Scores (Night Review & Debrief)
CREATE TABLE IF NOT EXISTS public.day_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    score_date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_score INT DEFAULT 0, -- 0-100
    task_score INT DEFAULT 0,
    goal_score INT DEFAULT 0,
    learning_score INT DEFAULT 0,
    discipline_score INT DEFAULT 0,
    mood TEXT DEFAULT 'good',
    energy_level INT DEFAULT 4,
    ai_review TEXT,
    wins TEXT[] DEFAULT '{}',
    improvements TEXT[] DEFAULT '{}',
    journal_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, score_date)
);

-- 7. Memory Cards (Spaced Repetition SM-2)
CREATE TABLE IF NOT EXISTS public.memory_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    category TEXT DEFAULT 'tech',
    difficulty INT DEFAULT 0,
    interval_days INT DEFAULT 1,
    ease_factor NUMERIC DEFAULT 2.5,
    next_review DATE DEFAULT CURRENT_DATE,
    review_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AI Chat & Coaching Logs
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    context TEXT DEFAULT 'chat', -- 'morning_war_room' | 'night_review' | 'chat'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Push Subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper RLS Policies for authenticated users
DO $$
BEGIN
    -- profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
        CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;

    -- daily_plans
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_plans' AND policyname = 'Users can manage own plans') THEN
        CREATE POLICY "Users can manage own plans" ON public.daily_plans FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- tasks
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can manage own tasks') THEN
        CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- goals
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Users can manage own goals') THEN
        CREATE POLICY "Users can manage own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- habits
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habits' AND policyname = 'Users can manage own habits') THEN
        CREATE POLICY "Users can manage own habits" ON public.habits FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- habit_logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'habit_logs' AND policyname = 'Users can manage own habit logs') THEN
        CREATE POLICY "Users can manage own habit logs" ON public.habit_logs FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- day_scores
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'day_scores' AND policyname = 'Users can manage own day scores') THEN
        CREATE POLICY "Users can manage own day scores" ON public.day_scores FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- memory_cards
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'memory_cards' AND policyname = 'Users can manage own cards') THEN
        CREATE POLICY "Users can manage own cards" ON public.memory_cards FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- ai_conversations
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_conversations' AND policyname = 'Users can manage own conversations') THEN
        CREATE POLICY "Users can manage own conversations" ON public.ai_conversations FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- push_subscriptions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Users can manage own push subs') THEN
        CREATE POLICY "Users can manage own push subs" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
