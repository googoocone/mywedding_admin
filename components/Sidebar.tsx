"use client";

import Link from "next/link";
import { AuthContext } from "@/context/AuthContext"; // AuthContext 경로를 확인해주세요.
import { useState, useContext } from "react";
import cn from "classnames";
import { useRouter } from "next/navigation"; // 로그아웃 후 리다이렉션을 위해 추가
import { logout } from "@/lib/auth";

// 기존 menuItem 배열에서 로그인/로그아웃은 제외하거나, 아래에서 필터링 시 사용하지 않습니다.
const baseMenuItems = [
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
      { name: "관리자견적서 삭제 ", href: "/wedding-hall/deleteAdminEstimate" },
    ],
  },
];

export default function Sidebar() {
  const authContext = useContext(AuthContext);
  const { setAdmin }: any = useContext(AuthContext);
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const isLoggedIn = !!(authContext && authContext.admin);

  return (
    <div className="w-[260px] h-full bg-white border-r p-4 flex flex-col items-center justify-start">
      <div className="h-40 flex items-center justify-center text-2xl font-semibold">
        관리자 페이지
      </div>
      <nav className="w-full flex flex-col items-center justify-center gap-6">
        {/* 기본 메뉴 아이템 렌더링 */}
        {baseMenuItems.map((item) => (
          <div key={item.name} className="w-full cursor-pointer text-center">
            {"submenu" in item && item.submenu ? ( // item.submenu가 실제로 존재하는지 확인
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
                {openMenu === item.name && (
                  <div className="ml-4 mt-2 flex flex-col gap-4">
                    {item.submenu.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          "text-md text-gray-600 hover:text-blue-500 hover:font-semibold",
                          {
                            "text-blue-500": sub.name === "표준견적서 등록", // 현재 활성화 조건 유지
                          }
                        )}
                        onClick={() => setOpenMenu(item.name)} // 서브메뉴 클릭 시 상위 메뉴는 열린 상태 유지 (선택적)
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href!} // submenu가 없는 아이템은 href가 있다고 가정 (타입 에러 방지)
                className={cn("block px-2 py-1", {
                  // w-full을 적용하려면 block 또는 flex 필요
                  "font-semibold": openMenu === item.name,
                })}
                onClick={() => setOpenMenu(item.name)}
              >
                {item.name}
              </Link>
            )}
          </div>
        ))}

        {/* 조건부 로그인/로그아웃 메뉴 렌더링 */}
        <div className="w-full cursor-pointer text-center">
          {isLoggedIn ? (
            // 로그인 상태일 때: 로그아웃 버튼
            <button
              onClick={() => {
                logout(setAdmin);
                setOpenMenu("로그아웃"); // 시각적으로 활성화 (선택적)
              }}
              className={cn("block w-full text-center px-2 py-1", {
                "font-semibold": openMenu === "로그아웃",
              })}
            >
              로그아웃
            </button>
          ) : (
            // 로그아웃 상태일 때: 로그인 링크
            <Link
              href="/login"
              className={cn("block px-2 py-1", {
                "font-semibold": openMenu === "로그인",
              })}
              onClick={() => setOpenMenu("로그인")}
            >
              로그인
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
