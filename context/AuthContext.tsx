// context/AuthContext.tsx
"use client";
import { createContext, useEffect, useState } from "react";
import Router, { useRouter } from "next/router";

interface AuthContextType {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  fetchUser: any;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState(null);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/me`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      const data = await res.json();
      setUser(data.user);
    } catch {
      setUser(null);
      router.push("/login");
    }
  };

  useEffect(() => {
    fetchUser(); // 마운트 시 유저 정보 요청
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};
