// Cosmetique Logistics - Shared Utilities and Constants
import { Product, CategoryType } from "./types";

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatDZD(amount: number): string {
  return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " DZD";
}

export const CATEGORIES: { key: CategoryType; label: string; labelAr: string }[] = [
  { key: "cigarettes", label: "Cigarettes", labelAr: "سجائر" },
  { key: "chemma", label: "Chemma", labelAr: "شمة" },
  { key: "chocolates", label: "Chocolats", labelAr: "شوكولاتة" },
  { key: "drinks", label: "Boissons", labelAr: "مشروبات" },
  { key: "snacks", label: "Candies", labelAr: "حلويات" },
  { key: "cosmetics", label: "Cosmétique", labelAr: "تجميل" },
  { key: "divers", label: "Divers", labelAr: "متنوع" },
];
