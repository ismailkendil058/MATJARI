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
            <Card className="w-full max-w-md shadow-xl border-border bg-white">
                <CardHeader className="space-y-1 text-center border-b border-border pb-6">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary rounded-xl shadow-lg shadow-primary/20">
                            <Lock className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tighter">
                        <span className="text-primary">Matjari</span> <span className="text-gray-400 text-xl font-bold uppercase tracking-[0.2em]">متجري</span>
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">
                        Entrez vos identifiants pour accéder au système
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin} className="pt-4">
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="font-bold">Nom d'utilisateur</Label>
                            <Select value={username} onValueChange={setUsername}>
                                <SelectTrigger className="h-12 border-border bg-secondary/50 focus:ring-primary shadow-none">
                                    <div className="flex items-center gap-3 text-muted-foreground w-full">
                                        <UserIcon className="h-5 w-5 flex-shrink-0" />
                                        <SelectValue placeholder="Sélectionner un utilisateur" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {adminUsers.map(admin => (
                                        <SelectItem key={admin.id} value={admin.username} className="font-bold">
                                            {admin.username} (Admin)
                                        </SelectItem>
                                    ))}
                                    {workerUsers.map(worker => (
                                        <SelectItem key={worker.id} value={worker.username}>{worker.username}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="font-bold">Mot de passe</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 h-12 border-border bg-secondary/50 focus-visible:ring-primary shadow-none"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="pb-6">
                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-black tracking-wide bg-primary hover:bg-primary/90 text-white transition-all duration-200 shadow-md hover:-translate-y-0.5 rounded-lg"
                            disabled={isLoggingIn}
                        >
                            {isLoggingIn ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
