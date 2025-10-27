import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProducerLayout } from "@/components/ProducerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Save, Calendar, MapPin, FileText } from "lucide-react";
import { toast } from "sonner";
import { ProductCoverUpload } from "@/components/products/ProductCoverUpload";
import { useAuth } from "@/hooks/useAuth";

export default function EventPersonalizePage() {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [eventDate, setEventDate] = useState("");
  const [eventAddress, setEventAddress] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  // Fetch product details
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product-event-details", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("producer_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!productId && !!user?.id,
  });

  // Load initial data
  useEffect(() => {
    if (product) {
      setEventDate(product.event_date ? new Date(product.event_date).toISOString().slice(0, 16) : "");
      setEventAddress(product.event_address || "");
      setEventDescription(product.event_description || "");
      setCoverImageUrl(product.cover_image_url || "");
    }
  }, [product]);

  // Update mutation
  const updateEventMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("update-product", {
        body: {
          productId,
          productData: {
            event_date: eventDate ? new Date(eventDate).toISOString() : null,
            event_address: eventAddress.trim() || null,
            event_description: eventDescription.trim() || null,
            cover_image_url: coverImageUrl || null,
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Evento atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["product-event-details", productId] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar evento: ${error.message}`);
    },
  });

  useEffect(() => {
    if (isError) {
      toast.error("Evento não encontrado", {
        description: "Redirecionando...",
      });
      navigate("/products");
    }
  }, [isError, navigate]);

  const handleSave = () => {
    if (!eventDate) {
      toast.error("A data do evento é obrigatória");
      return;
    }

    if (!eventAddress.trim()) {
      toast.error("O endereço do evento é obrigatório");
      return;
    }

    updateEventMutation.mutate();
  };

  if (isLoading) {
    return (
      <ProducerLayout>
        <Skeleton className="h-96 w-full" />
      </ProducerLayout>
    );
  }

  if (isError || !product) {
    return null;
  }

  return (
    <ProducerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="text-muted-foreground">Configure os detalhes do seu evento presencial</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações do Evento</CardTitle>
          <CardDescription>
            Defina data, local e informações que serão exibidas nos ingressos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cover Image */}
          <div className="space-y-2">
            <Label>Imagem de Capa do Evento</Label>
            {user?.id ? (
              <ProductCoverUpload
                userId={user.id}
                initialUrl={coverImageUrl}
                onUploadSuccess={setCoverImageUrl}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}
            <p className="text-xs text-muted-foreground">
              Esta imagem será exibida na página de ingressos
            </p>
          </div>

          {/* Event Date */}
          <div className="space-y-2">
            <Label htmlFor="event-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data e Horário do Evento *
            </Label>
            <Input
              id="event-date"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Defina quando o evento acontecerá
            </p>
          </div>

          {/* Event Address */}
          <div className="space-y-2">
            <Label htmlFor="event-address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Endereço do Evento *
            </Label>
            <Textarea
              id="event-address"
              value={eventAddress}
              onChange={(e) => setEventAddress(e.target.value)}
              placeholder="Ex: Rua Exemplo, 123 - Bairro Centro&#10;São Paulo - SP&#10;CEP: 01234-567"
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Endereço completo onde o evento será realizado
            </p>
          </div>

          {/* Event Description */}
          <div className="space-y-2">
            <Label htmlFor="event-description" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Descrição do Evento
            </Label>
            <Textarea
              id="event-description"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Descrição detalhada do evento que será exibida nos ingressos..."
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Informações adicionais sobre o evento (opcional)
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={updateEventMutation.isPending}
              size="lg"
            >
              {updateEventMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </ProducerLayout>
  );
}
