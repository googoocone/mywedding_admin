"use client";

import React, { useState, useEffect, ChangeEvent } from "react"; // ChangeEvent 임포트
import { useRouter } from "next/navigation";
import { DetailedEstimate } from "@/interface/estimates"; // 예시 경로

import { useAuthGuard } from "@/context/UseAuthGuard";

// 모든 관리자 견적서를 나열하고 삭제하는 페이지 컴포넌트
export default function DeleteAdminEstimatePage() {
  useAuthGuard();
  const router = useRouter();
  // 전체 견적서 목록 상태 (원본 데이터 유지)
  const [estimates, setEstimates] = useState<DetailedEstimate[]>([]);
  // ✅ 필터링된 견적서 목록 상태 (실제로 표에 표시될 목록)
  const [filteredEstimates, setFilteredEstimates] = useState<
    DetailedEstimate[]
  >([]);
  // ✅ 검색어 상태
  const [searchQuery, setSearchQuery] = useState<string>("");
  // 데이터 로딩 상태
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // 에러 메시지 상태
  const [error, setError] = useState<string | null>(null);
  // 삭제 중인 견적서 ID 상태 (선택 사항: 삭제 버튼 비활성화 등에 사용)
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // --- 데이터 불러오는 함수 ---
  const fetchEstimates = async () => {
    setIsLoading(true); // 로딩 시작
    setError(null); // 이전 에러 초기화
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/get_admin_estimate_all` // 실제 백엔드 API 엔드포인트
      );

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(
          errorResult.detail || `HTTP error! status: ${response.status}`
        );
      }

      const data: DetailedEstimate[] = await response.json();
      setEstimates(data); // ✅ 전체 목록 상태 업데이트
      // setFilteredEstimates(data); // ✅ 초기에는 전체 목록으로 필터링된 목록 설정 (아래 useEffect에서 처리)
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
      // 검색어가 있으면 홀 이름 기준으로 필터링
      const filtered = estimates.filter((estimate) => {
        // estimate.hall?.name 에 안전하게 접근하여 검색어 포함 여부 확인
        return estimate.hall?.wedding_company?.name
          .toLowerCase()
          .includes(lowerCaseQuery);
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
      // TODO: 실제 백엔드 API 엔드포인트로 변경
      const response = await fetch(
        `http://localhost:8000/admin/admin_estimates/${estimateId}`, // 삭제 엔드포인트 (DELETE)
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

  // ✅ 검색 입력 핸들러
  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // --- 렌더링 부분 ---
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">
        관리자 견적서 목록
      </h1>

      {/* ✅ 검색 입력 필드 */}
      <div className="mb-4">
        <label
          htmlFor="search-hall"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          웨딩업체 이름으로 검색:
        </label>
        <input
          type="text"
          id="search-hall"
          value={searchQuery}
          onChange={handleSearchInputChange} // 핸들러 연결
          placeholder="검색할 웨딩업체 이름을 입력하세요"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>

      {/* 로딩 상태 표시 */}
      {isLoading && <p className="text-center text-blue-500">로딩 중...</p>}

      {/* 에러 상태 표시 */}
      {error && <p className="text-center text-red-500">{error}</p>}

      {/* ✅ 필터링된 데이터가 없을 경우 (검색 결과 없음 포함) */}
      {!isLoading && !error && filteredEstimates.length === 0 && (
        <p className="text-center text-gray-600">
          {
            searchQuery
              ? `"${searchQuery}"에 해당하는 견적서가 없습니다.` // 검색 결과 없을 때 메시지
              : "등록된 견적서가 없습니다." // 전체 목록이 비어있을 때 메시지
          }
        </p>
      )}

      {/* ✅ 필터링된 견적서 목록 (표) */}
      {!isLoading && !error && filteredEstimates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">견적서 ID</th>
                <th className="py-3 px-6 text-left">업체명</th>
                <th className="py-3 px-6 text-left">홀 이름</th>
                <th className="py-3 px-6 text-left">종류</th>
                <th className="py-3 px-6 text-left">날짜</th>
                <th className="py-3 px-6 text-left">시간</th>
                <th className="py-3 px-6 text-left">대관료</th>
                {/* 계약금/위약금 조항 컬럼은 필요시 다시 추가 */}
                {/* <th className="py-3 px-6 text-left">계약금</th>
                <th className="py-3 px-6 text-left">위약금 조항</th> */}
                <th className="py-3 px-6 text-center">삭제</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {/* ✅ filteredEstimates 맵핑 */}
              {filteredEstimates.map((estimate) => (
                <tr
                  key={estimate.id}
                  className="border-b border-gray-200 hover:bg-gray-100"
                >
                  <td className="py-3 px-6 text-lg text-left whitespace-nowrap">
                    {estimate.id}
                  </td>
                  <td className="py-3 px-6 text-lg text-left whitespace-nowrap">
                    {estimate.hall?.wedding_company?.name || "정보 없음"}
                  </td>
                  <td className="py-3 px-6 text-lg text-left whitespace-nowrap">
                    {estimate.hall?.name || "정보 없음"}
                  </td>
                  <td className="py-3 px-6 text-lg text-left whitespace-nowrap">
                    {estimate.type || "미지정"}
                  </td>
                  <td className="py-3 px-6 text-lg text-left whitespace-nowrap">
                    {estimate.date?.toString() || "날짜 미정"}
                  </td>
                  <td className="py-3 px-6 text-lg text-left whitespace-nowrap">
                    {estimate.time || "시간 미정"}
                  </td>
                  <td className="py-3 px-6 text-lg text-left whitespace-nowrap">
                    {estimate.hall_price?.toLocaleString("ko-KR") || "0"}원
                  </td>

                  <td className="py-3 px-6 text-center">
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
