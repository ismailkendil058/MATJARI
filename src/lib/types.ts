export type CategoryType = "hauts" | "pantalons" | "chaussures" | "accessoires" | "parfums" | "sport" | "sousvetements" | "vestes";

export interface Product {
    id: string;
    name: string;
    nameAr: string;
    category: CategoryType;
    barcode?: string;
    priceSale: number;
    priceBuy: number;
    stock: number;
    sizeStock?: Record<string, number>;
    unit: "unité" | "kg";
    expiryDate?: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
    size?: string;
    sizeQtys?: Record<string, number>;
    weightKg?: number;

    subtotal: number;
    customUnitPrice?: number;
    customUnitCost?: number;
    customBaseProductId?: string;
    customCardId?: string;
}

export interface CustomSaleCard {
    id: string;
    baseProductId: string;
    baseProductName: string;
    category: CategoryType;
    kg: number;
    unitPrice: number;
    priceBuyPerKg?: number;
}

export interface Sale {
    id: string;
    type: "direct" | "credit";
    items: CartItem[];
    reduction: number;
    total: number;
    paidAmount: number;
    creditAmount: number;
    clientId?: string;
    date: string;
    username?: string;
}

export interface Client {
    id: string;
    name: string;
    phone: string;
    balance: number;
}

export interface Payment {
    id: string;
    clientId: string;
    amount: number;
    date: string;
    note?: string;
}

export interface Expense {
    id: string;
    amount: number;
    date: string;
    note: string;
}

export interface Supplier {
    id: string;
    name: string;
    phone: string;
    address: string;
}

export interface InvoiceItem {
    product: Product;
    quantity: number;
    size?: string;
    sizeQtys?: Record<string, number>;
    priceBuy: number;

    priceSale: number;
    expiryDate?: string;
}

export interface Invoice {
    id: string;
    number: string;
    supplier: Supplier;
    items: InvoiceItem[];
    total: number;
    date: string;
    type: "achat" | "retour";
    lastModified?: string;
    modifications?: string;
    addedBy?: string;
    editedBy?: string;
}
export interface User {
    id: string;
    username: string;
    password?: string;
    role: "admin" | "worker";
    status: "active" | "inactive";
}
