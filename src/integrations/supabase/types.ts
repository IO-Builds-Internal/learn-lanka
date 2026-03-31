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
      answer_access_payments: {
        Row: {
          created_at: string
          granted_at: string | null
          id: string
          payment_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string | null
          id?: string
          payment_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string | null
          id?: string
          payment_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_access_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      class_days: {
        Row: {
          class_month_id: string
          created_at: string
          date: string
          end_time: string | null
          id: string
          is_conducted: boolean
          is_extra: boolean
          meeting_link: string | null
          meeting_link_notified_at: string | null
          start_time: string | null
          title: string
          zoom_meeting_id: string | null
        }
        Insert: {
          class_month_id: string
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          is_conducted?: boolean
          is_extra?: boolean
          meeting_link?: string | null
          meeting_link_notified_at?: string | null
          start_time?: string | null
          title: string
          zoom_meeting_id?: string | null
        }
        Update: {
          class_month_id?: string
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          is_conducted?: boolean
          is_extra?: boolean
          meeting_link?: string | null
          meeting_link_notified_at?: string | null
          start_time?: string | null
          title?: string
          zoom_meeting_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_days_class_month_id_fkey"
            columns: ["class_month_id"]
            isOneToOne: false
            referencedRelation: "class_months"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          admin_note: string | null
          class_id: string
          enrolled_at: string
          id: string
          payment_received_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          class_id: string
          enrolled_at?: string
          id?: string
          payment_received_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          class_id?: string
          enrolled_at?: string
          id?: string
          payment_received_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_months: {
        Row: {
          class_id: string
          id: string
          monthly_fee_override: number | null
          schedule_notified_at: string | null
          year_month: string
        }
        Insert: {
          class_id: string
          id?: string
          monthly_fee_override?: number | null
          schedule_notified_at?: string | null
          year_month: string
        }
        Update: {
          class_id?: string
          id?: string
          monthly_fee_override?: number | null
          schedule_notified_at?: string | null
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_months_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_papers: {
        Row: {
          answer_pdf_url: string | null
          class_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          paper_type: string
          pdf_url: string
          publish_status: string
          published_at: string | null
          review_video_url: string | null
          title: string
        }
        Insert: {
          answer_pdf_url?: string | null
          class_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          paper_type: string
          pdf_url: string
          publish_status?: string
          published_at?: string | null
          review_video_url?: string | null
          title: string
        }
        Update: {
          answer_pdf_url?: string | null
          class_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          paper_type?: string
          pdf_url?: string
          publish_status?: string
          published_at?: string | null
          review_video_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_papers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          admin_otp_phone: string | null
          approval_status: string
          created_at: string
          created_by: string | null
          description: string | null
          grade_max: number
          grade_min: number
          id: string
          image_url: string | null
          is_private: boolean
          max_students: number | null
          monthly_fee_amount: number
          private_code: string | null
          subject_id: string | null
          teacher_id: string | null
          title: string
        }
        Insert: {
          admin_otp_phone?: string | null
          approval_status?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_max: number
          grade_min: number
          id?: string
          image_url?: string | null
          is_private?: boolean
          max_students?: number | null
          monthly_fee_amount?: number
          private_code?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title: string
        }
        Update: {
          admin_otp_phone?: string | null
          approval_status?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          grade_max?: number
          grade_min?: number
          id?: string
          image_url?: string | null
          is_private?: boolean
          max_students?: number | null
          monthly_fee_amount?: number
          private_code?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          admin_note: string | null
          created_at: string
          email: string | null
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contact_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          message_id: string
          sender_id: string | null
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          message_id: string
          sender_id?: string | null
          sender_role?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          message_id?: string
          sender_id?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "contact_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          coupon_id: string
          id: string
          payment_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          payment_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          payment_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      enrollment_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          enrollment_id: string
          id: string
          note: string | null
          payment_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          enrollment_id: string
          id?: string
          note?: string | null
          payment_date: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          enrollment_id?: string
          id?: string
          note?: string | null
          payment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "class_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_papers: {
        Row: {
          created_at: string
          essay_count: number
          grade: number
          id: string
          lesson_weights: Json
          mcq_count: number
          paper_type: string
          question_ids: Json
          short_essay_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          essay_count?: number
          grade: number
          id: string
          lesson_weights?: Json
          mcq_count?: number
          paper_type?: string
          question_ids?: Json
          short_essay_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          essay_count?: number
          grade?: number
          id?: string
          lesson_weights?: Json
          mcq_count?: number
          paper_type?: string
          question_ids?: Json
          short_essay_count?: number
          user_id?: string
        }
        Relationships: []
      }
      lesson_attachments: {
        Row: {
          attachment_type: string
          created_at: string
          id: string
          lesson_id: string
          sort_order: number
          title: string | null
          url: string
        }
        Insert: {
          attachment_type: string
          created_at?: string
          id?: string
          lesson_id: string
          sort_order?: number
          title?: string | null
          url: string
        }
        Update: {
          attachment_type?: string
          created_at?: string
          id?: string
          lesson_id?: string
          sort_order?: number
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_attachments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          class_day_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          notes_text: string | null
          pdf_url: string | null
          title: string
          youtube_url: string | null
        }
        Insert: {
          class_day_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes_text?: string | null
          pdf_url?: string | null
          title: string
          youtube_url?: string | null
        }
        Update: {
          class_day_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes_text?: string | null
          pdf_url?: string | null
          title?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_day_id_fkey"
            columns: ["class_day_id"]
            isOneToOne: false
            referencedRelation: "class_days"
            referencedColumns: ["id"]
          },
        ]
      }
      moderator_class_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          class_id: string
          id: string
          moderator_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          class_id: string
          id?: string
          moderator_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          class_id?: string
          id?: string
          moderator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderator_class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          sms_sent: boolean | null
          target_ref: string | null
          target_type: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          sms_sent?: boolean | null
          target_ref?: string | null
          target_type: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          sms_sent?: boolean | null
          target_ref?: string | null
          target_type?: string
          title?: string
        }
        Relationships: []
      }
      otp_requests: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          otp_plain: string | null
          phone: string
          purpose: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          otp_hash: string
          otp_plain?: string | null
          phone: string
          purpose: string
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          otp_plain?: string | null
          phone?: string
          purpose?: string
        }
        Relationships: []
      }
      paper_attachment_user_access: {
        Row: {
          attachment_id: string
          granted_at: string
          id: string
          user_id: string
        }
        Insert: {
          attachment_id: string
          granted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attachment_id?: string
          granted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_attachment_user_access_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "paper_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_attachment_users: {
        Row: {
          attachment_id: string
          granted_at: string
          id: string
          user_id: string
        }
        Insert: {
          attachment_id: string
          granted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attachment_id?: string
          granted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_attachment_users_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "paper_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_attachments: {
        Row: {
          access_type: string
          attachment_type: string
          class_id: string | null
          created_at: string
          id: string
          paper_id: string
          sort_order: number
          title: string | null
          url: string
        }
        Insert: {
          access_type?: string
          attachment_type: string
          class_id?: string | null
          created_at?: string
          id?: string
          paper_id: string
          sort_order?: number
          title?: string | null
          url: string
        }
        Update: {
          access_type?: string
          attachment_type?: string
          class_id?: string | null
          created_at?: string
          id?: string
          paper_id?: string
          sort_order?: number
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_attachments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paper_attachments_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
      papers: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          download_count: number
          grade: number | null
          id: string
          is_free: boolean
          medium: string | null
          paper_type: string
          pdf_url: string
          school_or_zone: string | null
          subject: string | null
          subject_id: string | null
          term: number | null
          title: string
          year: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number
          grade?: number | null
          id?: string
          is_free?: boolean
          medium?: string | null
          paper_type: string
          pdf_url: string
          school_or_zone?: string | null
          subject?: string | null
          subject_id?: string | null
          term?: number | null
          title: string
          year?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number
          grade?: number | null
          id?: string
          is_free?: boolean
          medium?: string | null
          paper_type?: string
          pdf_url?: string
          school_or_zone?: string | null
          subject?: string | null
          subject_id?: string | null
          term?: number | null
          title?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          payment_type: string
          ref_id: string
          slip_url: string | null
          status: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          payment_type: string
          ref_id: string
          slip_url?: string | null
          status?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          payment_type?: string
          ref_id?: string
          slip_url?: string | null
          status?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      playground_files: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birthday: string | null
          created_at: string
          first_name: string
          grade: number | null
          id: string
          last_name: string
          phone: string
          school_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          first_name: string
          grade?: number | null
          id: string
          last_name: string
          phone: string
          school_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          first_name?: string
          grade?: number | null
          id?: string
          last_name?: string
          phone?: string
          school_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          category: string
          correct_option_no: number | null
          created_at: string
          created_by: string | null
          explain_video_url: string | null
          grade: number | null
          id: string
          lesson_id: string | null
          linked_group_id: string | null
          medium: string | null
          options_image_url: string | null
          past_paper_ref: string | null
          question_image_url: string | null
          question_images: Json | null
          question_no: number | null
          question_part: string | null
          question_text: string | null
          question_type: string
          subject: string
          subject_id: string | null
        }
        Insert: {
          category?: string
          correct_option_no?: number | null
          created_at?: string
          created_by?: string | null
          explain_video_url?: string | null
          grade?: number | null
          id?: string
          lesson_id?: string | null
          linked_group_id?: string | null
          medium?: string | null
          options_image_url?: string | null
          past_paper_ref?: string | null
          question_image_url?: string | null
          question_images?: Json | null
          question_no?: number | null
          question_part?: string | null
          question_text?: string | null
          question_type?: string
          subject?: string
          subject_id?: string | null
        }
        Update: {
          category?: string
          correct_option_no?: number | null
          created_at?: string
          created_by?: string | null
          explain_video_url?: string | null
          grade?: number | null
          id?: string
          lesson_id?: string | null
          linked_group_id?: string | null
          medium?: string | null
          options_image_url?: string | null
          past_paper_ref?: string | null
          question_image_url?: string | null
          question_images?: Json | null
          question_no?: number | null
          question_part?: string | null
          question_text?: string | null
          question_type?: string
          subject?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "syllabus_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_image_url: string | null
          option_no: number
          option_text: string | null
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_image_url?: string | null
          option_no: number
          option_text?: string | null
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_image_url?: string | null
          option_no?: number
          option_text?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_answers_mcq: {
        Row: {
          attempt_id: string
          id: string
          question_id: string
          selected_option_no: number | null
        }
        Insert: {
          attempt_id: string
          id?: string
          question_id: string
          selected_option_no?: number | null
        }
        Update: {
          attempt_id?: string
          id?: string
          question_id?: string
          selected_option_no?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rank_answers_mcq_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "rank_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rank_answers_mcq_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "rank_mcq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_answers_uploads: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          pdf_url: string
          upload_type: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          pdf_url: string
          upload_type: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          pdf_url?: string
          upload_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_answers_uploads_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "rank_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_attempts: {
        Row: {
          auto_closed: boolean
          ends_at: string
          id: string
          rank_paper_id: string
          started_at: string
          submitted_at: string | null
          tab_switch_count: number
          user_id: string
          window_close_count: number
        }
        Insert: {
          auto_closed?: boolean
          ends_at: string
          id?: string
          rank_paper_id: string
          started_at?: string
          submitted_at?: string | null
          tab_switch_count?: number
          user_id: string
          window_close_count?: number
        }
        Update: {
          auto_closed?: boolean
          ends_at?: string
          id?: string
          rank_paper_id?: string
          started_at?: string
          submitted_at?: string | null
          tab_switch_count?: number
          user_id?: string
          window_close_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "rank_attempts_rank_paper_id_fkey"
            columns: ["rank_paper_id"]
            isOneToOne: false
            referencedRelation: "rank_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_marks: {
        Row: {
          attempt_id: string
          essay_score: number | null
          id: string
          mcq_score: number | null
          published_at: string | null
          reviewed_by: string | null
          short_essay_score: number | null
          total_score: number | null
        }
        Insert: {
          attempt_id: string
          essay_score?: number | null
          id?: string
          mcq_score?: number | null
          published_at?: string | null
          reviewed_by?: string | null
          short_essay_score?: number | null
          total_score?: number | null
        }
        Update: {
          attempt_id?: string
          essay_score?: number | null
          id?: string
          mcq_score?: number | null
          published_at?: string | null
          reviewed_by?: string | null
          short_essay_score?: number | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rank_marks_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "rank_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_mcq_options: {
        Row: {
          id: string
          is_correct: boolean
          option_image_url: string | null
          option_no: number
          option_text: string | null
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          option_image_url?: string | null
          option_no: number
          option_text?: string | null
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          option_image_url?: string | null
          option_no?: number
          option_text?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_mcq_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "rank_mcq_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_mcq_questions: {
        Row: {
          id: string
          q_no: number
          question_image_url: string | null
          question_text: string | null
          rank_paper_id: string
        }
        Insert: {
          id?: string
          q_no: number
          question_image_url?: string | null
          question_text?: string | null
          rank_paper_id: string
        }
        Update: {
          id?: string
          q_no?: number
          question_image_url?: string | null
          question_text?: string | null
          rank_paper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_mcq_questions_rank_paper_id_fkey"
            columns: ["rank_paper_id"]
            isOneToOne: false
            referencedRelation: "rank_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_paper_attachments: {
        Row: {
          attachment_type: string
          created_at: string
          id: string
          rank_paper_id: string
          sort_order: number
          title: string | null
          url: string
        }
        Insert: {
          attachment_type: string
          created_at?: string
          id?: string
          rank_paper_id: string
          sort_order?: number
          title?: string | null
          url: string
        }
        Update: {
          attachment_type?: string
          created_at?: string
          id?: string
          rank_paper_id?: string
          sort_order?: number
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_paper_attachments_rank_paper_id_fkey"
            columns: ["rank_paper_id"]
            isOneToOne: false
            referencedRelation: "rank_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_papers: {
        Row: {
          class_id: string | null
          created_at: string
          created_by: string | null
          essay_pdf_url: string | null
          fee_amount: number | null
          grade: number
          has_essay: boolean
          has_mcq: boolean
          has_short_essay: boolean
          id: string
          lock_at: string | null
          medium: string | null
          publish_status: string
          review_video_url: string | null
          short_essay_pdf_url: string | null
          subject_id: string | null
          time_limit_minutes: number
          title: string
          unlock_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          essay_pdf_url?: string | null
          fee_amount?: number | null
          grade: number
          has_essay?: boolean
          has_mcq?: boolean
          has_short_essay?: boolean
          id?: string
          lock_at?: string | null
          medium?: string | null
          publish_status?: string
          review_video_url?: string | null
          short_essay_pdf_url?: string | null
          subject_id?: string | null
          time_limit_minutes?: number
          title: string
          unlock_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          essay_pdf_url?: string | null
          fee_amount?: number | null
          grade?: number
          has_essay?: boolean
          has_mcq?: boolean
          has_short_essay?: boolean
          id?: string
          lock_at?: string | null
          medium?: string | null
          publish_status?: string
          review_video_url?: string | null
          short_essay_pdf_url?: string | null
          subject_id?: string | null
          time_limit_minutes?: number
          title?: string
          unlock_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rank_papers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rank_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_type: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_type: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_type?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          address: string | null
          created_at: string
          id: string
          note: string | null
          slip_url: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          note?: string | null
          slip_url?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          note?: string | null
          slip_url?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          price_both: number | null
          price_printed: number | null
          price_soft: number | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price_both?: number | null
          price_printed?: number | null
          price_soft?: number | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price_both?: number | null
          price_printed?: number | null
          price_soft?: number | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          class_id: string | null
          error_message: string | null
          id: string
          message: string
          recipient_phone: string
          sent_at: string
          sent_by: string | null
          status: string
        }
        Insert: {
          class_id?: string | null
          error_message?: string | null
          id?: string
          message: string
          recipient_phone: string
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Update: {
          class_id?: string | null
          error_message?: string | null
          id?: string
          message?: string
          recipient_phone?: string
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          template_body: string
          template_key: string
          template_name: string
          updated_at: string
          updated_by: string | null
          variables: string[]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          template_body: string
          template_key: string
          template_name: string
          updated_at?: string
          updated_by?: string | null
          variables?: string[]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          template_body?: string
          template_key?: string
          template_name?: string
          updated_at?: string
          updated_by?: string | null
          variables?: string[]
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      syllabus_lessons: {
        Row: {
          created_at: string
          created_by: string | null
          grade: number | null
          id: string
          medium: string | null
          parent_id: string | null
          sort_order: number
          subject: string
          subject_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grade?: number | null
          id?: string
          medium?: string | null
          parent_id?: string | null
          sort_order?: number
          subject?: string
          subject_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grade?: number | null
          id?: string
          medium?: string | null
          parent_id?: string | null
          sort_order?: number
          subject?: string
          subject_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_lessons_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "syllabus_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      can_manage_class: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_mod: { Args: { _user_id: string }; Returns: boolean }
      reorder_rank_mcq_questions: {
        Args: { new_order: number[]; question_ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "student" | "teacher"
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
      app_role: ["admin", "moderator", "student", "teacher"],
    },
  },
} as const
