"use client";

export const logout = async (setAdmin: (user: any) => void) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/logout`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!res.ok) {
      throw new Error("로그아웃 실패");
    }
    setAdmin(null);
    console.log(res.json());
    window.location.href = "/";
  } catch (err) {
    console.error("로그아웃 에러", err);
  }
};
