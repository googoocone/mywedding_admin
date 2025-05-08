// context/AuthContext.tsx
"use client";
import { createContext, useEffect, useState, useCallback } from "react";

interface AuthContextType {
  user: any; // 실제 프로젝트에서는 any 대신 구체적인 유저 타입을 정의하는 것이 좋습니다.
  setUser: React.Dispatch<React.SetStateAction<any>>;
  fetchUser: () => Promise<void>; // fetchUser가 Promise를 반환하도록 명시
  isLoading: boolean; // 유저 정보 로딩 상태
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(undefined); // 초기 user 상태를 undefined로 설정 (로딩 전 상태)
  const [isLoading, setIsLoading] = useState(true); // 초기 로딩 상태 true

  // useCallback을 사용하여 fetchUser 함수가 불필요하게 재생성되는 것을 방지합니다.
  const fetchUser = useCallback(async () => {
    setIsLoading(true); // 요청 시작 시 로딩 상태 true
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/me`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (!res.ok) {
        setUser(null);
      } else {
        const data = await res.json();
        setUser(data.user || null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, setUser, fetchUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
