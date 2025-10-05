-- Fix RLS issues by enabling RLS on tables that need it
-- Only enable RLS, don't recreate existing policies

-- Check if RLS is already enabled and enable if not
DO $$
BEGIN
    -- Enable RLS on webhook_delivery_jobs if not already enabled
    IF NOT (SELECT row_security FROM pg_tables WHERE tablename = 'webhook_delivery_jobs' AND schemaname = 'public') THEN
        ALTER TABLE public.webhook_delivery_jobs ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on webhook_event_logs if not already enabled  
    IF NOT (SELECT row_security FROM pg_tables WHERE tablename = 'webhook_event_logs' AND schemaname = 'public') THEN
        ALTER TABLE public.webhook_event_logs ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;