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
      deals: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          company: string;
          value: number | null;
          stage: DealStage;
          owner_id: string;
          notes: string | null;
          contact_name: string | null;
          contact_email: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["deals"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["deals"]["Insert"]>;
      };
    };
    Enums: {
      deal_stage: DealStage;
    };
  };
}

export type DealStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type Deal = Database["public"]["Tables"]["deals"]["Row"];
