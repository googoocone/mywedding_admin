"use client";

import Link from "next/link";
import { useState } from "react";
import cn from "classnames";

const menuItem = [
  { name: "대시보드", href: "/" },
  { name: "유저", href: "/users" },
  {
    name: "웨딩홀",
    submenu: [
      {
        name: "표준견적서 등록",
        href: "/wedding-hall/createStandardEstimate",
      },
      {
        name: "표준견적서 조회",
        href: "/wedding-hall/statusStandardEstimate",
      },
      {
        name: "관리자 견적서 등록",
        href: "/wedding-hall/createAdminEstimate",
      },
      {
        name: "관리자견적서 수정",
        href: "/wedding-hall/updateAdminEstimate",
      },
      { name: "관리자견적서 삭제", href: "/wedding-hall/deleteAdminEstimate" },
    ],
  },
  { name: "로그인", href: "/login" },
];

export default function Sidebar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <div className="w-[260px] h-full bg-white border-r p-4 flex flex-col items-center justify-start">
      <div className="h-40 flex items-center justify-center text-2xl font-semibold">
        관리자 페이지
      </div>
      <nav className="w-full flex flex-col items-center justify-center gap-6">
        {menuItem.map((item) => (
          <div key={item.name} className="w-full cursor-pointer text-center">
            {/* 메뉴가 서브메뉴를 갖는 경우 */}
            {"submenu" in item ? (
              <>
                <button
                  onClick={() =>
                    setOpenMenu((prev) =>
                      prev === item.name ? null : item.name
                    )
                  }
                  className={cn("w-full text-center px-2 py-1 cursor-pointer", {
                    "font-semibold": openMenu === item.name,
                  })}
                >
                  {item.name}
                </button>
                {/* 펼쳐진 경우 하위 메뉴 출력 */}
                {openMenu === item.name && (
                  <div className="ml-4 mt-2 flex flex-col gap-4">
                    {item?.submenu?.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "text-md text-gray-600 hover:text-blue-500 hover:font-semibold",
                          {
                            "text-blue-500":
                              sub.name == "웨딩홀 표준견적서 등록",
                          }
                        )}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // 일반 메뉴
              <Link
                href={item.href}
                className={cn("block px-2 py-1", {
                  "font-semibold": openMenu === item.name,
                })}
                onClick={() => setOpenMenu(item.name)}
              >
                {item.name}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
