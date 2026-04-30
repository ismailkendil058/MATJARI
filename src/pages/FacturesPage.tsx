import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus, RotateCcw, Search, Eye, ArrowLeft, Package, PackagePlus, X,
  Cigarette, Cookie, CupSoda, Grid, Candy, Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getInvoices, addInvoice, getSuppliers, addSupplier, getProducts, saveProducts, updateProductStock, deleteInvoice
} from "@/lib/db";
import { Invoice, InvoiceItem, Supplier, Product, CategoryType } from "@/lib/types";
import { formatDZD, generateId, CATEGORIES } from "@/lib/store";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthContext";

const categoryIcons: Record<CategoryType, React.ElementType> = {
  cigarettes: Cigarette,
  chemma: Package,
  chocolates: Cookie,
  drinks: CupSoda,
  snacks: Candy,
  cosmetics: Sparkles,
  divers: Grid,
};

const categoryColors: Record<CategoryType, string> = {
  cigarettes: "bg-[#be123c] hover:bg-[#9f1239] text-white",
  chemma: "bg-[#713f12] hover:bg-[#451a03] text-white",
  chocolates: "bg-[#7e22ce] hover:bg-[#6b21a8] text-white",
  drinks: "bg-[#0369a1] hover:bg-[#075985] text-white",
  snacks: "bg-[#f59e0b] hover:bg-[#d97706] text-white",
  cosmetics: "bg-[#db2777] hover:bg-[#be185d] text-white",
  divers: "bg-[#4b5563] hover:bg-[#374151] text-white",
};

type View = "list" | "add" | "return";
type InvoiceFormItem = {
  productId: string;
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
  newCategory: "cigarettes",
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [invs, sups, prods] = await Promise.all([
          getInvoices(),
          getSuppliers(),
          getProducts()
        ]);
        setInvoices(invs);
        setSuppliers(sups);
        setProducts(prods);
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
  const [activeCategory, setActiveCategory] = useState<CategoryType | null>("cigarettes");
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
  const [itemCategory, setItemCategory] = useState<CategoryType>("cigarettes");
  const [itemBarcode, setItemBarcode] = useState("");
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
    // Reset bar
    setItemName("");
    setItemQty("");
    setItemBuy("");
    setItemSale("");
    setItemCategory("cigarettes");
    setSelectedProduct(null);
    setItemBarcode("");
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
      expiryDate: item.expiryDate || "",
    })));
    setSelectedInvoice(null);
    setView("add");
  };

  const revertStockForInvoice = async (invoice: Invoice) => {
    const factor = invoice.type === "achat" ? -1 : 1;
    for (const item of invoice.items) {
      await updateProductStock(item.product.id, item.quantity * factor);
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
            product = {
              ...existing,
              stock: existing.stock + item.quantity,
              priceBuy: item.priceBuy,
              priceSale: item.priceSale,
              expiryDate: item.expiryDate || existing.expiryDate,
            };
            changedProducts.push(product);
          } else {
            product = {
              id: generateId(), name: item.newName, nameAr: "", category: item.newCategory as any,
              priceSale: item.priceSale, priceBuy: item.priceBuy, stock: item.quantity, unit: "unité", expiryDate: item.expiryDate || undefined,
              // include barcode if provided
              ...(item.barcode ? { barcode: item.barcode } : {})
            };
            changedProducts.push(product);
          }
        } else {
          const existing = currentProducts.find(p => p.id === item.productId);
          if (!existing) continue;
          product = {
            ...existing,
            stock: existing.stock + item.quantity,
            priceBuy: item.priceBuy,
            priceSale: item.priceSale,
            expiryDate: item.expiryDate || existing.expiryDate,
          };
          changedProducts.push(product);
        }
        items.push({ product, quantity: item.quantity, priceBuy: item.priceBuy, priceSale: item.priceSale, expiryDate: item.expiryDate });
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
        <header className="h-14 border-b bg-slate-50 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { resetAddForm(); setView("list"); }} className="h-8 w-8 p-0 rounded-lg hover:bg-slate-200">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-bold text-slate-800 uppercase tracking-tight text-sm">Saisie Facture Achat</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase text-slate-400 leading-none">Date de l'opération</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="bg-transparent border-0 outline-none text-sm font-bold text-slate-900 border-b border-transparent hover:border-slate-200 transition-all text-right"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50/20 p-6 flex flex-col gap-6">
          {/* SECTION 1: HEADER (Fournisseur) */}
          <div className="bg-white border rounded-xl p-5 shadow-sm max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div className="space-y-1.5 flex-1 relative">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Fournisseur (Optionnel)</label>
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
                className="h-11 border-slate-200 rounded-lg font-bold"
              />
              {showSupplierSuggestions && supplierSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {supplierSuggestions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSupplier(s);
                        setSupplierName(s.name);
                        setSupplierId(s.id);
                        setShowSupplierSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 border-slate-100 transition-colors flex items-center justify-between"
                    >
                      <p className="font-bold text-sm text-slate-900">{s.name}</p>
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{s.phone || "No phone"}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 text-slate-400 italic text-[11px] font-bold pb-2">
              <Package className="h-3 w-3" />
              Stock Management actif pour cette facture
            </div>
          </div>

          {/* SECTION 2: ADD PRODUCT ENTRY BAR */}
          <div className="bg-white border rounded-xl p-5 shadow-sm max-w-6xl mx-auto w-full">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1 block mb-3">Ajouter un produit à la facture</label>
            <div className="flex items-end gap-3 flex-wrap md:flex-nowrap">
              {/* Product Name with Suggestions */}
              <div className="relative flex-1 min-w-[300px] space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Désignation Produit</label>
                <div className="flex items-end gap-2">
                  <Input
                    placeholder="Nom du produit..."
                    value={itemName}
                    onChange={e => {
                      setItemName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="h-11 border-slate-200 rounded-lg font-bold focus-visible:ring-slate-200 flex-1"
                  />
                  <Input
                    placeholder="Code-barre (opt.)"
                    value={itemBarcode}
                    onChange={e => setItemBarcode(e.target.value)}
                    className="h-11 w-36 border-slate-200 rounded-lg text-sm"
                  />
                </div>
                {showSuggestions && nameSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
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
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 border-slate-100 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-bold text-sm text-slate-900 group-hover:text-[#be123c] transition-colors">{p.name}</p>
                          {p.barcode && (
                            <p className="text-[10px] text-slate-500 mt-1">Code-barre: {p.barcode}</p>
                          )}
                          <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{p.category} • Stock: {p.stock}</p>
                        </div>
                        <p className="text-xs font-black text-slate-900">{formatDZD(p.priceBuy)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category selector */}
              <div className="w-48 space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Catégorie</label>
                <Select value={itemCategory} onValueChange={(v: CategoryType) => setItemCategory(v)}>
                  <SelectTrigger className="h-11 border-slate-200 rounded-lg font-bold bg-white">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.key} value={cat.key}>
                        <div className="flex items-center gap-2">
                          {React.createElement(categoryIcons[cat.key], { className: "h-3.5 w-3.5" })}
                          <span>{cat.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="w-24 space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1 text-center block">Qté</label>
                <Input
                  type="number"
                  value={itemQty}
                  onChange={e => setItemQty(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Qté"
                  className="h-11 text-center font-black border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Prix Achat */}
              <div className="w-32 space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Prix d'Achat</label>
                <Input
                  type="number"
                  value={itemBuy}
                  onChange={e => setItemBuy(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="P. Achat"
                  className="h-11 font-bold border-slate-200"
                />
              </div>

              {/* Prix Vente */}
              <div className="w-32 space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Prix de Vente</label>
                <Input
                  type="number"
                  value={itemSale}
                  onChange={e => setItemSale(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="P. Vente"
                  className="h-11 font-bold border-slate-200"
                />
              </div>

              {/* Action Button */}
              <Button
                onClick={handleValidateItem}
                className="h-11 bg-slate-900 border-2 border-slate-900 hover:bg-[#be123c] hover:border-[#be123c] text-white px-8 rounded-lg font-black uppercase text-[11px] tracking-widest transition-all"
              >
                Valider le produit
              </Button>
            </div>
          </div>

          {/* SECTION 3: ITEMS TABLE */}
          <div className="bg-white border rounded-xl shadow-sm max-w-6xl mx-auto w-full overflow-hidden flex-1 flex flex-col min-h-[400px]">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 border-b sticky top-0 z-10">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-6 py-4 w-12">N°</th>
                    <th className="px-6 py-4">Article</th>
                    <th className="px-6 py-4 w-28 text-center">Quantité</th>
                    <th className="px-6 py-4 w-32">Prix Achat</th>
                    <th className="px-6 py-4 w-32">Prix Vente</th>
                    <th className="px-6 py-4 w-32 text-right">Total HT</th>
                    <th className="px-6 py-4 w-12"></th>
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
        <footer className="h-24 bg-white border-t flex items-center justify-between px-10 shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 leading-none mb-1">Total de la facture</span>
            <p className="text-4xl font-black text-[#be123c] tracking-tighter leading-none">{formatDZD(invoiceTotal)}</p>
          </div>

          <div className="flex items-center gap-4">
            {invoiceItems.length > 0 && (
              <button onClick={() => { if (confirm("Effacer toute la facture ?")) setInvoiceItems([]); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 mr-6 tracking-widest transition-colors">Réinitialiser</button>
            )}
            <Button
              onClick={handleSubmitInvoice}
              disabled={invoiceItems.length === 0}
              className="h-14 px-12 bg-slate-900 hover:bg-[#be123c] text-white text-lg font-black rounded-xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-20 flex items-center gap-3"
            >
              Valider la facture
              <Plus className="h-5 w-5" />
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
        <div className="flex-1 flex flex-col border-r border-border bg-white overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setReturnInvoiceId(""); setReturnItems([]); setView("list"); }}
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-secondary/50 hover:bg-secondary text-muted-foreground transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-foreground">Retour Fournisseur</h2>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-6 flex-1 overflow-auto bg-secondary/10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border space-y-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sélectionner la facture d'origine</span>
              </div>
              <Select value={returnInvoiceId} onValueChange={v => { setReturnInvoiceId(v); setReturnItems([]); }}>
                <SelectTrigger className="h-12 bg-secondary/30 border-0 rounded-xl">
                  <SelectValue placeholder="Choisir une facture d'achat..." />
                </SelectTrigger>
                <SelectContent>
                  {invoices.filter(i => i.type === "achat").map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.number} — {i.supplier.name} ({i.date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedReturnInvoice && (
              <div className="space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">Produits de la facture</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedReturnInvoice.items.map((item, idx) => {
                    const currentQty = returnItems.find(r => r.idx === idx)?.quantity || 0;
                    return (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-border shadow-sm flex flex-col gap-3 group hover:border-primary/30 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-foreground">{item.product.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Acheté: {item.quantity} units</p>
                          </div>
                          <p className="text-sm font-black text-primary">{formatDZD(item.priceBuy)}/u</p>
                        </div>
                        <div className="flex items-center gap-3 bg-secondary/10 p-2 rounded-xl">
                          <span className="text-[10px] font-black uppercase text-muted-foreground px-2">Qté à retourner</span>
                          <Input
                            type="number"
                            className="h-9 bg-white border-0 text-center font-bold rounded-lg"
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
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30 italic">
                <RotateCcw className="h-12 w-12 mb-4 opacity-10" />
                <p>Veuillez sélectionner une facture pour commencer le retour</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Return Summary */}
        <div className="w-[400px] flex flex-col bg-white border-l border-border shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          <div className="p-5 border-b border-border">
            <h3 className="text-xl font-black text-foreground">Récapitulatif Retour</h3>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3 bg-secondary/10">
            {returnItems.map(ri => {
              const item = selectedReturnInvoice?.items[ri.idx];
              if (!item) return null;
              return (
                <div key={ri.idx} className="bg-white p-3 rounded-xl border border-border shadow-sm flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-bold truncate">{item.product.name}</p>
                    <p className="text-[10px] font-bold text-red-500">Retour: {ri.quantity} units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground">{formatDZD(item.priceBuy * ri.quantity)}</p>
                  </div>
                </div>
              );
            })}
            {returnItems.length === 0 && (
              <div className="py-20 text-center text-muted-foreground/30 italic text-sm">Aucun article à retourner</div>
            )}
          </div>

          <div className="p-6 border-t border-border bg-white space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total à récupérer</span>
                <p className="text-3xl font-black text-red-500 tracking-tight">{formatDZD(returnTotal)}</p>
              </div>
              <Button
                onClick={handleReturn}
                disabled={returnItems.length === 0}
                className="h-14 px-8 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl shadow-lg hover:-translate-y-0.5 transition-all"
              >
                VALIDER LE RETOUR
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
    <div className="p-8 animate-fade-in bg-white min-h-screen font-sans text-gray-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#243740]">Gestion des Factures</h2>
          <p className="text-muted-foreground font-medium">Suivez vos achats et retours fournisseurs</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setView("return")} variant="outline" className="h-12 rounded-xl border-border px-6 hover:bg-white font-bold text-[#243740]">
            <RotateCcw className="mr-2 h-4 w-4" />
            Effectuer un Retour
          </Button>
          <Button onClick={() => setView("add")} className="h-12 rounded-xl bg-[#41b86d] px-6 font-bold text-white hover:bg-[#39a05f] shadow-md">
            <Plus className="mr-2 h-4 w-4" />
            Nouvel Achat
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Rechercher par numéro ou fournisseur..."
            className="pl-12 bg-white border-border h-12 shadow-sm rounded-xl focus-visible:ring-0 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Input
          type="date"
          className="w-full md:w-auto px-4 py-2 h-12 bg-white rounded-xl shadow-sm border border-border text-sm font-bold text-gray-600"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
        />
      </div>

      <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-center">
          <thead className="bg-[#f7fbfa] border-b border-border">
            <tr>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Numéro</th>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground text-left">Fournisseur</th>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Articles</th>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Total</th>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Date</th>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Type</th>
              {user?.role === "admin" && (
                <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Utilisateurs</th>
              )}
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(inv => (
              <tr key={inv.id} className="hover:bg-secondary/10 transition-colors group cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                <td className="px-6 py-4 font-black text-foreground">{inv.number}</td>
                <td className="px-6 py-4 text-left">
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground">{inv.supplier.name}</span>
                    <span className="text-[10px] text-muted-foreground">{inv.supplier.phone}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-secondary px-2 py-0.5 rounded-full text-[10px] font-black text-muted-foreground">
                    {inv.items.length} article{inv.items.length > 1 ? "s" : ""}
                  </span>
                </td>
                <td className="px-6 py-4 font-black text-[#41b86d]">{formatDZD(inv.total)}</td>
                <td className="px-6 py-4 font-medium text-muted-foreground">{inv.date}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${inv.type === "achat" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {inv.type}
                  </span>
                </td>
                {user?.role === "admin" && (
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-foreground">Ajouté: {inv.addedBy || "-"}</span>
                      {inv.editedBy && <span className="text-[10px] font-bold text-amber-600">Edité: {inv.editedBy}</span>}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" className="h-8 rounded-lg text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={user?.role === "admin" ? 8 : 7} className="px-6 py-20 text-center text-muted-foreground italic opacity-50">
                  Aucune facture trouvée
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
                        <td className="py-4 font-bold text-[#243740]">{item.product.name}</td>
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
