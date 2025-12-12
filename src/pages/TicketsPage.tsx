import { useState, useCallback } from "react";
import { ProducerLayout } from "@/components/ProducerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, QrCode } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TicketsTable } from "@/components/tickets/TicketsTable";
import { AddTicketModal } from "@/components/tickets/AddTicketModal";
import { QRCodeScannerModal } from "@/components/tickets/QRCodeScannerModal";

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['event-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('product_type', 'event')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: ticketsData, isLoading: ticketsLoading, refetch } = useQuery({
    queryKey: ['all-tickets', selectedEvent, searchTerm],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Não autenticado');

      const { data, error } = await supabase.functions.invoke('get-all-event-tickets', {
        body: {
          producer_id: user.user.id,
          event_id: selectedEvent !== 'all' ? selectedEvent : undefined,
          search: searchTerm || undefined,
        }
      });
      if (error) throw error;
      return data;
    },
  });

  const handleExport = async () => {
    const { data, error } = await supabase.functions.invoke('export-tickets-csv', {
      body: {
        event_id: selectedEvent !== 'all' ? selectedEvent : undefined,
        search: searchTerm || undefined,
      }
    });

    if (!error && data) {
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ingressos-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['all-tickets'] });
    await queryClient.invalidateQueries({ queryKey: ['event-products'] });
    await refetch();
  }, [queryClient, refetch]);

  return (
    <ProducerLayout onRefresh={handleRefresh}>
      <div className="space-y-4 md:space-y-6 w-full min-w-0 overflow-hidden">
        <div className="mb-4 md:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Ingressos</h1>
        </div>

        <Card className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Todos os eventos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                {events?.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Buscar por nome, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto text-sm">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Adicionar Ingresso</span>
            <span className="sm:hidden">Adicionar</span>
          </Button>
          <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto text-sm">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Exportar CSV</span>
            <span className="sm:hidden">Exportar</span>
          </Button>
          <Button variant="outline" onClick={() => setIsScannerOpen(true)} className="w-full sm:w-auto text-sm">
            <QrCode className="h-4 w-4 mr-2" />
            Scanner
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-4 md:p-6">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total de Ingressos
            </h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2">
              {ticketsData?.stats?.total || 0}
            </p>
          </Card>
          <Card className="p-3 sm:p-4 md:p-6">
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
              Check-ins Realizados
            </h3>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2">
              {ticketsData?.stats?.checkedIn || 0}
            </p>
          </Card>
        </div>

        <Card>
          <TicketsTable 
            tickets={ticketsData?.tickets || []} 
            isLoading={ticketsLoading}
            onCheckInUpdate={refetch}
          />
        </Card>

        <AddTicketModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={refetch}
        />

        <QRCodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onSuccess={refetch}
        />
      </div>
    </ProducerLayout>
  );
}
