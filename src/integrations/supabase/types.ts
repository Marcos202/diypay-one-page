export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      cohorts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          space_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          space_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          space_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          cohort_id: string | null
          enrolled_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          cohort_id?: string | null
          enrolled_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          cohort_id?: string | null
          enrolled_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          description: string
          id: string
          producer_id: string
          sale_id: string | null
          transaction_type: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description: string
          id?: string
          producer_id: string
          sale_id?: string | null
          transaction_type: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string
          id?: string
          producer_id?: string
          sale_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          attachments: Json | null
          content_text: string | null
          content_type: string
          content_url: string | null
          created_at: string
          display_order: number
          id: string
          is_free_sample: boolean
          module_id: string
          release_date: string | null
          release_days: number | null
          release_type: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          content_text?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_free_sample?: boolean
          module_id: string
          release_date?: string | null
          release_days?: number | null
          release_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_free_sample?: boolean
          module_id?: string
          release_date?: string | null
          release_days?: number | null
          release_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          display_order: number
          id: string
          product_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          product_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          product_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          featured_image_url: string | null
          id: string
          slug: string
          status: string
          tags: string[] | null
          title: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          featured_image_url?: string | null
          id?: string
          slug: string
          status?: string
          tags?: string[] | null
          title: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          featured_image_url?: string | null
          id?: string
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          created_at: string | null
          credentials: Json | null
          gateway_identifier: string
          gateway_name: string
          id: string
          is_active: boolean
          priority: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials?: Json | null
          gateway_identifier: string
          gateway_name: string
          id?: string
          is_active?: boolean
          priority?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json | null
          gateway_identifier?: string
          gateway_name?: string
          id?: string
          is_active?: boolean
          priority?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          card_installment_interest_rate: number | null
          created_at: string
          default_anticipation_fee_percent: number
          default_boleto_fee_percent: number
          default_boleto_release_days: number
          default_card_fee_percent: number | null
          default_card_release_days: number
          default_fixed_fee_cents: number
          default_pix_fee_percent: number
          default_pix_release_days: number
          default_security_reserve_days: number
          default_security_reserve_percent: number
          default_withdrawal_fee_cents: number
          id: number
          updated_at: string
        }
        Insert: {
          card_installment_interest_rate?: number | null
          created_at?: string
          default_anticipation_fee_percent: number
          default_boleto_fee_percent: number
          default_boleto_release_days: number
          default_card_fee_percent?: number | null
          default_card_release_days: number
          default_fixed_fee_cents?: number
          default_pix_fee_percent: number
          default_pix_release_days: number
          default_security_reserve_days: number
          default_security_reserve_percent: number
          default_withdrawal_fee_cents?: number
          id?: number
          updated_at?: string
        }
        Update: {
          card_installment_interest_rate?: number | null
          created_at?: string
          default_anticipation_fee_percent?: number
          default_boleto_fee_percent?: number
          default_boleto_release_days?: number
          default_card_fee_percent?: number | null
          default_card_release_days?: number
          default_fixed_fee_cents?: number
          default_pix_fee_percent?: number
          default_pix_release_days?: number
          default_security_reserve_days?: number
          default_security_reserve_percent?: number
          default_withdrawal_fee_cents?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      producer_financials: {
        Row: {
          available_balance_cents: number
          bank_account_number: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_name: string | null
          pending_balance_cents: number
          pix_key: string | null
          producer_id: string
          updated_at: string
        }
        Insert: {
          available_balance_cents?: number
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          pending_balance_cents?: number
          pix_key?: string | null
          producer_id: string
          updated_at?: string
        }
        Update: {
          available_balance_cents?: number
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          pending_balance_cents?: number
          pix_key?: string | null
          producer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_financials_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_settings: {
        Row: {
          created_at: string
          custom_fees_json: Json | null
          custom_fixed_fee_cents: number | null
          custom_release_rules_json: Json | null
          custom_security_reserve_days: number | null
          custom_security_reserve_percent: number | null
          custom_withdrawal_fee_cents: number | null
          id: string
          producer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fees_json?: Json | null
          custom_fixed_fee_cents?: number | null
          custom_release_rules_json?: Json | null
          custom_security_reserve_days?: number | null
          custom_security_reserve_percent?: number | null
          custom_withdrawal_fee_cents?: number | null
          id?: string
          producer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fees_json?: Json | null
          custom_fixed_fee_cents?: number | null
          custom_release_rules_json?: Json | null
          custom_security_reserve_days?: number | null
          custom_security_reserve_percent?: number | null
          custom_withdrawal_fee_cents?: number | null
          id?: string
          producer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_settings_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allowed_payment_methods: Json
          checkout_background_color: string | null
          checkout_image_url: string | null
          checkout_link_slug: string | null
          cover_image_url: string | null
          created_at: string
          delivery_type: string
          description: string | null
          donation_description: string | null
          donation_title: string | null
          file_url_or_access_info: string | null
          id: string
          is_active: boolean | null
          is_email_optional: boolean
          max_installments_allowed: number | null
          name: string
          price_cents: number
          producer_assumes_installments: boolean | null
          producer_id: string
          product_type: string
          require_email_confirmation: boolean
          show_order_summary: boolean
          subscription_frequency: string | null
          type: string | null
          updated_at: string
          vertical_cover_image_url: string | null
          vertical_cover_url: string | null
        }
        Insert: {
          allowed_payment_methods?: Json
          checkout_background_color?: string | null
          checkout_image_url?: string | null
          checkout_link_slug?: string | null
          cover_image_url?: string | null
          created_at?: string
          delivery_type?: string
          description?: string | null
          donation_description?: string | null
          donation_title?: string | null
          file_url_or_access_info?: string | null
          id?: string
          is_active?: boolean | null
          is_email_optional?: boolean
          max_installments_allowed?: number | null
          name: string
          price_cents: number
          producer_assumes_installments?: boolean | null
          producer_id: string
          product_type?: string
          require_email_confirmation?: boolean
          show_order_summary?: boolean
          subscription_frequency?: string | null
          type?: string | null
          updated_at?: string
          vertical_cover_image_url?: string | null
          vertical_cover_url?: string | null
        }
        Update: {
          allowed_payment_methods?: Json
          checkout_background_color?: string | null
          checkout_image_url?: string | null
          checkout_link_slug?: string | null
          cover_image_url?: string | null
          created_at?: string
          delivery_type?: string
          description?: string | null
          donation_description?: string | null
          donation_title?: string | null
          file_url_or_access_info?: string | null
          id?: string
          is_active?: boolean | null
          is_email_optional?: boolean
          max_installments_allowed?: number | null
          name?: string
          price_cents?: number
          producer_assumes_installments?: boolean | null
          producer_id?: string
          product_type?: string
          require_email_confirmation?: boolean
          show_order_summary?: boolean
          subscription_frequency?: string | null
          type?: string | null
          updated_at?: string
          vertical_cover_image_url?: string | null
          vertical_cover_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string | null
          cnpj: string | null
          company_name: string | null
          company_phone: string | null
          cpf: string | null
          cpf_cnpj: string | null
          created_at: string
          document_back_url: string | null
          document_front_url: string | null
          email: string
          full_name: string | null
          id: string
          instagram_handle: string | null
          iugu_customer_id: string | null
          opening_date: string | null
          person_type: string | null
          phone: string | null
          responsible_birth_date: string | null
          responsible_cpf: string | null
          responsible_name: string | null
          role: string
          selfie_url: string | null
          social_contract_url: string | null
          trading_name: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          birth_date?: string | null
          cnpj?: string | null
          company_name?: string | null
          company_phone?: string | null
          cpf?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          email: string
          full_name?: string | null
          id: string
          instagram_handle?: string | null
          iugu_customer_id?: string | null
          opening_date?: string | null
          person_type?: string | null
          phone?: string | null
          responsible_birth_date?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          role?: string
          selfie_url?: string | null
          social_contract_url?: string | null
          trading_name?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          birth_date?: string | null
          cnpj?: string | null
          company_name?: string | null
          company_phone?: string | null
          cpf?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          document_back_url?: string | null
          document_front_url?: string | null
          email?: string
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          iugu_customer_id?: string | null
          opening_date?: string | null
          person_type?: string | null
          phone?: string | null
          responsible_birth_date?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          role?: string
          selfie_url?: string | null
          social_contract_url?: string | null
          trading_name?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount_total_cents: number
          buyer_email: string
          buyer_profile_id: string | null
          created_at: string
          error_message_internal: string | null
          error_message_iugu: string | null
          event_attendees: Json | null
          gateway_bank_slip_barcode: string | null
          gateway_identifier: string | null
          gateway_payment_url: string | null
          gateway_pix_qrcode_base64: string | null
          gateway_pix_qrcode_text: string | null
          gateway_status: string | null
          gateway_transaction_id: string | null
          id: string
          installments_chosen: number | null
          iugu_charge_id: string | null
          iugu_subscription_id: string | null
          original_product_price_cents: number | null
          paid_at: string | null
          payment_method_used: string
          payout_status: string | null
          platform_fee_cents: number
          producer_share_cents: number
          product_id: string | null
          release_date: string | null
          security_reserve_cents: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_total_cents: number
          buyer_email: string
          buyer_profile_id?: string | null
          created_at?: string
          error_message_internal?: string | null
          error_message_iugu?: string | null
          event_attendees?: Json | null
          gateway_bank_slip_barcode?: string | null
          gateway_identifier?: string | null
          gateway_payment_url?: string | null
          gateway_pix_qrcode_base64?: string | null
          gateway_pix_qrcode_text?: string | null
          gateway_status?: string | null
          gateway_transaction_id?: string | null
          id?: string
          installments_chosen?: number | null
          iugu_charge_id?: string | null
          iugu_subscription_id?: string | null
          original_product_price_cents?: number | null
          paid_at?: string | null
          payment_method_used: string
          payout_status?: string | null
          platform_fee_cents?: number
          producer_share_cents?: number
          product_id?: string | null
          release_date?: string | null
          security_reserve_cents?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_total_cents?: number
          buyer_email?: string
          buyer_profile_id?: string | null
          created_at?: string
          error_message_internal?: string | null
          error_message_iugu?: string | null
          event_attendees?: Json | null
          gateway_bank_slip_barcode?: string | null
          gateway_identifier?: string | null
          gateway_payment_url?: string | null
          gateway_pix_qrcode_base64?: string | null
          gateway_pix_qrcode_text?: string | null
          gateway_status?: string | null
          gateway_transaction_id?: string | null
          id?: string
          installments_chosen?: number | null
          iugu_charge_id?: string | null
          iugu_subscription_id?: string | null
          original_product_price_cents?: number | null
          paid_at?: string | null
          payment_method_used?: string
          payout_status?: string | null
          platform_fee_cents?: number
          producer_share_cents?: number
          product_id?: string | null
          release_date?: string | null
          security_reserve_cents?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_buyer_profile_id_fkey"
            columns: ["buyer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      space_containers: {
        Row: {
          created_at: string
          display_format: string
          display_order: number
          id: string
          space_id: string
          title: string
        }
        Insert: {
          created_at?: string
          display_format?: string
          display_order?: number
          id?: string
          space_id: string
          title: string
        }
        Update: {
          created_at?: string
          display_format?: string
          display_order?: number
          id?: string
          space_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_containers_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_products: {
        Row: {
          container_id: string | null
          container_title: string | null
          created_at: string
          display_order: number
          id: string
          product_id: string
          product_type: string
          space_id: string
        }
        Insert: {
          container_id?: string | null
          container_title?: string | null
          created_at?: string
          display_order?: number
          id?: string
          product_id: string
          product_type: string
          space_id: string
        }
        Update: {
          container_id?: string | null
          container_title?: string | null
          created_at?: string
          display_order?: number
          id?: string
          product_id?: string
          product_type?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_products_club_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_space_products_container_id"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "space_containers"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          background_color: string | null
          banner_image_url: string | null
          created_at: string
          id: string
          name: string
          producer_id: string
          product_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          banner_image_url?: string | null
          created_at?: string
          id?: string
          name: string
          producer_id: string
          product_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          banner_image_url?: string | null
          created_at?: string
          id?: string
          name?: string
          producer_id?: string
          product_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          sale_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          sale_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_events_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_delivery_jobs: {
        Row: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          payload: Json
          processing_started_at: string | null
          status: string
          transaction_event_id: string
          updated_at: string
          webhook_endpoint_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          payload: Json
          processing_started_at?: string | null
          status?: string
          transaction_event_id: string
          updated_at?: string
          webhook_endpoint_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          payload?: Json
          processing_started_at?: string | null
          status?: string
          transaction_event_id?: string
          updated_at?: string
          webhook_endpoint_id?: string
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          event_types: string[]
          id: string
          is_active: boolean
          name: string
          producer_id: string
          product_id: string | null
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          event_types: string[]
          id?: string
          is_active?: boolean
          name: string
          producer_id: string
          product_id?: string | null
          secret?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          event_types?: string[]
          id?: string
          is_active?: boolean
          name?: string
          producer_id?: string
          product_id?: string | null
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_event_logs: {
        Row: {
          created_at: string
          endpoint_id: string
          event_type: string
          id: string
          payload: Json | null
          response_body: string | null
          response_code: number | null
          status: string
        }
        Insert: {
          created_at?: string
          endpoint_id: string
          event_type: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_code?: number | null
          status: string
        }
        Update: {
          created_at?: string
          endpoint_id?: string
          event_type?: string
          id?: string
          payload?: Json | null
          response_body?: string | null
          response_code?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_event_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount_cents: number
          fee_cents: number
          id: string
          processed_at: string | null
          producer_id: string
          requested_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cents: number
          fee_cents?: number
          id?: string
          processed_at?: string | null
          producer_id: string
          requested_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number
          fee_cents?: number
          id?: string
          processed_at?: string | null
          producer_id?: string
          requested_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_webhook_delivery_jobs: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      calculate_producer_balances_simple: {
        Args: { p_producer_id: string }
        Returns: Json
      }
      get_pending_webhook_jobs_locked: {
        Args: { max_jobs?: number }
        Returns: {
          attempts: number
          created_at: string
          event_type: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          payload: Json
          processing_started_at: string | null
          status: string
          transaction_event_id: string
          updated_at: string
          webhook_endpoint_id: string
        }[]
      }
      get_producer_financial_report: {
        Args: {
          p_end_date: string
          p_producer_id: string
          p_start_date: string
        }
        Returns: Json
      }
      get_space_hub_details: {
        Args: { space_id_input: string }
        Returns: Json
      }
      get_students_with_progress: {
        Args: { p_product_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      recover_missing_transaction_events: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      set_active_cohort_for_space: {
        Args: { p_cohort_id_to_activate: string; p_space_id: string }
        Returns: undefined
      }
      set_new_default_cohort: {
        Args: { p_new_default_cohort_id: string; p_space_id: string }
        Returns: undefined
      }
      update_container_format: {
        Args: { container_id_input: string; new_format: string }
        Returns: undefined
      }
      update_display_order: {
        Args: { items: Json; table_name: string }
        Returns: undefined
      }
      upsert_producer_balance: {
        Args: { amount_to_add: number; p_producer_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "producer" | "user" | "buyer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "producer", "user", "buyer"],
    },
  },
} as const
