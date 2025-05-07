"use client";

import { useEffect } from "react";

export default function WeddingHall() {
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
