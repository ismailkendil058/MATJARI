import { useEffect, useMemo, useState, Fragment } from "react";
import { getSales, getPayments, getClients, getExpenses } from "@/lib/db";
import { Sale, Payment, Client, Expense } from "@/lib/types";
import { formatDZD } from "@/lib/store";
import { Input } from "@/components/ui/input";

export default function AnalytiquePage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
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
        const [salesData, paymentsData, expensesData] = await Promise.all([
          getSales(prefix),
          getPayments(prefix),
          getExpenses(prefix)
        ]);
        setSales(salesData);
        setPayments(paymentsData);
        setExpenses(expensesData);
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
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const directCash = monthlySales.reduce((s, sale) => s + (sale.paidAmount || 0), 0);
  const venteEncaisser = directCash + totalPaymentCredits - totalExpenses;
  const venteCredit = totalRevenue - (directCash + totalPaymentCredits);
  const totalCost = monthlySales.reduce((s, sale) => {
    return s + sale.items.reduce((is, item) => is + getItemPurchaseCost(item), 0);
  }, 0);
  const totalReduction = monthlySales.reduce((s, sale) => s + (sale.reduction || 0), 0);
  const profit = totalRevenue - totalCost - totalExpenses;
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
        expenseAmount: number;
        totalReduction: number;
        productNames: Set<string>;
        sales: typeof monthlySales;
        payments: (Payment & { clientName: string })[];
        expenses: Expense[];
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
        expenseAmount: 0,
        totalReduction: 0,
        productNames: new Set<string>(),
        sales: [],
        payments: [],
        expenses: []
      };

      existing.revenue += sale.total;
      existing.cost += sale.items.reduce((s, i) => s + getItemPurchaseCost(i), 0);
      existing.totalReduction = (existing.totalReduction || 0) + (sale.reduction || 0);
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
        expenseAmount: 0,
        totalReduction: 0,
        productNames: new Set<string>(),
        sales: [],
        payments: [],
        expenses: []
      };
      existing.paymentCredits += p.amount;
      existing.payments.push({
        ...p,
        clientName: clients.find(c => c.id === p.clientId)?.name ?? "Client inconnu"
      });
      map.set(dayKey, existing);
    });

    expenses.forEach(e => {
      const dayKey = e.date.slice(0, 10);
      const existing = map.get(dayKey) || {
        date: dayKey,
        revenue: 0,
        cost: 0,
        creditCount: 0,
        directCount: 0,
        paymentCredits: 0,
        expenseAmount: 0,
        totalReduction: 0,
        productNames: new Set<string>(),
        sales: [],
        payments: [],
        expenses: []
      };
      existing.expenseAmount += e.amount;
      existing.expenses.push(e);
      map.set(dayKey, existing);
    });

    const groups = Array.from(map.values()).map(group => ({
      ...group,
      productList: Array.from(group.productNames),
      profit: group.revenue - group.cost - group.expenseAmount,
    }));

    groups.forEach(group => {
      group.sales.sort((a, b) => a.date.localeCompare(b.date));
    });

    return groups.sort((a, b) => a.date.localeCompare(b.date));
  }, [monthlySales, monthlyPayments, clients]);

  return (
    <div className="p-8 lg:p-12 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-12">
        <div>
          <h2 className="text-5xl font-black tracking-tight text-[#3f5362]">Analytique</h2>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Input
            type="month"
            className="w-full max-w-[280px] bg-white border-gray-200 h-16 shadow-sm rounded-2xl font-black focus-visible:ring-0 text-[#3f5362] text-xl"
            value={month}
            onChange={e => { setMonth(e.target.value); setDay(""); }}
          />
          <div className="relative flex items-center">
            <select
              className="appearance-none w-64 h-16 px-6 pr-12 bg-white border border-gray-200 rounded-2xl font-black text-[#3f5362] shadow-sm focus:outline-none focus:ring-0 text-lg cursor-pointer"
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
            <span className="pointer-events-none absolute right-6 text-gray-400 text-sm">▾</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-center animate-scale-in">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Ventes Totales</p>
          <p className="text-4xl lg:text-5xl font-black text-[#3f5362] tracking-tighter">{formatDZD(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-center animate-scale-in" style={{ animationDelay: '100ms' }}>
          <p className="text-xs font-black text-[#41b86d] uppercase tracking-widest mb-3">Vente Encaissée</p>
          <p className="text-4xl lg:text-5xl font-black text-[#41b86d] tracking-tighter">{formatDZD(venteEncaisser)}</p>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-center animate-scale-in" style={{ animationDelay: '200ms' }}>
          <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-3">Vente Crédit</p>
          <p className="text-4xl lg:text-5xl font-black text-red-500 tracking-tighter">{formatDZD(venteCredit)}</p>
        </div>
        <div className={`rounded-3xl p-8 shadow-sm border flex flex-col justify-center animate-scale-in bg-white`} style={{ animationDelay: '300ms', borderColor: '#e6f4ea' }}>
          <p className={`text-xs font-black uppercase tracking-widest mb-3 ${profit >= 0 ? 'text-[#16a34a]' : 'text-red-500'}`}>Bénéfices</p>
          <p className={`text-4xl lg:text-5xl font-black tracking-tighter ${profit >= 0 ? 'text-[#16a34a]' : 'text-red-500'}`}>{formatDZD(profit)}</p>
          {totalRevenue > 0 && (
            <p className="text-sm mt-3 text-gray-500 font-bold">Marge: {(profit / totalRevenue * 100).toFixed(1)}%</p>
          )}
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-sm border flex flex-col justify-center animate-scale-in" style={{ animationDelay: '400ms', borderColor: '#fca5a5' }}>
          <p className="text-xs font-black text-orange-500 uppercase tracking-widest mb-3">Dépenses / Réduc</p>
          <p className="text-4xl lg:text-5xl font-black text-orange-500 tracking-tighter">{formatDZD(totalExpenses + totalReduction)}</p>
          <div className="flex gap-4 text-xs mt-3 font-bold text-gray-400">
            <span>Dép: {formatDZD(totalExpenses)}</span>
            <span>Réd: {formatDZD(totalReduction)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden min-h-[600px]">
        <div className="bg-gray-50/80 px-10 py-6 border-b border-gray-100">
          <h4 className="font-black text-xl text-[#3f5362] uppercase tracking-wide">
            Historique des Ventes — {day ? new Date(`${month}-${day}`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : month}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead className="bg-white border-b border-gray-50">
              <tr>
                <th className="text-left px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Date / Client</th>
                <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Statistiques</th>
                <th className="text-left px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Produits</th>
                <th className="text-right px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Recette</th>
              </tr>
            </thead>
            <tbody>
              {dailyGroups.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-32 text-gray-400 font-black text-2xl uppercase tracking-widest opacity-20">Aucune activité</td></tr>
              ) : (
                dailyGroups.map(group => {
                  const isOpen = expandedDates.includes(group.date);
                  const displayDate = new Date(group.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

                  return (
                    <Fragment key={group.date}>
                      <tr
                        className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                        onClick={() => toggleDate(group.date)}
                      >
                        <td className="px-8 py-8">
                          <p className="text-[#3f5362] font-black text-xl">{displayDate}</p>
                          <p className="text-xs text-gray-400 uppercase font-bold mt-1 tracking-wider">{group.sales.length} ventes effectuées</p>
                        </td>
                        <td className="px-8 py-8 text-center">
                          <div className="flex justify-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-[#41b86d]/10 text-[#41b86d] text-xs font-black tracking-widest">{group.directCount} DIRECT</span>
                            {group.creditCount > 0 && <span className="px-3 py-1 rounded-full bg-red-50 text-red-500 text-xs font-black tracking-widest">{group.creditCount} CRÉDIT</span>}
                          </div>
                        </td>
                        <td className="px-8 py-8 font-bold text-gray-500 max-w-sm">
                          <p className="truncate">{group.productList.join(", ")}</p>
                        </td>
                        <td className="px-8 py-8 text-right">
                          <span className="font-black text-[#3f5362] text-2xl">{formatDZD(group.revenue)}</span>
                          <div className="mt-2 space-y-1">
                            {group.paymentCredits > 0 && (
                              <p className="text-xs text-[#41b86d] font-black">+ {formatDZD(group.paymentCredits)} payés</p>
                            )}
                            {group.totalReduction > 0 && (
                              <p className="text-xs text-red-500 font-black">- {formatDZD(group.totalReduction)} réduc.</p>
                            )}
                            {group.expenseAmount > 0 && (
                              <p className="text-xs text-orange-500 font-black">- {formatDZD(group.expenseAmount)} depense</p>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && group.sales.map(sale => (
                        <tr key={sale.id} className="bg-gray-50/30 border-t border-gray-100">
                          <td className="px-14 py-4 text-sm font-bold text-gray-500">
                            {new Date(sale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {sale.username && <span className="ml-3 text-[11px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">VENTE PAR {sale.username.toUpperCase()}</span>}
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full tracking-widest ${sale.type === 'credit' ? 'bg-red-50 text-red-500' : 'bg-[#41b86d]/10 text-[#41b86d]'}`}>
                              {sale.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-sm text-gray-600 italic font-medium">
                            {sale.items.map(i => i.product.name).join(", ")}
                          </td>
                          <td className="px-8 py-4 text-right font-black text-gray-600 flex flex-col items-end">
                            <span className="text-lg">{formatDZD(sale.total)}</span>
                            {sale.reduction > 0 && <span className="text-[10px] text-red-500 mt-1">- {formatDZD(sale.reduction)} RÉDUCTION</span>}
                          </td>
                        </tr>
                      ))}
                      {isOpen && group.expenses.map(exp => (
                        <tr key={exp.id} className="bg-orange-50/20 border-t border-gray-100">
                          <td className="px-14 py-4 text-sm font-bold text-gray-500">
                            {new Date(exp.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className="text-[10px] font-black px-3 py-1 rounded-full bg-orange-100 text-orange-600 tracking-widest">
                              DÉPENSE
                            </span>
                          </td>
                          <td className="px-8 py-4 text-sm text-gray-600 italic font-bold">
                            {exp.note}
                          </td>
                          <td className="px-8 py-4 text-right font-black text-orange-600 text-lg">
                            - {formatDZD(exp.amount)}
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
