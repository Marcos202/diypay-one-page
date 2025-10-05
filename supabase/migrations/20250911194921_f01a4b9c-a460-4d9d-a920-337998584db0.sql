-- ETAPA 2: Implementar o Trigger de Enfileiramento Automático
-- Este trigger detecta automaticamente a criação de novos eventos e enfileira os webhooks correspondentes

CREATE OR REPLACE TRIGGER trigger_enqueue_webhook_deliveries
    AFTER INSERT ON public.transaction_events
    FOR EACH ROW
    EXECUTE FUNCTION public.enqueue_webhook_deliveries();