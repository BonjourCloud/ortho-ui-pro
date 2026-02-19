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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_type: string
          created_at: string | null
          email: string | null
          emi_interest: boolean | null
          first_name: string
          id: string
          insurance_provider: string | null
          last_name: string
          phone: string
          preferred_date: string
          preferred_time: string
          service: string | null
          status: string | null
          symptoms: string
        }
        Insert: {
          appointment_type: string
          created_at?: string | null
          email?: string | null
          emi_interest?: boolean | null
          first_name: string
          id?: string
          insurance_provider?: string | null
          last_name: string
          phone: string
          preferred_date: string
          preferred_time: string
          service?: string | null
          status?: string | null
          symptoms: string
        }
        Update: {
          appointment_type?: string
          created_at?: string | null
          email?: string | null
          emi_interest?: boolean | null
          first_name?: string
          id?: string
          insurance_provider?: string | null
          last_name?: string
          phone?: string
          preferred_date?: string
          preferred_time?: string
          service?: string | null
          status?: string | null
          symptoms?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          id: string
          is_featured: boolean | null
          likes_count: number | null
          published_at: string | null
          read_time: number | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          published_at?: string | null
          read_time?: number | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          likes_count?: number | null
          published_at?: string | null
          read_time?: number | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      case_studies: {
        Row: {
          age: number | null
          condition: string
          created_at: string | null
          follow_up_period: string | null
          gender: string | null
          hospital_stay_days: number | null
          id: string
          is_featured: boolean | null
          milestones: Json | null
          occupation: string | null
          outcome_summary: string | null
          pain_score_post: number | null
          pain_score_pre: number | null
          patient_initials: string | null
          procedure_name: string | null
          published_date: string | null
          range_of_motion_post: string | null
          range_of_motion_pre: string | null
          return_to_sports: string | null
          return_to_work: string | null
          slug: string
          surgery_date: string | null
          surgery_type: string | null
          testimonial: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          condition: string
          created_at?: string | null
          follow_up_period?: string | null
          gender?: string | null
          hospital_stay_days?: number | null
          id?: string
          is_featured?: boolean | null
          milestones?: Json | null
          occupation?: string | null
          outcome_summary?: string | null
          pain_score_post?: number | null
          pain_score_pre?: number | null
          patient_initials?: string | null
          procedure_name?: string | null
          published_date?: string | null
          range_of_motion_post?: string | null
          range_of_motion_pre?: string | null
          return_to_sports?: string | null
          return_to_work?: string | null
          slug: string
          surgery_date?: string | null
          surgery_type?: string | null
          testimonial?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          condition?: string
          created_at?: string | null
          follow_up_period?: string | null
          gender?: string | null
          hospital_stay_days?: number | null
          id?: string
          is_featured?: boolean | null
          milestones?: Json | null
          occupation?: string | null
          outcome_summary?: string | null
          pain_score_post?: number | null
          pain_score_pre?: number | null
          patient_initials?: string | null
          procedure_name?: string | null
          published_date?: string | null
          range_of_motion_post?: string | null
          range_of_motion_pre?: string | null
          return_to_sports?: string | null
          return_to_work?: string | null
          slug?: string
          surgery_date?: string | null
          surgery_type?: string | null
          testimonial?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          read: boolean | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          read?: boolean | null
          subject: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          read?: boolean | null
          subject?: string
        }
        Relationships: []
      }
      second_opinions: {
        Row: {
          additional_notes: string | null
          age: number
          condition: string
          created_at: string | null
          current_diagnosis: string
          email: string | null
          file_names: string[] | null
          id: string
          name: string
          phone: string
          status: string | null
        }
        Insert: {
          additional_notes?: string | null
          age: number
          condition: string
          created_at?: string | null
          current_diagnosis: string
          email?: string | null
          file_names?: string[] | null
          id?: string
          name: string
          phone: string
          status?: string | null
        }
        Update: {
          additional_notes?: string | null
          age?: number
          condition?: string
          created_at?: string | null
          current_diagnosis?: string
          email?: string | null
          file_names?: string[] | null
          id?: string
          name?: string
          phone?: string
          status?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          body_part: string | null
          category: string | null
          cost_range: string | null
          created_at: string | null
          emi_available: boolean | null
          full_recovery: string | null
          hospital_stay: string | null
          id: string
          insurance_covered: boolean | null
          name: string
          patients_treated: number | null
          procedure_time: string | null
          recovery_time: string | null
          short_description: string | null
          slug: string
          sort_order: number | null
          success_rate: string | null
          updated_at: string | null
        }
        Insert: {
          body_part?: string | null
          category?: string | null
          cost_range?: string | null
          created_at?: string | null
          emi_available?: boolean | null
          full_recovery?: string | null
          hospital_stay?: string | null
          id?: string
          insurance_covered?: boolean | null
          name: string
          patients_treated?: number | null
          procedure_time?: string | null
          recovery_time?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number | null
          success_rate?: string | null
          updated_at?: string | null
        }
        Update: {
          body_part?: string | null
          category?: string | null
          cost_range?: string | null
          created_at?: string | null
          emi_available?: boolean | null
          full_recovery?: string | null
          hospital_stay?: string | null
          id?: string
          insurance_covered?: boolean | null
          name?: string
          patients_treated?: number | null
          procedure_time?: string | null
          recovery_time?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number | null
          success_rate?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          age: number | null
          condition: string
          created_at: string | null
          gender: string | null
          id: string
          initials: string
          is_featured: boolean | null
          location: string | null
          occupation: string | null
          patient_name: string
          rating: number
          sort_order: number | null
          text: string
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          condition: string
          created_at?: string | null
          gender?: string | null
          id?: string
          initials: string
          is_featured?: boolean | null
          location?: string | null
          occupation?: string | null
          patient_name: string
          rating?: number
          sort_order?: number | null
          text: string
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          condition?: string
          created_at?: string | null
          gender?: string | null
          id?: string
          initials?: string
          is_featured?: boolean | null
          location?: string | null
          occupation?: string | null
          patient_name?: string
          rating?: number
          sort_order?: number | null
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
