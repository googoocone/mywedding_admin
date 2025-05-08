import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";

export const useAuthGuard = (redirectTo: string = "/login") => {
  const context = useContext(AuthContext);
  const router = useRouter();

  if (!context) {
    if (process.env.NODE_ENV === "development") {
      throw new Error("useAuthGuard must be used within an AuthProvider");
    }
    return; // 혹은 로딩 상태나 빈 객체를 반환하여 사용하는 쪽에서 처리
  }

  const { admin, isLoading } = context;

  useEffect(() => {
    if (!isLoading && admin === null) {
      router.push(redirectTo);
    }
  }, [admin, isLoading, router, redirectTo]);
};
