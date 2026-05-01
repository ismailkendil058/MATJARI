import { useEffect, useState, useMemo } from "react";
import { Search, Plus, User, Phone, Wallet, History, Calendar, ArrowUpCircle, ArrowDownCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getClients, addPayment, getSalesByClient, getPaymentsByClient } from "@/lib/db";
import { Client, Sale, Payment } from "@/lib/types";
import { formatDZD, generateId } from "@/lib/store";
import { useIsMobile } from "@/hooks/useIsMobile";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function CreditPage() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const cls = await getClients();
        setClients(cls);
      } catch (error) {
        console.error("Error loading credit data:", error);
      }
    };
    loadData();
  }, []);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [history, setHistory] = useState<{ date: string; type: 'sale' | 'payment'; amount: number; note?: string; id: string }[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    return clients.filter(c =>
      (c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)) &&
      c.balance > 0
    );
  }, [clients, search]);

  useEffect(() => {
    if (historyClient) {
      const loadHistory = async () => {
        try {
          const [sales, payments] = await Promise.all([
            getSalesByClient(historyClient.id),
            getPaymentsByClient(historyClient.id)
          ]);

          const combined = [
            ...sales.filter(s => s.type === 'credit').map(s => ({
              id: s.id,
              date: s.date,
              type: 'sale' as const,
              amount: s.creditAmount,
              note: `Facture #${s.id}`
            })),
            ...payments.map(p => ({
              id: p.id,
              date: p.date,
              type: 'payment' as const,
              amount: p.amount,
              note: p.note
            }))
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          setHistory(combined);
        } catch (error) {
          console.error("Error loading history:", error);
        }
      };
      loadHistory();
    } else {
      setHistory([]);
    }
  }, [historyClient]);

  const totalCredit = useMemo(() => {
    return clients.reduce((sum, c) => sum + c.balance, 0);
  }, [clients]);

  const handlePayment = async () => {
    if (!selectedClient || !paymentAmount || Number(paymentAmount) <= 0) return;

    try {
      const amount = Number(paymentAmount);
      await addPayment({
        id: generateId(),
        clientId: selectedClient.id,
        amount: amount,
        date: new Date().toISOString(),
        note: paymentNote.trim() || undefined
      });

      // Refresh state
      const cls = await getClients();
      setClients(cls);
      setSelectedClient(null);
      setPaymentAmount("");
      setPaymentNote("");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("novaInventoryUpdated"));
      }
    } catch (error) {
      console.error("Error handling payment:", error);
    }
  };

  return (
    <div className="p-8 lg:p-12 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-12 gap-8">
        <div>
          <h2 className="text-5xl font-black tracking-tight text-[#3f5362]">Gestion des Crédits</h2>
          <p className="text-xl text-gray-500 font-medium mt-2">Suivi des dettes clients</p>
        </div>
        <div className="bg-white px-10 py-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center items-end">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Crédit Global</p>
          <p className="text-4xl font-black text-red-500">{formatDZD(totalCredit)}</p>
        </div>
      </div>

      <div className="mb-10 relative max-w-xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400" />
        <Input
          placeholder="Rechercher un client..."
          className="pl-16 bg-white border-gray-200 h-16 shadow-sm rounded-2xl focus-visible:ring-0 text-lg font-bold"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
            <Wallet className="h-20 w-20 text-gray-200 mx-auto mb-6" />
            <p className="text-gray-400 text-2xl font-black uppercase tracking-widest">Aucun crédit en cours</p>
          </div>
        ) : (
          filtered.map(client => (
            <div
              key={client.id}
              onClick={() => setHistoryClient(client)}
              className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer flex items-center justify-between group px-10"
            >
              <div className="flex items-center gap-8">
                <div className="h-16 w-16 bg-secondary/50 rounded-2xl flex items-center justify-center text-[#3f5362] group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-black text-2xl text-[#3f5362] group-hover:text-primary transition-colors">{client.name}</h3>
                  <div className="flex items-center gap-3 text-gray-400 text-lg font-bold">
                    <Phone className="h-5 w-5" />
                    <span>{client.phone || "Pas de numéro"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="text-right">
                  <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-1">Dette Actuelle</p>
                  <p className="text-3xl font-black text-red-500 leading-tight">{formatDZD(client.balance)}</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all">
                  <History className="h-7 w-7" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!historyClient} onOpenChange={open => !open && setHistoryClient(null)}>
        <DialogContent className="sm:max-w-4xl bg-[#f8fafb] border-0 shadow-2xl rounded-[2.5rem] p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="p-10 bg-white border-b border-gray-100 shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-4xl font-black text-[#3f5362] mb-2">Historique des Crédits</DialogTitle>
                <div className="flex items-center gap-4 text-gray-500 font-bold text-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <span>{historyClient?.name}</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    <span>{historyClient?.phone || "---"}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Solde Total Dû</p>
                <p className="text-4xl font-black text-red-500">{historyClient && formatDZD(historyClient.balance)}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-black text-[#3f5362] flex items-center gap-3">
                <History className="h-6 w-6 text-primary" />
                Transactions Récentes
              </h4>
              <Button
                onClick={() => {
                  setSelectedClient(historyClient);
                }}
                className="bg-primary hover:bg-primary/90 text-white font-black px-8 h-14 rounded-2xl flex items-center gap-3 shadow-lg shadow-primary/20"
              >
                <Plus className="h-6 w-6" />
                Effectuer un Paiement
              </Button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-gray-400 font-bold text-xl">Aucune transaction trouvée</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="bg-white rounded-2xl p-6 border border-gray-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${item.type === 'sale' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                        }`}>
                        {item.type === 'sale' ? <ArrowUpCircle className="h-8 w-8" /> : <ArrowDownCircle className="h-8 w-8" />}
                      </div>
                      <div>
                        <p className="font-black text-xl text-[#3f5362]">
                          {item.type === 'sale' ? 'Crédit (Achat)' : 'Paiement (Versement)'}
                        </p>
                        <div className="flex items-center gap-4 text-gray-400 font-bold">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(item.date), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </span>
                          {item.note && (
                            <>
                              <div className="w-1 h-1 rounded-full bg-gray-200" />
                              <span>{item.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black ${item.type === 'sale' ? 'text-red-500' : 'text-green-500'
                        }`}>
                        {item.type === 'sale' ? '+' : '-'}{formatDZD(item.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedClient} onOpenChange={open => !open && setSelectedClient(null)}>
        <DialogContent className="sm:max-w-xl bg-white border-0 shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
          <DialogHeader className="border-b border-gray-100 p-8 bg-gray-50/50">
            <DialogTitle className="text-3xl font-black text-[#3f5362]">
              Paiement de crédit
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="p-8 space-y-8">
              <div className="bg-secondary/30 p-8 rounded-3xl flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Client</p>
                  <p className="text-2xl font-black text-[#3f5362]">{selectedClient.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Dette actuelle</p>
                  <p className="text-2xl font-black text-red-500">{formatDZD(selectedClient.balance)}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-black uppercase tracking-widest text-gray-400 pl-1">Somme versée (DZD)</label>
                  <Input
                    type="number"
                    placeholder="Ex. 1000"
                    className="h-20 text-3xl font-black border-gray-200 rounded-2xl focus:ring-primary focus:border-primary transition-all shadow-none"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    max={selectedClient.balance}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-black uppercase tracking-widest text-gray-400 pl-1">Note / Remarque (Optionnel)</label>
                  <Input
                    placeholder="Ex. Versement partiel"
                    className="h-16 text-lg border-gray-200 rounded-2xl font-bold"
                    value={paymentNote}
                    onChange={e => setPaymentNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100 flex flex-col gap-4">
                <div className="flex justify-between text-lg font-black bg-gray-50 p-4 rounded-xl">
                  <span className="text-gray-400">Reste après paiement :</span>
                  <span className="text-[#3f5362]">{formatDZD(Math.max(0, selectedClient.balance - (Number(paymentAmount) || 0)))}</span>
                </div>
                <Button
                  className="w-full h-20 bg-primary hover:bg-primary/90 text-white font-black text-2xl rounded-[1.5rem] shadow-xl shadow-primary/20 transition-all hover:-translate-y-1"
                  onClick={handlePayment}
                  disabled={!paymentAmount || Number(paymentAmount) <= 0}
                >
                  Confirmer le paiement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
