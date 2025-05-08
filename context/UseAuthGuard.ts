import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";

export const useAuthGuard = () => {
  const { user, fetchUser } = useContext(AuthContext)!;
  const router = useRouter();

  useEffect(() => {
    // user 정보 없을 경우 로그인 페이지로
    if (user === null) {
      fetchUser().then(() => {
        if (user === null) router.push("/login");
      });
    }
  }, [user]);
};