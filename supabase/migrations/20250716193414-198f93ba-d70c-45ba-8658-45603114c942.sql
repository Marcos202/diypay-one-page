-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID NOT NULL REFERENCES public.profiles(id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    status TEXT NOT NULL DEFAULT 'pending', -- Values: pending, approved, rejected, paid
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    admin_notes TEXT -- For admin to add notes (e.g., rejection reason)
);

COMMENT ON TABLE public.withdrawal_requests IS 'Stores producer withdrawal requests.';

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Producers can view their own withdrawal requests"
ON public.withdrawal_requests 
FOR SELECT 
USING (producer_id = auth.uid());

CREATE POLICY "Producers can create their own withdrawal requests"
ON public.withdrawal_requests 
FOR INSERT 
WITH CHECK (producer_id = auth.uid());

-- Add trigger for updated_at if we want to track when records are modified
CREATE OR REPLACE FUNCTION update_withdrawal_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.processed_at = CASE WHEN NEW.status != OLD.status THEN NOW() ELSE OLD.processed_at END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_withdrawal_requests_processed_at
    BEFORE UPDATE ON public.withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_withdrawal_requests_updated_at();