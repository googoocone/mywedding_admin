"use client";

import { useState } from "react";

interface NaverPlaceSearchProps {
  setCompanyData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      address: string;
      phone: string;
      homepage: string;
      accessibility: string;
      mapx: string; // 네이버 API 응답은 문자열일 수 있으므로 string으로 유지
      mapy: string; // 위와 동일
      ceremony_times: string;
    }>
  >;
}

export default function NaverPlaceSearch({
  setCompanyData,
}: NaverPlaceSearchProps) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");

  // 실제 검색 로직을 수행하는 함수
  const performSearch = async () => {
    if (keyword.trim() === "") {
      setError("검색어를 입력해주세요.");
      setResults([]); // 이전 결과 지우기
      // setShowModal(false); // 모달이 열려있었다면 닫을 수도 있음
      return;
    }

    setError("");
    setSelected(null); // 새 검색 시 이전 선택 초기화

    try {
      const response = await fetch(
        `/api/naver/search?query=${encodeURIComponent(keyword)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errorMessage || "네이버 API 요청 실패");
      }

      if (data.items && data.items.length > 0) {
        setResults(data.items);
        setShowModal(true); // 검색 결과가 있으면 모달 열기
      } else {
        setResults([]);
        setError("검색 결과가 없습니다.");
        // setShowModal(false); // 결과가 없으면 모달을 굳이 열 필요 없음
      }
    } catch (err: any) {
      console.error("검색 중 오류 발생:", err);
      setError(err.message || "검색 중 오류가 발생했습니다.");
      setResults([]);
      // setShowModal(false);
    }
  };

  // Form의 onSubmit 이벤트 핸들러
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // 페이지 새로고침 방지
    performSearch(); // 검색 실행
  };

  // 검색 버튼 클릭 핸들러 (폼 제출로도 동작하므로, 특별한 로직이 없다면 onSubmit으로 통합 가능)
  // 여기서는 명시적으로 performSearch를 호출하도록 남겨둡니다.
  const handleSearchButtonClick = () => {
    performSearch();
  };

  const handleSelect = (item: any) => {
    setSelected(item); // 선택된 항목 상태 업데이트
    setShowModal(false); // 선택 시 모달 닫기

    // HTML 태그 제거 (예: <b> 태그)
    const cleanTitle = item.title ? item.title.replace(/<[^>]*>?/g, "") : "";

    setCompanyData((prev) => ({
      ...prev, // 이전 companyData의 다른 필드들은 유지
      name: cleanTitle,
      address: item.address || "", // 주소가 없을 경우 빈 문자열 처리
      phone: item.telephone || "", // 전화번호가 없을 경우 빈 문자열 처리
      homepage: "", // 네이버 플레이스 API 기본 응답에는 홈페이지 URL이 명시적으로 제공되지 않을 수 있음
      // 필요하다면 item.link (업체 상세 정보 URL) 등을 활용하거나, 별도 필드 확인
      accessibility: prev.accessibility, // 이 정보는 API에서 직접 오지 않으므로 기존 값 유지 또는 별도 처리
      mapx: item.mapx || "",
      mapy: item.mapy || "",
      ceremony_times: prev.ceremony_times, // 이 정보는 API에서 직접 오지 않으므로 기존 값 유지 또는 별도 처리
    }));
    // 선택 후 키워드 초기화 (선택 사항)
    // setKeyword("");
  };

  return (
    <div className="mt-4 mb-4 w-full relative">
      {/* form으로 input과 button을 감싸고, onSubmit 핸들러 연결 */}
      <form onSubmit={handleFormSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="예: 노블발렌티 (검색 후 Enter 또는 버튼 클릭)"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            if (error) setError(""); // 입력 시작 시 에러 메시지 초기화
          }}
          className="border p-2 w-full rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
        />
        <button
          type="submit" // 버튼 타입을 "submit"으로 변경하여 Enter키로 폼 제출 가능
          // onClick={handleSearchButtonClick} // onSubmit으로 처리되므로 onClick은 필수는 아님.
          // 다만, form 바깥에서 이 함수를 호출할 일이 있다면 유지.
          // 여기서는 type="submit"이 form의 onSubmit을 트리거하므로 중복 호출 방지 위해 주석 처리하거나 제거.
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md whitespace-nowrap"
        >
          검색
        </button>
      </form>

      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}

      {/* 선택된 항목 표시 */}
      {selected && (
        <div className="mt-4 border p-4 rounded bg-gray-50">
          <p className="font-semibold text-gray-800">
            선택된 업체: {selected.title.replace(/<[^>]*>?/g, "")}
          </p>
          <p className="text-sm text-gray-600">주소: {selected.address}</p>
        </div>
      )}

      {/* 검색 결과 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-5 shadow-xl w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              검색 결과
            </h3>
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
              {results.map((item, index) => (
                <li
                  key={item.link || index} // 고유한 key 값으로 item.link 사용 고려
                  className="p-3 border rounded-md hover:bg-green-50 cursor-pointer transition-colors duration-150"
                  onClick={() => handleSelect(item)}
                >
                  <p className="font-bold text-green-700">
                    {item.title.replace(/<[^>]*>?/g, "")}
                  </p>
                  <p className="text-sm text-gray-600">
                    {item.roadAddress || item.address}
                  </p>{" "}
                  {/* roadAddress 우선 사용 */}
                  {item.category && (
                    <p className="text-xs text-gray-500 mt-1">
                      {item.category}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                setShowModal(false);
                // 모달 닫을 때 검색 결과나 에러 메시지도 초기화할 수 있습니다.
                // setResults([]);
                // setError("");
              }}
              className="mt-5 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 px-4 rounded-md font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
