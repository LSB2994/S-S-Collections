// Product & inventory
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Stock movement types
export type StockMovementType = "in" | "out" | "adjust";

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number; // positive for in, negative for out/adjust
  previousStock: number;
  newStock: number;
  reason?: string;
  createdAt: string;
  createdBy: string;
}

// Order (guest checkout - no user account)
export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  contactPhone: string;
  contactTelegram?: string;
  bankId: string;
  bankName: string;
  status: "pending" | "paid" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

// Bank (static QR for payment)
export interface Bank {
  id: string;
  name: string;
  qrImageUrl: string; // static QR image URL
  accountName?: string;
  accountNumber?: string;
  active: boolean;
  sortOrder: number;
}

// Admin user (Firebase Auth - stored in Firestore for role)
export interface AdminProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
}
