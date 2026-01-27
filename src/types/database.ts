export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      blocks: {
        Row: {
          id: string;
          name: string;
          content: string;
          indent: number;
          is_collapsed: boolean;
          is_pinned: boolean;
          column: string;
          properties: Json;
          created_at: string;
          updated_at: string;
          user_id: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name?: string;
          content?: string;
          indent?: number;
          is_collapsed?: boolean;
          is_pinned?: boolean;
          column?: string;
          properties?: Json;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          content?: string;
          indent?: number;
          is_collapsed?: boolean;
          is_pinned?: boolean;
          column?: string;
          properties?: Json;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          sort_order?: number;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
          color: string;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          created_at?: string;
          user_id?: string | null;
        };
      };
      block_types: {
        Row: {
          id: string;
          name: string;
          icon: string;
          color: string;
          property_ids: Json;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string;
          color?: string;
          property_ids?: Json;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          color?: string;
          property_ids?: Json;
          created_at?: string;
          user_id?: string | null;
        };
      };
      custom_views: {
        Row: {
          id: string;
          name: string;
          icon: string;
          color: string;
          property_ids: Json;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string;
          color?: string;
          property_ids?: Json;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          color?: string;
          property_ids?: Json;
          created_at?: string;
          user_id?: string | null;
        };
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          user_id: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          user_id?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          user_id?: string | null;
          updated_at?: string;
        };
      };
      top3_history: {
        Row: {
          id: string;
          date: string;
          blocks: Json;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          blocks: Json;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          blocks?: Json;
          user_id?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
