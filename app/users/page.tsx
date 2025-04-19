"use client";

import { useEffect } from "react";

export default function WeddingHall() {
  const fetchAdmin = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/me`, {
      method: "GET",
      credentials: "include",
    });
  };

  useEffect(() => {
    fetchAdmin();
  }, []);

  return <div>유저 페이지</div>;
}
