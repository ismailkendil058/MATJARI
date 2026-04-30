import { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getProducts } from "@/lib/db";
import { Product } from "@/lib/types";
import { formatDZD, CATEGORIES } from "@/lib/store";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function InventairePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadData = async () => {
      try {
        const prods = await getProducts();
        setProducts(prods);
      } catch (error) {
        console.error("Error loading inventory:", error);
      }
    };
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = !catFilter || p.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, catFilter]);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#eef5f4] px-4 pb-6 pt-5 text-gray-800">
        <div className="mx-auto max-w-md space-y-5">
          <div className="rounded-[2rem] bg-[#243740] px-5 py-5 text-white shadow-[0_18px_40px_rgba(36,55,64,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Inventaire</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Stock mobile</h2>
                <p className="mt-1 text-sm text-white/70">{filtered.length} produit{filtered.length !== 1 ? "s" : ""} visible{filtered.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">Alertes</p>
                <p className="text-lg font-black">{filtered.filter(product => product.stock <= 5).length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher un produit..."
                className="h-12 rounded-2xl border-gray-200 bg-[#f7fbfa] pl-11 text-sm font-medium shadow-none focus-visible:ring-0"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="mobile-scroll-x mt-4 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCatFilter("")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors ${!catFilter ? "bg-[#41b86d] text-white" : "bg-[#eef5f4] text-[#3f5362]"}`}
              >
                Toutes
              </button>
              {CATEGORIES.map(category => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setCatFilter(category.key)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors ${catFilter === category.key ? "bg-[#243740] text-white" : "bg-[#eef5f4] text-[#3f5362]"}`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-[#c9dcda] bg-white px-4 py-10 text-center text-sm font-medium text-gray-400">
                Aucun produit ne correspond aux filtres.
              </div>
            ) : (
              filtered.map(product => {
                const category = CATEGORIES.find(item => item.key === product.category);
                return (
                  <article key={product.id} className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black leading-tight text-[#243740]">{product.name}</p>
                        <div className="mt-2 inline-flex rounded-full bg-[#eef5f4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#628b9a]">
                          {category?.label}
                        </div>
                      </div>
                      <div className={`rounded-2xl px-3 py-2 text-center ${product.stock <= 5 ? "bg-red-50 text-red-500" : "bg-[#ecf8f0] text-[#41b86d]"}`}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Stock</p>
                        <p className="text-lg font-black">{product.stock}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#f7fbfa] px-3 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Prix vente</p>
                        <p className="mt-1 text-sm font-black text-[#41b86d]">{formatDZD(product.priceSale)}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f7fbfa] px-3 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Unité</p>
                        <p className="mt-1 text-sm font-black text-[#243740]">{product.unit}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-[#f7fbfa] px-3 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Péremption</p>
                      <p className="mt-1 text-sm font-semibold text-gray-600">
                        {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString("fr-FR") : "Aucune date"}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="mb-12">
        <h2 className="text-5xl font-black tracking-tight text-[#3f5362]">Inventaire</h2>
      </div>

      <div className="flex gap-6 mb-8">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400" />
          <Input placeholder="Rechercher un produit..." className="pl-16 bg-white border-gray-200 h-16 shadow-sm rounded-2xl focus-visible:ring-0 text-lg font-bold" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-6 py-2 h-16 bg-white rounded-2xl shadow-sm border border-gray-200 text-lg font-black text-gray-600 focus:outline-none min-w-[240px]" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Produit</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Catégorie</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Stock</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Prix de vente</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Unité</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Péremption</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const cat = CATEGORIES.find(c => c.key === p.category);
              return (
                <tr key={p.id} className="border-b last:border-0 border-gray-50 hover:bg-[#f0fbf4]/40 transition-colors">
                  <td className="px-8 py-6 font-black text-gray-700 text-center text-lg">{p.name}</td>
                  <td className="px-8 py-6 font-bold text-gray-500 text-center">
                    <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-black uppercase tracking-widest">{cat?.label}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-4 py-2 rounded-xl text-xl font-black ${p.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100/50 text-green-700'}`}>{p.stock}</span>
                  </td>
                  <td className="px-8 py-6 text-center font-black text-2xl text-primary">{formatDZD(p.priceSale)}</td>
                  <td className="px-8 py-6 text-gray-400 font-black uppercase tracking-[0.15em] text-xs text-center">{p.unit}</td>
                  <td className="px-8 py-6 text-gray-500 font-bold text-center">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('fr-FR') : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-gray-400 text-xl font-bold uppercase tracking-widest">Aucun produit trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
