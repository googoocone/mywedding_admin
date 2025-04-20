"use client";

import { useState } from "react";

interface NaverPlaceSearchProps {
  setCompanyData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      address: string;
      mapx: string;
      mapy: string;
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

  const handleSearch = async () => {
    setError("");
    setSelected(null);

    try {
      const response = await fetch(
        `/api/naver/search?query=${encodeURIComponent(keyword)}`
      );
      const data = await response.json();
      console.log(data);

      if (!response.ok) throw new Error("네이버 API 요청 실패");

      if (data.items.length > 0) {
        setResults(data.items);
        setShowModal(true); // 모달 열기
      } else {
        setResults([]);
        setError("검색 결과가 없습니다.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleSelect = (item: any) => {
    console.log("item", item);
    setSelected(item);
    setShowModal(false); // 선택 시 모달 닫기

    setCompanyData((prev) => ({
      ...prev,
      name: item.title.replace(/<[^>]*>?/g, ""),
      address: item.address,
      mapx: item.mapx,
      mapy: item.mapy,
    }));
  };

  return (
    <div className="mt-4 mb-4 w-full relative">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="예: 노블발렌티"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="border p-2 w-full"
        />
        <button
          onClick={handleSearch}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          검색
        </button>
      </div>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      {/* ✅ 선택된 항목 */}
      {selected && (
        <div className="mt-4 border p-4 rounded bg-gray-100">
          <p>
            <strong>🏢 상호:</strong> {selected.title.replace(/<[^>]*>?/g, "")}
          </p>
          <p>
            <strong>📍 주소:</strong> {selected.address}
          </p>
        </div>
      )}

      {/* ✅ 결과 모달 */}
      {showModal && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md">
            <h3 className="text-lg font-semibold mb-4">🔍 검색 결과 선택</h3>
            <ul className="space-y-3 max-h-80 overflow-y-auto">
              {results.map((item, index) => (
                <li
                  key={index}
                  className="p-3 border rounded hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelect(item)}
                >
                  <p className="font-bold">
                    {item.title.replace(/<[^>]*>?/g, "")}
                  </p>
                  <p className="text-sm text-gray-600">{item.address}</p>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full bg-gray-300 text-black py-2 rounded"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
