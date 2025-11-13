import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin } from "lucide-react";

interface EventDetailsSectionProps {
  eventDate: string | null;
  eventAddress: string;
  eventDescription: string;
  onDateChange: (date: string) => void;
  onAddressChange: (address: string) => void;
  onDescriptionChange: (description: string) => void;
}

const EventDetailsSection = ({
  eventDate,
  eventAddress,
  eventDescription,
  onDateChange,
  onAddressChange,
  onDescriptionChange
}: EventDetailsSectionProps) => {
  return (
    <div className="space-y-6 p-6 border-2 border-primary/20 rounded-lg bg-primary/5">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Data e Local do Evento</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_date">Data e hora do evento *</Label>
        <Input
          id="event_date"
          type="datetime-local"
          value={eventDate || ''}
          onChange={(e) => onDateChange(e.target.value)}
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">
          Selecione a data e hora de início do evento
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_address">Endereço do evento *</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="event_address"
            type="text"
            value={eventAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="Rua, número, bairro, cidade - Estado"
            className="pl-10 text-base"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Digite o endereço completo onde o evento acontecerá
        </p>
      </div>

      <div className="rounded-lg border-2 border-dashed border-border bg-muted/50 p-8 flex flex-col items-center justify-center min-h-[200px]">
        <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center">
          Mapa ilustrativo do local do evento
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          O endereço será exibido nos ingressos
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_description">Informações adicionais sobre o evento</Label>
        <Textarea
          id="event_description"
          value={eventDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Informações importantes sobre o evento, estacionamento, dress code, etc..."
          rows={3}
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">
          Opcional - Adicione detalhes que ajudarão os participantes
        </p>
      </div>
    </div>
  );
};

export default EventDetailsSection;
