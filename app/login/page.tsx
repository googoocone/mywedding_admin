// Login.tsx
"use client";

import { useState, useContext } from "react"; // useContext 추가
import { useRouter } from "next/navigation";
import axios from "axios";
import { AuthContext } from "@/context/AuthContext"; // AuthContext 경로를 정확히 지정해주세요.

interface LoginPayload {
  id: string;
  password: string;
}

export default function Login() {
  const [id, setId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const router = useRouter();
  const authContext = useContext(AuthContext); // AuthContext 사용

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: LoginPayload = { id, password };
    console.log("로그인 실행합니다");

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/signin`,
        payload,
        { withCredentials: true } // 쿠키를 주고받기 위해 중요!
      );
      console.log("res", res);

      if (res.status === 200) {
        // 로그인 성공 시 AuthContext의 fetchUser (또는 fetchAdmin) 함수를 호출
        if (authContext && authContext.fetchUser) {
          // authContext와 fetchUser 함수가 있는지 확인
          await authContext.fetchUser();
        } else {
          console.warn(
            "AuthContext 또는 fetchUser 함수를 찾을 수 없습니다. 상태가 즉시 업데이트되지 않을 수 있습니다."
          );
        }
        router.push("/"); // 그 후 메인 페이지로 이동
      }
    } catch (err) {
      alert("로그인 실패");
      console.error("로그인 실패", err);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-[400px] h-[500px] border-black-300 border rounded-xl flex flex-col items-center justify-center gap-10">
        <div className="text-2xl font-semibold text-blue-500">
          관리자 로그인
        </div>
        <form
          className="w-full flex flex-col items-center justify-center gap-5 px-5 mb-10"
          onSubmit={handleLogin}
        >
          <input
            className="w-full h-12 pl-2 rounded-xl border-gray-300 border"
            name="id"
            placeholder="아이디를 입력하세요"
            value={id} // value 추가 및 양방향 바인딩
            onChange={(e) => setId(e.target.value)}
          />
          <input
            className="w-full h-12 pl-2 rounded-xl border-gray-300 border"
            type="password"
            name="password"
            placeholder="password를 입력하세요"
            value={password} // value 추가 및 양방향 바인딩
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className="w-full h-12 pl-2 rounded-xl border-gray-300 border cursor-pointer hover:bg-black hover:text-white"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
