import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/lib/types";
import { getUsers } from "@/lib/db";

interface AuthContextType {
    user: User | null;
    login: (password: string, username?: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem("mimicha_user");
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (password: string, username?: string): Promise<boolean> => {
        // Check database users first (admins and workers created via /Travailleurs)
        if (username) {
            const users = await getUsers();
            const foundUser = users.find(
                (u) => u.username === username && u.password === password && u.status === "active"
            );
            if (foundUser) {
                const sessionUser = { ...foundUser };
                delete sessionUser.password;
                setUser(sessionUser);
                localStorage.setItem("mimicha_user", JSON.stringify(sessionUser));
                return true;
            }
        }

        // Fallback: hardcoded admin account
        if (password === "ismail2003" && (!username || username === "admin")) {
            const adminUser: User = {
                id: "admin",
                username: "admin",
                role: "admin",
                status: "active",
            };
            setUser(adminUser);
            localStorage.setItem("mimicha_user", JSON.stringify(adminUser));
            return true;
        }

        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("mimicha_user");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
