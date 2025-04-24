"use client";

import NaverPlaceSearch from "@/components/NaverAddressSearch";
import { FormEvent, useState } from "react";

export default function createAdminEstimate() {
  const [companyData, setCompanyData] = useState({
    name: "",
    address: "",
    mapx: "",
    mapy: "",
  });

  const [estimateData, setEstimateData] = useState<any[]>([]);

  const [selectEstimate, setSelectEstimate] = useState("");

  const handleSearchCompany = async () => {
    if (!companyData) {
      console.error("회사 이름을 검색해주세요");
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/get_standard_estimate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ companyName: companyData.name }),
        }
      );

      const estimateData = await response.json();

      if (!response.ok) {
        throw new Error(estimateData.detail || "표준견적서 요청 실패");
      }

      setEstimateData(estimateData.data);
      console.log(estimateData);
    } catch (err) {
      throw Error("표준견적서 요청 에러 발생");
    }
  };

  const handleSelectEstimate = async (item: any) => {
    console.log("item", item);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center mt-10 gap-5">
      <div className="w-[600px] border-gray-400 border rounded-lg flex flex-col items-center justify-start px-6 py-4">
        <h2 className="text-2xl font-semibold my-10">관리자 견적서 등록</h2>
        <div className="w-full">
          <NaverPlaceSearch setCompanyData={setCompanyData}></NaverPlaceSearch>
        </div>
        {companyData && (
          <button
            onClick={handleSearchCompany}
            className="w-full h-10 rounded-lg bg-blue-500 text-white"
          >
            검색
          </button>
        )}
      </div>
      <div className="w-[600px] flex items-center justify-between">
        {estimateData.map((item) => (
          <div
            onClick={() => handleSelectEstimate(item)}
            key={item.id}
            className="w-[180px] h-[50px] bg-white text-blue-500 border border-blue-500 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:font-semibold"
          >
            <p>{item.hall.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
