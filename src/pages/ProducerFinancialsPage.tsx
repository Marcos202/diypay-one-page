import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DollarSign, 
  Clock, 
  Download,
  Loader2,
  CreditCard,
  CheckCircle,
  Shield,
  Calendar
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { WithdrawalModal } from "@/components/WithdrawalModal";
import { ProducerLayout } from "@/components/ProducerLayout";

interface FinancialTransaction {
  id: string;
  created_at: string;
  status: string;
  product_name: string;
  amount_total_cents: number;
  platform_fee_cents: number;
  producer_share_cents: number;
  buyer_email: string;
}

interface EffectiveSettings {
  pix_fee_percent: number;
  boleto_fee_percent: number;
  card_fee_percent: number;
  card_installment_interest_rate: number;
  card_installments_fees: Record<string, number>;
  fixed_fee_cents: number;
  pix_release_days: number;
  boleto_release_days: number;
  card_release_days: number;
  security_reserve_percent: number;
  security_reserve_days: number;
  withdrawal_fee_cents: number;
  is_custom: boolean;
}

interface FinancialData {
  availableBalance: number;
  pendingBalance: number;
  transactions: FinancialTransaction[];
  effectiveSettings?: EffectiveSettings;
  identity_status?: string;
}

interface WithdrawalHistory {
  id: string;
  requested_at: string;
  amount_cents: number;
  status: string;
}

const ProducerFinancialsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [bankFormData, setBankFormData] = useState({
    bankName: "",
    bankAgency: "",
    bankAccountNumber: "",
    bankAccountType: "",
    pixKey: "",
  });
  const [isSavingBankData, setIsSavingBankData] = useState(false);
  const [bankError, setBankError] = useState("");
  const [bankSuccess, setBankSuccess] = useState("");
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

  const { data: financialData, isLoading, isError } = useQuery<FinancialData>({
    queryKey: ['producer-financials'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-producer-financials');
      
      if (error) {
        console.error('Error fetching financial data:', error);
        throw new Error('Erro ao carregar dados financeiros');
      }
      
      return { ...data.data, identity_status: "verified" }; // Mock identity status
    }
  });

  const { data: withdrawalHistory = [] } = useQuery<WithdrawalHistory[]>({
    queryKey: ['withdrawal-history'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-withdrawal-history');
      
      if (error) {
        console.error('Error fetching withdrawal history:', error);
        return [];
      }
      
      return data.data;
    }
  });

  const { data: producerSettings } = useQuery({
    queryKey: ['producer-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-producer-settings');
      
      if (error) {
        console.error('Error fetching producer settings:', error);
        return null;
      }
      
      return data.data;
    }
  });

  // Fetch existing bank data
  useEffect(() => {
    if (user) {
      fetchBankData();
    }
  }, [user]);

  const fetchBankData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('producer_financials')
        .select('*')
        .eq('producer_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching bank data:', error);
        return;
      }

      if (data) {
        setBankFormData({
          bankName: data.bank_name || "",
          bankAgency: data.bank_agency || "",
          bankAccountNumber: data.bank_account_number || "",
          bankAccountType: data.bank_account_type || "",
          pixKey: data.pix_key || "",
        });
      }
    } catch (error) {
      console.error('Error fetching bank data:', error);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'approved':
        return <Badge className="bg-[#4d0782] text-white border-[#4d0782] hover:bg-[#4d0782]">Pago</Badge>;
      case 'pending':
      case 'pending_payment':
        return <Badge className="bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-200">Pendente</Badge>;
      case 'rejected':
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Rejeitado</Badge>;
      case 'authorized':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Autorizada</Badge>;
      default:
        return <Badge className="bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-200">{status}</Badge>;
    }
  };

  const handleWithdrawRequest = () => {
    setIsWithdrawalModalOpen(true);
  };

  const handleBankFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSavingBankData(true);
    setBankError("");
    setBankSuccess("");

    try {
      const financialData = {
        producer_id: user.id,
        bank_name: bankFormData.bankName,
        bank_agency: bankFormData.bankAgency,
        bank_account_number: bankFormData.bankAccountNumber,
        bank_account_type: bankFormData.bankAccountType,
        pix_key: bankFormData.pixKey || null,
      };

      const { error } = await supabase
        .from('producer_financials')
        .upsert(financialData);

      if (error) {
        setBankError(error.message);
      } else {
        setBankSuccess("Dados bancários salvos com sucesso!");
        toast({
          title: "Sucesso",
          description: "Dados bancários atualizados com sucesso!",
        });
      }
    } catch (err: any) {
      setBankError("Erro ao salvar dados bancários. Tente novamente.");
    } finally {
      setIsSavingBankData(false);
    }
  };

  const formatAgency = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 6);
  };

  const formatAccountNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length > 1) {
      const account = numbers.slice(0, -1);
      const digit = numbers.slice(-1);
      return `${account}-${digit}`;
    }
    return numbers;
  };

  if (isLoading) {
    return (
      <ProducerLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando dados financeiros...</span>
        </div>
      </ProducerLayout>
    );
  }

  if (isError) {
    return (
      <ProducerLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-destructive mb-2">Erro ao carregar dados financeiros.</p>
            <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Central Financeira</h1>
        <p className="text-gray-600 mt-2">Gerencie seus dados financeiros e bancários</p>
      </div>

      <Tabs defaultValue="saques" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="saques" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Saques</TabsTrigger>
          <TabsTrigger value="dados-bancarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Dados Bancários</TabsTrigger>
          <TabsTrigger value="taxas-prazos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Taxas e Prazos</TabsTrigger>
        </TabsList>

                  {/* Aba Saques */}
                  <TabsContent value="saques" className="space-y-6">
        {/* Cards de saldo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#4d0782] border-[#4d0782] text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Saldo Disponível para Saque</CardTitle>
              <DollarSign className="h-4 w-4 text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(financialData?.availableBalance || 0)}
              </div>
              <p className="text-xs text-white/80">
                Valor liberado e disponível para saque
              </p>
              <div className="mt-4">
                <Button 
                  onClick={handleWithdrawRequest}
                  disabled={!financialData?.availableBalance || financialData.availableBalance === 0}
                  className="w-full bg-white hover:bg-white/90 text-[#4d0782]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Solicitar Saque
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-500 border-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-50">Saldo Pendente</CardTitle>
              <Clock className="h-4 w-4 text-orange-100" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(financialData?.pendingBalance || 0)}
              </div>
              <p className="text-xs text-orange-100">
                Aguardando prazo de liberação
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Saques */}
        <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Histórico de Saques
                        </CardTitle>
                        <CardDescription>
                          Últimos saques solicitados
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {withdrawalHistory.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                               {withdrawalHistory.map((withdrawal) => (
                                 <TableRow key={withdrawal.id}>
                                   <TableCell className="font-medium">
                                     {formatDate(withdrawal.requested_at)}
                                   </TableCell>
                                   <TableCell className="text-right">
                                     {formatCurrency(withdrawal.amount_cents)}
                                   </TableCell>
                                   <TableCell className="text-center">
                                     {getStatusBadge(withdrawal.status)}
                                   </TableCell>
                                 </TableRow>
                               ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>Nenhum saque encontrado</p>
                            <p className="text-sm">Seus saques aparecerão aqui quando forem solicitados</p>
                          </div>
                        )}
                      </CardContent>
        </Card>
      </TabsContent>

      {/* Aba Dados Bancários */}
      <TabsContent value="dados-bancarios" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          Dados Bancários
                        </CardTitle>
                        <CardDescription>
                          Configure seus dados bancários para receber pagamentos
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleBankFormSubmit} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="bankName">Nome do Banco</Label>
                              <Input
                                id="bankName"
                                value={bankFormData.bankName}
                                onChange={(e) => setBankFormData(prev => ({ ...prev, bankName: e.target.value }))}
                                placeholder="Ex: Banco do Brasil"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="bankAgency">Agência</Label>
                              <Input
                                id="bankAgency"
                                value={bankFormData.bankAgency}
                                onChange={(e) => setBankFormData(prev => ({ ...prev, bankAgency: formatAgency(e.target.value) }))}
                                placeholder="0000"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="bankAccountNumber">Número da Conta</Label>
                              <Input
                                id="bankAccountNumber"
                                value={bankFormData.bankAccountNumber}
                                onChange={(e) => setBankFormData(prev => ({ ...prev, bankAccountNumber: formatAccountNumber(e.target.value) }))}
                                placeholder="00000-0"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="bankAccountType">Tipo de Conta</Label>
                              <Select 
                                value={bankFormData.bankAccountType} 
                                onValueChange={(value) => setBankFormData(prev => ({ ...prev, bankAccountType: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="checking">Conta Corrente</SelectItem>
                                  <SelectItem value="savings">Poupança</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="pixKey">Chave PIX (Opcional)</Label>
                            <Input
                              id="pixKey"
                              value={bankFormData.pixKey}
                              onChange={(e) => setBankFormData(prev => ({ ...prev, pixKey: e.target.value }))}
                              placeholder="CPF, CNPJ, email ou telefone"
                            />
                            <p className="text-sm text-gray-500">
                              A chave PIX facilitará recebimentos rápidos quando disponível
                            </p>
                          </div>

                          {bankError && (
                            <Alert variant="destructive">
                              <AlertDescription>{bankError}</AlertDescription>
                            </Alert>
                          )}

                          {bankSuccess && (
                            <Alert>
                              <CheckCircle className="h-4 w-4" />
                              <AlertDescription>{bankSuccess}</AlertDescription>
                            </Alert>
                          )}

                          <Button
                            type="submit"
                            className="w-full"
                            disabled={isSavingBankData}
                          >
                            {isSavingBankData ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              "Salvar Alterações"
                            )}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Aba Taxas e Prazos */}
                  <TabsContent value="taxas-prazos" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Suas Taxas e Prazos
                        </CardTitle>
                        <CardDescription>
                          Informações sobre as taxas aplicadas às suas vendas
                          {financialData?.effectiveSettings?.is_custom && (
                            <span className="text-[#4d0782] font-medium ml-1">(configuração personalizada)</span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Card 1 - Taxas por Método de Pagamento */}
                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                          <h4 className="font-medium text-gray-900 mb-3">Taxas por Método de Pagamento</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-700">PIX:</span>
                              <span className="font-medium">{financialData?.effectiveSettings?.pix_fee_percent ?? 0}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Boleto:</span>
                              <span className="font-medium">{financialData?.effectiveSettings?.boleto_fee_percent ?? 0}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Cartão de Crédito:</span>
                              <span className="font-medium">{financialData?.effectiveSettings?.card_fee_percent ?? 0}%</span>
                            </div>
                          </div>
                          {financialData?.effectiveSettings?.is_custom && (
                            <p className="text-xs text-[#4d0782] mt-3 bg-purple-50 p-2 rounded">
                              ✨ Taxas personalizadas aplicadas
                            </p>
                          )}
                        </div>

                        {/* Card 2 - Taxa de Parcelamento */}
                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                          <h4 className="font-medium text-gray-900 mb-3">Taxa de Parcelamento</h4>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Taxa de Juros de Parcelamento:</span>
                            <span className="font-medium">{financialData?.effectiveSettings?.card_installment_interest_rate ?? 0}% ao mês</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Taxa aplicada ao parcelamento de vendas no cartão de crédito
                          </p>
                        </div>

                        {/* Card 3 - Taxas Fixas */}
                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                          <h4 className="font-medium text-gray-900 mb-3">Taxas Fixas</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Taxa por venda aprovada:</span>
                              <span className="font-medium">R$ {((financialData?.effectiveSettings?.fixed_fee_cents ?? 100) / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Taxa de saque:</span>
                              <span className="font-medium">R$ {((financialData?.effectiveSettings?.withdrawal_fee_cents ?? 367) / 100).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Card 4 - Prazo de Recebimento */}
                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                          <h4 className="font-medium text-gray-900 mb-3">Prazo de Recebimento</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Cartão de crédito:</span>
                              <span className="font-medium">
                                {financialData?.effectiveSettings?.card_release_days === 0 
                                  ? "Liberação imediata" 
                                  : `${financialData?.effectiveSettings?.card_release_days ?? 15} dias`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">Boleto bancário:</span>
                              <span className="font-medium">
                                {financialData?.effectiveSettings?.boleto_release_days === 0 
                                  ? "Liberação imediata" 
                                  : `${financialData?.effectiveSettings?.boleto_release_days ?? 2} dias`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-700">PIX:</span>
                              <span className="font-medium">
                                {financialData?.effectiveSettings?.pix_release_days === 0 
                                  ? "Liberação imediata" 
                                  : `${financialData?.effectiveSettings?.pix_release_days ?? 2} dias`}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Card 5 - Reserva de Segurança */}
                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                          <h4 className="font-medium text-gray-900 mb-3">Reserva de Segurança</h4>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Percentual retido:</span>
                            <span className="font-medium">{financialData?.effectiveSettings?.security_reserve_percent ?? 0}%</span>
                          </div>
                          <div className="flex justify-between mt-2">
                            <span className="text-gray-700">Prazo de liberação:</span>
                            <span className="font-medium">{financialData?.effectiveSettings?.security_reserve_days ?? 30} dias</span>
                          </div>
                          {(financialData?.effectiveSettings?.security_reserve_percent ?? 0) === 0 && (
                            <p className="text-xs text-green-600 mt-2 bg-green-50 p-2 rounded">
                              ✅ Reserva de segurança não aplicável
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

      </Tabs>
      
      <WithdrawalModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        availableBalance={financialData?.availableBalance || 0}
      />
    </ProducerLayout>
  );
};

export default ProducerFinancialsPage;