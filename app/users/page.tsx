"use client";

import { useEffect } from "react";
import { useAuthGuard } from "@/context/UseAuthGuard";

export default function WeddingHall() {
  useAuthGuard();
  const fetchAdmin = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/me`, {
      method: "GET",
      credentials: "include",
    });

    return res;
  };

  useEffect(() => {
    fetchAdmin();
  }, []);

  return <div></div>;
}
