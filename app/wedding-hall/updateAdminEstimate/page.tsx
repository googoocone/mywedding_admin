"use client";

import NaverPlaceSearch from "@/components/NaverAddressSearch";
import UpdateAdminEstimate from "@/components/wedding-hall/updateAdminEstimate/page"; // 실제 경로 확인 필요
import { useMemo, useState } from "react"; // useMemo 추가
import { DetailedEstimate } from "@/interface/estimates"; // 실제 경로 확인 필요
import { useAuthGuard } from "@/context/UseAuthGuard"; // 실제 경로 확인 필요

// --- 정렬 설정을 위한 타입 추가 ---
type SortDirection = "ascending" | "descending";
type SortConfig = {
  key: keyof DetailedEstimate;
  direction: SortDirection;
};
// --- 타입 추가 완료 ---

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [estimateIdToDelete, setEstimateIdToDelete] = useState<number | null>(
    null
  );

  // --- 정렬 상태 추가 (기본: ID 내림차순, 최신순) ---
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "id",
    direction: "descending",
  });
  // --- 정렬 상태 추가 완료 ---

  // --- useMemo를 사용한 정렬된 견적서 목록 ---
  const sortedEstimateList = useMemo(() => {
    const sortableList = [...estimateList]; // 원본 배열을 복사하여 사용
    if (sortConfig.key) {
      sortableList.sort((a, b) => {
        const valueA = a[sortConfig.key];
        const valueB = b[sortConfig.key];

        // 1. null 또는 undefined 값 처리
        // 둘 다 null/undefined이면 순서 변경 없음
        if (valueA == null && valueB == null) return 0;
        // a만 null/undefined이면 b를 앞으로 보냄 (null 값을 뒤로 정렬)
        if (valueA == null) return 1;
        // b만 null/undefined이면 a를 앞으로 보냄 (null 값을 뒤로 정렬)
        if (valueB == null) return -1;

        // 2. 실제 값 비교 (null이 아닌 경우)
        if (valueA < valueB) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }

        return 0;
      });
    }
    return sortableList;
  }, [estimateList, sortConfig]);
  // --- 정렬된 목록 생성 완료 ---

  // --- 정렬 요청 처리 함수 ---
  const requestSort = (key: keyof DetailedEstimate) => {
    let direction: SortDirection = "ascending";
    // 현재 정렬 키와 같고 오름차순이면 내림차순으로 변경
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };
  // --- 정렬 요청 함수 완료 ---

  const handleSearchCompany = async () => {
    // ... (기존과 동일)
    setSelectedEstimate(null);
    setShowEditForm(false);

    if (!companySearchData.name) {
      console.error("회사 이름을 검색해주세요");
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
      setEstimateList(result.data); // 여기서 정렬하지 않고 원본 데이터를 그대로 저장
      if (result.data.length === 0) {
        alert("해당 업체의 견적서가 없습니다.");
      }
    } catch (err) {
      console.error("표준견적서 요청 에러 발생:", err);
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
    if (companySearchData.name) {
      handleSearchCompany();
    } else {
      setEstimateList([]);
    }
  };

  const handleDeleteRequest = (estimateId: number) => {
    if (deletingId !== null) return;
    setEstimateIdToDelete(estimateId);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (estimateIdToDelete === null) return;
    setDeletingId(estimateIdToDelete);
    setShowConfirmModal(false);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/admin_estimates/${estimateIdToDelete}`,
        {
          method: "DELETE",
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
      setEstimateIdToDelete(null);
    }
  };

  const formatAddressShort = (address: string | undefined): string => {
    if (!address) return "주소 정보 없음";
    const parts = address.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return address;
  };

  // --- 정렬 방향 표시를 위한 유틸리티 함수 ---
  const getSortIndicator = (key: keyof DetailedEstimate) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ▲" : " ▼";
  };
  // --- 유틸리티 함수 완료 ---

  return (
    <div className="w-full flex flex-col items-center justify-center mt-10 mb-20 gap-5 px-4">
      {/* ... (검색 폼 부분은 기존과 동일) ... */}
      <div className="w-full max-w-2xl border-gray-300 border rounded-lg flex flex-col items-center justify-start px-6 py-4 shadow-md">
        <h2 className="text-2xl font-semibold my-6 text-gray-800">
          관리자 견적서 관리
        </h2>
        <div className="w-full">
          <NaverPlaceSearch setCompanyData={setCompanySearchData} />
        </div>
        {companySearchData.name && (
          <button
            onClick={handleSearchCompany}
            disabled={deletingId !== null}
            className="w-full h-10 rounded-lg bg-blue-500 text-white mt-4 hover:bg-blue-600 transition duration-150 ease-in-out disabled:bg-gray-300"
          >
            업체 견적 검색
          </button>
        )}
      </div>

      {/* --- 테이블 렌더링 수정 --- */}
      {estimateList.length > 0 && !selectedEstimate && (
        <div className="overflow-x-auto w-full max-w-5xl shadow-md rounded-lg">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600 uppercase text-sm leading-normal">
                {/* --- th에 onClick 및 스타일 추가 --- */}
                <th
                  className="py-3 px-6 cursor-pointer hover:bg-gray-200 transition duration-150"
                  onClick={() => requestSort("id")}
                >
                  견적ID
                  {getSortIndicator("id")}
                </th>
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
              {/* --- sortedEstimateList를 map으로 순회 --- */}
              {sortedEstimateList.map((estimate) => (
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
                      estimate.hall?.wedding_company?.address || "정보 없음"
                    )}
                  </td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    {estimate.hall?.name || "정보 없음"}
                  </td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    {estimate.date
                      ? new Date(estimate.date).toLocaleDateString()
                      : "날짜 미정"}
                  </td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    {estimate.time || "시간 미정"}
                  </td>
                  <td className="py-3 px-6 text-left whitespace-nowrap">
                    {estimate.hall_price?.toLocaleString("ko-KR") || "0"}원
                  </td>
                  <td className="py-3 px-6 text-center whitespace-nowrap">
                    {/* ... (버튼 부분은 기존과 동일) ... */}
                    <button
                      onClick={() => handleSelectEstimate(estimate)}
                      disabled={deletingId !== null}
                      className="px-3 py-1 rounded text-white text-xs font-semibold bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed mr-2 transition duration-150 ease-in-out"
                    >
                      수정
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRequest(estimate.id);
                      }}
                      disabled={deletingId !== null}
                      className={`px-3 py-1 rounded text-white text-xs font-semibold transition duration-150 ease-in-out ${
                        deletingId === estimate.id
                          ? "bg-yellow-500 cursor-wait"
                          : deletingId !== null
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {deletingId === estimate.id ? "처리중" : "삭제"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ... (수정 폼 및 삭제 모달 부분은 기존과 동일) ... */}
      {showEditForm && selectedEstimate && (
        <div className="w-full max-w-2xl mt-8">
          <UpdateAdminEstimate
            initialData={selectedEstimate}
            onFormSubmit={handleEditComplete}
          />
        </div>
      )}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl max-w-md w-full mx-auto">
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
                  setEstimateIdToDelete(null);
                }}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 transition duration-150 ease-in-out"
                disabled={
                  deletingId !== null && deletingId === estimateIdToDelete
                }
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className={`px-4 py-2 rounded text-white transition duration-150 ease-in-out ${
                  deletingId !== null && deletingId === estimateIdToDelete
                    ? "bg-red-400 cursor-wait"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={
                  deletingId !== null && deletingId === estimateIdToDelete
                }
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
