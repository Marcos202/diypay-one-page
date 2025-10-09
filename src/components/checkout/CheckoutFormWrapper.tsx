import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { EmailSection } from "./EmailSection";
import { EventTicketsSection } from "./EventTicketsSection";
import { PaymentMethodTabs } from "./PaymentMethodTabs";
import { CheckoutButton } from "./CheckoutButton";
import { DonationValueSection } from "./DonationValueSection";
import OrderBumpCheckout from "./OrderBumpCheckout";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface Product {
  id: string;
  name: string;
  price_cents: number;
  max_installments_allowed: number;
  product_type?: string;
  donation_title?: string;
  donation_description?: string;
  allowed_payment_methods: Json;
  is_email_optional?: boolean;
  require_email_confirmation?: boolean;
  producer_assumes_installments?: boolean;
}

interface CheckoutFormWrapperProps {
  product: Product;
  onDonationAmountChange?: (amount: string) => void;
  onEventQuantityChange?: (quantity: number) => void;
  orderBump?: any;
  selectedOrderBumps: any[];
  onOrderBumpSelect: (item: any) => void;
  onOrderBumpDeselect: (item: any) => void;
}

export function CheckoutFormWrapper({ 
  product, 
  onDonationAmountChange, 
  onEventQuantityChange,
  orderBump,
  selectedOrderBumps,
  onOrderBumpSelect,
  onOrderBumpDeselect
}: CheckoutFormWrapperProps) {
  
  return (
    <div className="space-y-6">
      {/* Aqui vem todo o conteúdo do CheckoutForm original */}
      
      {orderBump && orderBump.order_bump_items && orderBump.order_bump_items.length > 0 && (
        <OrderBumpCheckout
          orderBump={orderBump}
          onSelect={onOrderBumpSelect}
          onDeselect={onOrderBumpDeselect}
        />
      )}
    </div>
  );
}
