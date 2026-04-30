import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, User as UserIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getUsers } from "@/lib/db";
import { User } from "@/lib/types";

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const users = await getUsers();
                setAllUsers(users.filter(u => u.status === 'active'));
            } catch (error) {
                console.error("Failed to fetch users", error);
            }
        };
        fetchUsers();
    }, []);

    const adminUsers = allUsers.filter(u => u.role === 'admin');
    const workerUsers = allUsers.filter(u => u.role === 'worker');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);

        try {
            const success = await login(password, username || undefined);
            if (success) {
                toast({
                    title: "Connexion réussie",
                    description: "Bienvenue sur Matjari",
                });
                navigate("/");
            } else {
                toast({
                    variant: "destructive",
                    title: "Échec de la connexion",
                    description: "Nom d'utilisateur ou mot de passe incorrect ou compte désactivé.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Une erreur est survenue lors de la connexion.",
            });
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-secondary p-4 font-sans">
            <Card className="w-full max-w-lg shadow-2xl border-border bg-white overflow-hidden rounded-3xl">
                <CardHeader className="space-y-4 text-center border-b border-border pb-10 pt-10 px-10">
                    <div className="flex justify-center mb-4">
                        <div className="p-5 bg-primary rounded-2xl shadow-xl shadow-primary/20">
                            <Lock className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-5xl font-black tracking-tighter">
                        <span className="text-primary">Matjari</span> <span className="text-gray-400 text-3xl font-bold uppercase tracking-[0.2em]">متجري</span>
                    </CardTitle>
                    <CardDescription className="text-lg text-muted-foreground font-medium pt-2">
                        Entrez vos identifiants pour accéder au système
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin} className="pt-6">
                    <CardContent className="space-y-8 px-10">
                        <div className="space-y-3">
                            <Label htmlFor="username" className="text-xl font-bold">Nom d'utilisateur</Label>
                            <Select value={username} onValueChange={setUsername}>
                                <SelectTrigger className="h-16 text-lg border-border bg-secondary/50 focus:ring-primary shadow-none rounded-xl">
                                    <div className="flex items-center gap-4 text-muted-foreground w-full">
                                        <UserIcon className="h-8 w-8 flex-shrink-0" />
                                        <SelectValue placeholder="Sélectionner un utilisateur" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {adminUsers.map(admin => (
                                        <SelectItem key={admin.id} value={admin.username} className="font-bold text-lg py-4">
                                            {admin.username} (Admin)
                                        </SelectItem>
                                    ))}
                                    {workerUsers.map(worker => (
                                        <SelectItem key={worker.id} value={worker.username} className="text-lg py-4">
                                            {worker.username}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            <Label htmlFor="password" className="text-xl font-bold">Mot de passe</Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-5 h-6 w-6 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-12 h-16 text-xl border-border bg-secondary/50 focus-visible:ring-primary shadow-none rounded-xl"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="pb-10 pt-6 px-10">
                        <Button
                            type="submit"
                            className="w-full h-16 text-2xl font-black tracking-wide bg-primary hover:bg-primary/90 text-white transition-all duration-200 shadow-lg hover:-translate-y-1 rounded-2xl"
                            disabled={isLoggingIn}
                        >
                            {isLoggingIn ? (
                                <>
                                    <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                                    Connexion...
                                </>
                            ) : (
                                "Se connecter"
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default LoginPage;
