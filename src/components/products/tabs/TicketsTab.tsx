
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Users, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Attendee {
  id: string;
  name: string;
  email: string;
  checked_in: boolean;
  checked_in_at: string | null;
  lote: string;
  order_index: number;
  sale_id: string;
  sale_date: string;
  buyer_email: string;
  sale_status: string;
}

interface TicketsTabStats {
  total_tickets: number;
  checked_in: number;
  pending_checkin: number;
}

interface TicketsTabProps {
  productId?: string;
}

const TicketsTab = ({ productId }: TicketsTabProps) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [stats, setStats] = useState<TicketsTabStats>({ total_tickets: 0, checked_in: 0, pending_checkin: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<Record<string, boolean>>({});

  const fetchAttendees = async () => {
    if (!productId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-event-attendees', {
        body: { product_id: productId }
      });

      if (error) throw error;

      if (data.success) {
        setAttendees(data.attendees);
        setStats(data.stats);
      } else {
        toast.error('Erro ao carregar participantes');
      }
    } catch (error) {
      console.error('Erro ao buscar participantes:', error);
      toast.error('Erro ao carregar participantes');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCheckIn = async (attendeeId: string, saleId: string) => {
    setCheckingIn(prev => ({ ...prev, [attendeeId]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('toggle-check-in', {
        body: { sale_id: saleId, attendee_id: attendeeId }
      });

      if (error) throw error;

      if (data.success) {
        // Atualizar o estado local
        setAttendees(prev => prev.map(attendee => 
          attendee.id === attendeeId 
            ? { 
                ...attendee, 
                checked_in: data.checked_in, 
                checked_in_at: data.checked_in_at 
              }
            : attendee
        ));

        // Atualizar estatísticas
        setStats(prev => ({
          ...prev,
          checked_in: prev.checked_in + (data.checked_in ? 1 : -1),
          pending_checkin: prev.pending_checkin + (data.checked_in ? -1 : 1)
        }));

        toast.success(data.checked_in ? 'Check-in realizado' : 'Check-in desfeito');
      } else {
        toast.error('Erro ao alterar check-in');
      }
    } catch (error) {
      console.error('Erro ao alterar check-in:', error);
      toast.error('Erro ao alterar check-in');
    } finally {
      setCheckingIn(prev => ({ ...prev, [attendeeId]: false }));
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  useEffect(() => {
    fetchAttendees();
  }, [productId]);

  if (!productId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Produto não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gerenciar Participantes</h3>
        <Button
          variant="outline"
          onClick={fetchAttendees}
          disabled={isLoading}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ingressos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_tickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-ins Realizados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.checked_in}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_checkin}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Participantes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Participantes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center">
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                Carregando participantes...
              </div>
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum participante encontrado.</p>
              <p className="text-sm text-gray-400 mt-1">
                Os participantes aparecerão aqui após a primeira venda confirmada do evento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">CHECK-IN</th>
                    <th className="text-left py-3 px-4 font-medium">PARTICIPANTE</th>
                    <th className="text-left py-3 px-4 font-medium">LOTE</th>
                    <th className="text-left py-3 px-4 font-medium">CHECK-IN FEITO EM</th>
                    <th className="text-left py-3 px-4 font-medium">VENDA</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((attendee) => (
                    <tr key={attendee.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <Checkbox
                          checked={attendee.checked_in}
                          onCheckedChange={() => toggleCheckIn(attendee.id, attendee.sale_id)}
                          disabled={checkingIn[attendee.id]}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{attendee.name}</p>
                          <p className="text-sm text-gray-500">{attendee.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{attendee.lote}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className={attendee.checked_in ? 'text-green-600' : 'text-gray-400'}>
                          {formatDate(attendee.checked_in_at)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <p className="text-gray-600">{formatDate(attendee.sale_date)}</p>
                          <Badge 
                            variant={attendee.sale_status === 'paid' ? 'default' : 'secondary'}
                            className="mt-1"
                          >
                            {attendee.sale_status === 'paid' ? 'Paga' : 'Pendente'}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketsTab;
