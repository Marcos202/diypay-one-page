import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TicketsTableProps {
  tickets: any[];
  isLoading: boolean;
  onCheckInUpdate: () => void;
}

export function TicketsTable({ tickets, isLoading, onCheckInUpdate }: TicketsTableProps) {
  const [processingCheckIn, setProcessingCheckIn] = useState<string | null>(null);

  const handleCheckIn = async (saleId: string, attendeeId: string, currentStatus: boolean) => {
    setProcessingCheckIn(attendeeId);
    
    try {
      const { error } = await supabase.functions.invoke('toggle-check-in', {
        body: { sale_id: saleId, attendee_id: attendeeId }
      });

      if (error) throw error;

      toast({
        title: currentStatus ? "Check-in desfeito" : "Check-in realizado",
        description: "Status atualizado com sucesso"
      });
      
      onCheckInUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao processar check-in",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessingCheckIn(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Carregando ingressos...</p>
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Nenhum ingresso encontrado</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Lote</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.attendee_id}>
              <TableCell className="font-medium">{ticket.name}</TableCell>
              <TableCell>{ticket.email}</TableCell>
              <TableCell>{ticket.cpf || '-'}</TableCell>
              <TableCell>{ticket.event_name}</TableCell>
              <TableCell>{ticket.batch_name || 'Sem lote'}</TableCell>
              <TableCell>
                {ticket.checked_in ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Check-in realizado
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCheckIn(ticket.sale_id, ticket.attendee_id, ticket.checked_in)}
                  disabled={processingCheckIn === ticket.attendee_id}
                >
                  {processingCheckIn === ticket.attendee_id
                    ? "Processando..."
                    : ticket.checked_in
                    ? "Desfazer Check-in"
                    : "Fazer Check-in"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
