// Matjari متجري - Shared Utilities and Constants
import { CategoryType, Category } from "./types";

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function formatDZD(amount: number): string {
  return new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " DZD";
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-hauts", key: "hauts", label: "Hauts", labelAr: "قمصان", color: "#9DC6D8", hoverColor: "#8AB6C8", icon: "Shirt", hasVentePersonnalisee: false, hasTailles: true, hasPointure: false, sortOrder: 0 },
  { id: "cat-pantalons", key: "pantalons", label: "Pantalons", labelAr: "بناطيل", color: "#6B909B", hoverColor: "#5A7F8A", icon: "Layers", hasVentePersonnalisee: false, hasTailles: true, hasPointure: false, sortOrder: 1 },
  { id: "cat-chaussures", key: "chaussures", label: "Chaussures", labelAr: "أحذية", color: "#5F676D", hoverColor: "#4E565C", icon: "Footprints", hasVentePersonnalisee: false, hasTailles: false, hasPointure: true, sortOrder: 2 },
  { id: "cat-accessoires", key: "accessoires", label: "Accessoires", labelAr: "إكسسوارات", color: "#34675C", hoverColor: "#23564B", icon: "Watch", hasVentePersonnalisee: false, hasTailles: false, hasPointure: false, sortOrder: 3 },
  { id: "cat-parfums", key: "parfums", label: "Parfums", labelAr: "عطور", color: "#A58AB7", hoverColor: "#9479A6", icon: "Sparkles", hasVentePersonnalisee: true, hasTailles: false, hasPointure: false, sortOrder: 4 },
  { id: "cat-sport", key: "sport", label: "Sport", labelAr: "ملابس رياضية", color: "#E16969", hoverColor: "#D05858", icon: "Dumbbell", hasVentePersonnalisee: false, hasTailles: true, hasPointure: false, sortOrder: 5 },
  { id: "cat-sousvetements", key: "sousvetements", label: "Sous-vêtements", labelAr: "ملابس داخلية", color: "#E5A862", hoverColor: "#D49751", icon: "Layers", hasVentePersonnalisee: false, hasTailles: true, hasPointure: false, sortOrder: 6 },
  { id: "cat-vestes", key: "vestes", label: "Vestes", labelAr: "جاكيتات", color: "#7A9CA5", hoverColor: "#698B94", icon: "Shirt", hasVentePersonnalisee: false, hasTailles: true, hasPointure: false, sortOrder: 7 },
];

// Backward-compatible simple list for components that just need key/label/labelAr
export const CATEGORIES: { key: CategoryType; label: string; labelAr: string }[] = DEFAULT_CATEGORIES.map(c => ({
  key: c.key,
  label: c.label,
  labelAr: c.labelAr,
}));

