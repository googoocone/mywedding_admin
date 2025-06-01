"use client";

import NaverPlaceSearch from "@/components/NaverAddressSearch";
import UpdateAdminEstimate from "@/components/wedding-hall/updateAdminEstimate/page"; // 실제 경로 확인 필요
// import { FormEvent, useState } from "react"; // FormEvent는 현재 코드에서 사용되지 않으므로 제거 가능
import { useState } from "react";
import { DetailedEstimate } from "@/interface/estimates"; // 실제 경로 확인 필요
import { useAuthGuard } from "@/context/UseAuthGuard"; // 실제 경로 확인 필요

export default function UpdateAdminEstimatePage() {
  useAuthGuard();
  const [companySearchData, setCompanySearchData] = useState({
    name: "",
    address: "",
    phone: "",
    homepage: "",
    accessibility: "",
    mapx: "",
    mapy: "",
    ceremony_times: "",
  });

  const [estimateList, setEstimateList] = useState<DetailedEstimate[]>([]);
  const [selectedEstimate, setSelectedEstimate] =
    useState<DetailedEstimate | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // --- 모달 상태 추가 ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [estimateIdToDelete, setEstimateIdToDelete] = useState<number | null>(
    null
  );
  // --- 모달 상태 추가 완료 ---

  const handleSearchCompany = async () => {
    setSelectedEstimate(null);
    setShowEditForm(false);

    if (!companySearchData.name) {
      console.error("회사 이름을 검색해주세요");
      // 사용자에게 알림을 줄 수 있습니다. (예: alert 또는 UI 메시지)
      alert("회사 이름을 입력 후 검색해주세요.");
      return;
    }
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/get_admin_estimate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ companyName: companySearchData.name }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error("백엔드 오류 응답:", result);
        alert(`견적서 검색 실패: ${result.detail || response.statusText}`);
        throw new Error(result.detail || "표준견적서 요청 실패");
      }

      console.log("표준 견적서 검색 성공:", result.data);
      setEstimateList(result.data);
      if (result.data.length === 0) {
        alert("해당 업체의 견적서가 없습니다.");
      }
    } catch (err) {
      console.error("표준견적서 요청 에러 발생:", err);
      // 사용자에게 에러 메시지 표시
      alert(
        `오류 발생: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
      );
    }
  };

  const handleSelectEstimate = (item: DetailedEstimate) => {
    setSelectedEstimate(item);
    setShowEditForm(true);
  };

  const handleEditComplete = () => {
    setSelectedEstimate(null);
    setShowEditForm(false);
    // 수정 완료 후 목록을 새로고침하여 변경사항을 즉시 반영
    if (companySearchData.name) {
      // 검색했던 업체명이 있다면 해당 업체 기준으로 다시 검색
      handleSearchCompany();
    } else {
      setEstimateList([]); // 검색 조건이 없다면 목록을 비움
    }
  };

  // --- handleDeleteRequest 함수: 모달을 띄우는 역할 ---
  const handleDeleteRequest = (estimateId: number) => {
    if (deletingId !== null) return; // 다른 작업(삭제)이 진행 중이면 무시
    setEstimateIdToDelete(estimateId);
    setShowConfirmModal(true);
  };
  // --- handleDeleteRequest 함수 수정 완료 ---

  // --- 실제 삭제 로직을 담은 함수 ---
  const confirmDelete = async () => {
    if (estimateIdToDelete === null) return;
    // deletingId 상태를 여기서 설정해야 모달의 확인 버튼 텍스트도 "삭제 중..."으로 변경 가능
    setDeletingId(estimateIdToDelete);
    setShowConfirmModal(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/admin_estimates/${estimateIdToDelete}`,
        {
          method: "DELETE",
          headers: {}, // DELETE 요청 시 Content-Type은 필수가 아님
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        alert(`견적서 삭제 실패: ${errorData.detail || response.statusText}`);
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      console.log(
        `견적서 (ID: ${estimateIdToDelete})가 성공적으로 삭제되었습니다.`
      );
      alert(`견적서 (ID: ${estimateIdToDelete})가 성공적으로 삭제되었습니다.`);
      setEstimateList((prevList) =>
        prevList.filter((estimate) => estimate.id !== estimateIdToDelete)
      );

      // 삭제된 항목이 현재 선택된 수정 항목이었다면 선택 해제
      if (selectedEstimate && selectedEstimate.id === estimateIdToDelete) {
        setSelectedEstimate(null);
        setShowEditForm(false);
      }
    } catch (err) {
      console.error("견적서 삭제 중 오류 발생:", err);
      alert(
        `삭제 중 오류 발생: ${
          err instanceof Error ? err.message : "알 수 없는 오류"
        }`
      );
    } finally {
      setDeletingId(null);
      setEstimateIdToDelete(null); // estimateIdToDelete도 여기서 초기화
    }
  };
  // --- 실제 삭제 로직 함수 완료 ---

  const formatAddressShort = (address: string | undefined): string => {
    if (!address) return "주소 정보 없음";
    const parts = address.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return address;
  };

  return (
    <div className="w-full flex flex-col items-center justify-center mt-10 mb-20 gap-5 px-4">
      {" "}
      {/* 하단 여백 및 좌우 패딩 추가 */}
      <div className="w-full max-w-2xl border-gray-300 border rounded-lg flex flex-col items-center justify-start px-6 py-4 shadow-md">
        <h2 className="text-2xl font-semibold my-6 text-gray-800">
          관리자 견적서 관리
        </h2>
        <div className="w-full">
          <NaverPlaceSearch setCompanyData={setCompanySearchData} />
        </div>
        {companySearchData.name && ( // 업체명이 있을 때만 검색 버튼 표시
          <button
            onClick={handleSearchCompany}
            disabled={deletingId !== null} // 삭제 작업 중에는 검색 버튼 비활성화
            className="w-full h-10 rounded-lg bg-blue-500 text-white mt-4 hover:bg-blue-600 transition duration-150 ease-in-out disabled:bg-gray-300"
          >
            업체 견적 검색
          </button>
        )}
      </div>
      {/* 견적 목록 테이블 */}
      {estimateList.length > 0 && !selectedEstimate && (
        <div className="overflow-x-auto w-full max-w-5xl shadow-md rounded-lg">
          {" "}
          {/* 최대 너비 확장 및 그림자, 둥근 모서리 */}
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              {" "}
              {/* thead 배경색 변경 */}
              <tr className="text-left text-gray-600 uppercase text-sm leading-normal">
                {" "}
                {/* a an th 텍스트 스타일 변경 */}
                <th className="py-3 px-6">견적ID</th>
                <th className="py-3 px-6 whitespace-nowrap">업체명</th>
                <th className="py-3 px-6 whitespace-nowrap">주소 (시/구)</th>
                <th className="py-3 px-6">홀 이름</th>
                <th className="py-3 px-6">견적서 날짜</th>
                <th className="py-3 px-6">예식 시작 시간</th>
                <th className="py-3 px-6">대관료</th>
                <th className="py-3 px-6 text-center">액션</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {" "}
              {/* tbody 텍스트 색상 변경 */}
              {estimateList.map((estimate) => (
                <tr
                  key={estimate.id}
                  className="border-b border-gray-200 hover:bg-gray-100 transition duration-150 ease-in-out"
                >
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    {estimate.id}
                  </td>
                  <td className="py-3 px-6 text-left max-w-xs truncate">
                    {estimate.hall?.wedding_company?.name || "정보 없음"}
                  </td>
                  <td className="py-3 px-6 text-left max-w-xs truncate">
                    {formatAddressShort(
                      estimate.hall?.wedding_company?.address
                    )}
                  </td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    {estimate.hall?.name || "정보 없음"}
                  </td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    {estimate.date
                      ? new Date(estimate.date).toLocaleDateString()
                      : "날짜 미정"}{" "}
                    {/* 날짜 형식 변경 */}
                  </td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    {estimate.time || "시간 미정"}
                  </td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    {estimate.hall_price?.toLocaleString("ko-KR") || "0"}원
                  </td>
                  <td className="py-3 px-6 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleSelectEstimate(estimate)}
                      disabled={deletingId !== null} // 다른 항목 삭제 중에는 수정 버튼 비활성화
                      className="px-3 py-1 rounded text-white text-xs font-semibold bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed mr-2 transition duration-150 ease-in-out"
                    >
                      수정
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // 테이블 행의 onClick 이벤트 전파 방지 (필요 시)
                        handleDeleteRequest(estimate.id);
                      }}
                      disabled={deletingId !== null} // 어떤 항목이든 삭제 중이면 모든 삭제 버튼 비활성화
                      className={`px-3 py-1 rounded text-white text-xs font-semibold transition duration-150 ease-in-out ${
                        deletingId === estimate.id // 현재 항목이 삭제 중일 때 (모달이 아닌 테이블 버튼)
                          ? "bg-yellow-500 cursor-wait" // 모달이 떠 있으므로 "삭제 요청됨" 의미로 변경 가능
                          : deletingId !== null
                          ? "bg-gray-300 cursor-not-allowed" // 다른 항목 삭제 중
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {/* 테이블의 삭제 버튼 텍스트는 deletingId와 직접 연관짓지 않거나, "삭제 요청" 등으로 표시 가능 */}
                      {deletingId === estimate.id ? "처리중" : "삭제"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* 수정 폼 */}
      {showEditForm && selectedEstimate && (
        <div className="w-full max-w-2xl mt-8">
          {" "}
          {/* 수정 폼 위 여백 추가 */}
          <UpdateAdminEstimate
            initialData={selectedEstimate}
            onFormSubmit={handleEditComplete} // 수정 완료 콜백 함수 전달
          />
        </div>
      )}
      {/* 삭제 확인 모달 UI */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          {" "}
          {/* 배경 투명도 및 패딩 조절 */}
          <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl max-w-md w-full mx-auto">
            {" "}
            {/* 반응형 너비 및 패딩 */}
            <h3 className="text-xl font-semibold mb-5 text-gray-800">
              삭제 확인
            </h3>
            <p className="mb-7 text-gray-700">
              정말로 이 견적서(ID:{" "}
              <span className="font-semibold">{estimateIdToDelete}</span>)를
              삭제하시겠습니까? <br />이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setEstimateIdToDelete(null); // 취소 시 estimateIdToDelete도 초기화
                }}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 transition duration-150 ease-in-out"
                disabled={
                  deletingId !== null && deletingId === estimateIdToDelete
                } // 현재 항목 삭제 진행 중일때만 비활성화
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className={`px-4 py-2 rounded text-white transition duration-150 ease-in-out ${
                  deletingId !== null && deletingId === estimateIdToDelete
                    ? "bg-red-400 cursor-wait" // "삭제 중..."일 때 스타일
                    : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={
                  deletingId !== null && deletingId === estimateIdToDelete
                } // 현재 항목 삭제 진행 중일때만 비활성화
              >
                {deletingId !== null && deletingId === estimateIdToDelete ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    삭제 중...
                  </>
                ) : (
                  "확인"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
