-- Enable Row Level Security on the new space_containers table
ALTER TABLE public.space_containers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for space_containers
-- Space owners can manage their own containers
CREATE POLICY "Space owners can manage their own containers"
ON public.space_containers
FOR ALL
USING (space_id IN (
  SELECT id FROM public.spaces WHERE producer_id = auth.uid()
))
WITH CHECK (space_id IN (
  SELECT id FROM public.spaces WHERE producer_id = auth.uid()
));

-- Public can view containers (needed for member area access)
CREATE POLICY "Public can view space containers"
ON public.space_containers
FOR SELECT
USING (true);