"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation"; // Next.js 라우터 임포트
import { useAuthGuard } from "@/context/UseAuthGuard";
import {
  DetailedEstimate, // 견적 상세 정보를 포함하는 타입 (홀, 업체 정보 포함)
  // 필요한 경우 MealPriceData, EstimateOptionData 등 하위 데이터 타입도 임포트
} from "@/interface/estimates"; // 예시 경로

// 모든 견적서 (표준 견적서)를 나열, 검색, 수정, 삭제하는 페이지 컴포넌트
export default function DeleteAdminEstimatePage() {
  useAuthGuard();
  const router = useRouter(); // Next.js 라우터 인스턴스 생성

  // 전체 견적서 목록 상태 (원본 데이터 유지)
  const [estimates, setEstimates] = useState<DetailedEstimate[]>([]);
  // 필터링된 견적서 목록 상태 (실제로 표에 표시될 목록)
  const [filteredEstimates, setFilteredEstimates] = useState<
    DetailedEstimate[]
  >([]);
  // 검색어 상태
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchEstimates = async () => {
    setIsLoading(true); // 로딩 시작
    setError(null); // 이전 에러 초기화
    try {
      // ✅ 모든 견적서 목록을 가져오는 백엔드 API 엔드포인트
      // '/admin/get_admin_estimate_all' 또는 '/admin/estimates' 등 실제 엔드포인트 사용
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/get_standard_estimate_all` // 백엔드 GET 엔드포인트
      );

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(
          errorResult.detail || `HTTP error! status: ${response.status}`
        );
      }

      const data: DetailedEstimate[] = await response.json();
      setEstimates(data); // 전체 목록 상태 업데이트
      // 필터링된 목록은 아래 useEffect에서 초기 설정됨
    } catch (err: any) {
      console.error("Failed to fetch estimates:", err);
      setError(err.message || "견적서 목록을 불러오는데 실패했습니다."); // 에러 상태 업데이트
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };

  // --- 컴포넌트 마운트 시 데이터 불러오기 ---
  useEffect(() => {
    fetchEstimates();
  }, []); // 빈 의존성 배열: 마운트 시 한 번만 실행

  // ✅ --- 필터링 로직 ---
  // 전체 견적 목록(estimates) 또는 검색어(searchQuery)가 변경될 때마다 실행
  useEffect(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();

    if (!lowerCaseQuery) {
      // 검색어가 비어있으면 전체 목록을 표시
      setFilteredEstimates(estimates);
    } else {
      // 검색어가 있으면 ✅ 웨딩업체 이름 기준으로 필터링
      const filtered = estimates.filter((estimate) => {
        // estimate.hall?.wedding_company?.name 에 안전하게 접근하여 검색어 포함 여부 확인
        // hall 또는 wedding_company가 null인 경우 대비
        const companyName = estimate.hall?.wedding_company?.name;
        return (
          companyName && companyName.toLowerCase().includes(lowerCaseQuery)
        );
      });
      setFilteredEstimates(filtered);
    }
  }, [estimates, searchQuery]); // estimates 또는 searchQuery가 변경될 때마다 실행

  // --- 견적서 삭제 처리 함수 ---
  const handleDelete = async (estimateId: number) => {
    if (
      !window.confirm(
        `견적서 (ID: ${estimateId})를 정말 삭제하시겠습니까?\n연관된 식대, 옵션, 기타 정보도 모두 삭제됩니다.`
      )
    ) {
      return; // 취소 시 함수 종료
    }

    setDeletingId(estimateId); // 삭제 중인 ID 설정
    setError(null); // 이전 에러 초기화

    try {
      // ✅ 특정 견적서 삭제 백엔드 API 엔드포인트 (DELETE)
      const response = await fetch(
        `http://localhost:8000/admin/standard_estimates/${estimateId}`, // DELETE 엔드포인트 사용
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(
          errorResult.detail || `HTTP error! status: ${response.status}`
        );
      }

      // 삭제 성공 시 목록에서 해당 견적 제거 (상태 업데이트)
      // 전체 목록(estimates)과 필터링된 목록(filteredEstimates) 모두에서 제거
      setEstimates((prevEstimates) =>
        prevEstimates.filter((estimate) => estimate.id !== estimateId)
      );
      setFilteredEstimates((prevFiltered) =>
        prevFiltered.filter((estimate) => estimate.id !== estimateId)
      );
      // TODO: 성공 메시지 표시 (선택 사항)
    } catch (err: any) {
      console.error(`Failed to delete estimate ${estimateId}:`, err);
      setError(
        err.message || `견적서 (ID: ${estimateId}) 삭제에 실패했습니다.`
      ); // 에러 상태 업데이트
    } finally {
      setDeletingId(null); // 삭제 중 상태 해제
    }
  };

  // ✅ 견적서 수정 페이지로 이동하는 함수
  const handleEdit = (estimateId: number) => {
    // TODO: 실제 수정 페이지 경로로 변경
    // 예: /admin/estimates/edit/123
    router.push(`/wedding-hall/updateStandardEstimate?id=${estimateId}`);
  };

  // ✅ 검색 입력 핸들러
  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // --- 렌더링 부분 ---
  return (
    <div className="container mx-auto p-4">
      {/* ✅ 페이지 제목 변경 */}
      <h1 className="text-2xl font-bold mb-6 text-center">
        표준 견적서 목록 조회/관리
      </h1>

      {/* ✅ 검색 입력 필드 (레이블, placeholder 변경) */}
      <div className="mb-4">
        <label
          htmlFor="search-company"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          웨딩업체 이름으로 검색:
        </label>
        <input
          type="text"
          id="search-company" // id 변경
          value={searchQuery}
          onChange={handleSearchInputChange}
          placeholder="검색할 웨딩업체 이름을 입력하세요" // placeholder 변경
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>

      {/* 로딩 상태 표시 */}
      {isLoading && <p className="text-center text-blue-500">로딩 중...</p>}

      {/* 에러 상태 표시 */}
      {error && <p className="text-center text-red-500">{error}</p>}

      {/* 필터링된 데이터가 없을 경우 (검색 결과 없음 포함) */}
      {!isLoading && !error && filteredEstimates.length === 0 && (
        <p className="text-center text-gray-900">
          {searchQuery
            ? `"${searchQuery}"에 해당하는 견적서가 없습니다.`
            : "등록된 견적서가 없습니다."}
        </p>
      )}

      {/* ✅ 필터링된 견적서 목록 (표) */}
      {!isLoading && !error && filteredEstimates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-900 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">견적서 ID</th>
                <th className="py-3 px-6 text-left">업체명</th>
                <th className="py-3 px-6 text-left">홀 이름</th>
                <th className="py-3 px-6 text-left">종류</th>
                <th className="py-3 px-6 text-left">날짜</th>
                <th className="py-3 px-6 text-left">시간</th>
                <th className="py-3 px-6 text-left">대관료</th>
                <th className="py-3 px-6 text-center">액션</th>{" "}
                {/* ✅ 수정/삭제 버튼을 포함할 컬럼 */}
              </tr>
            </thead>
            <tbody className="text-gray-900 text-sm font-light">
              {/* filteredEstimates 맵핑 */}
              {filteredEstimates.map((estimate) => (
                <tr
                  key={estimate.id}
                  className="border-b border-gray-200 hover:bg-gray-100"
                >
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.id}
                  </td>
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.hall?.wedding_company?.name || "정보 없음"}
                  </td>
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.hall?.name || "정보 없음"}
                  </td>
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.type || "미지정"}
                  </td>
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.date?.toString() || "날짜 미정"}
                  </td>
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.time || "시간 미정"}
                  </td>
                  <td className="py-3 px-6 text-black text-lg text-left whitespace-nowrap">
                    {estimate.hall_price?.toLocaleString("ko-KR") || "0"}원
                  </td>

                  {/* ✅ 액션 버튼 컬럼 (수정/삭제 포함) */}
                  <td className="py-3 px-6 text-center whitespace-nowrap">
                    {" "}
                    {/* nowrap 유지 */}
                    {/* ✅ 수정 버튼 */}
                    <button
                      onClick={() => handleEdit(estimate.id)}
                      // 삭제 중일 때 수정 버튼 비활성화
                      disabled={deletingId !== null} // || editingId !== null
                      className="px-4 py-2 rounded text-white text-xs font-semibold bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed mr-2" // mr-2 로 삭제 버튼과 간격
                    >
                      수정
                    </button>
                    {/* ✅ 삭제 버튼 */}
                    <button
                      onClick={() => handleDelete(estimate.id)}
                      // 삭제 중이거나 해당 항목 삭제 중일 때 버튼 비활성화
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
