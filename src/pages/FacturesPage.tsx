import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus, RotateCcw, Search, Eye, ArrowLeft, Package, PackagePlus, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getInvoices, addInvoice, getSuppliers, addSupplier, getProducts, saveProducts, updateProductStock, deleteInvoice, updateProduct, getCategories
} from "@/lib/db";

import { Invoice, InvoiceItem, Supplier, Product, CategoryType, Category } from "@/lib/types";
import { formatDZD, generateId } from "@/lib/store";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthContext";

const categoryColorsFallback: Record<string, string> = {
  hauts: "bg-blue-50 text-blue-600 border-blue-100",
  pantalons: "bg-emerald-50 text-emerald-600 border-emerald-100",
  chaussures: "bg-indigo-50 text-indigo-600 border-indigo-100",
  accessoires: "bg-amber-50 text-amber-600 border-amber-100",
  parfums: "bg-rose-50 text-rose-600 border-rose-100",
  sport: "bg-orange-50 text-orange-600 border-orange-100",
  sousvetements: "bg-slate-50 text-slate-600 border-slate-100",
  vestes: "bg-cyan-50 text-cyan-600 border-cyan-100",
};


type View = "list" | "add" | "return";
type InvoiceFormItem = {
  productId: string;
  size?: string;
  sizeQtys?: Record<string, number>;
  isNew: boolean;
  newName: string;
  newCategory: string;
  barcode?: string;
  quantity: number;
  priceBuy: number;
  priceSale: number;
  expiryDate: string;
};



const createInvoiceFormItem = (): InvoiceFormItem => ({
  productId: "",
  isNew: false,
  newName: "",
  newCategory: "hauts",
  barcode: "",
  quantity: 1,
  priceBuy: 0,
  priceSale: 0,
  expiryDate: "",
});

export default function FacturesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const { user } = useAuth();
  const [dbCategories, setDbCategories] = useState<Category[]>([]);

  // Dynamic derivations from categories
  const SIZE_CATEGORIES = useMemo(() => {
    return dbCategories.filter(c => c.hasTailles || c.hasPointure).map(c => c.key);
  }, [dbCategories]);

  const dynamicCATEGORIES = useMemo(() => {
    return dbCategories.map(c => ({ key: c.key, label: c.label, labelAr: c.labelAr }));
  }, [dbCategories]);

  const isPointureCategory = useCallback((catKey: string) => {
    return dbCategories.some(c => c.key === catKey && c.hasPointure);
  }, [dbCategories]);

  const categoryColors = useMemo(() => {
    const map: Record<string, string> = { ...categoryColorsFallback };
    return map;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [invs, sups, prods, cats] = await Promise.all([
          getInvoices(),
          getSuppliers(),
          getProducts(),
          getCategories(),
        ]);
        setInvoices(invs);
        setSuppliers(sups);
        setProducts(prods);
        setDbCategories(cats);
      } catch (error) {
        console.error("Error loading invoices data:", error);
      }
    };
    loadData();
  }, []);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [view, setView] = useState<View>("list");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryType | null>("hauts");
  const [mobileSection, setMobileSection] = useState<"products" | "cart">("products");

  // Add form state
  const [supplierId, setSupplierId] = useState("");
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", address: "" });
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceFormItem[]>([]);
  const [draftInvoiceItem, setDraftInvoiceItem] = useState<InvoiceFormItem>(createInvoiceFormItem());

  // Return form state
  const [returnInvoiceId, setReturnInvoiceId] = useState("");
  const [returnItems, setReturnItems] = useState<{ idx: number; quantity: number }[]>([]);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // New Saisie Facture states
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState<number | "">("");
  const [itemBuy, setItemBuy] = useState<number | "">("");
  const [itemSale, setItemSale] = useState<number | "">("");
  const [itemCategory, setItemCategory] = useState<CategoryType>("hauts");
  const [itemBarcode, setItemBarcode] = useState("");
  const SHIRT_SIZES = ["S", "M", "L", "XL", "XXL"];
  const SHOE_SIZES = ["39", "40", "41", "42", "43", "44", "45", "46", "47"];
  const [sizeQtys, setSizeQtys] = useState<Record<string, number>>({});



  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [supplierName, setSupplierName] = useState("");
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const supplierSuggestions = useMemo(() => {
    if (!supplierName || selectedSupplier) return [];
    return suppliers.filter(s => s.name.toLowerCase().includes(supplierName.toLowerCase())).slice(0, 5);
  }, [suppliers, supplierName, selectedSupplier]);

  const nameSuggestions = useMemo(() => {
    if (!itemName || selectedProduct) return [];
    return products.filter(p => p.name.toLowerCase().includes(itemName.toLowerCase())).slice(0, 5);
  }, [products, itemName, selectedProduct]);

  const handleValidateItem = async () => {
    if (!itemName) return;
    const isNew = !selectedProduct;

    let productId = selectedProduct ? selectedProduct.id : `new-${Date.now()}`;

    if (isNew && itemBarcode) {
      // create a new product record including barcode
      const newProd: Product = {
        id: generateId(),
        name: itemName.trim(),
        nameAr: "",
        category: itemCategory,
        priceSale: Number(itemSale) || 0,
        priceBuy: Number(itemBuy) || 0,
        stock: 0,
        unit: "unité",
        barcode: itemBarcode || undefined,
      };

      try {
        await saveProducts([...(products || []), newProd]);
        setProducts(prev => [...prev, newProd]);
        productId = newProd.id;
      } catch (e) {
        console.error("Failed saving new product with barcode:", e);
      }
    }

    if (SIZE_CATEGORIES.includes(itemCategory)) {

      const activeSizes = Object.entries(sizeQtys).filter(([_, qty]) => qty > 0);
      if (activeSizes.length > 0) {
        const totalQty = activeSizes.reduce((sum, [_, qty]) => sum + qty, 0);
        const combinedSize = activeSizes.map(([size, qty]) => `${size}: ${qty}`).join(" | ");
        const newItem: InvoiceFormItem = {
          productId,
          size: combinedSize,
          sizeQtys: { ...sizeQtys },
          isNew,
          newName: isNew ? itemName : "",
          barcode: isNew ? (itemBarcode || undefined) : selectedProduct?.barcode,
          newCategory: selectedProduct ? selectedProduct.category : itemCategory,
          quantity: totalQty,
          priceBuy: Number(itemBuy),
          priceSale: Number(itemSale),
          expiryDate: ""
        };

        setInvoiceItems(prev => [...prev, newItem]);
      } else if (itemQty && Number(itemQty) > 0) {
        // Fallback to itemQty if no size quantities but itemQty is set
        const newItem: InvoiceFormItem = {
          productId,
          isNew,
          newName: isNew ? itemName : "",
          barcode: isNew ? (itemBarcode || undefined) : selectedProduct?.barcode,
          newCategory: selectedProduct ? selectedProduct.category : itemCategory,
          quantity: Number(itemQty),
          priceBuy: Number(itemBuy),
          priceSale: Number(itemSale),
          expiryDate: ""
        };
        setInvoiceItems(prev => [...prev, newItem]);
      }
    } else {
      const newItem: InvoiceFormItem = {
        productId,
        isNew,
        newName: isNew ? itemName : "",
        barcode: isNew ? (itemBarcode || undefined) : selectedProduct?.barcode,
        newCategory: selectedProduct ? selectedProduct.category : itemCategory,
        quantity: Number(itemQty),
        priceBuy: Number(itemBuy),
        priceSale: Number(itemSale),
        expiryDate: ""
      };
      setInvoiceItems(prev => [...prev, newItem]);
    }

    // Reset bar
    setItemName("");
    setItemQty("");
    setItemBuy("");
    setItemSale("");
    setItemCategory("hauts");
    setSelectedProduct(null);
    setItemBarcode("");
    setSizeQtys({});

    setShowSuggestions(false);
  };



  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = !search || inv.supplier.name.toLowerCase().includes(search.toLowerCase()) || inv.number.includes(search);
      const matchDate = !dateFilter || inv.date.startsWith(dateFilter);
      return matchSearch && matchDate;
    });
  }, [invoices, search, dateFilter]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = !search && activeCategory ? p.category === activeCategory : true;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  const updateDraftInvoiceItem = <K extends keyof InvoiceFormItem>(key: K, value: InvoiceFormItem[K]) => {
    setDraftInvoiceItem(prev => ({ ...prev, [key]: value }));
  };

  const handleDraftInvoiceMode = (isNew: boolean) => {
    setDraftInvoiceItem(prev => ({
      ...prev,
      isNew,
      productId: isNew ? "" : prev.productId,
      newName: isNew ? prev.newName : "",
    }));
  };

  const canAddDraftInvoiceItem = draftInvoiceItem.quantity > 0
    && draftInvoiceItem.priceBuy > 0
    && draftInvoiceItem.priceSale > 0
    && (draftInvoiceItem.isNew ? draftInvoiceItem.newName.trim().length > 0 : draftInvoiceItem.productId.length > 0);
  const addInvoiceItem = () => {
    if (!canAddDraftInvoiceItem) return;
    setInvoiceItems(prev => [...prev, { ...draftInvoiceItem, newName: draftInvoiceItem.newName.trim() }]);
    setDraftInvoiceItem(createInvoiceFormItem());
  };

  const removeInvoiceItem = (idx: number) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== idx));
  };

  const getInvoiceItemLabel = (item: InvoiceFormItem) => {
    if (item.isNew) return item.newName;
    return products.find(product => product.id === item.productId)?.name || "Produit";
  };

  const invoiceTotal = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + item.quantity * item.priceBuy, 0);
  }, [invoiceItems]);

  const resetAddForm = useCallback(() => {
    setSupplierId("");
    setSupplierName("");
    setSelectedSupplier(null);
    setNewSupplier({ name: "", phone: "", address: "" });
    setIsNewSupplier(false);
    setInvoiceItems([]);
    setDraftInvoiceItem(createInvoiceFormItem());
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setEditingInvoiceId(null);
  }, []);

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoiceId(invoice.id);
    setSupplierId(invoice.supplier.id);
    setIsNewSupplier(false);
    setInvoiceDate(invoice.date);
    setInvoiceItems(invoice.items.map(item => ({
      productId: item.product.id,
      isNew: false,
      newName: "",
      newCategory: item.product.category,
      quantity: item.quantity,
      priceBuy: item.priceBuy,
      priceSale: item.priceSale,
      size: item.size,
      expiryDate: item.expiryDate || "",
    })));

    setSelectedInvoice(null);
    setView("add");
  };

  const revertStockForInvoice = async (invoice: Invoice) => {
    const factor = invoice.type === "achat" ? -1 : 1;
    const currentProds = await getProducts();
    for (const item of invoice.items) {
      const prod = currentProds.find(p => p.id === item.product.id);
      if (prod) {
        const nextSizeStock = { ...(prod.sizeStock || {}) };
        if (item.sizeQtys) {
          Object.entries(item.sizeQtys).forEach(([sz, q]) => {
            nextSizeStock[sz] = (nextSizeStock[sz] || 0) + (q * factor);
          });
        }
        await updateProduct({ ...prod, stock: prod.stock + (item.quantity * factor), sizeStock: nextSizeStock });
      }
    }
  };


  const handleSubmitInvoice = async () => {
    try {
      if (editingInvoiceId) {
        const oldInv = invoices.find(i => i.id === editingInvoiceId);
        if (oldInv) await revertStockForInvoice(oldInv);
      }

      let supplier: Supplier;
      if (supplierId) {
        supplier = suppliers.find(s => s.id === supplierId)!;
      } else if (supplierName.trim()) {
        const existing = suppliers.find(s => s.name.toLowerCase() === supplierName.trim().toLowerCase());
        if (existing) {
          supplier = existing;
        } else {
          supplier = { id: generateId(), name: supplierName.trim(), phone: "", address: "" };
          await addSupplier(supplier);
          setSuppliers(prev => [...prev, supplier]);
        }
      } else {
        const passage = suppliers.find(s => s.name.toUpperCase() === "DIVERS");
        if (passage) {
          supplier = passage;
        } else {
          supplier = { id: generateId(), name: "DIVERS", phone: "", address: "" };
          await addSupplier(supplier);
          setSuppliers(prev => [...prev, supplier]);
        }
      }

      const items: InvoiceItem[] = [];
      const changedProducts: Product[] = [];

      // Refresh current products to get accurate stock after reversal
      const currentProducts = await getProducts();

      for (const item of invoiceItems) {
        let product: Product;
        if (item.isNew) {
          // Try to find an existing product (maybe created earlier when adding the item)
          let existing = currentProducts.find(p => p.id === item.productId);
          if (!existing && item.barcode) {
            existing = currentProducts.find(p => p.barcode && p.barcode === item.barcode);
          }

          if (existing) {
            const nextSizeStock = { ...(existing.sizeStock || {}) };
            if (item.sizeQtys) {
              Object.entries(item.sizeQtys).forEach(([sz, q]) => {
                nextSizeStock[sz] = (nextSizeStock[sz] || 0) + q;
              });
            }
            product = {
              ...existing,
              stock: existing.stock + item.quantity,
              sizeStock: nextSizeStock,
              priceBuy: item.priceBuy,
              priceSale: item.priceSale,
              expiryDate: item.expiryDate || existing.expiryDate,
            };
            changedProducts.push(product);
          } else {
            product = {
              id: generateId(), name: item.newName, nameAr: "", category: item.newCategory as any,
              priceSale: item.priceSale, priceBuy: item.priceBuy, stock: item.quantity,
              sizeStock: item.sizeQtys ? { ...item.sizeQtys } : undefined,
              unit: "unité", expiryDate: item.expiryDate || undefined,
              // include barcode if provided
              ...(item.barcode ? { barcode: item.barcode } : {})
            };
            changedProducts.push(product);
          }
        } else {
          const existing = currentProducts.find(p => p.id === item.productId);
          if (!existing) continue;
          const nextSizeStock = { ...(existing.sizeStock || {}) };
          if (item.sizeQtys) {
            Object.entries(item.sizeQtys).forEach(([sz, q]) => {
              nextSizeStock[sz] = (nextSizeStock[sz] || 0) + q;
            });
          }
          product = {
            ...existing,
            stock: existing.stock + item.quantity,
            sizeStock: nextSizeStock,
            priceBuy: item.priceBuy,
            priceSale: item.priceSale,
            expiryDate: item.expiryDate || existing.expiryDate,
          };
          changedProducts.push(product);
        }
        items.push({ product, quantity: item.quantity, size: item.size, sizeQtys: item.sizeQtys, priceBuy: item.priceBuy, priceSale: item.priceSale, expiryDate: item.expiryDate });
      }




      if (changedProducts.length > 0) {
        await saveProducts(changedProducts);
      }

      const finalTotal = items.reduce((s, i) => s + i.priceBuy * i.quantity, 0);
      let modificationLog = "";
      if (editingInvoiceId) {
        const oldInv = invoices.find(i => i.id === editingInvoiceId);
        if (oldInv) {
          modificationLog = `Total: ${formatDZD(oldInv.total)} → ${formatDZD(finalTotal)}`;
          if (oldInv.items.length !== items.length) {
            modificationLog += ` (${items.length} articles)`;
          }
        }
      }

      let editedBy = editingInvoiceId ? invoices.find(i => i.id === editingInvoiceId)?.editedBy : undefined;
      if (editingInvoiceId && user?.username) {
        if (!editedBy) editedBy = user.username;
        else if (!editedBy.split(', ').includes(user.username)) editedBy += `, ${user.username}`;
      }

      const invoice: Invoice = {
        id: editingInvoiceId || generateId(),
        number: editingInvoiceId ? invoices.find(i => i.id === editingInvoiceId)!.number : `FAC-${Date.now().toString().slice(-6)}`,
        supplier,
        items,
        total: finalTotal,
        date: invoiceDate,
        type: "achat",
        lastModified: editingInvoiceId ? new Date().toISOString() : undefined,
        modifications: editingInvoiceId ? modificationLog : undefined,
        addedBy: editingInvoiceId ? invoices.find(i => i.id === editingInvoiceId)?.addedBy : user?.username,
        editedBy: editedBy,
      };

      await addInvoice(invoice);
      if (editingInvoiceId) {
        setInvoices(prev => prev.map(i => i.id === editingInvoiceId ? invoice : i));
      } else {
        setInvoices(prev => [invoice, ...prev]);
      }

      const allProducts = await getProducts();
      setProducts(allProducts);

      resetAddForm();
      setView("list");
      toast.success(editingInvoiceId ? "Facture modifiée et stock mis à jour" : "Facture enregistrée avec succès");
    } catch (error: any) {
      console.error("Error submitting invoice:", error);
      toast.error(`Une erreur est survenue: ${error?.message || "Erreur inconnue"}`);
    }
  };

  const handleReturn = async () => {
    try {
      const original = invoices.find(i => i.id === returnInvoiceId);
      if (!original) return;

      const returnedItems: InvoiceItem[] = [];
      for (const ri of returnItems) {
        const origItem = original.items[ri.idx];
        if (!origItem) continue;
        await updateProductStock(origItem.product.id, -ri.quantity);
        returnedItems.push({ ...origItem, quantity: ri.quantity });
      }

      const returnInvoice: Invoice = {
        id: generateId(),
        number: `RET-${Date.now().toString().slice(-6)}`,
        supplier: original.supplier,
        items: returnedItems,
        total: returnedItems.reduce((s, i) => s + i.priceBuy * i.quantity, 0),
        date: new Date().toISOString().split("T")[0],
        type: "retour",
      };

      await addInvoice(returnInvoice);
      setInvoices(prev => [returnInvoice, ...prev]);

      const prods = await getProducts();
      setProducts(prods);

      setReturnInvoiceId("");
      setReturnItems([]);
      setView("list");
      toast.success("Retour enregistré avec succès");
    } catch (error) {
      console.error("Error handling return:", error);
      toast.error("Une erreur est survenue lors du retour");
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la facture ${invoice.number} ? Les stocks seront mis à jour en conséquence.`)) return;
    try {
      await revertStockForInvoice(invoice);
      await deleteInvoice(invoice.id);
      setInvoices(prev => prev.filter(i => i.id !== invoice.id));
      setSelectedInvoice(null);
      // Refresh products after stock update
      const prods = await getProducts();
      setProducts(prods);
      toast.success("Facture supprimée et stock mis à jour");
    } catch (error) {
      console.error("error deleting invoice", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const selectedReturnInvoice = useMemo(() => invoices.find(i => i.id === returnInvoiceId), [invoices, returnInvoiceId]);

  const returnTotal = useMemo(() => {
    return returnItems.reduce((s, ri) => {
      const item = selectedReturnInvoice?.items[ri.idx];
      return s + (item ? item.priceBuy * ri.quantity : 0);
    }, 0);
  }, [returnItems, selectedReturnInvoice]);

  // â”€â”€â”€ ADD FACTURE VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (view === "add") {
    return (
      <div className="flex h-screen flex-col bg-white text-slate-800 font-sans overflow-hidden animate-fade-in">
        <header className="h-20 border-b bg-slate-50 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => { resetAddForm(); setView("list"); }} className="h-12 w-12 p-0 rounded-xl hover:bg-slate-200 transition-all">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="font-black text-slate-800 uppercase tracking-tight text-3xl">Saisie Facture Achat</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-black uppercase text-slate-400 leading-none mb-1">Date de l'opération</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="bg-transparent border-0 outline-none text-xl font-black text-slate-900 border-b-2 border-transparent hover:border-slate-200 transition-all text-right"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50/20 p-10 flex flex-col gap-8">
          {/* SECTION 1: HEADER (Fournisseur) */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm max-w-[1750px] mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
            <div className="space-y-3 flex-1 relative">
              <label className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] pl-1">Fournisseur (Optionnel)</label>
              <Input
                placeholder="Nom du fournisseur..."
                value={supplierName}
                onChange={e => {
                  setSupplierName(e.target.value);
                  setShowSupplierSuggestions(true);
                  if (selectedSupplier) {
                    setSelectedSupplier(null);
                    setSupplierId("");
                  }
                }}
                onFocus={() => setShowSupplierSuggestions(true)}
                className="h-16 border-slate-200 rounded-2xl font-black text-xl px-6"
              />
              {showSupplierSuggestions && supplierSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 overflow-hidden border-2">
                  {supplierSuggestions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSupplier(s);
                        setSupplierName(s.name);
                        setSupplierId(s.id);
                        setShowSupplierSuggestions(false);
                      }}
                      className="w-full text-left px-6 py-4 hover:bg-primary/5 border-b last:border-0 border-slate-50 transition-colors flex items-center justify-between"
                    >
                      <p className="font-black text-lg text-slate-900">{s.name}</p>
                      <p className="text-xs uppercase font-black text-slate-400 tracking-widest">{s.phone || "No phone"}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 text-slate-400 italic text-sm font-bold pb-4">
              <Package className="h-5 w-5" />
              Stock Management actif pour cette facture
            </div>
          </div>

          {/* SECTION 2: ADD PRODUCT ENTRY BAR */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-10 shadow-sm max-w-[1750px] mx-auto w-full">
            <label className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] pl-1 block mb-6">Ajouter un produit à la facture</label>
            <div className="flex items-end gap-5 flex-wrap xl:flex-nowrap">
              {/* Product Name with Suggestions */}
              <div className="relative flex-1 min-w-[500px] space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">Désignation Produit</label>
                <div className="flex items-end gap-3">
                  <Input
                    placeholder="Nom du produit..."
                    value={itemName}
                    onChange={e => {
                      setItemName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="h-16 border-slate-200 rounded-2xl font-black text-xl focus-visible:ring-slate-100 flex-1 px-6 shadow-none"
                  />
                  <Input
                    placeholder="Code-barre (opt.)"
                    value={itemBarcode}
                    onChange={e => setItemBarcode(e.target.value)}
                    className="h-16 w-52 border-slate-200 rounded-2xl text-lg font-bold px-6 shadow-none"
                  />
                </div>
                {showSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 overflow-hidden border-2">
                    {nameSuggestions.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProduct(p);
                          setItemName(p.name);
                          setItemBuy(p.priceBuy);
                          setItemSale(p.priceSale);
                          setItemCategory(p.category);
                          setItemBarcode(p.barcode || "");
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-6 py-5 hover:bg-primary/5 border-b last:border-0 border-slate-50 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-black text-xl text-slate-900 group-hover:text-primary transition-colors">{p.name}</p>
                          {p.barcode && (
                            <p className="text-xs text-slate-500 mt-1 font-bold">Code-barre: {p.barcode}</p>
                          )}
                          <p className="text-[11px] uppercase font-black text-slate-400 tracking-widest mt-1">{p.category} • Stock: {p.stock}</p>
                        </div>
                        <p className="text-lg font-black text-slate-900">{formatDZD(p.priceBuy)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category selector */}
              <div className="w-56 space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">Catégorie</label>
                <Select value={itemCategory} onValueChange={(v: CategoryType) => setItemCategory(v)}>
                  <SelectTrigger className="h-16 border-slate-200 rounded-2xl font-black bg-white text-lg px-6 shadow-none">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-2">
                    {dynamicCATEGORIES.map(cat => (
                      <SelectItem key={cat.key} value={cat.key} className="text-lg py-3">
                        <span>{cat.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Multi-Size Quantities (Clothing or Shoes) */}
              {SIZE_CATEGORIES.includes(itemCategory) ? (
                <div className="flex gap-3">
                  {(isPointureCategory(itemCategory) ? SHOE_SIZES : SHIRT_SIZES).map(size => (
                    <div key={size} className={isPointureCategory(itemCategory) ? "w-14 space-y-3 text-center" : "w-16 space-y-3 text-center"}>
                      <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">{size}</label>
                      <Input
                        type="number"
                        value={sizeQtys[size] || ""}
                        onChange={e => setSizeQtys(prev => ({ ...prev, [size]: e.target.value === "" ? 0 : Number(e.target.value) }))}
                        placeholder={size}
                        className="h-16 text-center font-black text-xl border-slate-200 bg-white p-0 rounded-2xl shadow-none"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-32 space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1 text-center block">Qté</label>
                  <Input
                    type="number"
                    value={itemQty}
                    onChange={e => setItemQty(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Qté"
                    className="h-16 text-center font-black text-2xl border-slate-200 bg-slate-50 focus:bg-white rounded-2xl shadow-none"
                  />
                </div>
              )}

              {/* Prix Achat */}
              <div className="w-44 space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">Prix d'Achat</label>
                <Input
                  type="number"
                  value={itemBuy}
                  onChange={e => setItemBuy(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="P. Achat"
                  className="h-16 font-black text-2xl border-slate-200 rounded-2xl px-6 shadow-none"
                />
              </div>

              {/* Prix Vente */}
              <div className="w-44 space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest pl-1">Prix de Vente</label>
                <Input
                  type="number"
                  value={itemSale}
                  onChange={e => setItemSale(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="P. Vente"
                  className="h-16 font-black text-2xl border-slate-200 rounded-2xl px-6 shadow-none"
                />
              </div>

              {/* Action Button */}
              <Button
                onClick={handleValidateItem}
                className="h-16 bg-slate-900 border-4 border-slate-900 hover:bg-primary hover:border-primary text-white px-10 rounded-2xl font-black uppercase text-xs tracking-widest transition-all hover:-translate-y-1 active:scale-95 shadow-xl shadow-black/10"
              >
                Valider
              </Button>
            </div>
          </div>

          {/* SECTION 3: ITEMS TABLE */}
          <div className="bg-white border rounded-xl shadow-sm max-w-[1750px] mx-auto w-full overflow-hidden flex-1 flex flex-col min-h-[400px]">

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 border-b sticky top-0 z-10">
                  <tr className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">
                    <th className="px-8 py-6 w-16">N°</th>
                    <th className="px-8 py-6">Article</th>
                    <th className="px-8 py-6 w-36 text-center">Quantité</th>
                    <th className="px-8 py-6 w-44">Prix Achat</th>
                    <th className="px-8 py-6 w-44">Prix Vente</th>
                    <th className="px-8 py-6 w-48 text-right">Total HT</th>
                    <th className="px-8 py-6 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-24 text-center">
                        <div className="flex flex-col items-center opacity-20">
                          <PackagePlus className="h-16 w-16 mb-4" />
                          <p className="text-sm font-black uppercase tracking-[0.2em]">Facture en attente</p>
                          <p className="text-xs mt-1">Saisissez les produits ci-dessus pour commencer</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoiceItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-3 font-bold text-slate-300">{idx + 1}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-bold text-slate-900">{item.isNew ? item.newName : products.find(p => p.id === item.productId)?.name}</p>
                              {!item.isNew && products.find(p => p.id === item.productId)?.barcode && (
                                <p className="text-[10px] text-slate-500 mt-1">Code-barre: {products.find(p => p.id === item.productId)?.barcode}</p>
                              )}
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${categoryColors[item.newCategory as CategoryType] || "bg-slate-100 text-slate-600"}`}>
                              {item.newCategory}
                            </span>
                            {item.size && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {item.size}
                              </span>
                            )}
                          </div>

                          {item.isNew && <p className="text-[9px] font-black uppercase text-amber-600 mt-1">Nouveau Produit</p>}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e => {
                              const next = [...invoiceItems];
                              next[idx].quantity = Number(e.target.value);
                              setInvoiceItems(next);
                            }}
                            className="w-20 h-9 bg-slate-100 font-bold border-0 text-center outline-none rounded-lg focus:bg-white focus:ring-1 focus:ring-slate-200 transition-all"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="number"
                            value={item.priceBuy}
                            onChange={e => {
                              const next = [...invoiceItems];
                              next[idx].priceBuy = Number(e.target.value);
                              setInvoiceItems(next);
                            }}
                            className="w-28 h-9 bg-slate-50 font-bold border-0 outline-none rounded-lg px-3 focus:bg-white focus:ring-1 focus:ring-slate-200 transition-all"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input
                            type="number"
                            value={item.priceSale}
                            onChange={e => {
                              const next = [...invoiceItems];
                              next[idx].priceSale = Number(e.target.value);
                              setInvoiceItems(next);
                            }}
                            className="w-28 h-9 bg-slate-50 font-bold border-0 outline-none rounded-lg px-3 focus:bg-white focus:ring-1 focus:ring-slate-200 transition-all"
                          />
                        </td>
                        <td className="px-6 py-3 text-right font-black text-slate-900">{formatDZD(item.quantity * item.priceBuy)}</td>
                        <td className="px-6 py-3 text-center">
                          <button onClick={() => removeInvoiceItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 4: FOOTER (Total & Submit) */}
        <footer className="h-32 bg-white border-t-2 flex items-center justify-between px-12 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 leading-none mb-2">Total de la facture</span>
            <p className="text-6xl font-black text-primary tracking-tighter leading-none">{formatDZD(invoiceTotal)}</p>
          </div>

          <div className="flex items-center gap-8">
            {invoiceItems.length > 0 && (
              <button onClick={() => { if (confirm("Effacer toute la facture ?")) setInvoiceItems([]); }} className="text-xs font-black uppercase text-slate-400 hover:text-red-500 tracking-[0.2em] transition-colors">Réinitialiser</button>
            )}
            <Button
              onClick={handleSubmitInvoice}
              disabled={invoiceItems.length === 0}
              className="h-20 px-16 bg-slate-900 hover:bg-primary text-white text-2xl font-black rounded-[1.5rem] shadow-2xl shadow-black/10 transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-20 flex items-center gap-4"
            >
              Valider la facture
              <Plus className="h-7 w-7" />
            </Button>
          </div>
        </footer>
      </div>
    );
  }

  // â”€â”€â”€ RETOUR DE FACTURE VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (view === "return") {
    const desktopView = (
      <div className="flex min-h-screen animate-fade-in bg-white font-sans overflow-hidden">
        {/* Left: Invoice Selection & Products */}
        <div className="flex-1 flex flex-col border-r-2 border-border bg-white overflow-hidden">
          <div className="p-8 border-b-2 border-border flex items-center justify-between bg-white">
            <div className="flex items-center gap-5">
              <button
                onClick={() => { setReturnInvoiceId(""); setReturnItems([]); setView("list"); }}
                className="h-14 w-14 flex items-center justify-center rounded-2xl bg-secondary/50 hover:bg-secondary text-muted-foreground transition-all"
              >
                <ArrowLeft className="h-7 w-7" />
              </button>
              <div>
                <h2 className="text-4xl font-black text-[#243740] uppercase tracking-tight">Retour Fournisseur</h2>
              </div>
            </div>
          </div>

          <div className="p-10 space-y-10 flex-1 overflow-auto bg-slate-50/30">
            <div className="bg-white p-10 rounded-[2rem] shadow-xl border-2 border-border space-y-6">
              <div className="flex items-center gap-3">
                <RotateCcw className="h-6 w-6 text-primary" />
                <span className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Sélectionner la facture d'origine</span>
              </div>
              <Select value={returnInvoiceId} onValueChange={v => { setReturnInvoiceId(v); setReturnItems([]); }}>
                <SelectTrigger className="h-20 bg-secondary/10 border-2 border-border rounded-2xl text-2xl font-black px-8">
                  <SelectValue placeholder="Choisir une facture d'achat..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2">
                  {invoices.filter(i => i.type === "achat").map(i => (
                    <SelectItem key={i.id} value={i.id} className="text-xl py-4">
                      {i.number} — {i.supplier.name} ({i.date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedReturnInvoice && (
              <div className="space-y-6">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground pl-2 italic">Produits disponibles pour retour :</p>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {selectedReturnInvoice.items.map((item, idx) => {
                    const currentQty = returnItems.find(r => r.idx === idx)?.quantity || 0;
                    return (
                      <div key={idx} className="bg-white p-8 rounded-[2rem] border-2 border-border shadow-md flex flex-col gap-6 group hover:border-primary/50 transition-all hover:shadow-2xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-black text-2xl text-foreground mb-1">{item.product.name}</p>
                            <span className="px-3 py-1 bg-secondary rounded-lg text-xs font-black uppercase tracking-widest text-muted-foreground">Initial: {item.quantity} units</span>
                          </div>
                          <p className="text-xl font-black text-primary bg-primary/5 px-4 py-2 rounded-xl">{formatDZD(item.priceBuy)}/u</p>
                        </div>
                        <div className="flex items-center gap-6 bg-secondary/10 p-4 rounded-2xl border border-border/50">
                          <span className="text-xs font-black uppercase text-muted-foreground px-4 tracking-widest">Retour :</span>
                          <Input
                            type="number"
                            className="h-16 bg-white border-2 border-border text-center text-2xl font-black rounded-xl focus:border-primary px-6 shadow-none"
                            min={0}
                            max={item.quantity}
                            value={currentQty || ""}
                            onChange={e => {
                              const qty = Math.min(Number(e.target.value), item.quantity);
                              setReturnItems(prev => {
                                const existing = prev.find(r => r.idx === idx);
                                if (qty === 0) return prev.filter(r => r.idx !== idx);
                                if (existing) return prev.map(r => r.idx === idx ? { ...r, quantity: qty } : r);
                                return [...prev, { idx, quantity: qty }];
                              });
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!selectedReturnInvoice && (
              <div className="flex flex-col items-center justify-center py-40 text-muted-foreground/30 italic">
                <RotateCcw className="h-24 w-24 mb-6 opacity-5" />
                <p className="text-2xl font-black uppercase tracking-[0.25em]">Veuillez sélectionner une facture</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Return Summary */}
        <div className="w-[550px] flex flex-col bg-white border-l-2 border-border shadow-[-20px_0_60px_rgba(0,0,0,0.03)]">
          <div className="p-8 border-b-2 border-border bg-slate-50/50">
            <h3 className="text-3xl font-black text-foreground uppercase tracking-tight">Récapitulatif</h3>
          </div>

          <div className="flex-1 overflow-auto p-8 space-y-4 bg-slate-50/20">
            {returnItems.map(ri => {
              const item = selectedReturnInvoice?.items[ri.idx];
              if (!item) return null;
              return (
                <div key={ri.idx} className="bg-white p-6 rounded-2xl border-2 border-border shadow-sm flex items-center justify-between group hover:border-red-200 transition-all">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-xl font-black truncate text-foreground mb-1">{item.product.name}</p>
                    <p className="text-xs font-black text-red-500 uppercase tracking-widest bg-red-50 px-3 py-1 rounded inline-block">Retour: {ri.quantity} units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-foreground tracking-tighter">{formatDZD(item.priceBuy * ri.quantity)}</p>
                  </div>
                </div>
              );
            })}
            {returnItems.length === 0 && (
              <div className="py-40 text-center text-muted-foreground/30 italic flex flex-col items-center gap-4">
                <Package className="h-12 w-12 opacity-10" />
                <p className="text-lg font-black uppercase tracking-widest uppercase">Panier vide</p>
              </div>
            )}
          </div>

          <div className="p-10 border-t-2 border-border bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
            <div className="space-y-8">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground block mb-2">Montant total à déduire</span>
                <p className="text-7xl font-black text-red-500 tracking-tighter leading-none">{formatDZD(returnTotal)}</p>
              </div>
              <Button
                onClick={handleReturn}
                disabled={returnItems.length === 0}
                className="w-full h-24 bg-red-500 hover:bg-red-600 text-white font-black text-3xl rounded-[2rem] shadow-2xl shadow-red-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-20 flex items-center justify-center gap-4"
              >
                VALIDER LE RETOUR
                <RotateCcw className="h-8 w-8" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );

    if (isMobile) {
      return (
        <div className="min-h-screen bg-[#eef5f4] px-4 pb-6 pt-5 text-gray-800">
          <div className="mx-auto max-w-md space-y-5">
            <div className="rounded-[2rem] bg-[#243740] px-5 py-5 text-white shadow-[0_18px_40px_rgba(36,55,64,0.18)]">
              <button
                onClick={() => { setReturnInvoiceId(""); setReturnItems([]); setView("list"); }}
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Retours</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Retour facture</h2>
              <p className="mt-1 text-sm text-white/70">Sélectionnez une facture et les quantités à retirer.</p>
            </div>

            <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
              <p className="text-sm font-black text-[#243740]">Facture d'origine</p>
              <Select value={returnInvoiceId} onValueChange={v => { setReturnInvoiceId(v); setReturnItems([]); }}>
                <SelectTrigger className="mt-3 h-12 rounded-2xl border-gray-200 bg-[#f7fbfa] text-sm">
                  <SelectValue placeholder="Choisir une facture..." />
                </SelectTrigger>
                <SelectContent>
                  {invoices.filter(i => i.type === "achat").map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.number} - {i.supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedReturnInvoice && (
              <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
                <p className="text-sm font-black text-[#243740]">Produits à retourner</p>
                <div className="mt-4 space-y-3">
                  {selectedReturnInvoice.items.map((item, idx) => {
                    const currentQty = returnItems.find(r => r.idx === idx)?.quantity || 0;
                    return (
                      <div key={idx} className="rounded-[1.5rem] border border-gray-100 bg-[#f7fbfa] p-4">
                        <p className="text-sm font-bold text-[#243740]">{item.product.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Acheté: {item.quantity} • {formatDZD(item.priceBuy)} / unité
                        </p>
                        <Input
                          type="number"
                          className="mt-3 h-12 rounded-2xl border-gray-200 bg-white text-center font-bold"
                          min={0}
                          max={item.quantity}
                          value={currentQty || ""}
                          placeholder="Qté retour"
                          onChange={e => {
                            const qty = Math.min(Number(e.target.value), item.quantity);
                            setReturnItems(prev => {
                              const existing = prev.find(r => r.idx === idx);
                              if (qty === 0) return prev.filter(r => r.idx !== idx);
                              if (existing) return prev.map(r => r.idx === idx ? { ...r, quantity: qty } : r);
                              return [...prev, { idx, quantity: qty }];
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-[1.75rem] bg-[#5f1f2f] px-5 py-4 text-white shadow-[0_18px_40px_rgba(95,31,47,0.16)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/50">Montant retour</p>
                  <p className="mt-1 text-2xl font-black">{formatDZD(returnTotal)}</p>
                </div>
                <Button
                  onClick={handleReturn}
                  disabled={returnItems.length === 0}
                  className="h-12 rounded-2xl bg-red-500 px-5 font-bold text-white hover:bg-red-600"
                >
                  Valider
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return desktopView;
  }

  // --- List View (Default) ---
  const desktopList = (
    <div className="p-8 lg:p-12 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
        <div>
          <h2 className="text-5xl font-black tracking-tight text-[#3f5362]">Gestion des Factures</h2>
          <p className="text-xl text-gray-500 font-medium mt-2">Suivez vos achats et retours fournisseurs</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => setView("return")} variant="outline" className="h-16 rounded-2xl border border-gray-200 bg-white px-8 font-black text-xl text-[#3f5362] shadow-sm transition-all hover:border-primary">
            <RotateCcw className="mr-3 h-6 w-6 text-primary" />
            Effectuer un Retour
          </Button>
          <Button onClick={() => setView("add")} className="h-16 rounded-2xl bg-[#41b86d] px-10 font-black text-xl text-white hover:bg-[#39a05f] shadow-lg shadow-green-200 transition-all hover:-translate-y-1">
            <Plus className="mr-3 h-7 w-7" />
            Nouvel Achat
          </Button>
        </div>
      </div>

      <div className="flex gap-6 mb-10">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400" />
          <Input
            placeholder="Rechercher par numéro ou fournisseur..."
            className="pl-16 bg-white border border-gray-200 h-16 shadow-sm rounded-2xl focus-visible:ring-0 text-lg font-bold"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Input
          type="date"
          className="w-full md:w-auto px-6 h-16 bg-white rounded-2xl shadow-sm border border-gray-200 text-lg font-black text-gray-600 focus:outline-none"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-center">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
              <th className="px-8 py-6">Numéro</th>
              <th className="px-8 py-6 text-left">Fournisseur</th>
              <th className="px-8 py-6">Articles</th>
              <th className="px-8 py-6">Total</th>
              <th className="px-8 py-6">Date</th>
              <th className="px-8 py-6">Type</th>
              {user?.role === "admin" && (
                <th className="px-8 py-6 text-left">Utilisateurs</th>
              )}
              <th className="px-8 py-6 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} className="border-b last:border-0 border-gray-50 hover:bg-[#f0fbf4]/40 transition-colors group cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                <td className="px-8 py-6 font-black text-xl text-gray-700">{inv.number}</td>
                <td className="px-8 py-6 text-left">
                  <div className="flex flex-col">
                    <span className="font-black text-xl text-gray-700">{inv.supplier.name}</span>
                    <span className="text-[10px] font-bold text-gray-400 mt-1 tracking-widest uppercase">{inv.supplier.phone || "SANS CONTACT"}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-black text-gray-500 uppercase tracking-widest">
                    {inv.items.length} article{inv.items.length > 1 ? "s" : ""}
                  </span>
                </td>
                <td className="px-8 py-6 font-black text-2xl text-primary tracking-tighter">{formatDZD(inv.total)}</td>
                <td className="px-8 py-6 font-black text-base text-gray-400">{inv.date}</td>
                <td className="px-8 py-6 text-center">
                  <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-[0.2em] ${inv.type === "achat" ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"}`}>
                    {inv.type}
                  </span>
                </td>
                {user?.role === "admin" && (
                  <td className="px-8 py-6">
                    <div className="flex flex-col text-left space-y-1">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Added: {inv.addedBy || "-"}</span>
                      {inv.editedBy && <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Edited: {inv.editedBy}</span>}
                    </div>
                  </td>
                )}
                <td className="px-8 py-6 text-right">
                  <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all">
                    <Eye className="h-6 w-6" />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={user?.role === "admin" ? 8 : 7} className="px-8 py-32 text-center text-muted-foreground italic opacity-50">
                  <div className="flex flex-col items-center gap-4">
                    <Search className="h-16 w-16" />
                    <p className="text-2xl font-black uppercase tracking-[0.2em]">Aucune facture trouvée</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const mobileList = (
    <div className="min-h-screen bg-[#eef5f4] pb-24 text-gray-800">
      <div className="bg-[#243740] px-4 pt-8 pb-10 text-white rounded-b-[2.5rem] shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Facturation</p>
            <h1 className="text-3xl font-black mt-1">Factures</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setView("return")} className="h-11 w-11 bg-white/10 rounded-2xl flex items-center justify-center"><RotateCcw className="h-5 w-5 text-white/70" /></button>
            <button onClick={() => setView("add")} className="h-11 w-11 bg-[#41b86d] rounded-2xl flex items-center justify-center text-white shadow-lg"><Plus className="h-6 w-6" /></button>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <Input
            placeholder="Rechercher..."
            className="h-14 bg-white/10 border-0 rounded-2xl pl-12 text-white placeholder:text-white/30 focus-visible:ring-white/20"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-3">
        {filtered.map(inv => (
          <div
            key={inv.id}
            onClick={() => setSelectedInvoice(inv)}
            className="bg-white p-4 rounded-[2rem] shadow-lg border border-white flex items-center justify-between group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${inv.type === "achat" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                {inv.type === "achat" ? <Package className="h-6 w-6" /> : <RotateCcw className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-black text-[#243740] text-sm">{inv.number}</p>
                <p className="text-[11px] font-bold text-gray-400 mt-0.5">{inv.supplier.name} • {inv.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-black text-base ${inv.type === "achat" ? "text-[#41b86d]" : "text-red-500"}`}>
                {inv.type === "achat" ? "" : "-"}{formatDZD(inv.total)}
              </p>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{inv.items.length} Art.</p>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-20 text-center text-gray-400/50">
            <p className="font-bold italic">Aucun résultat</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="font-sans">
      {isMobile ? mobileList : desktopList}

      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-2xl bg-white border-0 shadow-2xl p-0 overflow-hidden rounded-[2rem]">
          {selectedInvoice && (
            <div className="flex flex-col h-full max-h-[85vh]">
              <div className="p-8 bg-[#be123c] text-white">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${selectedInvoice.type === "achat" ? "bg-green-500" : "bg-red-500"}`}>
                      Facture {selectedInvoice.type}
                    </span>
                    <h2 className="text-3xl font-black mt-2 tracking-tight">{selectedInvoice.number}</h2>
                    <p className="text-white/60 text-sm mt-1">{selectedInvoice.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total Facture</p>
                    <p className="text-3xl font-black">{formatDZD(selectedInvoice.total)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-2">
                  <div className="bg-white/10 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Fournisseur</p>
                    <p className="font-black text-lg">{selectedInvoice.supplier.name}</p>
                    <p className="text-sm text-white/60">{selectedInvoice.supplier.phone}</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Moyen de paiement</p>
                    <p className="font-black text-lg">Espèces</p>
                    <p className="text-sm text-white/60">Payé intégralement</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-100">
                      <th className="pb-4 font-black uppercase text-[10px] tracking-widest text-gray-400">Produit</th>
                      <th className="pb-4 text-center font-black uppercase text-[10px] tracking-widest text-gray-400">Quantité</th>
                      <th className="pb-4 text-right font-black uppercase text-[10px] tracking-widest text-gray-400">P.U</th>
                      <th className="pb-4 text-right font-black uppercase text-[10px] tracking-widest text-gray-400">Sous-total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-4 font-bold text-[#243740]">
                          {item.product.name}
                          {item.size && <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] uppercase font-black tracking-widest">{item.size}</span>}
                        </td>
                        <td className="py-4 text-center font-bold text-gray-500">{item.quantity}</td>
                        <td className="py-4 text-right font-medium text-gray-500">{formatDZD(item.priceBuy)}</td>
                        <td className="py-4 text-right font-black text-[#243740]">{formatDZD(item.priceBuy * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedInvoice.lastModified && (
                <div className="px-8 py-3 bg-amber-50 border-t border-b border-amber-100 italic text-[11px] text-amber-800 font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-3 w-3" />
                    <span>Modifiée le {new Date(selectedInvoice.lastModified).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className="opacity-70">{selectedInvoice.modifications}</span>
                </div>
              )}

              <div className="p-8 border-t border-gray-100 bg-[#f7fbfa] flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="rounded-xl font-bold px-4 text-[#be123c] hover:bg-red-50"
                    onClick={() => handleEditInvoice(selectedInvoice)}
                  >
                    Modifier
                  </Button>
                  <Button variant="ghost" className="rounded-xl font-bold px-4 text-gray-400 hover:bg-gray-100" onClick={() => setSelectedInvoice(null)}>Fermer</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
