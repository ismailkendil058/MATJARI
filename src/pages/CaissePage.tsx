import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search, Plus, Minus, Trash2, Package, Shirt, Sparkles, Watch, Dumbbell, Footprints, Layers, Printer,
  ShoppingBag, Gem, Palette, Crown, Heart, Star, Flower2, Sun, Moon, Zap, Coffee, Gift,
  Glasses, Scissors, Umbrella, Music, Camera, Headphones,
  type LucideIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getClients, saveClients, updateClientCredit, addSale, getSales,
  getProducts, updateProductStock, getCustomCards, saveCustomCards,
  addExpense, updateProduct, getNextTicketId, getCategories
} from "@/lib/db";

import { Product, CartItem, CategoryType, CustomSaleCard, Client, Sale, Expense, Category } from "@/lib/types";
import { formatDZD, generateId } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthContext";

// Icon registry for resolving icon names to components
const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Shirt, Layers, Footprints, Watch, Sparkles, Dumbbell,
  Package, ShoppingBag, Gem, Palette, Crown, Heart,
  Star, Flower2, Sun, Moon, Zap, Coffee, Gift,
  Glasses, Scissors, Umbrella, Music, Camera, Headphones,
};

const SHIRT_SIZES = ["S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = ["39", "40", "41", "42", "43", "44", "45", "46", "47"];

export default function CaissePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryType | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const [reduction, setReduction] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReduction, setShowReduction] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [matchingClients, setMatchingClients] = useState<Client[]>([]);
  const [showCreditDetails, setShowCreditDetails] = useState(false);
  const [paidNow, setPaidNow] = useState("");
  const [mobileSection, setMobileSection] = useState<"products" | "cart">("products");
  const [tempReduction, setTempReduction] = useState("");

  const [customCards, setCustomCards] = useState<CustomSaleCard[]>([]);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const [showExpense, setShowExpense] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");

  const [customModalProduct, setCustomModalProduct] = useState<Product | null>(null);
  const [customModalKg, setCustomModalKg] = useState("");
  const [customModalUnitPrice, setCustomModalUnitPrice] = useState("");
  const [activeCustomCard, setActiveCustomCard] = useState<CustomSaleCard | null>(null);
  const [customCardKg, setCustomCardKg] = useState("");

  const [showSizeModal, setShowSizeModal] = useState(false);
  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const [showRetour, setShowRetour] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState("");
  const [retourProductSearch, setRetourProductSearch] = useState("");
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  // Dynamic categories from database
  const [dbCategories, setDbCategories] = useState<Category[]>([]);

  // Derived lookups from dynamic categories
  const categoryColors = useMemo(() => {
    const map: Record<string, string> = {};
    dbCategories.forEach(c => {
      map[c.key] = `bg-[${c.color}] hover:bg-[${c.hoverColor}] text-white`;
    });
    return map;
  }, [dbCategories]);

  const categoryIcons = useMemo(() => {
    const map: Record<string, any> = {};
    dbCategories.forEach(c => {
      map[c.key] = LUCIDE_ICON_MAP[c.icon] || Package;
    });
    return map;
  }, [dbCategories]);

  const SIZE_CATEGORIES = useMemo(() => {
    return dbCategories.filter(c => c.hasTailles || c.hasPointure).map(c => c.key);
  }, [dbCategories]);

  const customizableCategories = useMemo(() => {
    return new Set(dbCategories.filter(c => c.hasVentePersonnalisee).map(c => c.key));
  }, [dbCategories]);

  const dynamicCATEGORIES = useMemo(() => {
    return dbCategories.map(c => ({ key: c.key, label: c.label, labelAr: c.labelAr }));
  }, [dbCategories]);

  // Helper: is this a pointure (shoe) category?
  const isPointureCategory = useCallback((catKey: string) => {
    return dbCategories.some(c => c.key === catKey && c.hasPointure);
  }, [dbCategories]);

  // Helper: get custom icon data URI if available
  const getCategoryCustomIcon = useCallback((catKey: string) => {
    return dbCategories.find(c => c.key === catKey)?.customIcon;
  }, [dbCategories]);

  // Helper: get the color style object for inline styling
  const getCategoryColorStyle = useCallback((catKey: string): React.CSSProperties => {
    const cat = dbCategories.find(c => c.key === catKey);
    return cat ? { backgroundColor: cat.color } : {};
  }, [dbCategories]);

  const getCategoryHoverColorStyle = useCallback((catKey: string): React.CSSProperties => {
    const cat = dbCategories.find(c => c.key === catKey);
    return cat ? { backgroundColor: cat.hoverColor } : {};
  }, [dbCategories]);


  const getCustomCardPendingKg = useCallback((cardId: string) => {
    return cart.reduce((sum, item) => {
      if (item.customCardId !== cardId) return sum;
      return sum + (item.weightKg ?? item.quantity);
    }, 0);
  }, [cart]);

  const visibleCustomCards = useMemo(() => {
    const filtered = activeCategory ? customCards.filter(card => card.category === activeCategory) : customCards;
    return filtered.filter(card => card.kg - getCustomCardPendingKg(card.id) > 0);
  }, [customCards, activeCategory, getCustomCardPendingKg]);

  const mobileCartCount = useMemo(() => {
    const total = cart.reduce((sum, item) => sum + (item.weightKg ?? item.quantity), 0);
    return Number.isInteger(total) ? String(total) : total.toFixed(1);
  }, [cart]);

  const sectionOptions = [
    { id: "products", label: "Produits" },
    { id: "cart", label: "Panier" },
  ] as const;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prods, cards, cls, cats] = await Promise.all([
          getProducts(),
          getCustomCards(),
          getClients(),
          getCategories(),
        ]);
        setProducts(prods);
        setCustomCards(cards);
        setClients(cls);
        setDbCategories(cats);
        // Set default active category to first category
        if (cats.length > 0) {
          setActiveCategory(cats[0].key);
        }
      } catch (error) {
        console.error("Error loading Caisse data:", error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleInventoryUpdated = async () => {
      const prods = await getProducts();
      setProducts(prods);
    };
    window.addEventListener("novaInventoryUpdated", handleInventoryUpdated);
    return () => window.removeEventListener("novaInventoryUpdated", handleInventoryUpdated);
  }, []);

  const openCustomModal = (product: Product) => {
    if (product.stock <= 0) return;
    setCustomModalProduct(product);
    setCustomModalKg("");
    setCustomModalUnitPrice("");
    setShowCustomModal(true);
  };

  const closeCustomModal = () => {
    setShowCustomModal(false);
    setCustomModalProduct(null);
    setCustomModalKg("");
    setCustomModalUnitPrice("");
  };

  const getCustomPurchaseCostPerKg = (baseProduct: Product, kg: number) => {
    if (kg <= 0) return baseProduct.priceBuy;
    return baseProduct.priceBuy / kg;
  };

  const addCustomCartItem = (
    baseProduct: Product,
    kg: number,
    unitPrice: number,
    customPurchaseCostPerKg: number,
    customCardId?: string
  ) => {
    setCart(prev => {
      const existing = customCardId
        ? prev.find(c => c.customCardId === customCardId)
        : prev.find(c => c.customBaseProductId === baseProduct.id && c.customUnitPrice === unitPrice && !c.customCardId);

      if (existing) {
        return prev.map(c =>
          c.product.id === existing.product.id
            ? { ...c, quantity: c.quantity + kg, weightKg: (c.weightKg ?? c.quantity) + kg, subtotal: (c.quantity + kg) * unitPrice }
            : c
        );
      }

      const itemId = customCardId ? `${customCardId}-item` : `${baseProduct.id}-custom-${Date.now()}`;
      const customProduct: Product = {
        ...baseProduct,
        id: itemId,
        name: baseProduct.name,
        priceSale: unitPrice,
        priceBuy: customPurchaseCostPerKg,
      };

      const newItem: CartItem = {
        product: customProduct,
        quantity: kg,
        subtotal: kg * unitPrice,
        weightKg: kg,
        customUnitPrice: unitPrice,
        customUnitCost: customPurchaseCostPerKg,
        customBaseProductId: baseProduct.id,
        customCardId,
      };

      return [...prev, newItem];
    });
  };

  const addCustomCardEntry = async (baseProduct: Product, kg: number, unitPrice: number, priceBuyPerKg: number) => {
    const card: CustomSaleCard = {
      id: `${baseProduct.id}-custom-card-${Date.now()}`,
      baseProductId: baseProduct.id,
      baseProductName: baseProduct.name,
      category: baseProduct.category,
      kg,
      unitPrice,
      priceBuyPerKg,
    };

    const nextCards = [...customCards, card];
    await saveCustomCards(nextCards);
    setCustomCards(nextCards);
  };

  const handleCustomSaleConfirm = async () => {
    if (!customModalProduct) return;
    const kg = Number(customModalKg);
    const unitPrice = Number(customModalUnitPrice);
    if (!kg || !unitPrice || customModalProduct.stock <= 0) return;
    const customPurchaseCostPerKg = getCustomPurchaseCostPerKg(customModalProduct, kg);

    try {
      // 1. Subtract 1 from base product stock immediately
      await updateProductStock(customModalProduct.id, -1);

      // 2. Update local products state
      setProducts(prev => prev.map(p =>
        p.id === customModalProduct.id ? { ...p, stock: p.stock - 1 } : p
      ));

      // 3. Create the custom card (this card is now "separated")
      await addCustomCardEntry(customModalProduct, kg, unitPrice, customPurchaseCostPerKg);

      closeCustomModal();
    } catch (error) {
      console.error("Error saving custom card:", error);
    }
  };

  const canUseCustomCard = (card: CustomSaleCard) => {
    const available = card.kg - getCustomCardPendingKg(card.id);
    return available > 0;
  };

  const openCustomCardModal = (card: CustomSaleCard) => {
    if (!canUseCustomCard(card)) return;
    setActiveCustomCard(card);
    setCustomCardKg("");
  };

  const handleCustomCardAdd = (card: CustomSaleCard, kgOverride?: number) => {
    const kg = kgOverride ?? 1;
    if (kg <= 0) return;
    const baseProduct = products.find(p => p.id === card.baseProductId);
    if (!baseProduct) return;

    const pendingInCart = getCustomCardPendingKg(card.id);
    if (kg > card.kg - pendingInCart) return;

    const customPurchaseCostPerKg = card.priceBuyPerKg ?? getCustomPurchaseCostPerKg(baseProduct, card.kg);
    addCustomCartItem(baseProduct, kg, card.unitPrice, customPurchaseCostPerKg, card.id);

    if (!kgOverride) {
      setActiveCustomCard(null);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = !search && activeCategory ? p.category === activeCategory : true;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  const addToCart = useCallback((product: Product, size?: string) => {
    // Total qty of this product in cart regardless of size (to check stock)
    const totalQtyInCart = cart.reduce((sum, item) => {
      const baseId = item.customBaseProductId ?? item.product.id;
      return (baseId === product.id && !item.customCardId) ? sum + item.quantity : sum;
    }, 0);

    if (product.stock <= totalQtyInCart) return false;

    // Size-specific stock check
    if (size) {
      const available = product.sizeStock?.[size] || 0;
      const inCart = cart.find(c => c.product.id === product.id && !c.customUnitPrice)?.sizeQtys?.[size] || 0;
      if (available <= inCart) return false;
    }


    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id && !c.customUnitPrice);
      if (existing) {
        const nextSizeQtys = { ...(existing.sizeQtys || {}) };
        if (size) nextSizeQtys[size] = (nextSizeQtys[size] || 0) + 1;

        return prev.map(c => (c.product.id === product.id && !c.customUnitPrice)
          ? {
            ...c,
            quantity: c.quantity + 1,
            subtotal: (c.quantity + 1) * product.priceSale,
            size: size ? (c.size ? (c.size.split(', ').includes(size) ? c.size : `${c.size}, ${size}`) : size) : c.size,
            sizeQtys: nextSizeQtys
          }
          : c
        );
      }
      return [...prev, { product, quantity: 1, size, subtotal: product.priceSale, sizeQtys: size ? { [size]: 1 } : undefined }];
    });
    return true;
  }, [cart]);

  const handleProductClick = (product: Product) => {
    if (SIZE_CATEGORIES.includes(product.category)) {
      setSizeModalProduct(product);
      setShowSizeModal(true);
    } else {
      addToCart(product);
    }
  };


  const selectSize = (size: string) => {
    if (sizeModalProduct) {
      const added = addToCart(sizeModalProduct, size);
      if (!added) {
        toast({ title: "Stock insuffisant", description: `${sizeModalProduct.name} n'est pas disponible en quantité suffisante.` });
      } else {
        toast({ title: "Ajouté au panier", description: `${sizeModalProduct.name} (${size}) ajouté.` });
      }
      setShowSizeModal(false);
      setSizeModalProduct(null);
    }
  };


  const handleAddByBarcode = (code?: string) => {
    const val = (code ?? barcodeInput).trim();
    if (!val) return;
    const found = products.find(p => p.barcode === val);
    if (!found) {
      toast({ title: "Produit non trouvé", description: "Aucun produit avec ce code-barre." });
      setBarcodeInput("");
      return;
    }
    if (SIZE_CATEGORIES.includes(found.category)) {
      handleProductClick(found);
      setBarcodeInput("");
      return;
    }
    const added = addToCart(found);

    setBarcodeInput("");
    if (!added) {
      toast({ title: "Stock insuffisant", description: `${found.name} n'est pas disponible en quantité suffisante.` });
      return;
    }

    toast({ title: "Ajouté au panier", description: `${found.name} ajouté.` });

  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(c => c.product.id === id);

      if (!item) return prev;


      if (delta > 0) {
        // Handle custom card specific logic
        if (item.customCardId) {
          const card = customCards.find(c => c.id === item.customCardId);
          if (card) {
            const pending = prev.reduce((sum, c) => {
              if (c.customCardId !== card.id) return sum;
              return sum + (c.weightKg ?? c.quantity);
            }, 0);
            if (pending >= card.kg) return prev;
          }
        } else {
          // Normal product logic
          const baseProductId = item.customBaseProductId ?? item.product.id;
          const baseProduct = products.find(p => p.id === baseProductId);
          if (!baseProduct) return prev;

          const totalOwnedInCart = prev.reduce((sum, c) => {
            if (c.customCardId) return sum; // Skip items that don't deduct from base stock at checkout
            const cBaseId = c.customBaseProductId ?? c.product.id;
            return cBaseId === baseProductId ? sum + c.quantity : sum;
          }, 0);

          if (totalOwnedInCart >= baseProduct.stock) return prev;
        }
      }

      return prev.map(c => {
        if (c.product.id !== id) return c;
        const newQty = Math.max(0, c.quantity + delta);
        const price = c.customUnitPrice ?? c.product.priceSale;
        return {
          ...c,
          quantity: newQty,
          weightKg: c.weightKg !== undefined ? newQty : undefined,
          subtotal: newQty * price
        };
      }).filter(c => c.quantity > 0);
    });
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(c => c.product.id !== id));



  const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
  const total = subtotal - reduction;

  const applyCustomCardUsage = async () => {
    const usage: Record<string, number> = {};
    cart.forEach(item => {
      if (!item.customCardId) return;
      usage[item.customCardId] = (usage[item.customCardId] || 0) + (item.weightKg ?? item.quantity);
    });
    if (!Object.keys(usage).length) return;

    const nextCards = customCards.reduce<CustomSaleCard[]>((acc, card) => {
      const used = usage[card.id] ?? 0;
      const remaining = Math.max(0, card.kg - used);
      if (remaining > 0) {
        return [...acc, { ...card, kg: remaining }];
      }
      return acc;
    }, []);

    await saveCustomCards(nextCards);
    setCustomCards(nextCards);
  };

  const handleCheckout = async (type: 'direct' | 'credit', actualPaid?: number) => {
    try {
      const saleId = currentSaleId || generateId();
      for (const item of cart) {
        if (item.customCardId) continue;
        const productId = item.customBaseProductId ?? item.product.id;
        const prod = products.find(p => p.id === productId);
        if (prod) {
          const nextSizeStock = { ...(prod.sizeStock || {}) };
          if (item.sizeQtys) {
            Object.entries(item.sizeQtys).forEach(([sz, q]) => {
              nextSizeStock[sz] = Math.max(0, (nextSizeStock[sz] || 0) - q);
            });
          }
          await updateProduct({ ...prod, stock: prod.stock - item.quantity, sizeStock: nextSizeStock });
        }
      }

      await applyCustomCardUsage();

      const isCredit = type === 'credit';
      const finalPaid = actualPaid ?? total;
      const creditAmount = isCredit ? Math.max(0, total - finalPaid) : 0;

      if (type === 'direct') {
        await addSale({
          id: saleId, type: 'direct', items: [...cart], reduction, total,
          paidAmount: total, creditAmount: 0, date: new Date().toISOString(),
          username: user?.username
        } as Sale);
      } else {
        let finalClientId = "";
        const existingClient = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
        if (existingClient) {
          finalClientId = existingClient.id;
          await updateClientCredit(existingClient.id, creditAmount);
        } else {
          const newClient: Client = { id: generateId(), name: clientName, phone: clientPhone, balance: creditAmount };
          await saveClients([...clients, newClient]);
          finalClientId = newClient.id;
        }

        await addSale({
          id: saleId, type: 'credit', items: [...cart], reduction, total,
          paidAmount: finalPaid, creditAmount, clientId: finalClientId, date: new Date().toISOString(),
          username: user?.username
        } as Sale);
      }

      setCart([]);
      setReduction(0);
      setClientName("");
      setClientPhone("");
      setPaidNow("");
      setShowCreditDetails(false);
      const prods = await getProducts();
      setProducts(prods);
      setShowCheckout(false);
    } catch (error) {
      console.error("Checkout failed:", error);
    }
  };

  const openCheckout = async () => {
    const nextId = await getNextTicketId();
    setCurrentSaleId(nextId);
    setShowCheckout(true);
  };

  const handleExpenseSubmit = async () => {
    const amt = Number(expenseAmount);
    if (!amt || !expenseNote) return;
    try {
      await addExpense({
        id: generateId(),
        amount: amt,
        date: new Date().toISOString(),
        note: expenseNote
      });
      setShowExpense(false);
      setExpenseAmount("");
      setExpenseNote("");
      toast({ title: "Dépense ajoutée", description: `Dépense de ${formatDZD(amt)} enregistrée.` });
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  };

  const fetchRecentSales = async () => {
    try {
      const sales = await getSales();
      setRecentSales(sales);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenRetour = () => {
    setRetourProductSearch("");
    fetchRecentSales();
    setShowRetour(true);
  };

  const selectSaleForReturn = (sale: Sale) => {
    setSelectedSaleForReturn(sale);
    const qtys: Record<string, number> = {};
    sale.items.forEach((item, idx) => {
      qtys[`${item.product.id}-${idx}`] = 0;
    });
    setReturnQtys(qtys);
  };

  const handleReturnSubmit = async () => {
    if (!selectedSaleForReturn) return;

    try {
      let refundTotal = 0;
      const returnedItems: CartItem[] = [];

      for (let i = 0; i < selectedSaleForReturn.items.length; i++) {
        const item = selectedSaleForReturn.items[i];
        const qtyToReturn = returnQtys[`${item.product.id}-${i}`] || 0;
        if (qtyToReturn <= 0) continue;

        const subtotal = qtyToReturn * (item.customUnitPrice ?? item.product.priceSale);
        refundTotal += subtotal;

        returnedItems.push({
          ...item,
          quantity: qtyToReturn,
          subtotal: subtotal
        });

        // Update stock
        const productId = item.customBaseProductId ?? item.product.id;
        const prod = products.find(p => p.id === productId);
        if (prod) {
          const nextSizeStock = { ...(prod.sizeStock || {}) };
          if (item.sizeQtys) {
            // This is tricky because we don't know which sizes were turned.
            // For now, let's assume the user returns from the total qty.
            // If they have size info, we should probably let them pick sizes too.
            // But to keep it simple and "perfect", I'll just increment total stock if no sizes.
            // If sizes exist, I'll increment based on the item.size if single size.
            if (item.size && !item.size.includes(',')) {
              nextSizeStock[item.size] = (nextSizeStock[item.size] || 0) + qtyToReturn;
            }
          }
          await updateProduct({ ...prod, stock: prod.stock + qtyToReturn, sizeStock: nextSizeStock });
        }
      }

      if (returnedItems.length === 0) {
        toast({ title: "Aucun produit sélectionné", description: "Veuillez choisir les quantités à retourner." });
        return;
      }

      // If it was a credit sale, reduce client balance
      if (selectedSaleForReturn.type === 'credit' && selectedSaleForReturn.clientId) {
        await updateClientCredit(selectedSaleForReturn.clientId, -refundTotal);
      }

      // Add return sale record
      await addSale({
        id: generateId(),
        type: 'return',
        items: returnedItems,
        reduction: 0,
        total: refundTotal,
        paidAmount: selectedSaleForReturn.type === 'direct' ? refundTotal : 0,
        creditAmount: selectedSaleForReturn.type === 'credit' ? refundTotal : 0,
        clientId: selectedSaleForReturn.clientId,
        date: new Date().toISOString(),
        username: user?.username,
        originalSaleId: selectedSaleForReturn.id
      } as Sale);

      toast({ title: "Retour effectué", description: `Le retour d'un montant de ${formatDZD(refundTotal)} a été enregistré.` });

      const [prods, cls] = await Promise.all([getProducts(), getClients()]);
      setProducts(prods);
      setClients(cls);
      setShowRetour(false);
      setSelectedSaleForReturn(null);
      setReturnQtys({});
    } catch (error) {
      console.error("Return failed:", error);
      toast({ title: "Erreur", description: "Le retour a échoué." });
    }
  };

  const handlePrintReceipt = () => {
    setShowReceiptModal(true);
  };

  const executePrint = () => {
    const saleId = currentSaleId || generateId().toUpperCase();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = cart.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 4px 0;">${item.product.name} ${item.size ? `(${item.size})` : ''}</td>
        <td style="padding: 4px 0; text-align: center;">${item.quantity}</td>
        <td style="padding: 4px 0; text-align: right;">${formatDZD(item.subtotal)}</td>
      </tr>
    `).join('');

    const receiptContent = `
      <html>
      <head>
        <title>Ticket d'achat - Matjari</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body { font-family: 'Courier New', Courier, monospace; width: 75mm; margin: 0 auto; padding: 10px; color: black; background: white; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .hr { border-bottom: 1px dashed black; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th { font-size: 11px; text-transform: uppercase; border-bottom: 1px solid black; }
          td { font-size: 12px; }
          .total-box { margin-top: 15px; border-top: 2px solid black; padding-top: 5px; }
          .footer { font-size: 10px; margin-top: 20px; text-align: center; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="bold" style="font-size: 22px;">MATJARI متجري</div>
          <div style="font-size: 12px; margin-top: 4px;">TICKET D'ACHAT</div>
        </div>
        <div class="hr"></div>
        <div style="font-size: 10px;">
          Date: ${new Date().toLocaleString('fr-FR')} <br/>
          Ticket ID: ${saleId.toUpperCase()} <br/>
          Caissier: ${user?.username || 'Admin'}
        </div>
        ${clientName ? `<div style="font-size: 10px; margin-top: 4px;">Client: <b>${clientName}</b></div>` : ''}
        <div class="hr"></div>
        <table>
          <thead>
            <tr>
              <th style="text-align: left;">Art.</th>
              <th style="text-align: center;">Qté</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="hr"></div>
        <div class="text-right" style="font-size: 11px;">
          Sous-total: ${formatDZD(subtotal)} <br/>
          ${reduction > 0 ? `Réduction: -${formatDZD(reduction)} <br/>` : ''}
        </div>
        <div class="total-box">
          <div class="flex justify-between" style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 2000;">
            <span class="bold">TOTAL:</span>
            <span class="bold">${formatDZD(total)}</span>
          </div>
          ${showCreditDetails && Number(paidNow) > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
              <span>Payé:</span>
              <span>${formatDZD(Number(paidNow))}</span>
            </div>
          ` : ''}
          ${showCreditDetails ? `
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-top: 2px; border-top: 1px solid #ddd;">
              <span class="bold">RESTE (CRÉDIT):</span>
              <span class="bold">${formatDZD(Math.max(0, total - (Number(paidNow) || 0)))}</span>
            </div>
          ` : ''}
        </div>
        <div class="footer">
          Merci pour votre confiance ! <br/>
          À bientôt chez MATJARI متجري
        </div>
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 500);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptContent);
    printWindow.document.close();
    setShowReceiptModal(false);
  };

  const handleClientInput = (val: string) => {
    setClientName(val);
    if (val.length > 0) {
      setMatchingClients(clients.filter(c => c.name.toLowerCase().includes(val.toLowerCase())));
    } else {
      setMatchingClients([]);
    }
  };

  const selectClient = (client: Client) => {
    setClientName(client.name);
    setClientPhone(client.phone);
    setMatchingClients([]);
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row animate-fade-in bg-secondary font-sans">
      <div className="lg:hidden w-full border-b border-border bg-white px-4 pt-4 pb-3 shadow-sm z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">Caisse</h2>
            <p className="text-sm text-muted-foreground">Point de vente</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 font-bold"
            onClick={handleOpenRetour}
          >
            Retour
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          {sectionOptions.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMobileSection(option.id)}
              aria-pressed={mobileSection === option.id}
              className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${mobileSection === option.id ? "bg-primary border-transparent text-white" : "bg-white border-border text-foreground"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {/* Left panel — Products */}
      <div className={`${mobileSection === "cart" ? "hidden" : ""} flex-1 flex flex-col border-b border-border bg-white p-4 lg:flex lg:p-5 lg:border-r lg:border-border lg:bg-white`}>
        <div className="mb-3 hidden items-center justify-between lg:flex">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Caisse</h2>
            <p className="text-sm font-medium text-muted-foreground">Point de vente</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 font-bold"
              onClick={handleOpenRetour}
            >
              Retour de produit
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6 bg-white rounded-xl shadow-sm border border-border">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
          <Input
            placeholder="Rechercher des produits..."
            className="pl-14 bg-transparent border-0 h-16 text-lg focus-visible:ring-0 shadow-none text-foreground"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category filters - mobile */}
        <div className="mobile-scroll-x flex gap-2 overflow-x-auto pb-3 lg:hidden w-full">
          <div className="flex w-full gap-2">
            {dynamicCATEGORIES.map(cat => {
              const catData = dbCategories.find(c => c.key === cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                  className={`flex-1 min-w-[72px] aspect-square rounded-2xl transition-all flex flex-col items-center justify-center p-1 shadow-sm border border-transparent text-white ${activeCategory === cat.key ? 'ring-4 ring-primary scale-[0.98]' : 'hover:-translate-y-0.5'}`}
                  style={{ backgroundColor: catData?.color || '#9DC6D8' }}
                >
                  <div className="font-black text-xs md:text-sm tracking-wider text-center leading-tight line-clamp-1">{cat.labelAr}</div>
                  <span className="font-bold text-[8px] md:text-[9px] opacity-75 tracking-widest text-center uppercase mx-auto line-clamp-1">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-auto rounded-lg mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-2.5 p-1">
            {filteredProducts.map(product => {
              const showCustom = customizableCategories.has(product.category);
              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white border border-border rounded-xl p-4 text-left hover:border-accent hover:shadow-lg transition-all duration-200 group relative flex flex-col min-h-[220px] items-center justify-between cursor-pointer"
                >

                  <span className="absolute top-3 right-3 text-xs font-bold bg-secondary text-muted-foreground px-2 py-1 rounded-md">
                    {product.stock}
                  </span>
                  {showCustom && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); openCustomModal(product); }}
                      className="absolute left-3 top-3 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                      disabled={product.stock <= 0}
                    >
                      <Plus className="h-6 w-6" strokeWidth={2.5} />
                    </button>
                  )}
                  <div className="flex-1 flex items-center justify-center pt-6 pb-2 w-full pointer-events-none">
                    {(() => {
                      const customIcon = getCategoryCustomIcon(product.category);
                      if (customIcon) {
                        return <img src={customIcon} alt="icon" className="h-20 w-20 object-contain drop-shadow-sm group-hover:scale-110 transition-transform opacity-80 group-hover:opacity-100" />;
                      }
                      const ProductIcon = categoryIcons[product.category] || Package;
                      return <ProductIcon className="h-20 w-20 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all drop-shadow-sm" strokeWidth={1} />;
                    })()}
                  </div>
                  <div className="w-full border-t border-border pt-3 flex flex-col h-16 justify-end">
                    <p className="text-sm font-bold text-foreground leading-tight mb-2 line-clamp-2 text-center" title={product.name}>{product.name}</p>
                    <p className="text-xl font-black text-primary text-center">{formatDZD(product.priceSale)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {visibleCustomCards.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-primary">Ventes personnalisées</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {visibleCustomCards.map(card => (
                  <div
                    key={card.id}
                    className="relative border border-border rounded-2xl bg-white p-3 shadow-sm cursor-pointer group hover:border-primary transition-all overflow-hidden"
                    onClick={() => handleCustomCardAdd(card, 1)}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#41b86d] bg-[#41b86d]/5 px-2 py-0.5 rounded-full">{card.category}</p>
                      <span className="text-[10px] font-black text-muted-foreground">{card.kg - getCustomCardPendingKg(card.id)} restants</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-[#3f5362] line-clamp-2">{card.baseProductName}</p>
                    <div className="flex items-end justify-between mt-1">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Prix Unité</p>
                        <p className="text-lg font-black text-primary leading-tight">{formatDZD(card.unitPrice)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openCustomCardModal(card); }}
                        className="h-8 w-8 rounded-full bg-secondary hover:bg-primary hover:text-white transition-colors flex items-center justify-center text-muted-foreground"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category filters */}
        <div className="hidden gap-2 pt-2 border-t border-border pb-2 lg:flex w-full overflow-x-auto">
          <div className="flex w-full gap-2 px-1">
            {dynamicCATEGORIES.map(cat => {
              const catData = dbCategories.find(c => c.key === cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                  className={`flex-1 aspect-square rounded-xl transition-all flex flex-col items-center justify-center p-1.5 shadow-sm border border-transparent text-white ${activeCategory === cat.key ? 'ring-4 ring-primary scale-[0.98]' : 'hover:-translate-y-0.5'}`}
                  style={{ backgroundColor: catData?.color || '#9DC6D8' }}
                >
                  <div className="font-black text-[13px] md:text-[15px] tracking-wider text-center leading-tight line-clamp-1">{cat.labelAr}</div>
                  <span className="font-bold text-[8px] md:text-[9px] opacity-70 tracking-widest text-center uppercase mx-auto line-clamp-1">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right panel — Cart */}
      <div className={`${mobileSection === "products" ? "hidden" : ""} flex w-full flex-col bg-white border-l border-border z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)] lg:flex lg:w-[400px] xl:w-[440px] lg:h-screen lg:sticky lg:top-0`}>
        <div className="flex items-center justify-between p-6 border-b border-border bg-white">
          <h3 className="text-2xl font-black tracking-tight text-foreground">Panier</h3>
          <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-primary px-3 text-lg font-black text-white lg:hidden">
            {mobileCartCount}
          </span>
        </div>

        <div className="p-4 border-b border-border bg-white">
          <Input
            placeholder="Scanner / entrer code-barre..."
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddByBarcode(); }}
            className="h-14 text-lg"
          />
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-auto bg-secondary/30">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCartEmpty />
              <p className="text-sm mt-4 font-medium">Le panier est vide</p>
            </div>
          ) : (
            <div className="divide-y divide-border p-2">
              {cart.map((item, idx) => (
                <div key={`${item.product.id}-${idx}`} className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-border mb-3 group transition-all hover:border-accent">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-foreground truncate">
                      {item.product.name}
                      {item.size && <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[11px] font-black">{item.size}</span>}
                    </p>
                    {item.customUnitPrice ? (
                      <p className="text-xs text-primary mt-1 font-bold">
                        {item.weightKg ?? item.quantity} × {formatDZD(item.customUnitPrice)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">{formatDZD(item.product.priceSale)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product.id, -1)} className="h-10 w-10 rounded-md bg-secondary border border-border flex items-center justify-center hover:bg-muted text-muted-foreground transition-all active:scale-95">
                      <Minus className="h-5 w-5" />
                    </button>
                    <span className="w-10 text-center text-lg font-black text-foreground">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="h-10 w-10 rounded-md bg-secondary border border-border flex items-center justify-center hover:bg-muted text-muted-foreground transition-all active:scale-95">
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3">
                    <p className="text-lg font-black text-foreground">{formatDZD(item.subtotal)}</p>
                    <button onClick={() => removeItem(item.product.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 hover:bg-red-50 rounded-md">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          )}
        </div>

        {/* Totals */}
        <div className="p-6 bg-white border-t border-border space-y-4">
          <div className="flex items-center justify-between text-sm gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowReduction(true)} className="flex-1 h-8 border-dashed text-primary hover:bg-primary/5 hover:text-primary">
              <Plus className="h-4 w-4 mr-1" /> Réduction
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowExpense(true)} className="flex-1 h-8 border-dashed text-orange-500 border-orange-200 hover:bg-orange-50 hover:text-orange-600">
              <Plus className="h-4 w-4 mr-1" /> Dépense
            </Button>
          </div>

          {reduction > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-muted-foreground">Réduction appliquée</span>
              <span className="font-bold tracking-tight text-red-500">-{formatDZD(reduction)}</span>
            </div>
          )}

          <div className="h-px bg-border w-full" />

          <div className="flex justify-between items-end pb-4">
            <div>
              <span className="text-muted-foreground text-sm font-bold uppercase tracking-wider block mb-2">Total à payer</span>
            </div>
            <span className="text-5xl font-black text-primary tracking-tight">{formatDZD(total)}</span>
          </div>

          <Button
            className="w-full h-20 text-2xl font-black bg-primary hover:bg-primary/90 text-white shadow-xl hover:-translate-y-1 transition-all rounded-2xl disabled:opacity-50"
            disabled={cart.length === 0}
            onClick={openCheckout}
          >
            ENCAISSER
          </Button>
        </div>
      </div>

      {/* Checkout modal */}
      <Dialog open={showCheckout} onOpenChange={(open) => { setShowCheckout(open); if (!open) setShowCreditDetails(false); }}>
        <DialogContent className="sm:max-w-xl bg-white border-0 shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
          <DialogHeader className="p-8 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle className="text-3xl font-black text-[#3f5362] uppercase tracking-wide">Encaissement</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="bg-secondary/20 border border-border p-12 rounded-[2rem] flex flex-col items-center justify-center">
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.25em] mb-3">Total à payer</p>
              <p className="text-6xl font-black text-primary tracking-tighter">{formatDZD(total)}</p>
            </div>

            {!showCreditDetails ? (
              <>
                <div className="grid grid-cols-2 gap-6">
                  <Button variant="outline" className="h-44 flex-col gap-4 rounded-3xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-foreground group" onClick={() => handleCheckout('direct')}>
                    <span className="text-2xl font-black group-hover:scale-110 transition-transform">Vente Directe</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Paiement Cash</span>
                  </Button>
                  <Button variant="outline" className="h-44 flex-col gap-4 rounded-3xl border-2 border-primary text-primary hover:bg-primary/5 transition-all group" onClick={() => setShowCreditDetails(true)}>
                    <span className="text-2xl font-black uppercase tracking-widest group-hover:scale-110 transition-transform">Crédit</span>
                    <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">Dette Client</span>
                  </Button>
                </div>
                <div className="pt-4">
                  <Button
                    variant="ghost"
                    className="w-full h-20 border-2 border-dashed border-gray-200 rounded-3xl flex items-center justify-center gap-4 text-gray-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
                    onClick={handlePrintReceipt}
                  >
                    <Printer className="h-8 w-8" />
                    <span className="text-xl font-black uppercase tracking-widest">Imprimer Ticket</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4 pl-1">Informations Crédit</h4>
                  <div className="relative">
                    <Input
                      placeholder="Nom du client..."
                      className="bg-secondary/10 border-gray-200 h-20 text-2xl font-black rounded-2xl px-6 focus:ring-primary shadow-none"
                      value={clientName}
                      onChange={e => handleClientInput(e.target.value)}
                    />
                    {matchingClients.length > 0 && (
                      <div className="absolute top-full left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] mt-2 overflow-hidden border-2">
                        {matchingClients.map(c => (
                          <button
                            key={c.id}
                            className="w-full text-left px-6 py-5 hover:bg-primary/5 hover:text-primary transition-colors text-lg flex justify-between items-center border-b last:border-0 border-gray-50"
                            onClick={() => selectClient(c)}
                          >
                            <span className="font-black">{c.name}</span>
                            <span className="px-3 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-black">DETTE: {formatDZD(c.balance)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input placeholder="Numéro de téléphone" className="bg-secondary/10 border-gray-200 h-16 text-lg font-bold rounded-2xl px-6 shadow-none" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />

                  <div className="space-y-3 pt-6 border-t border-gray-100">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Somme payée maintenant (optionnel)</p>
                    <Input
                      type="number"
                      placeholder="0.00 DZD"
                      className="bg-primary/5 border-primary/20 h-20 text-4xl font-black text-primary rounded-2xl px-6 shadow-none"
                      value={paidNow}
                      onChange={e => setPaidNow(e.target.value)}
                    />
                  </div>

                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div className="flex justify-between text-lg font-black">
                      <span className="text-gray-400 uppercase tracking-widest text-xs mt-1">À ajouter au crédit :</span>
                      <span className="text-red-500 text-3xl tracking-tighter">{formatDZD(Math.max(0, total - (Number(paidNow) || 0)))}</span>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button variant="ghost" className="flex-1 h-20 text-xl font-bold rounded-2xl text-gray-400" onClick={() => setShowCreditDetails(false)}>Précédent</Button>
                    <Button
                      className="flex-[2] h-20 bg-primary hover:bg-primary/90 text-white font-black text-2xl rounded-2xl shadow-xl shadow-primary/20 transition-all hover:-translate-y-1"
                      onClick={() => handleCheckout('credit', Number(paidNow) || 0)}
                      disabled={!clientName}
                    >
                      Confirmer le Crédit
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full h-16 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-3 text-gray-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all mt-2"
                    onClick={handlePrintReceipt}
                  >
                    <Printer className="h-6 w-6" />
                    <span className="text-lg font-black uppercase tracking-widest">Imprimer Ticket</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Size Selection Modal */}
      <Dialog open={showSizeModal} onOpenChange={setShowSizeModal}>
        <DialogContent className="sm:max-w-sm bg-white border-0 shadow-xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-center text-foreground border-b border-border pb-4 mb-2 tracking-tight">Veuillez choisir la Taille</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {(sizeModalProduct && isPointureCategory(sizeModalProduct.category) ? SHOE_SIZES : SHIRT_SIZES).map(size => {
              const qty = sizeModalProduct?.sizeStock?.[size] || 0;

              return (
                <Button
                  key={size}
                  variant="outline"
                  onClick={() => selectSize(size)}
                  disabled={qty <= 0}
                  className="h-24 flex flex-col items-center justify-center rounded-2xl border-2 border-border hover:border-primary hover:bg-primary/5 hover:text-primary transition-all active:scale-95 shadow-sm relative overflow-hidden disabled:opacity-50 disabled:grayscale"
                >

                  <span className="text-2xl font-black">{size}</span>
                  <div className={`mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-full ${qty > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    <span className="text-[10px] font-black uppercase tracking-tight">Stock: {qty}</span>
                  </div>
                </Button>
              );
            })}
          </div>

          <Button variant="ghost" onClick={() => setShowSizeModal(false)} className="w-full mt-2 font-bold text-muted-foreground">Annuler</Button>
        </DialogContent>
      </Dialog>



      {/* Reduction modal */}
      <Dialog open={showReduction} onOpenChange={setShowReduction}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold">Réduction</DialogTitle>
          </DialogHeader>
          <Input type="number" placeholder="Montant en DZD" className="h-11 border-border" value={tempReduction} onChange={e => setTempReduction(e.target.value)} />
          <Button onClick={() => { setReduction(Number(tempReduction) || 0); setShowReduction(false); }} className="w-full h-11 mt-2 bg-primary hover:bg-primary/90 text-white font-black">Appliquer</Button>
        </DialogContent>
      </Dialog>

      {/* Expense modal */}
      <Dialog open={showExpense} onOpenChange={setShowExpense}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold text-orange-600">Ajouter Dépense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input type="number" placeholder="Montant en DZD" className="h-11 border-border" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
            <Input placeholder="Note / Raison" className="h-11 border-border" value={expenseNote} onChange={e => setExpenseNote(e.target.value)} />
            <Button onClick={handleExpenseSubmit} className="w-full h-11 mt-2 bg-orange-500 hover:bg-orange-600 text-white font-black">Enregistrer Dépense</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Sale Creation Modal */}
      <Dialog open={showCustomModal} onOpenChange={open => { if (!open) closeCustomModal(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold">Vente personnalisée</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm font-semibold text-foreground">{customModalProduct?.name}</p>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Quantité d'unités</p>
              <Input
                type="number"
                placeholder="Ex. 25"
                className="h-11 border-border"
                value={customModalKg}
                onChange={e => setCustomModalKg(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Prix unitaire</p>
              <Input
                type="number"
                placeholder="Ex. 1200"
                className="h-11 border-border"
                value={customModalUnitPrice}
                onChange={e => setCustomModalUnitPrice(e.target.value)}
              />
            </div>
            <Button onClick={handleCustomSaleConfirm} className="w-full h-11 mt-2 bg-primary hover:bg-primary/90 text-white font-bold">CRÉER LA CARTE</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Card Usage Modal */}
      <Dialog open={!!activeCustomCard} onOpenChange={open => { if (!open) setActiveCustomCard(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold">Quantité à vendre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-primary/5 p-3 border border-primary/10">
              <p className="text-sm font-bold text-primary">{activeCustomCard?.baseProductName}</p>
              <p className="text-xs text-muted-foreground">Disponible: {activeCustomCard ? activeCustomCard.kg - getCustomCardPendingKg(activeCustomCard.id) : 0} unités</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Combien d'unités ajouter ?</p>
              <Input
                type="number"
                placeholder="Ex. 5"
                className="h-12 border-border text-lg font-bold"
                value={customCardKg}
                onChange={e => setCustomCardKg(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              onClick={() => handleCustomCardAdd(activeCustomCard!, Number(customCardKg))}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold text-lg"
              disabled={!customCardKg || Number(customCardKg) <= 0}
            >
              AJOUTER AU PANIER
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Retour Modal */}
      <Dialog open={showRetour} onOpenChange={setShowRetour}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-[2rem] border-0 shadow-2xl">
          <DialogHeader className="p-8 border-b border-gray-100 bg-orange-50/50">
            <DialogTitle className="text-3xl font-black text-orange-600 uppercase tracking-wide">Retour de Produit</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-8">
            {!selectedSaleForReturn ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Rechercher un produit, Ticket ou Client</p>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                    <Input
                      placeholder="Saisissez le nom du produit, le #ID du ticket..."
                      className="pl-14 h-16 rounded-2xl border-gray-200 text-lg shadow-sm focus:ring-orange-500"
                      value={retourProductSearch}
                      onChange={e => setRetourProductSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="grid gap-3">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Historique des ventes</p>

                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-xl shadow-gray-100/50">
                    {(() => {
                      const filteredSales = recentSales.filter(s => s.type !== 'return');

                      const saleItems = filteredSales.flatMap(sale =>
                        sale.items.map((item, idx) => ({
                          sale,
                          item,
                          itemIdx: idx,
                          clientName: clients.find(c => c.id === sale.clientId)?.name || 'Client Direct'
                        }))
                      ).filter(record =>
                        !retourProductSearch ||
                        record.item.product.name.toLowerCase().includes(retourProductSearch.toLowerCase()) ||
                        record.sale.id.toLowerCase().includes(retourProductSearch.toLowerCase()) ||
                        record.sale.id.toUpperCase().slice(-6).includes(retourProductSearch.toUpperCase()) ||
                        record.clientName.toLowerCase().includes(retourProductSearch.toLowerCase())
                      );

                      if (recentSales.length === 0) {
                        return <div className="p-12 text-center text-gray-400 font-medium italic">Chargement des ventes... (ou aucune vente en base)</div>;
                      }

                      if (saleItems.length === 0) {
                        return (
                          <div className="p-12 text-center text-gray-400 font-medium italic">
                            {retourProductSearch ? "Aucun produit trouvé pour cette recherche." : "Aucune vente enregistrée."}
                          </div>
                        );
                      }

                      return saleItems.map((record, i) => (
                        <div key={`${record.sale.id}-${record.item.product.id}-${i}`} className="p-5 flex items-center justify-between hover:bg-orange-50/20 group transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-black text-gray-700 truncate">{record.item.product.name}</span>
                              {record.item.size && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-black">{record.item.size}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 font-bold">
                              <span>Ticket #{record.sale.id.toUpperCase()}</span>
                              <span>•</span>
                              <span>{record.clientName}</span>
                              <span>•</span>
                              <span className={`px-1.5 py-0.5 rounded-md ${record.sale.type === 'credit' ? 'text-red-500 bg-red-50' : 'text-emerald-500 bg-emerald-50'}`}>
                                {record.sale.type.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="font-black text-gray-700">{formatDZD(record.item.subtotal)}</p>
                              <p className="text-[10px] font-bold text-gray-400">Qté: {record.item.quantity}</p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => selectSaleForReturn(record.sale)}
                              className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-600 hover:text-white font-bold h-10 px-4"
                            >
                              Retourner
                            </Button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-orange-600 uppercase tracking-widest">Ticket Sélectionné</p>
                    <p className="text-xl font-black text-gray-700 mt-1">#{selectedSaleForReturn.id.toUpperCase()}</p>
                    <p className="text-sm font-bold text-gray-500">{new Date(selectedSaleForReturn.date).toLocaleString('fr-FR')}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedSaleForReturn(null)} className="text-orange-600 font-bold">Changer</Button>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Produits à retourner</p>
                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-2xl overflow-hidden bg-white">
                    {selectedSaleForReturn.items.map((item, idx) => {
                      const key = `${item.product.id}-${idx}`;
                      const currentVal = returnQtys[key] || 0;
                      return (
                        <div key={key} className="p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-gray-700">{item.product.name} {item.size ? `(${item.size})` : ''}</p>
                            <p className="text-xs text-gray-400">Total acheté: {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setReturnQtys(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))}
                                className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-orange-50 hover:text-orange-600 transition-colors"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center font-black text-lg">{currentVal}</span>
                              <button
                                onClick={() => setReturnQtys(prev => ({ ...prev, [key]: Math.min(item.quantity, prev[key] + 1) }))}
                                className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-orange-50 hover:text-orange-600 transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="w-24 text-right">
                              <p className="font-black text-orange-600">{formatDZD(currentVal * (item.customUnitPrice ?? item.product.priceSale))}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <Button variant="ghost" className="flex-1 h-16 text-lg font-bold rounded-xl" onClick={() => setShowRetour(false)}>Annuler</Button>
                  <Button
                    className="flex-[2] h-16 bg-orange-600 hover:bg-orange-700 text-white font-black text-xl rounded-xl shadow-xl shadow-orange-200 transition-all hover:-translate-y-1"
                    onClick={handleReturnSubmit}
                  >
                    Confirmer le Retour
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-[400px] bg-gray-100 p-0 overflow-hidden border-0">
          <div className="bg-white mx-auto my-6 p-6 shadow-lg min-h-[500px] w-[350px] font-mono text-black relative flex flex-col">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black">MATJARI متجري</h2>
              <p className="text-xs uppercase tracking-widest mt-1">Ticket d'achat</p>
            </div>

            <div className="border-b border-dashed border-black my-3" />

            <div className="text-[10px] space-y-0.5">
              <p>Date: {new Date().toLocaleString('fr-FR')}</p>
              <p>Ticket ID: {currentSaleId.toUpperCase()}</p>
              <p>Vendeur: {user?.username || 'Admin'}</p>
              {clientName && <p className="font-bold mt-1">Client: {clientName}</p>}
            </div>

            <div className="border-b border-dashed border-black my-3" />

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="pb-1">Art.</th>
                  <th className="pb-1 text-center">Qté</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cart.map((item, i) => (
                  <tr key={i}>
                    <td className="py-1 line-clamp-1">{item.product.name} {item.size ? `(${item.size})` : ''}</td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">{formatDZD(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-b border-dashed border-black my-3" />

            <div className="text-right text-xs space-y-1">
              <p>Sous-total: {formatDZD(subtotal)}</p>
              {reduction > 0 && <p>Réduction: -{formatDZD(reduction)}</p>}
              <div className="flex justify-between items-center text-lg font-black pt-2 border-t border-black mt-2">
                <span>TOTAL:</span>
                <span>{formatDZD(total)}</span>
              </div>
              {showCreditDetails && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex justify-between font-bold">
                    <span>Payé:</span>
                    <span>{formatDZD(Number(paidNow) || 0)}</span>
                  </div>
                  <div className="flex justify-between font-black text-red-600 mt-1">
                    <span>Reste (Crédit):</span>
                    <span>{formatDZD(Math.max(0, total - (Number(paidNow) || 0)))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-8 text-center text-[10px] italic">
              Merci pour votre visite ! <br />
              À bientôt chez MATJARI متجري
            </div>
          </div>

          <div className="bg-white p-4 border-t border-gray-200 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowReceiptModal(false)}>Annuler</Button>
            <Button className="flex-1 bg-black hover:bg-gray-800 text-white" onClick={executePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Confirmer & Imprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShoppingCartEmpty() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl animate-pulse" />
      <Package className="h-16 w-16 text-primary/10 relative" strokeWidth={1} />
    </div>
  );
}
