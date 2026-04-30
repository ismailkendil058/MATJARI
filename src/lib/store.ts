// Matjari متجري - Shared Utilities and Constants
import { Product, CategoryType } from "./types";

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatDZD(amount: number): string {
  return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " DZD";
}

export const CATEGORIES: { key: CategoryType; label: string; labelAr: string }[] = [
  { key: "hauts", label: "Hauts", labelAr: "قمصان" },
  { key: "pantalons", label: "Pantalons", labelAr: "بناطيل" },
  { key: "chaussures", label: "Chaussures", labelAr: "أحذية" },
  { key: "accessoires", label: "Accessoires", labelAr: "إكسسوارات" },
  { key: "parfums", label: "Parfums", labelAr: "عطور" },
  { key: "sport", label: "Sport", labelAr: "ملابس رياضية" },
  { key: "sousvetements", label: "Sous-vêtements", labelAr: "ملابس داخلية" },
  { key: "vestes", label: "Vestes", labelAr: "جاكيتات" },
];
