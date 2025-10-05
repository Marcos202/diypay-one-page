import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarIcon, Download, Search, TrendingUp, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { ProducerLayout } from "@/components/ProducerLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Sale {
  id: string
  buyer_email: string
  amount_total_cents: number
  producer_share_cents: number
  platform_fee_cents: number
  payment_method_used: string
  status: string
  created_at: string
  paid_at?: string
  installments_chosen: number
  products: {
    id: string
    name: string
    type: string
  }
}

interface Product {
  id: string
  name: string
}

interface SalesData {
  kpis: {
    valorLiquidoTotal: number
    totalVendas: number
  }
  salesHistory: Sale[]
  hasMore: boolean
}

const ProducerSalesPage = () => {
  const { session } = useAuth()
  const { toast } = useToast()
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [page, setPage] = useState(1)
  
  // Products for filter dropdown
  const [products, setProducts] = useState<Product[]>([])

  // Fetch products for filter dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      if (!session) return
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('producer_id', session.user.id)
        .eq('is_active', true)
        .order('name')

      if (!error && data) {
        setProducts(data)
      }
    }

    fetchProducts()
  }, [session])

  // Fetch sales data with filters
  const { data: salesData, isLoading, error } = useQuery<SalesData>({
    queryKey: ['producer-sales', { 
      searchTerm, 
      productFilter, 
      statusFilter, 
      paymentMethodFilter, 
      dateRange, 
      page 
    }],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-producer-sales-data', {
        body: {
          search_term: searchTerm || null,
          product_id: productFilter !== 'all' ? productFilter : null,
          status: statusFilter !== 'all' ? statusFilter : null,
          payment_method: paymentMethodFilter !== 'all' ? paymentMethodFilter : null,
          date_range: {
            from: dateRange.from?.toISOString(),
            to: dateRange.to?.toISOString()
          },
          page,
          limit: 12
        }
      })

      if (error) {
        console.error('Error fetching sales data:', error)
        throw new Error(error.message || 'Erro ao carregar dados de vendas')
      }

      return data
    },
    enabled: !!session,
    retry: 1
  })

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter, productFilter, paymentMethodFilter, dateRange])

  // Helper functions
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100)
  }

  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-primary text-primary-foreground border-primary">Pago</Badge>;
      case 'pending_payment':
        return <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-secondary">Pendente</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="bg-destructive text-destructive-foreground border-destructive">Falhou</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Cancelado</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Reembolsado</Badge>;
      default:
        return <Badge variant="outline" className="border-muted-foreground text-muted-foreground">{status}</Badge>;
    }
  }

  const getPaymentMethodLabel = (method: string): string => {
    const methods: Record<string, string> = {
      credit_card: 'Cartão de Crédito',
      pix: 'PIX',
      bank_slip: 'Boleto'
    }
    return methods[method] || method
  }

  const loadMore = () => {
    setPage(prev => prev + 1)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setProductFilter('all')
    setPaymentMethodFilter('all')
    setDateRange({})
    setPage(1)
  }

  if (error) {
    return (
      <ProducerLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Erro ao carregar dados: {error.message}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Tentar Novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProducerLayout>
    )
  }

  return (
    <ProducerLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Suas Vendas</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho das suas vendas e analise seus resultados
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Valor Líquido Total */}
          <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">
                Valor Líquido Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? 'Carregando...' : formatCurrency(salesData?.kpis?.valorLiquidoTotal || 0)}
              </div>
              <p className="text-xs text-purple-100">
                Receita após taxas da plataforma
              </p>
            </CardContent>
          </Card>

          {/* Total de Vendas */}
          <Card className="bg-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total de Vendas
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {isLoading ? 'Carregando...' : (salesData?.kpis?.totalVendas || 0)}
              </div>
              <p className="text-xs text-slate-600">
                Número total de transações
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtrar Vendas</CardTitle>
            <CardDescription>
              Use os filtros abaixo para encontrar vendas específicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar por email</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="email@exemplo.com"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Product Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Produto</label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os produtos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os produtos</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending_payment">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Método de Pagamento</label>
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os métodos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os métodos</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="bank_slip">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Selecionar data"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? (
                        format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        "Selecionar data"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={clearFilters} variant="outline">
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sales History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Vendas</CardTitle>
            <CardDescription>
              Lista detalhada de todas as suas vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando vendas...</p>
              </div>
            ) : !salesData?.salesHistory?.length ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhuma venda encontrada com os filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Comprador</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Valor Líquido</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.salesHistory.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            {sale.buyer_email}
                          </TableCell>
                          <TableCell>
                            {sale.products?.name || 'Produto não encontrado'}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(sale.amount_total_cents)}
                            {sale.installments_chosen > 1 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({sale.installments_chosen}x)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-accent">
                            {formatCurrency(sale.producer_share_cents)}
                          </TableCell>
                          <TableCell>
                            {getPaymentMethodLabel(sale.payment_method_used)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(sale.status)}
                          </TableCell>
                          <TableCell>
                            {formatDate(sale.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-700">
                    Mostrando {Math.min((page - 1) * 12 + 1, salesData.kpis.totalVendas)} até {Math.min(page * 12, salesData.kpis.totalVendas)} de {salesData.kpis.totalVendas} vendas
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(p => p + 1)}
                      disabled={!salesData.hasMore}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </ProducerLayout>
  )
}

export default ProducerSalesPage