"use client";

import NaverPlaceSearch from "@/components/NaverAddressSearch";
import GetStandardEstimate from "@/components/wedding-hall/createAdminEstimate/GetStandardEstimateForm";
import { useState } from "react";
import { DetailedEstimate } from "@/interface/estimates";
import { useAuthGuard } from "@/context/UseAuthGuard";

export default function CreateAdminEstimatePage() {
  useAuthGuard();
  // 컴포넌트 이름 변경 고려
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

  // 백엔드 검색 결과를 담을 상태 (간단 목록 또는 상세 목록)
  const [estimateList, setEstimateList] = useState<DetailedEstimate[]>([]); // 상세 데이터 리스트로 변경

  // 사용자가 목록에서 선택한 견적의 상세 데이터를 담을 상태
  const [selectedEstimate, setSelectedEstimate] =
    useState<DetailedEstimate | null>(null);

  // 수정 폼을 보여줄지 말지를 결정하는 상태 (옵션)
  const [showEditForm, setShowEditForm] = useState(false);

  const handleSearchCompany = async () => {
    console.log("검색 결과 (DetailedEstimate[]):", estimateList); // 검색 결과 확인

    // 검색 후 선택 상태 초기화
    setSelectedEstimate(null);
    setShowEditForm(false);

    // 예시: 실제 백엔드 호출 코드 (Async/await 및 fetch 사용)
    if (!companySearchData.name) {
      console.error("회사 이름을 검색해주세요");
      return; // 회사 이름 없으면 검색 안 함
    }
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/get_standard_estimate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ companyName: companySearchData.name }),
        }
      );

      const result = await response.json(); // 백엔드 응답 형식 { message: string, data: DetailedEstimate[] }

      if (!response.ok) {
        // 에러 처리
        console.error("백엔드 오류 응답:", result);
        throw new Error(result.detail || "표준견적서 요청 실패");
      }

      console.log("표준 견적서 검색 성공:", result.data);
      setEstimateList(result.data); // DetailedEstimate 객체들의 배열
    } catch (err) {
      console.error("표준견적서 요청 에러 발생:", err);
      // 사용자에게 에러 메시지 표시 (상태 변수 사용)
    }
  };

  // 목록에서 특정 견적을 선택했을 때 호출되는 함수
  const handleSelectEstimate = (item: DetailedEstimate) => {
    console.log("선택된 견적 (DetailedEstimate 객체):", item);
    setSelectedEstimate(item); // 선택된 견적 객체 전체를 상태에 저장
    setShowEditForm(true); // 수정 폼을 보여주도록 상태 변경
  };

  // 선택된 견적 수정 완료 또는 취소 시 호출될 함수 (수정 폼에서 전달받아 실행)
  const handleEditComplete = () => {
    setSelectedEstimate(null); // 선택 상태 초기화
    setShowEditForm(false); // 수정 폼 숨김
    // 필요하다면 목록을 새로고침하는 로직 추가 (handleSearchCompany 다시 호출 등)
    handleSearchCompany();
  };

  return (
    <div className="w-full flex flex-col items-center justify-center mt-10 gap-5">
      {/* 회사 검색 부분 */}
      <div className="w-[600px] border-gray-400 border rounded-lg flex flex-col items-center justify-start px-6 py-4">
        <h2 className="text-2xl font-semibold my-10">관리자 견적서 등록</h2>
        {/* 제목 변경 고려 */}
        <div className="w-full">
          <NaverPlaceSearch
            setCompanyData={setCompanySearchData}
          ></NaverPlaceSearch>
          {/* 상태 이름 변경 */}
        </div>
        {/* companySearchData의 name 필드가 채워졌는지 확인 후 버튼 활성화 */}
        {companySearchData.name && (
          <button
            onClick={handleSearchCompany}
            className="w-full h-10 rounded-lg bg-blue-500 text-white"
          >
            업체 견적 검색
          </button>
        )}
      </div>

      {/* 검색 결과 목록 표시 */}
      {estimateList.length > 0 &&
        !selectedEstimate && ( // 목록이 있고 선택되지 않았을 때만 보여줌
          <div className="w-[600px] flex items-center justify-between flex-wrap gap-4">
            {/* 목록 레이아웃 조정 고려 */}
            {estimateList.map((item) => (
              <div
                onClick={() => handleSelectEstimate(item)} // 객체 전체를 전달
                key={item.id}
                className="w-[180px] h-[80px] bg-white text-blue-500 border border-blue-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:font-semibold"
              >
                {/* 백엔드에서 받아온 상세 구조에 맞춰 hall.name 사용 */}
                <p className="text-lg">{item.hall.name}</p>

                <p className="text-sm text-gray-600">{item.date}</p>
              </div>
            ))}
          </div>
        )}

      {showEditForm && selectedEstimate && (
        <GetStandardEstimate
          initialData={selectedEstimate} // 받아온 상세 데이터를 prop으로 전달
          onFormSubmit={() => {}} // 수정 완료 후 목록 새로고침 등의 처리를 위한 prop (필요시)
        />
      )}
    </div>
  );
}
