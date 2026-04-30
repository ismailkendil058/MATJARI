import { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Plus, Minus, Trash2, Package, Cigarette, Cookie, CupSoda, Grid, Candy, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getClients, saveClients, updateClientCredit, addSale,
  getProducts, updateProductStock, getCustomCards, saveCustomCards
} from "@/lib/db";
import { Product, CartItem, CategoryType, CustomSaleCard, Client, Sale } from "@/lib/types";
import { CATEGORIES, formatDZD, generateId } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
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
  cigarettes: "bg-[#be123c] hover:bg-[#9f1239] text-white", // Red
  chemma: "bg-[#713f12] hover:bg-[#451a03] text-white", // Brown
  chocolates: "bg-[#7e22ce] hover:bg-[#6b21a8] text-white", // Purple
  drinks: "bg-[#0369a1] hover:bg-[#075985] text-white", // Blue
  snacks: "bg-[#f59e0b] hover:bg-[#d97706] text-white", // Amber/Gold
  cosmetics: "bg-[#db2777] hover:bg-[#be185d] text-white", // Pink
  divers: "bg-[#4b5563] hover:bg-[#374151] text-white", // Grey
};

const customizableCategories = new Set<CategoryType>(["cigarettes", "drinks"]);

export default function CaissePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryType | null>("cigarettes");
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
  const [customModalProduct, setCustomModalProduct] = useState<Product | null>(null);
  const [customModalKg, setCustomModalKg] = useState("");
  const [customModalUnitPrice, setCustomModalUnitPrice] = useState("");
  const [activeCustomCard, setActiveCustomCard] = useState<CustomSaleCard | null>(null);
  const [customCardKg, setCustomCardKg] = useState("");

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
        const [prods, cards, cls] = await Promise.all([
          getProducts(),
          getCustomCards(),
          getClients()
        ]);
        setProducts(prods);
        setCustomCards(cards);
        setClients(cls);
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

  const normalProductCartQty = (productId: string) => {
    return cart.reduce((sum, item) => {
      if (item.product.id !== productId || item.customUnitPrice) return sum;
      return sum + item.quantity;
    }, 0);
  };

  const addToCart = useCallback((product: Product) => {
    const qtyInCart = normalProductCartQty(product.id);
    if (product.stock <= qtyInCart) return false;
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id && !c.customUnitPrice);
      if (existing) {
        return prev.map(c => c.product.id === product.id && !c.customUnitPrice
          ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * product.priceSale }
          : c
        );
      }
      return [...prev, { product, quantity: 1, subtotal: product.priceSale }];
    });
    return true;
  }, [cart]);

  const handleAddByBarcode = (code?: string) => {
    const val = (code ?? barcodeInput).trim();
    if (!val) return;
    const found = products.find(p => p.barcode === val);
    if (!found) {
      toast({ title: "Produit non trouvé", description: "Aucun produit avec ce code-barre." });
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
      const saleId = generateId();
      for (const item of cart) {
        if (item.customCardId) continue; // Already deducted from stock when card was created
        const productId = item.customBaseProductId ?? item.product.id;
        await updateProductStock(productId, -item.quantity);
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
        </div>

        {/* Search */}
        <div className="relative mb-4 bg-white rounded-md shadow-sm border border-border">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher des produits..."
            className="pl-11 bg-transparent border-0 h-11 text-sm focus-visible:ring-0 shadow-none text-foreground"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category filters - mobile */}
        <div className="mobile-scroll-x flex gap-2 overflow-x-auto pb-3 lg:hidden">
          <div className="flex min-w-max gap-2">
            {CATEGORIES.map(cat => {
              const CategoryIcon = categoryIcons[cat.key];

              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                  className={`min-w-[108px] md:min-w-[116px] flex-shrink-0 py-4 md:min-h-[84px] rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm border border-transparent ${categoryColors[cat.key]} ${activeCategory === cat.key ? 'ring-4 ring-black/10 scale-[0.98]' : 'hover:-translate-y-0.5'}`}
                >
                  <CategoryIcon className="hidden md:block h-7 w-[35px]" strokeWidth={2.2} />
                  <div className="text-[9px] md:text-[9px] opacity-80 uppercase tracking-wider">{cat.labelAr}</div>
                  <span className="font-semibold text-xs md:text-sm tracking-wide text-center leading-tight max-w-[72px] whitespace-normal">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-auto rounded-lg mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-2.5 p-1">
            {filteredProducts.map(product => {
              const Icon = categoryIcons[product.category] || Package;
              const showCustom = customizableCategories.has(product.category);
              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white border border-border rounded-lg p-2.5 md:p-2.5 text-left hover:border-accent hover:shadow-md transition-all duration-200 group relative flex flex-col min-h-[172px] md:min-h-[160px] items-center justify-between cursor-pointer"
                >
                  <span className="absolute top-2 right-2 text-[10px] font-semibold bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">
                    {product.stock}
                  </span>
                  {showCustom && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); openCustomModal(product); }}
                      className="absolute left-2 top-2 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                      disabled={product.stock <= 0}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} />
                    </button>
                  )}
                  <div className="flex-1 flex items-center justify-center pt-3 pb-1 w-full pointer-events-none">
                    <Icon className="h-11 w-11 md:h-[54px] md:w-[54px] text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all drop-shadow-sm" strokeWidth={1.5} />
                  </div>
                  <div className="w-full border-t border-border pt-2 flex flex-col h-12 justify-end">
                    <p className="text-[11px] md:text-[11px] font-medium text-foreground leading-tight mb-1 line-clamp-2 text-center" title={product.name}>{product.name}</p>
                    <p className="text-sm font-bold text-primary text-center">{formatDZD(product.priceSale)}</p>
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
        <div className="mobile-scroll-x hidden gap-2 overflow-x-auto pt-2 border-t border-border pb-1 lg:flex">
          <div className="flex min-w-max gap-2 md:mx-auto">
            {CATEGORIES.map(cat => {
              const CategoryIcon = categoryIcons[cat.key];

              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                  className={`min-w-[108px] md:min-w-[116px] flex-shrink-0 py-4 md:min-h-[84px] rounded-lg transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm border border-transparent ${categoryColors[cat.key]} ${activeCategory === cat.key ? 'ring-4 ring-black/10 scale-[0.98]' : 'hover:-translate-y-0.5'}`}
                >
                  <CategoryIcon className="hidden md:block h-7 w-[35px]" strokeWidth={2.2} />
                  <div className="text-[9px] md:text-[9px] opacity-80 uppercase tracking-wider">{cat.labelAr}</div>
                  <span className="font-semibold text-xs md:text-sm tracking-wide text-center leading-tight max-w-[72px] whitespace-normal">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right panel — Cart */}
      <div className={`${mobileSection === "products" ? "hidden" : ""} flex w-full flex-col bg-white border-l border-border z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)] lg:flex lg:w-[400px] xl:w-[440px] lg:h-screen lg:sticky lg:top-0`}>
        <div className="flex items-center justify-between p-5 border-b border-border bg-white">
          <h3 className="text-xl font-bold tracking-tight text-foreground">Panier</h3>
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2 text-sm font-bold text-white lg:hidden">
            {mobileCartCount}
          </span>
        </div>

        <div className="p-3 border-b border-border bg-white">
          <Input
            placeholder="Scanner / entrer code-barre et Appuyer Entrée"
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddByBarcode(); }}
            className="h-10"
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
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm border border-border mb-2 group transition-all hover:border-accent">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                    {item.customUnitPrice ? (
                      <p className="text-[10px] text-primary mt-1 font-semibold">
                        {item.weightKg ?? item.quantity} × {formatDZD(item.customUnitPrice)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDZD(item.product.priceSale)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product.id, -1)} className="h-7 w-7 rounded-sm bg-secondary border border-border flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-foreground">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="h-7 w-7 rounded-sm bg-secondary border border-border flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <p className="text-sm font-bold text-foreground">{formatDZD(item.subtotal)}</p>
                    <button onClick={() => removeItem(item.product.id)} className="text-muted-foreground hover:text-destructive transition-colors bg-white">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="p-6 bg-white border-t border-border space-y-4">


          <div className="h-px bg-border w-full" />

          <div className="flex justify-between items-end pb-2">
            <div>
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider block mb-1">Total à payer</span>
            </div>
            <span className="text-3xl font-black text-primary tracking-tight">{formatDZD(total)}</span>
          </div>

          <Button
            className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-lg hover:-translate-y-0.5 transition-all rounded-lg disabled:opacity-50"
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)}
          >
            ENCAISSER
          </Button>
        </div>
      </div>

      {/* Checkout modal */}
      <Dialog open={showCheckout} onOpenChange={(open) => { setShowCheckout(open); if (!open) setShowCreditDetails(false); }}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold border-b border-border pb-3">Encaissement</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="bg-secondary/20 border border-border p-6 rounded-xl">
              <p className="text-center text-3xl font-black text-primary">{formatDZD(total)}</p>
            </div>

            {!showCreditDetails ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-20 flex-col gap-2 rounded-xl border-border hover:border-primary hover:bg-primary/5 transition-all text-foreground" onClick={() => handleCheckout('direct')}>
                    <span className="text-sm font-bold">Vente Directe</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2 rounded-xl border-primary text-primary hover:bg-primary/5 transition-all" onClick={() => setShowCreditDetails(true)}>
                    <span className="text-sm font-bold uppercase tracking-widest">Crédit</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Informations Crédit</h4>
                  <div className="relative">
                    <Input
                      placeholder="Nom du client"
                      className="bg-secondary/20 border-border h-11"
                      value={clientName}
                      onChange={e => handleClientInput(e.target.value)}
                    />
                    {matchingClients.length > 0 && (
                      <div className="absolute top-full left-0 w-full bg-white border border-border rounded-xl shadow-lg z-[100] mt-1 overflow-hidden">
                        {matchingClients.map(c => (
                          <button
                            key={c.id}
                            className="w-full text-left px-4 py-3 hover:bg-secondary/50 text-sm flex justify-between items-center"
                            onClick={() => selectClient(c)}
                          >
                            <span className="font-bold">{c.name}</span>
                            <span className="text-xs text-red-500 font-black">Reste: {formatDZD(c.balance)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input placeholder="Numéro de téléphone" className="bg-secondary/20 border-border h-11" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />

                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Somme payée maintenant (0 si tout à crédit)</p>
                    <Input
                      type="number"
                      placeholder="0 DZD"
                      className="bg-secondary/20 border-border h-11 text-lg font-black"
                      value={paidNow}
                      onChange={e => setPaidNow(e.target.value)}
                    />
                  </div>

                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-muted-foreground">À ajouter au crédit:</span>
                      <span className="text-red-600 font-black">{formatDZD(Math.max(0, total - (Number(paidNow) || 0)))}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" className="flex-1 h-12 font-bold" onClick={() => setShowCreditDetails(false)}>Retour</Button>
                    <Button
                      className="flex-[2] h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg"
                      onClick={() => handleCheckout('credit', Number(paidNow) || 0)}
                      disabled={!clientName}
                    >
                      Confirmer le Crédit
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
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
