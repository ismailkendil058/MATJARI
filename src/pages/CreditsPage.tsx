import { useEffect, useState, useMemo } from "react";
import { Search, Plus, User, Phone, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getClients, addPayment } from "@/lib/db";
import { Client } from "@/lib/types";
import { formatDZD, generateId } from "@/lib/store";
import { useIsMobile } from "@/hooks/useIsMobile";

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
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    return clients.filter(c =>
      (c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)) &&
      c.balance > 0
    );
  }, [clients, search]);

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
    <div className="p-4 lg:p-8 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#3f5362]">Gestion des Crédits</h2>
          <p className="text-sm text-gray-500 font-medium">Suivi des dettes clients</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-end">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Crédit Global</p>
          <p className="text-2xl font-black text-red-500">{formatDZD(totalCredit)}</p>
        </div>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Rechercher un client..."
          className="pl-12 bg-white border-gray-200 h-12 shadow-sm rounded-xl focus-visible:ring-0 text-sm font-medium"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <Wallet className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">Aucun crédit en cours</p>
          </div>
        ) : (
          filtered.map(client => (
            <div key={client.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 bg-secondary rounded-xl flex items-center justify-center text-[#3f5362]">
                  <User className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Dette</p>
                  <p className="text-xl font-black text-red-500 leading-tight">{formatDZD(client.balance)}</p>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="font-black text-lg text-[#3f5362] line-clamp-1">{client.name}</h3>
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{client.phone || "Pas de numéro"}</span>
                </div>
              </div>

              <Button
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                onClick={() => setSelectedClient(client)}
              >
                <Plus className="h-4 w-4" />
                Rembourser
              </Button>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!selectedClient} onOpenChange={open => !open && setSelectedClient(null)}>
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-xl rounded-3xl">
          <DialogHeader className="border-b border-gray-100 pb-4">
            <DialogTitle className="text-xl font-black text-[#3f5362]">
              Paiement de crédit
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6 pt-4">
              <div className="bg-secondary/30 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Client</p>
                  <p className="text-lg font-black text-[#3f5362]">{selectedClient.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Dette actuelle</p>
                  <p className="text-lg font-black text-red-500">{formatDZD(selectedClient.balance)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Somme versée (DZD)</label>
                  <Input
                    type="number"
                    placeholder="Ex. 1000"
                    className="h-14 text-xl font-black border-gray-200 rounded-2xl focus:border-primary transition-colors"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    max={selectedClient.balance}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Note / Remarque (Optionnel)</label>
                  <Input
                    placeholder="Ex. Versement partiel"
                    className="h-12 border-gray-200 rounded-xl"
                    value={paymentNote}
                    onChange={e => setPaymentNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                <div className="flex justify-between text-sm font-bold mb-2">
                  <span className="text-gray-400">Reste après paiement:</span>
                  <span className="text-[#3f5362]">{formatDZD(Math.max(0, selectedClient.balance - (Number(paymentAmount) || 0)))}</span>
                </div>
                <Button
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black text-lg rounded-2xl shadow-lg shadow-primary/20"
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
