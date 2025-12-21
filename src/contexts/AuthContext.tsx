"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = "grid8_auth_token";
const AUTH_USER_KEY = "grid8_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        token: "testTokenForSwaggerUI",
      }),
    });

    const data = await response.json();

    if (!response.ok || data["undefined"]) {
      const errorMessage = data["undefined"]?.join(", ") || "Login failed";
      throw new Error(errorMessage);
    }

    // Extract token and user info from response
    const authToken = data.token || data.accessToken || data.access_token;
    const userData: User = {
      id: data.id || data.userId || "1",
      email: email,
      name: data.name || data.username || email.split("@")[0],
    };

    // Store in localStorage
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));

    // Update state
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    // Clear state
    setToken(null);
    setUser(null);

    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
