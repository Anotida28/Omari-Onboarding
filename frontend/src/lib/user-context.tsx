import React, { createContext, useContext, useState, ReactNode } from "react";

export type User = {
  username: string;
  accessToken: string;
  role?: string;
  fullname?: string;
  email?: string;
  title?: string;
  employeeID?: string;
  businessUnit?: string;
  mobile?: string;
  source?: "local" | "localAdmin" | "ad";
};

type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = "omari.user";

const getStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as User;
    if (parsed?.username && parsed?.accessToken) return parsed;
  } catch {
    return null;
  }
  return null;
};

const setStoredUser = (user: User | null) => {
  if (typeof window === "undefined") return;
  if (!user) {
    window.sessionStorage.removeItem(USER_STORAGE_KEY);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  // Remove any previously persisted auth state from older builds.
  window.localStorage.removeItem(USER_STORAGE_KEY);
};


export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(getStoredUser);

  const setUser = (user: User | null) => {
    setStoredUser(user);
    setUserState(user);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
