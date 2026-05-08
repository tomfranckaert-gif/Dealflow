export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DealStage =
  | "lead"
  | "bezichtiging"
  | "bod"
  | "koopakte"
  | "voorwaarden"
  | "financiering"
  | "overdracht"
  | "gesloten";

export interface Deal {
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
  address: string | null;
  postcode: string | null;
  city: string | null;
  property_type: string | null;
  surface: number | null;
  rooms: number | null;
  asking_price: number | null;
  agreed_price: number | null;
  transfer_date: string | null;
  notary_name: string | null;
  seller_id: string | null;
  buyer_id: string | null;
}

export interface Contact {
  id: string;
  created_at: string;
  owner_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: "buyer" | "seller";
  partner_name: string | null;
  partner_email: string | null;
  partner_phone: string | null;
}

export interface DealWithContacts extends Deal {
  buyer: Pick<Contact, "name" | "email" | "phone" | "partner_name" | "partner_email" | "partner_phone"> | null;
  seller: Pick<Contact, "name" | "email" | "phone" | "partner_name" | "partner_email" | "partner_phone"> | null;
}
