import { useEffect, useMemo, useState, Fragment } from "react";
import { getSales, getPayments, getClients } from "@/lib/db";
import { Sale, Payment, Client } from "@/lib/types";
import { formatDZD } from "@/lib/store";
import { Input } from "@/components/ui/input";

export default function AnalytiquePage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [day, setDay] = useState<string>("");
  const [mobileView, setMobileView] = useState<"kpis" | "history">("kpis");

  useEffect(() => {
    getClients().then(setClients).catch(console.error);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const prefix = day ? `${month}-${day.padStart(2, "0")}` : month;
        const [salesData, paymentsData] = await Promise.all([
          getSales(prefix),
          getPayments(prefix)
        ]);
        setSales(salesData);
        setPayments(paymentsData);
      } catch (error) {
        console.error("Error loading analytics data:", error);
      }
    };
    loadData();
  }, [month, day]);

  const monthlySales = sales;

  const daysInMonth = useMemo(() => {
    const [year, m] = month.split("-").map(Number);
    const totalDays = new Date(year, m, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) =>
      String(i + 1).padStart(2, "0")
    );
  }, [month]);

  const getItemPurchaseCost = (item: (typeof sales)[number]["items"][number]) => {
    const unitCost = item.customUnitCost ?? item.product.priceBuy;
    return unitCost * item.quantity;
  };

  const monthlyPayments = payments;

  const totalRevenue = monthlySales.reduce((s, sale) => s + sale.total, 0);
  const totalPaymentCredits = monthlyPayments.reduce((s, p) => s + p.amount, 0);
  const directCash = monthlySales.reduce((s, sale) => s + (sale.paidAmount || 0), 0);
  const venteEncaisser = directCash + totalPaymentCredits;
  const venteCredit = totalRevenue - venteEncaisser;
  const totalCost = monthlySales.reduce((s, sale) => {
    return s + sale.items.reduce((is, item) => is + getItemPurchaseCost(item), 0);
  }, 0);
  const profit = totalRevenue - totalCost;
  const totalCaisse = venteEncaisser;

  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const dailyGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        revenue: number;
        cost: number;
        creditCount: number;
        directCount: number;
        paymentCredits: number;
        productNames: Set<string>;
        sales: typeof monthlySales;
        payments: (Payment & { clientName: string })[];
      }
    >();

    monthlySales.forEach(sale => {
      const dayKey = sale.date.slice(0, 10);
      const existing = map.get(dayKey) || {
        date: dayKey,
        revenue: 0,
        cost: 0,
        creditCount: 0,
        directCount: 0,
        paymentCredits: 0,
        productNames: new Set<string>(),
        sales: [],
        payments: []
      };

      existing.revenue += sale.total;
      existing.cost += sale.items.reduce((s, i) => s + getItemPurchaseCost(i), 0);
      if (sale.type === "credit") {
        existing.creditCount += 1;
      } else {
        existing.directCount += 1;
      }

      sale.items.forEach(item => existing.productNames.add(item.product.name));
      existing.sales.push(sale);
      map.set(dayKey, existing);
    });

    monthlyPayments.forEach(p => {
      const dayKey = p.date.slice(0, 10);
      const existing = map.get(dayKey) || {
        date: dayKey,
        revenue: 0,
        cost: 0,
        creditCount: 0,
        directCount: 0,
        paymentCredits: 0,
        productNames: new Set<string>(),
        sales: [],
        payments: []
      };
      existing.paymentCredits += p.amount;
      existing.payments.push({
        ...p,
        clientName: clients.find(c => c.id === p.clientId)?.name ?? "Client inconnu"
      });
      map.set(dayKey, existing);
    });

    const groups = Array.from(map.values()).map(group => ({
      ...group,
      productList: Array.from(group.productNames),
      profit: group.revenue - group.cost,
    }));

    groups.forEach(group => {
      group.sales.sort((a, b) => a.date.localeCompare(b.date));
    });

    return groups.sort((a, b) => a.date.localeCompare(b.date));
  }, [monthlySales, monthlyPayments, clients]);

  return (
    <div className="p-8 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#3f5362]">Analytique</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="month"
            className="w-full max-w-[220px] bg-white border-gray-200 h-12 shadow-sm rounded-xl font-bold focus-visible:ring-0 text-[#3f5362]"
            value={month}
            onChange={e => { setMonth(e.target.value); setDay(""); }}
          />
          <div className="relative flex items-center">
            <select
              className="appearance-none w-48 h-12 px-4 pr-9 bg-white border border-gray-200 rounded-xl font-bold text-[#3f5362] shadow-sm focus:outline-none focus:ring-0 text-sm cursor-pointer"
              value={day}
              onChange={e => setDay(e.target.value)}
            >
              <option value="">Tout le mois</option>
              {daysInMonth.map(d => (
                <option key={d} value={d}>
                  {new Date(`${month}-${d}`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 text-gray-400 text-xs">▾</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center animate-scale-in">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Ventes Totales</p>
          <p className="text-4xl font-black text-[#3f5362] tracking-tighter">{formatDZD(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center animate-scale-in" style={{ animationDelay: '100ms' }}>
          <p className="text-[10px] font-bold text-[#41b86d] uppercase tracking-widest mb-2">Vente Encaissée</p>
          <p className="text-4xl font-black text-[#41b86d] tracking-tighter">{formatDZD(venteEncaisser)}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center animate-scale-in" style={{ animationDelay: '200ms' }}>
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">Vente Crédit</p>
          <p className="text-4xl font-black text-red-500 tracking-tighter">{formatDZD(venteCredit)}</p>
        </div>
        <div className={`rounded-2xl p-6 shadow-sm border flex flex-col justify-center animate-scale-in bg-white`} style={{ animationDelay: '300ms', borderColor: '#e6f4ea' }}>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${profit >= 0 ? 'text-[#16a34a]' : 'text-red-500'}`}>Bénéfices</p>
          <p className={`text-4xl font-black tracking-tighter ${profit >= 0 ? 'text-[#16a34a]' : 'text-red-500'}`}>{formatDZD(profit)}</p>
          {totalRevenue > 0 && (
            <p className="text-[11px] mt-2 text-gray-500">Marge: {(profit / totalRevenue * 100).toFixed(1)}%</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100">
          <h4 className="font-bold text-sm text-[#3f5362]">
            Historique des Ventes — {day ? new Date(`${month}-${day}`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : month}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white">
              <tr>
                <th className="text-left px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Date / Client</th>
                <th className="text-center px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Statistiques</th>
                <th className="text-left px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Produits</th>
                <th className="text-right px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400">Recette</th>
              </tr>
            </thead>
            <tbody>
              {dailyGroups.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-16 text-gray-400 font-medium">Aucune activité ce mois</td></tr>
              ) : (
                dailyGroups.map(group => {
                  const isOpen = expandedDates.includes(group.date);
                  const displayDate = new Date(group.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

                  return (
                    <Fragment key={group.date}>
                      <tr
                        className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                        onClick={() => toggleDate(group.date)}
                      >
                        <td className="px-6 py-4">
                          <p className="text-[#3f5362] font-black">{displayDate}</p>
                          <p className="text-[10px] text-gray-400 uppercase">{group.sales.length} ventes</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-[#41b86d]/10 text-[#41b86d] text-[10px] font-black">{group.directCount} DIRECT</span>
                            {group.creditCount > 0 && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-[10px] font-black">{group.creditCount} CRÉDIT</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-600 line-clamp-1">
                          {group.productList.join(", ")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-black text-[#3f5362]">{formatDZD(group.revenue)}</span>
                          {group.paymentCredits > 0 && (
                            <p className="text-[10px] text-[#41b86d] font-black">+ {formatDZD(group.paymentCredits)} payés</p>
                          )}
                        </td>
                      </tr>
                      {isOpen && group.sales.map(sale => (
                        <tr key={sale.id} className="bg-gray-50/30 border-t border-gray-100">
                          <td className="px-10 py-3 text-xs text-gray-500">
                            {new Date(sale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {sale.username && <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Par {sale.username}</span>}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded ${sale.type === 'credit' ? 'bg-red-50 text-red-500' : 'bg-[#41b86d]/10 text-[#41b86d]'}`}>
                              {sale.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-600 italic">
                            {sale.items.map(i => i.product.name).join(", ")}
                          </td>
                          <td className="px-6 py-3 text-right font-black text-gray-600">
                            {formatDZD(sale.total)}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
