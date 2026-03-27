import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";

function getDb() {
  if (!db) throw new Error("Firebase not configured. Add env vars and restart.");
  return db;
}
import type { Product, StockMovement, Order, Bank } from "@/types";

const PRODUCTS = "products";
const STOCK_MOVEMENTS = "stockMovements";
const ORDERS = "orders";
const BANKS = "banks";

// ——— Products ———
export async function getProducts(activeOnly = true): Promise<Product[]> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
  if (activeOnly) constraints.push(where("active", "==", true));
  const q = query(collection(getDb(), PRODUCTS), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function getProduct(id: string): Promise<Product | null> {
  const ref = doc(getDb(), PRODUCTS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Product;
}

export async function createProduct(data: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(getDb(), PRODUCTS), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  const ref = doc(getDb(), PRODUCTS, id);
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), PRODUCTS, id));
}

// ——— Stock movements ———
export async function getStockMovements(productId?: string, max = 100): Promise<StockMovement[]> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), limit(max)];
  if (productId) constraints.unshift(where("productId", "==", productId));
  const q = query(collection(getDb(), STOCK_MOVEMENTS), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockMovement));
}

export async function addStockMovement(movement: Omit<StockMovement, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(getDb(), STOCK_MOVEMENTS), {
    ...movement,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function stockIn(productId: string, quantity: number, productName: string, adminUid: string): Promise<void> {
  const product = await getProduct(productId);
  if (!product) throw new Error("Product not found");
  const previousStock = product.stock;
  const newStock = previousStock + quantity;
  await addStockMovement({
    productId,
    productName,
    type: "in",
    quantity,
    previousStock,
    newStock,
    reason: "Stock in",
    createdBy: adminUid,
  });
  await updateProduct(productId, { stock: newStock });
}

export async function stockOut(productId: string, quantity: number, productName: string, adminUid: string, reason?: string): Promise<void> {
  const product = await getProduct(productId);
  if (!product) throw new Error("Product not found");
  const previousStock = product.stock;
  if (previousStock < quantity) throw new Error("Insufficient stock");
  const newStock = previousStock - quantity;
  await addStockMovement({
    productId,
    productName,
    type: "out",
    quantity: -quantity,
    previousStock,
    newStock,
    reason: reason || "Stock out",
    createdBy: adminUid,
  });
  await updateProduct(productId, { stock: newStock });
}

export async function adjustStock(productId: string, newStock: number, productName: string, adminUid: string, reason?: string): Promise<void> {
  const product = await getProduct(productId);
  if (!product) throw new Error("Product not found");
  const previousStock = product.stock;
  const quantity = newStock - previousStock;
  await addStockMovement({
    productId,
    productName,
    type: "adjust",
    quantity,
    previousStock,
    newStock,
    reason: reason || "Stock adjustment",
    createdBy: adminUid,
  });
  await updateProduct(productId, { stock: newStock });
}

// ——— Orders ———
export async function createOrder(
  order: Omit<Order, "id" | "createdAt" | "updatedAt" | "status">
): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(getDb(), ORDERS), {
    ...order,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function getOrders(limitCount = 50): Promise<Order[]> {
  const q = query(collection(getDb(), ORDERS), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

export async function getOrder(id: string): Promise<Order | null> {
  const ref = doc(getDb(), ORDERS, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Order;
}

export async function updateOrderStatus(id: string, status: Order["status"]): Promise<void> {
  const ref = doc(getDb(), ORDERS, id);
  await updateDoc(ref, { status, updatedAt: new Date().toISOString() });
}

// ——— Banks ———
export async function getBanks(): Promise<Bank[]> {
  const q = query(
    collection(getDb(), BANKS),
    where("active", "==", true),
    orderBy("sortOrder", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bank));
}

export async function getBanksAdmin(): Promise<Bank[]> {
  const q = query(collection(getDb(), BANKS), orderBy("sortOrder", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bank));
}

export async function createBank(data: Omit<Bank, "id">): Promise<string> {
  const ref = await addDoc(collection(getDb(), BANKS), data);
  return ref.id;
}

export async function updateBank(id: string, data: Partial<Bank>): Promise<void> {
  const ref = doc(getDb(), BANKS, id);
  await updateDoc(ref, data);
}

export async function deleteBank(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), BANKS, id));
}
