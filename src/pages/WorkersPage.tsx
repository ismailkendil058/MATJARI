import React, { useState, useEffect } from "react";
import { getUsers, addUser, updateUserStatus, deleteUser } from "@/lib/db";
import { User } from "@/lib/types";
import { generateId } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserX, UserCheck, Trash2, Shield, Users as UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WorkersPage = () => {
    const [workers, setWorkers] = useState<User[]>([]);
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState<"admin" | "worker">("worker");
    const { toast } = useToast();

    const fetchWorkers = async () => {
        const allUsers = await getUsers();
        setWorkers(allUsers);
    };

    useEffect(() => {
        fetchWorkers();
    }, []);

    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUsername || !newPassword) return;

        try {
            const newWorker: User = {
                id: generateId(),
                username: newUsername,
                password: newPassword,
                role: newRole,
                status: "active",
            };
            await addUser(newWorker);
            toast({ title: "Succès", description: "Utilisateur ajouté avec succès." });
            setNewUsername("");
            setNewPassword("");
            setNewRole("worker");
            fetchWorkers();
        } catch (error) {
            toast({ variant: "destructive", title: "Erreur", description: "Ce nom d'utilisateur existe déjà." });
        }
    };

    const toggleStatus = async (worker: User) => {
        const newStatus = worker.status === "active" ? "inactive" : "active";
        await updateUserStatus(worker.id, newStatus);
        toast({ title: "Mis à jour", description: `Le statut de ${worker.username} est maintenant ${newStatus}.` });
        fetchWorkers();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Êtes-vous sûr de vouloir supprimer ce travailleur ?")) {
            await deleteUser(id);
            toast({ title: "Supprimé", description: "Travailleur supprimé." });
            fetchWorkers();
        }
    };

    return (
        <div className="h-screen p-8 flex flex-col space-y-8 animate-in fade-in duration-500 font-sans max-w-[1600px] mx-auto overflow-hidden">
            <div className="flex items-center gap-6 flex-none pb-4">
                <div className="p-5 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                    <UsersIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-5xl font-black tracking-tight text-foreground font-serif">Gestion des Travailleurs</h1>
                    <p className="text-xl text-muted-foreground font-medium mt-2">Ajoutez et gérez les comptes de vos employés.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 pb-4">
                <Card className="lg:col-span-1 shadow-xl border-border bg-white rounded-2xl flex flex-col h-full overflow-hidden">
                    <CardHeader className="bg-secondary/30 border-b border-border pb-6 flex-none">
                        <CardTitle className="flex items-center gap-3 text-3xl font-bold font-serif">
                            <UserPlus className="w-8 h-8 text-primary" />
                            Nouveau Travailleur
                        </CardTitle>
                        <CardDescription className="font-medium text-lg text-muted-foreground mt-3">Créer un compte pour un nouveau membre de l'équipe.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 flex-1 flex flex-col justify-center">
                        <form onSubmit={handleAddWorker} className="space-y-8 mt-auto mb-auto">
                            <div className="space-y-4">
                                <Label htmlFor="worker-name" className="font-bold text-lg">Nom d'utilisateur</Label>
                                <Input
                                    id="worker-name"
                                    placeholder="ex: Ahmed"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="h-20 text-xl border-border bg-secondary/20 focus-visible:ring-primary shadow-none rounded-xl px-6"
                                />
                            </div>
                            <div className="space-y-4">
                                <Label htmlFor="worker-pass" className="font-bold text-lg">Mot de passe</Label>
                                <Input
                                    id="worker-pass"
                                    type="password"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="h-20 text-xl border-border bg-secondary/20 focus-visible:ring-primary shadow-none rounded-xl px-6"
                                />
                            </div>
                            <div className="space-y-4">
                                <Label htmlFor="worker-role" className="font-bold text-lg">Rôle</Label>
                                <Select value={newRole} onValueChange={(v: "admin" | "worker") => setNewRole(v)}>
                                    <SelectTrigger id="worker-role" className="h-20 text-xl border-border bg-secondary/20 focus-visible:ring-primary shadow-none rounded-xl px-6">
                                        <SelectValue placeholder="Sélectionnez un rôle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="worker" className="text-xl py-4 hover:bg-secondary/20">Travailleur (Worker)</SelectItem>
                                        <SelectItem value="admin" className="text-xl py-4 hover:bg-secondary/20">Administrateur (Admin)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full h-20 text-xl mt-8 bg-primary hover:bg-primary/90 text-white font-black tracking-wide shadow-lg shadow-primary/10 rounded-xl transition-all hover:-translate-y-0.5">
                                Ajouter le travailleur
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 shadow-xl border-border bg-white rounded-2xl flex flex-col h-full overflow-hidden">
                    <CardHeader className="bg-secondary/30 border-b border-border pb-6 flex-none">
                        <CardTitle className="flex items-center gap-3 text-3xl font-bold font-serif">
                            <Shield className="w-8 h-8 text-primary" />
                            Liste des Travailleurs
                        </CardTitle>
                        <CardDescription className="font-medium text-lg text-muted-foreground mt-3">Visualisez et modifiez les accès de vos travailleurs.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 flex-1 flex flex-col min-h-0">
                        <div className="rounded-2xl border border-border flex-1 overflow-auto">
                            <Table>
                                <TableHeader className="bg-secondary/50 sticky top-0 z-10 backdrop-blur-sm">
                                    <TableRow className="hover:bg-transparent border-border">
                                        <TableHead className="font-bold text-foreground text-xl py-6 px-6">Utilisateur</TableHead>
                                        <TableHead className="font-bold text-foreground text-xl py-6 px-6">Rôle</TableHead>
                                        <TableHead className="font-bold text-foreground text-xl py-6 px-6">Statut</TableHead>
                                        <TableHead className="text-right font-bold text-foreground text-xl py-6 px-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-24 text-2xl text-muted-foreground font-medium italic">
                                                Aucun travailleur enregistré.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        workers.map((worker) => (
                                            <TableRow key={worker.id} className="group hover:bg-secondary/20 transition-colors border-border">
                                                <TableCell className="font-bold text-foreground text-2xl py-6 px-6">{worker.username}</TableCell>
                                                <TableCell className="py-6 px-6">
                                                    <Badge variant="outline" className="capitalize bg-secondary/50 text-foreground border-none font-bold px-6 py-3 rounded-full text-sm tracking-wider uppercase">
                                                        {worker.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-6 px-6">
                                                    {worker.status === "active" ? (
                                                        <Badge className="bg-success/10 text-success hover:bg-success/20 border-success/20 px-6 py-3 font-bold rounded-full text-sm tracking-wider uppercase">
                                                            Actif
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 px-6 py-3 font-bold rounded-full text-sm tracking-wider uppercase">
                                                            Inactif
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right space-x-3 py-6 px-6 relative">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => toggleStatus(worker)}
                                                            className={worker.status === "active" ? "w-12 h-12 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl" : "w-12 h-12 text-success hover:text-success hover:bg-success/10 rounded-xl"}
                                                        >
                                                            {worker.status === "active" ? <UserX className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(worker.id)}
                                                            className="w-12 h-12 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                                                        >
                                                            <Trash2 className="w-6 h-6" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
};

export default WorkersPage;
