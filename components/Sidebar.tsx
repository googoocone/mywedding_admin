"use client";

import Link from "next/link";
import { useState } from "react";
import cn from "classnames";

const menuItem = [
  { name: "대시보드", href: "/" },
  { name: "유저", href: "/users" },
  { name: "웨딩홀", href: "/wedding-hall" },
  { name: "로그인", href: "/login" },
];

export default function Sidebar() {
  const [isMenu, setIsMenu] = useState("");

  return (
    <div className="w-[240px] h-full bg-white border-r p-4 flex flex-col items-center justify-start">
      <div className="h-40 flex items-center justify-center text-2xl font-semibold ">
        관리자 페이지
      </div>
      <nav className="w-full h-80 flex flex-col items-center justify-center gap-10">
        {menuItem.map((item) => (
          <Link
            onClick={() => setIsMenu(`${item.name}`)}
            href={item.href}
            key={item.href}
            className={cn("font-normal", {
              "font-semibold": isMenu == item.name,
            })}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
