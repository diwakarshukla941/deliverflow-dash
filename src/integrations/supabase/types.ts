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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          ai_confidence: number | null
          attendance_date: string
          check_in_at: string | null
          check_in_image_url: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_at: string | null
          check_out_image_url: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          created_at: string
          created_by: string | null
          device_id: string | null
          device_info: Json | null
          face_recognition_id: string | null
          face_verification_status: string | null
          id: string
          partner_id: string
          remarks: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_confidence?: number | null
          attendance_date?: string
          check_in_at?: string | null
          check_in_image_url?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_image_url?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          device_info?: Json | null
          face_recognition_id?: string | null
          face_verification_status?: string | null
          id?: string
          partner_id: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_confidence?: number | null
          attendance_date?: string
          check_in_at?: string | null
          check_in_image_url?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_image_url?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          device_info?: Json | null
          face_recognition_id?: string | null
          face_verification_status?: string | null
          id?: string
          partner_id?: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      delivery_partners: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          app_version: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          deleted_at: string | null
          deleted_by: string | null
          device_id: string | null
          driving_license_expiry: string | null
          driving_license_number: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employment_type: string | null
          full_name: string
          gender: string | null
          government_id_number: string | null
          government_id_type: string | null
          id: string
          joining_date: string | null
          last_login_at: string | null
          last_seen_at: string | null
          notes: string | null
          os_version: string | null
          partner_code: string
          phone: string
          postal_code: string | null
          profile_photo_url: string | null
          push_token: string | null
          qr_code: string | null
          state: string | null
          status: Database["public"]["Enums"]["partner_status"]
          updated_at: string
          updated_by: string | null
          upi_id: string | null
          user_id: string | null
          vehicle_model: string | null
          vehicle_number: string | null
          vehicle_type: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          app_version?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          device_id?: string | null
          driving_license_expiry?: string | null
          driving_license_number?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employment_type?: string | null
          full_name: string
          gender?: string | null
          government_id_number?: string | null
          government_id_type?: string | null
          id?: string
          joining_date?: string | null
          last_login_at?: string | null
          last_seen_at?: string | null
          notes?: string | null
          os_version?: string | null
          partner_code: string
          phone: string
          postal_code?: string | null
          profile_photo_url?: string | null
          push_token?: string | null
          qr_code?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
          updated_by?: string | null
          upi_id?: string | null
          user_id?: string | null
          vehicle_model?: string | null
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          app_version?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          device_id?: string | null
          driving_license_expiry?: string | null
          driving_license_number?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employment_type?: string | null
          full_name?: string
          gender?: string | null
          government_id_number?: string | null
          government_id_type?: string | null
          id?: string
          joining_date?: string | null
          last_login_at?: string | null
          last_seen_at?: string | null
          notes?: string | null
          os_version?: string | null
          partner_code?: string
          phone?: string
          postal_code?: string | null
          profile_photo_url?: string | null
          push_token?: string | null
          qr_code?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
          updated_by?: string | null
          upi_id?: string | null
          user_id?: string | null
          vehicle_model?: string | null
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          key: string
          module: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          module: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          module?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          department: string | null
          designation: string | null
          email: string
          employee_id: string | null
          full_name: string
          id: string
          joining_date: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          reporting_manager_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branch?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          designation?: string | null
          email: string
          employee_id?: string | null
          full_name: string
          id: string
          joining_date?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          reporting_manager_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branch?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          designation?: string | null
          email?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          joining_date?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          reporting_manager_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "hr"
        | "operations"
        | "finance"
        | "manager"
        | "dispatcher"
        | "team_leader"
        | "branch_manager"
        | "warehouse_manager"
        | "inventory_manager"
        | "customer_support"
        | "delivery_manager"
        | "auditor"
      attendance_status: "checked_in" | "checked_out" | "absent" | "on_leave"
      delivery_status:
        | "pending"
        | "assigned"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "cancelled"
        | "failed"
      partner_status:
        | "active"
        | "suspended"
        | "deactivated"
        | "blacklisted"
        | "resigned"
        | "pending"
      payment_mode: "cash" | "upi" | "card" | "wallet" | "online" | "other"
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
      app_role: [
        "super_admin",
        "admin",
        "hr",
        "operations",
        "finance",
        "manager",
        "dispatcher",
        "team_leader",
        "branch_manager",
        "warehouse_manager",
        "inventory_manager",
        "customer_support",
        "delivery_manager",
        "auditor",
      ],
      attendance_status: ["checked_in", "checked_out", "absent", "on_leave"],
      delivery_status: [
        "pending",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "cancelled",
        "failed",
      ],
      partner_status: [
        "active",
        "suspended",
        "deactivated",
        "blacklisted",
        "resigned",
        "pending",
      ],
      payment_mode: ["cash", "upi", "card", "wallet", "online", "other"],
    },
  },
} as const
