export type AppRole = "customer" | "owner" | "manager" | "staff" | "viewer";
export type OrderStatus = "placed" | "confirmed" | "ready" | "picked_up" | "cancelled";
export type PaymentMethod = "razorpay" | "counter" | "cod";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type ProductUnit = "kg" | "piece";
export type InventoryReason =
  | "sale"
  | "restock"
  | "adjustment"
  | "image_scan"
  | "waste"
  | "reserve"
  | "release";
export type ScanStatus = "pending_review" | "applied" | "rejected";
export type CouponType = "percent" | "fixed";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_primary: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  cut_notes: string | null;
  unit: ProductUnit;
  price_paise: number;
  gst_rate: number;
  image_url: string | null;
  is_active: boolean;
  min_order_qty: number;
  categories?: Category | null;
  inventory?: Inventory | null;
}

export interface Inventory {
  product_id: string;
  qty_on_hand: number;
  reserved_qty: number;
  low_stock_threshold: number;
  updated_at: string;
}

export interface Order {
  id: string;
  pickup_code: string;
  customer_id: string;
  status: OrderStatus;
  fulfillment: string;
  pickup_slot: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  subtotal_paise: number;
  discount_paise: number;
  gst_paise: number;
  total_paise: number;
  coupon_id: string | null;
  coupon_code: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit: ProductUnit;
  qty: number;
  unit_price_paise: number;
  gst_rate: number;
  line_total_paise: number;
}

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  unit: ProductUnit;
  pricePaise: number;
  gstRate: number;
  imageUrl: string | null;
  qty: number;
  minOrderQty: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_subtotal_paise: number;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  redemption_count?: number;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  order_id: string;
  customer_id: string;
  discount_paise: number;
  created_at: string;
}

export interface PriceSummary {
  subtotalPaise: number;
  discountPaise: number;
  taxablePaise: number;
  gstPaise: number;
  totalPaise: number;
  coupon: Coupon | null;
}

export interface AiInsight {
  id: string;
  type: "sales" | "stock";
  period_start: string;
  period_end: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface StockScan {
  id: string;
  image_path: string;
  storage_path?: string | null;
  image_expires_at?: string | null;
  image_purged_at?: string | null;
  raw_ai_json: Record<string, unknown> | null;
  proposed_updates: Array<{
    product_id?: string;
    product_name: string;
    suggested_qty: number;
    suggested_price_rupees?: number | null;
    confidence: number;
    notes?: string;
  }>;
  status: ScanStatus;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export const STAFF_ROLES: AppRole[] = ["owner", "manager", "staff", "viewer"];
export const WRITE_STAFF_ROLES: AppRole[] = ["owner", "manager", "staff"];
export const MANAGER_ROLES: AppRole[] = ["owner", "manager"];
