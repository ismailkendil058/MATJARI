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
        <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500 font-sans">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                    <UsersIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground font-serif">Gestion des Travailleurs</h1>
                    <p className="text-muted-foreground font-medium">Ajoutez et gérez les comptes de vos employés.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 shadow-xl border-border bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="bg-secondary/30 border-b border-border pb-6">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold font-serif">
                            <UserPlus className="w-5 h-5 text-primary" />
                            Nouveau Travailleur
                        </CardTitle>
                        <CardDescription className="font-medium text-muted-foreground">Créer un compte pour un nouveau membre de l'équipe.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleAddWorker} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="worker-name" className="font-bold text-sm">Nom d'utilisateur</Label>
                                <Input
                                    id="worker-name"
                                    placeholder="ex: Ahmed"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="h-12 border-border bg-secondary/20 focus-visible:ring-primary shadow-none rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="worker-pass" className="font-bold text-sm">Mot de passe</Label>
                                <Input
                                    id="worker-pass"
                                    type="password"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="h-12 border-border bg-secondary/20 focus-visible:ring-primary shadow-none rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="worker-role" className="font-bold text-sm">Rôle</Label>
                                <Select value={newRole} onValueChange={(v: "admin" | "worker") => setNewRole(v)}>
                                    <SelectTrigger id="worker-role" className="h-12 border-border bg-secondary/20 focus-visible:ring-primary shadow-none rounded-xl">
                                        <SelectValue placeholder="Sélectionnez un rôle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="worker">Travailleur (Worker)</SelectItem>
                                        <SelectItem value="admin">Administrateur (Admin)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black tracking-wide shadow-lg shadow-primary/10 rounded-xl transition-all hover:-translate-y-0.5">
                                Ajouter le travailleur
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 shadow-xl border-border bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="bg-secondary/30 border-b border-border pb-6">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold font-serif">
                            <Shield className="w-5 h-5 text-primary" />
                            Liste des Travailleurs
                        </CardTitle>
                        <CardDescription className="font-medium text-muted-foreground">Visualisez et modifiez les accès de vos travailleurs.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="rounded-2xl border border-border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-secondary/50">
                                    <TableRow className="hover:bg-transparent border-border">
                                        <TableHead className="font-bold text-foreground">Utilisateur</TableHead>
                                        <TableHead className="font-bold text-foreground">Rôle</TableHead>
                                        <TableHead className="font-bold text-foreground">Statut</TableHead>
                                        <TableHead className="text-right font-bold text-foreground">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-medium italic">
                                                Aucun travailleur enregistré.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        workers.map((worker) => (
                                            <TableRow key={worker.id} className="group hover:bg-secondary/20 transition-colors border-border">
                                                <TableCell className="font-bold text-foreground">{worker.username}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize bg-secondary/50 text-foreground border-none font-bold px-3 py-1 rounded-full text-[10px] tracking-wider uppercase">
                                                        {worker.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {worker.status === "active" ? (
                                                        <Badge className="bg-success/10 text-success hover:bg-success/20 border-success/20 px-3 py-1 font-bold rounded-full text-[10px] tracking-wider uppercase">
                                                            Actif
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 px-3 py-1 font-bold rounded-full text-[10px] tracking-wider uppercase">
                                                            Inactif
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => toggleStatus(worker)}
                                                        className={worker.status === "active" ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg" : "text-success hover:text-success hover:bg-success/10 rounded-lg"}
                                                    >
                                                        {worker.status === "active" ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(worker.id)}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
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
        </div>
    );
};

export default WorkersPage;
