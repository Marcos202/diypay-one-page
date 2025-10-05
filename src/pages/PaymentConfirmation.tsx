import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CheckCircle, Copy, Download, ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SaleData {
  id: string;
  product_id: string;
  buyer_email: string;
  amount_total_cents: number;
  payment_method_used: string;
  installments_chosen: number;
  status: string;
  gateway_payment_url: string | null;
  gateway_pix_qrcode_base64: string | null;
  gateway_pix_qrcode_text: string | null;
  gateway_bank_slip_barcode: string | null;
  created_at: string;
  paid_at: string | null;
  products: {
    name: string;
    price_cents: number;
  };
}

const PaymentConfirmation = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<SaleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState(false);

  // Função para buscar dados da venda
  const fetchSaleDetails = async () => {
    if (!saleId) {
      setError('ID da venda não fornecido');
      setIsLoading(false);
      return;
    }

    console.log('[DEBUG] Buscando detalhes da venda:', saleId);

    try {
      const { data, error } = await supabase.functions.invoke('get-sale-details', {
        body: { sale_id: saleId },
      });

      console.log('[DEBUG] Resposta da função:', { data, error });

      if (error) {
        console.error('[ERRO] Erro na função:', error);
        setError('Erro ao carregar dados da venda');
        return;
      }

      if (data?.success && data?.sale) {
        setSale(data.sale);
        console.log('[DEBUG] Dados da venda carregados:', data.sale);
      } else {
        setError('Venda não encontrada');
      }
    } catch (err) {
      console.error('[ERRO] Erro ao buscar venda:', err);
      setError('Erro ao carregar dados da venda');
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega dados iniciais
  useEffect(() => {
    fetchSaleDetails();
  }, [saleId]);

  // Realtime para atualizações de status
  useEffect(() => {
    if (!saleId) return;

    console.log('[DEBUG] Configurando listener realtime para venda:', saleId);

    // Criar o canal com configurações específicas
    const channel = supabase
      .channel(`sale-updates-${saleId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: saleId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sales',
          filter: `id=eq.${saleId}`,
        },
        (payload) => {
          console.log('[DEBUG] Atualização realtime recebida:', payload);
          const newSale = payload.new as any;
          
          if (newSale.status === 'paid' && sale?.status !== 'paid') {
            toast({
              title: "Pagamento Confirmado! 🎉",
              description: "Seu pagamento foi processado com sucesso. Você receberá o acesso por email.",
            });
            
            // Atualiza o estado local
            setSale(prev => prev ? { 
              ...prev, 
              status: newSale.status, 
              paid_at: newSale.paid_at 
            } : null);
          } else if (newSale.status !== sale?.status) {
            // Para outras mudanças de status, apenas atualizar
            setSale(prev => prev ? { 
              ...prev, 
              status: newSale.status,
              paid_at: newSale.paid_at
            } : null);
          }
        }
      )
      .subscribe((status) => {
        console.log('[DEBUG] Status da inscrição realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[DEBUG] Realtime conectado com sucesso');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[ERRO] Erro no canal realtime');
        } else if (status === 'TIMED_OUT') {
          console.error('[ERRO] Timeout na conexão realtime');
        } else if (status === 'CLOSED') {
          console.log('[DEBUG] Canal realtime fechado');
        }
      });

    return () => {
      console.log('[DEBUG] Removendo listener realtime');
      channel.unsubscribe();
    };
  }, [saleId, sale?.status]);

  const handleCopyPixCode = async () => {
    if (sale?.gateway_pix_qrcode_text) {
      try {
        await navigator.clipboard.writeText(sale.gateway_pix_qrcode_text);
        setCopiedPix(true);
        toast({
          title: "Código PIX copiado!",
          description: "O código PIX foi copiado para sua área de transferência.",
        });
        setTimeout(() => setCopiedPix(false), 3000);
      } catch (err) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o código PIX. Tente selecionar e copiar manualmente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCopyBarcode = async () => {
    if (sale?.gateway_bank_slip_barcode) {
      try {
        await navigator.clipboard.writeText(sale.gateway_bank_slip_barcode);
        setCopiedBarcode(true);
        toast({
          title: "Linha digitável copiada!",
          description: "A linha digitável foi copiada para sua área de transferência.",
        });
        setTimeout(() => setCopiedBarcode(false), 3000);
      } catch (err) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar a linha digitável. Tente selecionar e copiar manualmente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleOpenBankSlip = () => {
    if (sale?.gateway_payment_url) {
      window.open(sale.gateway_payment_url, '_blank');
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'Aguardando Pagamento';
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusDisplay = (status: string) => {
    const formattedStatus = formatStatus(status);
    
    switch (status) {
      case 'paid':
        return {
          text: formattedStatus,
          className: 'bg-green-100 text-green-800',
        };
      case 'pending':
      case 'pending_payment':
        return {
          text: formattedStatus,
          className: 'bg-yellow-100 text-yellow-800',
        };
      case 'cancelled':
        return {
          text: formattedStatus,
          className: 'bg-red-100 text-red-800',
        };
      default:
        return {
          text: formattedStatus,
          className: 'bg-gray-100 text-gray-800',
        };
    }
  };

  // Estados de loading e erro
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando detalhes do pagamento...</p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.863-.833-2.634 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro ao Carregar Pedido</h1>
          <p className="text-gray-600 mb-6">{error || "Não foi possível carregar os detalhes do seu pedido."}</p>
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-700">
              Tentar Novamente
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isPix = sale.payment_method_used === 'pix';
  const isBankSlip = sale.payment_method_used === 'bank_slip';
  const isCreditCard = sale.payment_method_used === 'credit_card';
  const isPaid = sale.status === 'paid';

  const statusDisplay = getStatusDisplay(sale.status);

  // Verifica se o código PIX é uma URL (ambiente de teste)
  const isPixTestUrl = sale.gateway_pix_qrcode_text?.startsWith('http');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <CheckCircle className={`w-16 h-16 mx-auto mb-4 ${isPaid ? 'text-green-600' : 'text-yellow-600'}`} />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isPaid ? 'Pagamento Confirmado!' : 'Pedido Recebido!'}
          </h1>
          <p className="text-lg text-gray-600">
            {isPaid ? 'Obrigado pela sua compra! Você receberá o acesso por email.' : 'Finalize seu pagamento para acessar o produto'}
          </p>
        </div>

        {/* Detalhes do Pedido */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detalhes do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Produto:</span>
                <span className="font-medium">{sale.products.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-medium text-lg">{formatCurrency(sale.amount_total_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Método de Pagamento:</span>
                <span className="font-medium">
                  {isPix ? 'PIX' : isBankSlip ? 'Boleto Bancário' : isCreditCard ? 'Cartão de Crédito' : sale.payment_method_used}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.className}`}>
                  {statusDisplay.text}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo específico por método de pagamento */}
        {!isPaid && (
          <>
            {/* PIX Payment */}
            {isPix && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Pagar com PIX</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* QR Code PIX */}
                  {sale.gateway_pix_qrcode_base64 && (
                    <div className="text-center">
                      <img 
                        src={`data:image/png;base64,${sale.gateway_pix_qrcode_base64}`}
                        alt="QR Code PIX"
                        className="mx-auto mb-4 border rounded-lg"
                        style={{ maxWidth: '200px', height: 'auto' }}
                      />
                      <p className="text-sm text-gray-600 mb-4">
                        Escaneie o QR Code com o app do seu banco ou use o código PIX abaixo
                      </p>
                    </div>
                  )}
                  
                  {/* Código PIX ou Link de Teste */}
                  {sale.gateway_pix_qrcode_text && (
                    <div className="space-y-3">
                      {isPixTestUrl ? (
                        // Ambiente de teste - mostra link
                        <div className="text-center">
                          <a
                            href={sale.gateway_pix_qrcode_text}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <ExternalLink className="w-5 h-5 mr-2" />
                            Clique para Pagar (Simulação PIX)
                          </a>
                          <p className="text-xs text-gray-500 mt-2">
                            * Este é um ambiente de teste. Clique no link para simular o pagamento.
                          </p>
                        </div>
                      ) : (
                        // Ambiente real - mostra código copia e cola
                        <>
                          <label className="text-sm font-medium text-gray-700">
                            Código PIX (Copia e Cola):
                          </label>
                          <Textarea
                            value={sale.gateway_pix_qrcode_text}
                            readOnly
                            className="text-xs font-mono bg-gray-50 resize-none"
                            rows={4}
                          />
                          <div className="flex justify-center">
                            <Button
                              onClick={handleCopyPixCode}
                              variant="outline"
                              className="w-full max-w-xs"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              {copiedPix ? 'Copiado!' : 'Copiar Código PIX'}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Mensagem quando não há código PIX disponível */}
                  {!sale.gateway_pix_qrcode_text && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        Código Copia e Cola indisponível no ambiente de teste.
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Instruções:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• O pagamento é processado instantaneamente</li>
                      <li>• Após o pagamento, você receberá o acesso por email</li>
                      <li>• O PIX expira em 24 horas</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bank Slip Payment */}
            {isBankSlip && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Pagar com Boleto Bancário</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Botão para imprimir boleto */}
                  {sale.gateway_payment_url && (
                    <div className="text-center">
                      <Button
                        onClick={handleOpenBankSlip}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                        size="lg"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Imprimir Boleto
                      </Button>
                    </div>
                  )}

                  {/* Linha digitável do boleto */}
                  {sale.gateway_bank_slip_barcode && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        Linha Digitável:
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={sale.gateway_bank_slip_barcode}
                          readOnly
                          className="flex-1 text-sm font-mono bg-gray-50"
                        />
                        <Button
                          onClick={handleCopyBarcode}
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          {copiedBarcode ? 'Copiado!' : 'Copiar'}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Instruções:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Pague o boleto em qualquer banco, lotérica ou app bancário</li>
                      <li>• O prazo para pagamento é de 3 dias úteis</li>
                      <li>• Após o pagamento, o processamento pode levar até 2 dias úteis</li>
                      <li>• Você receberá o acesso por email após a confirmação</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Credit Card Payment */}
            {isCreditCard && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Pagamento com Cartão de Crédito</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                      Pagamento em Processamento
                    </h3>
                    <p className="text-blue-700">
                      Seu pagamento está sendo processado. Avisaremos por e-mail quando for aprovado.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Mensagem de sucesso para pagamentos confirmados */}
        {isPaid && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Pagamento Confirmado! 🎉
                </h3>
                <p className="text-green-700 mb-4">
                  Obrigado pela sua compra! Você receberá o acesso ao produto por email em instantes.
                </p>
                <p className="text-sm text-green-600">
                  Verifique também sua caixa de spam caso não encontre o email.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Dúvidas? Entre em contato conosco.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
