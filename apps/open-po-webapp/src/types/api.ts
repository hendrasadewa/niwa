import type { OrderStatus, WaveStatus } from "@niwa/open-po-validators";

export interface User {
  id: string;
  name: string;
  email: string;
  whatsapp_number: string;
  default_shipping_address: string | null;
  roles: string[];
  permissions: string[];
  created_at: number;
}

export interface Store {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  payment_instructions: string;
  whatsapp_contact: string;
  created_at: number;
}

export interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string;
  base_price: number;
  image_url: string | null;
  is_archived: boolean;
  review_summary?: ReviewSummary;
}

export interface WaveProductItem {
  id: string;
  wave_id: string;
  product_id: string;
  locked_price: number;
  quota: number | null;
  ordered_quantity: number;
  remaining_quota: number | null;
  product: Product;
}

export interface PreOrderWave {
  id: string;
  store_id: string;
  name: string;
  start_date: number;
  end_date: number;
  status: WaveStatus;
  products: WaveProductItem[];
  store?: Store | null;
}

export interface OrderItemRecord {
  id: string;
  order_id?: string;
  wave_product_id: string;
  product_id: string;
  product_name: string;
  product_image_url?: string | null;
  locked_price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderRecord {
  id: string;
  slug: string;
  wave_id: string;
  customer_id: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_whatsapp?: string | null;
  customer_display_name?: string | null;
  whatsapp_number?: string | null;
  guest_name: string | null;
  guest_whatsapp: string | null;
  shipping_address?: string;
  is_pii_masked?: boolean;
  total_amount: number;
  payment_receipt_url: string | null;
  has_payment_receipt?: boolean;
  tracking_url?: string;
  status: OrderStatus;
  tracking_number: string | null;
  created_at: number;
  wave?: {
    id: string;
    name: string;
    status?: WaveStatus;
    store_id: string;
  } | null;
  store?: {
    id: string;
    slug: string;
    name: string;
    logo_url?: string | null;
    payment_instructions?: string;
    whatsapp_contact: string;
  } | null;
  items: OrderItemRecord[];
}

export type KanbanBoard = Record<OrderStatus, OrderRecord[]>;

export interface TrackingStep {
  status: OrderStatus;
  step_index: number;
  is_completed: boolean;
  is_current: boolean;
}

export interface OrderTrackingDetail {
  order_id: string;
  order_slug: string;
  status: OrderStatus;
  current_step_index: number;
  timeline: TrackingStep[];
  tracking_number: string | null;
  total_amount: number;
  has_payment_receipt: boolean;
  payment_receipt_url: string | null;
  is_pii_masked?: boolean;
  customer_display_name: string;
  whatsapp_number?: string | null;
  shipping_address?: string;
  can_review: boolean;
  created_at: number;
  wave: {
    id: string;
    name: string;
    status: WaveStatus;
    store_id: string;
  } | null;
  store: {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    payment_instructions: string;
    whatsapp_contact: string;
  } | null;
  items: OrderItemRecord[];
}

export interface GuestPhoneLookupResponse {
  phone: string;
  is_pii_masked?: boolean;
  total: number;
  orders: OrderRecord[];
}

export interface ProductReview {
  id: string;
  product_id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ProfileResponse {
  user: User;
  stores: Store[];
}

export interface CheckoutResponse {
  order: OrderRecord;
  payment_instructions: string;
  whatsapp_redirect_url: string;
  tracking_url: string;
}
