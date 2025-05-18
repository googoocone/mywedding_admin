"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation"; // Next.js 라우터 임포트
import { useAuthGuard } from "@/context/UseAuthGuard";
import {
  DetailedEstimate, // 견적 상세 정보를 포함하는 타입 (홀, 업체 정보 포함)
} from "@/interface/estimates"; // 예시 경로

// 주소에서 시/구 정보만 추출하는 헬퍼 함수
const formatAddressShort = (fullAddress?: string | null): string => {
  if (!fullAddress) return "주소 없음";
  const parts = fullAddress.split(" ");

  if (parts.length === 0) return "주소 없음";

  let city = "";
  let district = "";

  // 특별시, 광역시, 특별자치시 찾기
  if (
    parts[0].endsWith("특별시") ||
    parts[0].endsWith("광역시") ||
    parts[0].endsWith("특별자치시")
  ) {
    city = parts[0];
    if (
      parts.length > 1 &&
      (parts[1].endsWith("구") || parts[1].endsWith("군"))
    ) {
      district = parts[1];
    }
  }
  // 도 찾기
  else if (parts[0].endsWith("도")) {
    if (
      parts.length > 1 &&
      (parts[1].endsWith("시") || parts[1].endsWith("군"))
    ) {
      city = parts[1];
      if (
        parts.length > 2 &&
        (parts[2].endsWith("구") || parts[2].endsWith("군"))
      ) {
        district = parts[2];
      }
    } else {
      city = parts[0]; // 예: 강원도 (시/군 정보 부족)
    }
  }
  // 일반 시/군 시작
  else if (parts[0].endsWith("시") || parts[0].endsWith("군")) {
    city = parts[0];
    if (
      parts.length > 1 &&
      (parts[1].endsWith("구") || parts[1].endsWith("군"))
    ) {
      district = parts[1];
    }
  }
  // 그 외의 경우, 첫 두 단어를 시/구로 가정 (최대한 정보 제공)
  else if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  } else {
    return parts[0];
  }

  if (city && district) {
    return `${city} ${district}`;
  } else if (city) {
    return city;
  } else if (district) {
    // 거의 없는 경우
    return district;
  }

  return parts.length > 0 ? parts[0] : "주소 없음"; // 최후의 폴백
};

// 모든 견적서 (표준 견적서)를 나열, 검색, 수정, 삭제하는 페이지 컴포넌트
export default function DeleteAdminEstimatePage() {
  useAuthGuard();
  const router = useRouter(); // Next.js 라우터 인스턴스 생성

  const [estimates, setEstimates] = useState<DetailedEstimate[]>([]);
  const [filteredEstimates, setFilteredEstimates] = useState<
    DetailedEstimate[]
  >([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchEstimates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/get_standard_estimate_all`
      );
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(
          errorResult.detail || `HTTP error! status: ${response.status}`
        );
      }
      const data: DetailedEstimate[] = await response.json();
      setEstimates(data);
    } catch (err: any) {
      console.error("Failed to fetch estimates:", err);
      setError(err.message || "견적서 목록을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimates();
  }, []);

  useEffect(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    let newFilteredEstimates: DetailedEstimate[];

    if (!lowerCaseQuery) {
      newFilteredEstimates = [...estimates]; // 원본 복사
    } else {
      newFilteredEstimates = estimates.filter((estimate) => {
        const companyName = estimate.hall?.wedding_company?.name;
        return (
          companyName && companyName.toLowerCase().includes(lowerCaseQuery)
        );
      });
    }

    // ✨ [수정됨] 견적서 ID 순으로 오름차순 정렬
    newFilteredEstimates.sort((a, b) => a.id - b.id);
    setFilteredEstimates(newFilteredEstimates);
  }, [estimates, searchQuery]);

  const handleDelete = async (estimateId: number) => {
    if (
      !window.confirm(
        `견적서 (ID: ${estimateId})를 정말 삭제하시겠습니까?\n연관된 식대, 옵션, 기타 정보도 모두 삭제됩니다.`
      )
    ) {
      return;
    }
    setDeletingId(estimateId);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/standard_estimates/${estimateId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(
          errorResult.detail || `HTTP error! status: ${response.status}`
        );
      }
      // 삭제 성공 후 목록 다시 불러오기 또는 상태에서 직접 제거
      // 여기서는 상태에서 직접 제거하는 방식을 유지 (fetchEstimates() 호출도 가능)
      setEstimates((prevEstimates) =>
        prevEstimates.filter((estimate) => estimate.id !== estimateId)
      );
      // filteredEstimates는 estimates 변경에 따라 useEffect에서 자동 업데이트됨
    } catch (err: any) {
      console.error(`Failed to delete estimate ${estimateId}:`, err);
      setError(
        err.message || `견적서 (ID: ${estimateId}) 삭제에 실패했습니다.`
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (estimateId: number) => {
    router.push(`/wedding-hall/updateStandardEstimate?id=${estimateId}`);
  };

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">
        표준 견적서 목록 조회/관리
      </h1>
      <div className="mb-4">
        <label
          htmlFor="search-company"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          웨딩업체 이름으로 검색:
        </label>
        <input
          type="text"
          id="search-company"
          value={searchQuery}
          onChange={handleSearchInputChange}
          placeholder="검색할 웨딩업체 이름을 입력하세요"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>

      {isLoading && <p className="text-center text-blue-500">로딩 중...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {!isLoading && !error && filteredEstimates.length === 0 && (
        <p className="text-center text-gray-900">
          {searchQuery
            ? `"${searchQuery}"에 해당하는 견적서가 없습니다.`
            : "등록된 견적서가 없습니다."}
        </p>
      )}

      {!isLoading && !error && filteredEstimates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-900 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">견적ID</th>{" "}
                {/* 약자 변경 */}
                {/* ✨ [수정됨] 업체명 컬럼 (넓이 조정을 위한 클래스 추가 가능) */}
                <th className="py-3 px-6 text-left whitespace-nowrap">
                  업체명
                </th>
                {/* ✨ [추가됨] 주소 컬럼 */}
                <th className="py-3 px-6 text-left whitespace-nowrap">
                  주소 (시/구)
                </th>
                <th className="py-3 px-6 text-left">홀 이름</th>
                {/* <th className="py-3 px-6 text-left">종류</th> ✨ [삭제됨] 종류 컬럼 */}
                <th className="py-3 px-6 text-left">날짜</th>
                <th className="py-3 px-6 text-left">시간</th>
                <th className="py-3 px-6 text-left">대관료</th>
                <th className="py-3 px-6 text-center">액션</th>
              </tr>
            </thead>
            <tbody className="text-gray-900 text-sm font-light">
              {filteredEstimates.map((estimate) => (
                <tr
                  key={estimate.id}
                  className="border-b border-gray-200 hover:bg-gray-100"
                >
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.id}
                  </td>
                  {/* ✨ [수정됨] 업체명 (넓이 조정을 위해 max-w-xs, truncate 등 사용 가능) */}
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap max-w-xs truncate">
                    {estimate.hall?.wedding_company?.name || "정보 없음"}
                  </td>
                  {/* ✨ [추가됨] 주소 (시/구) */}
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap max-w-xs truncate">
                    {formatAddressShort(
                      estimate.hall?.wedding_company?.address
                    )}
                  </td>
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.hall?.name || "정보 없음"}
                  </td>
                  {/* <td>{estimate.type || "미지정"}</td> ✨ [삭제됨] 종류 데이터 */}
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.date?.toString() || "날짜 미정"}
                  </td>
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.time || "시간 미정"}
                  </td>
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.hall_price?.toLocaleString("ko-KR") || "0"}원
                  </td>
                  <td className="py-3 px-6 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(estimate.id)}
                      disabled={deletingId !== null}
                      className="px-4 py-2 rounded text-white text-xs font-semibold bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed mr-2"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(estimate.id)}
                      disabled={
                        deletingId !== null && deletingId === estimate.id
                      }
                      className={`px-4 py-2 rounded text-white text-xs font-semibold ${
                        deletingId !== null && deletingId === estimate.id
                          ? "bg-red-300 cursor-not-allowed"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {deletingId !== null && deletingId === estimate.id
                        ? "삭제 중..."
                        : "삭제"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
