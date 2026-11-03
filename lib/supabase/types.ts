export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'citizen' | 'agency_admin' | 'platform_admin';
export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'action_required'
  | 'approved'
  | 'rejected'
  | 'completed';
export type ActionStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired';
export type AppointmentStatus = 'confirmed' | 'rescheduled' | 'cancelled' | 'attended';

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          hotline: string | null;
          office_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          hotline?: string | null;
          office_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          hotline?: string | null;
          office_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          agency_id: string;
          code: string;
          name: string;
          description: string | null;
          is_active: boolean;
          requirements: Json;
          processing_fee: number;
          processing_days: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          code: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          requirements?: Json;
          processing_fee?: number;
          processing_days?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          requirements?: Json;
          processing_fee?: number;
          processing_days?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      charter_chunks: {
        Row: {
          id: string;
          agency_id: string;
          service_id: string | null;
          title: string;
          content: string;
          metadata: Json;
          embedding: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          agency_id: string;
          service_id?: string | null;
          title: string;
          content: string;
          metadata?: Json;
          embedding: number[];
          created_at?: string;
        };
        Update: {
          id?: string;
          agency_id?: string;
          service_id?: string | null;
          title?: string;
          content?: string;
          metadata?: Json;
          embedding?: number[];
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          agency_id: string | null;
          full_name: string;
          email: string;
          phone: string | null;
          consent_settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          agency_id?: string | null;
          full_name: string;
          email: string;
          phone?: string | null;
          consent_settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          agency_id?: string | null;
          full_name?: string;
          email?: string;
          phone?: string | null;
          consent_settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_requests: {
        Row: {
          id: string;
          tracking_number: string;
          citizen_id: string;
          service_id: string;
          status: RequestStatus;
          form_data: Json;
          counter_fee: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tracking_number: string;
          citizen_id: string;
          service_id: string;
          status?: RequestStatus;
          form_data?: Json;
          counter_fee?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tracking_number?: string;
          citizen_id?: string;
          service_id?: string;
          status?: RequestStatus;
          form_data?: Json;
          counter_fee?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pending_actions: {
        Row: {
          id: string;
          request_id: string | null;
          citizen_id: string;
          action_type: string;
          payload: Json;
          payload_hash: string;
          status: ActionStatus;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id?: string | null;
          citizen_id: string;
          action_type: string;
          payload: Json;
          payload_hash: string;
          status?: ActionStatus;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string | null;
          citizen_id?: string;
          action_type?: string;
          payload?: Json;
          payload_hash?: string;
          status?: ActionStatus;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      appointment_slots: {
        Row: {
          id: string;
          service_id: string;
          slot_time: string;
          capacity: number;
          booked_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          slot_time: string;
          capacity?: number;
          booked_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          slot_time?: string;
          capacity?: number;
          booked_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          request_id: string | null;
          citizen_id: string;
          slot_id: string;
          slot_time: string;
          status: AppointmentStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id?: string | null;
          citizen_id: string;
          slot_id: string;
          slot_time: string;
          status?: AppointmentStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string | null;
          citizen_id?: string;
          slot_id?: string;
          slot_time?: string;
          status?: AppointmentStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          citizen_id: string;
          title: string;
          body: string;
          is_read: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          citizen_id: string;
          title: string;
          body: string;
          is_read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          citizen_id?: string;
          title?: string;
          body?: string;
          is_read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_role: string;
          action: string;
          target_type: string;
          target_id: string;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_role: string;
          action: string;
          target_type: string;
          target_id: string;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_role?: string;
          action?: string;
          target_type?: string;
          target_id?: string;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_unanswered: {
        Row: {
          id: string;
          session_id: string;
          user_query: string;
          reason: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_query: string;
          reason: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_query?: string;
          reason?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_charter_chunks: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
          filter_agency_id?: string | null;
          filter_service_id?: string | null;
        };
        Returns: {
          id: string;
          agency_id: string;
          service_id: string | null;
          title: string;
          content: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      current_user_agency: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    CompositeTypes: Record<string, never>;
  };
}
