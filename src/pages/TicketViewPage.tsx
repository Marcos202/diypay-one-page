import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, MapPin, Calendar, User } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "@/hooks/use-toast";

interface AttendeeData {
  name: string;
  email: string;
  id?: string;
  ticket_id?: string;
}

interface SaleData {
  id: string;
  buyer_email: string;
  event_attendees: AttendeeData[];
  products: {
    id: string;
    name: string;
    cover_image_url: string;
    event_date: string;
    event_address: string;
    event_description: string;
  };
}

const TicketViewPage = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<SaleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!saleId) {
        toast({
          title: "Erro",
          description: "ID da venda não fornecido",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-sale-details', {
          body: { sale_id: saleId },
        });

        if (error || !data?.success) {
          throw new Error(error?.message || "Erro ao carregar ingressos");
        }

        setSale(data.sale);
      } catch (err: any) {
        console.error("Erro ao carregar ingressos:", err);
        toast({
          title: "Erro ao carregar ingressos",
          description: err.message || "Não foi possível carregar seus ingressos",
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [saleId, navigate]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Data não definida";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const generateQRContent = (attendee: AttendeeData, index: number) => {
    return JSON.stringify({
      sale_id: saleId,
      attendee_id: attendee.id || `attendee-${index}`,
      event_id: sale?.products.id,
      name: attendee.name,
      email: attendee.email,
    });
  };

  const handleDownloadTickets = () => {
    toast({
      title: "Em desenvolvimento",
      description: "Download de ingressos em PDF será implementado em breve.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ingressos não encontrados</h1>
          <p className="text-gray-600 mb-6">Não foi possível encontrar seus ingressos.</p>
          <Button onClick={() => navigate("/members")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const attendees = sale.event_attendees || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with back button */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/members")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Meus Cursos
          </Button>
        </div>

        {/* Event Cover */}
        {sale.products.cover_image_url && (
          <div className="mb-6 rounded-lg overflow-hidden shadow-lg">
            <img
              src={sale.products.cover_image_url}
              alt={sale.products.name}
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Event Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">{sale.products.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sale.products.event_description && (
              <p className="text-gray-600">{sale.products.event_description}</p>
            )}
            
            <div className="flex items-start gap-3 text-gray-700">
              <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Data e Horário</p>
                <p className="text-sm">{formatDate(sale.products.event_date)}</p>
              </div>
            </div>

            {sale.products.event_address && (
              <div className="flex items-start gap-3 text-gray-700">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Local</p>
                  <p className="text-sm whitespace-pre-line">{sale.products.event_address}</p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button onClick={handleDownloadTickets} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Baixar Ingressos (PDF)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tickets */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Seus Ingressos</h2>
          
          {attendees.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-600">
                Nenhum participante registrado
              </CardContent>
            </Card>
          ) : (
            attendees.map((attendee, index) => (
              <Card key={index} className="overflow-hidden">
                {/* Header laranja com Ticket ID */}
                <div className="bg-orange-500 text-white px-6 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium opacity-90">ID do Ticket</p>
                      <p className="text-lg font-bold tracking-wider">
                        {attendee.ticket_id || `TKT-${saleId?.slice(0, 8).toUpperCase()}-${index + 1}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium opacity-90">Ingresso</p>
                      <p className="text-2xl font-bold">#{index + 1}</p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* QR Code */}
                    <div className="flex-shrink-0 bg-white p-4 rounded-lg border-2 border-gray-200">
                      <QRCode
                        value={generateQRContent(attendee, index)}
                        size={180}
                        level="H"
                      />
                    </div>

                    {/* Attendee Info */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Nome do Comprador
                        </p>
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-muted-foreground" />
                          <h3 className="text-xl font-bold text-foreground">{attendee.name}</h3>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          E-mail
                        </p>
                        <p className="text-base text-foreground">{attendee.email}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Instruções</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Apresente este QR Code na entrada do evento</li>
              <li>• Cada ingresso possui um QR Code único</li>
              <li>• O check-in será confirmado automaticamente ao escanear</li>
              <li>• Guarde esta página ou faça o download dos ingressos</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicketViewPage;
