-- Add notification_preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "purchase_approved": true,
  "boleto_generated": false,
  "pix_generated": false,
  "abandoned_cart": false,
  "purchase_declined": false,
  "refund": false,
  "chargeback": false,
  "subscription_cancelled": false,
  "subscription_overdue": false,
  "subscription_renewed": false
}'::jsonb;