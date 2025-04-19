"use client";

import form from "next/form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

interface LoginPayload {
  id: string;
  password: string;
}

export default function Login() {
  const [id, setId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: LoginPayload = { id, password };
    console.log("로그인 실행함니다");

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/admin/signin",
        payload,
        { withCredentials: true }
      );
      console.log("res", res);
      if (res.status == 200) {
        console.log("됏따");
        router.push("/admin");
      }
    } catch (err) {
      alert("로그인 실패");
      console.error("로그인 실패");
    }
  };

  return (
    <div className="w-full h-full  flex items-center justify-center">
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
            onChange={(e) => setId(e.target.value)}
          ></input>
          <input
            className="w-full h-12 pl-2 rounded-xl border-gray-300 border"
            type="password"
            name="password"
            placeholder="password를 입력하세요"
            onChange={(e) => setPassword(e.target.value)}
          ></input>
          <button className="w-full h-12 pl-2 rounded-xl border-gray-300 border cursor-pointer hover:bg-black hover:text-white">
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
