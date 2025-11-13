import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, MapPin, Calendar, User } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  const handleDownloadTickets = async () => {
    if (!sale || attendees.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum ingresso disponível para download",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Gerando PDF...",
        description: "Aguarde enquanto preparamos seus ingressos",
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Para cada ingresso, criar uma página
      for (let i = 0; i < attendees.length; i++) {
        const attendee = attendees[i];
        
        if (i > 0) {
          pdf.addPage();
        }

        // Título do evento
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        const eventTitle = pdf.splitTextToSize(sale.products.name, 170);
        pdf.text(eventTitle, 105, 20, { align: 'center' });

        // ID do Ticket - Header laranja
        pdf.setFillColor(249, 115, 22); // orange-500
        pdf.rect(20, 35, 170, 18, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.text('ID do Ticket', 25, 42);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(
          attendee.ticket_id || `TKT-${saleId?.slice(0, 8).toUpperCase()}-${i + 1}`,
          105,
          49,
          { align: 'center' }
        );
        
        // Número do ingresso no canto direito do header
        pdf.setFontSize(10);
        pdf.text('Ingresso', 185, 42, { align: 'right' });
        pdf.setFontSize(18);
        pdf.text(`#${i + 1}`, 185, 49, { align: 'right' });

        // Reset cor do texto
        pdf.setTextColor(0, 0, 0);
        let yPos = 65;

        // Informações do Evento
        if (sale.products.event_date) {
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Data e Horário:', 20, yPos);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.text(formatDate(sale.products.event_date), 20, yPos + 5);
          yPos += 15;
        }

        if (sale.products.event_address) {
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Local:', 20, yPos);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          const addressLines = pdf.splitTextToSize(sale.products.event_address, 170);
          pdf.text(addressLines, 20, yPos + 5);
          yPos += 10 + (addressLines.length * 5);
        }

        // QR Code
        const qrElement = document.getElementById(`qr-code-${i}`);
        if (qrElement) {
          try {
            const canvas = await html2canvas(qrElement, {
              backgroundColor: '#ffffff',
              scale: 2
            });
            const qrImage = canvas.toDataURL('image/png');
            pdf.addImage(qrImage, 'PNG', 65, yPos + 10, 70, 70);
            yPos += 85;
          } catch (err) {
            console.error('Erro ao capturar QR Code:', err);
          }
        }

        // Informações do Comprador
        yPos += 10;
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text('NOME DO COMPRADOR', 20, yPos);
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text(attendee.name, 20, yPos + 5);

        yPos += 15;
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'normal');
        pdf.text('E-MAIL', 20, yPos);
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text(attendee.email, 20, yPos + 5);

        // Instruções no rodapé
        yPos = 260;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Instruções', 20, yPos);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text('• Apresente este QR Code na entrada do evento', 20, yPos + 5);
        pdf.text('• Cada ingresso possui um QR Code único', 20, yPos + 10);
        pdf.text('• O check-in será confirmado automaticamente ao escanear', 20, yPos + 15);
      }

      // Salvar PDF
      const fileName = `ingressos_${sale.products.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF gerado com sucesso!",
        description: `${attendees.length} ingresso(s) baixado(s)`,
      });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o PDF dos ingressos",
        variant: "destructive",
      });
    }
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
              <p className="text-muted-foreground mb-4">{sale.products.event_description}</p>
            )}
            
            {/* Data e Horário - SEMPRE visível */}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Data e Horário</p>
                <p className="text-sm text-muted-foreground">
                  {sale.products.event_date 
                    ? formatDate(sale.products.event_date)
                    : "Data a ser definida"}
                </p>
              </div>
            </div>

            {/* Endereço - Com fallback visual */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Local</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {sale.products.event_address || "Endereço a ser definido"}
                </p>
              </div>
            </div>

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
                    {/* QR Code com ID para captura pelo PDF */}
                    <div 
                      id={`qr-code-${index}`}
                      className="flex-shrink-0 bg-white p-4 rounded-lg border-2 border-gray-200"
                    >
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
