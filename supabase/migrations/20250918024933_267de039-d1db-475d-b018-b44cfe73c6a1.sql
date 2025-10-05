-- Create missing trigger for automatic webhook delivery
-- This trigger will automatically enqueue webhook deliveries when transaction events are created

CREATE OR REPLACE TRIGGER trigger_enqueue_webhook_deliveries
  AFTER INSERT ON public.transaction_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_webhook_deliveries();