import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <div className="p-4 sm:p-6 md:p-8 text-center">
        <p className="text-muted-foreground text-sm sm:text-base">Carregando ingressos...</p>
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="p-4 sm:p-6 md:p-8 text-center">
        <p className="text-muted-foreground text-sm sm:text-base">Nenhum ingresso encontrado</p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 p-3 sm:p-4">
        {tickets.map((ticket) => (
          <Card key={ticket.attendee_id} className="p-3 sm:p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{ticket.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{ticket.email}</p>
                </div>
                {ticket.checked_in ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    OK
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <XCircle className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                <div className="min-w-0">
                  <p className="text-muted-foreground">Evento</p>
                  <p className="font-medium truncate">{ticket.event_name}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground">Lote</p>
                  <p className="font-medium truncate">{ticket.batch_name || 'Sem lote'}</p>
                </div>
              </div>
              
              {ticket.cpf && (
                <div className="text-xs pt-1">
                  <span className="text-muted-foreground">CPF: </span>
                  <span>{ticket.cpf}</span>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs"
                onClick={() => handleCheckIn(ticket.sale_id, ticket.attendee_id, ticket.checked_in)}
                disabled={processingCheckIn === ticket.attendee_id}
              >
                {processingCheckIn === ticket.attendee_id
                  ? "Processando..."
                  : ticket.checked_in
                  ? "Desfazer Check-in"
                  : "Fazer Check-in"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
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
                <TableCell className="font-medium text-sm">{ticket.name}</TableCell>
                <TableCell className="text-sm">{ticket.email}</TableCell>
                <TableCell className="text-sm">{ticket.cpf || '-'}</TableCell>
                <TableCell className="text-sm">{ticket.event_name}</TableCell>
                <TableCell className="text-sm">{ticket.batch_name || 'Sem lote'}</TableCell>
                <TableCell>
                  {ticket.checked_in ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Check-in realizado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
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
                    className="text-xs"
                  >
                    {processingCheckIn === ticket.attendee_id
                      ? "..."
                      : ticket.checked_in
                      ? "Desfazer"
                      : "Check-in"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
