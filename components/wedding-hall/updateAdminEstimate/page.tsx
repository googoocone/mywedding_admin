"use client";

import React, { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

import { DetailedEstimate } from "@/interface/estimates"; // 예시 경로

// 컴포넌트 속성(Props)에 대한 인터페이스
interface CreateStandardEstimateProps {
  // initialData prop으로 수정할 견적서 데이터를 받습니다. 이 컴포넌트가 수정 전용이라면 이 prop은 필수입니다.
  initialData?: DetailedEstimate | null;
  // 폼 제출 완료 시 호출될 콜백 함수. 제출 결과 데이터와 수정 여부를 전달합니다.
  onFormSubmit?: (data: any, isUpdate: boolean) => void;
  // 취소 버튼 클릭 시 호출될 콜백 함수.
  onCancel?: () => void;
}

const packageItemOptions = [
  { value: "스튜디오", label: "스튜디오" },
  { value: "드레스", label: "드레스" },
  { value: "헤어메이크업", label: "헤어&메이크업" }, // value는 "헤어메이크업", label은 "헤어&메이크업"
  { value: "부케", label: "부케" },
];

export default function UpdateAdminEstimate({
  initialData,
  onFormSubmit,
  onCancel,
}: CreateStandardEstimateProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 회사 정보 상태
  const [companyData, setCompanyData] = useState({
    name: "",
    address: "",
    phone: "",
    homepage: "",
    accessibility: "",
    mapx: "", // NaverPlaceSearch에서 오는 값, 백엔드 lat/lng과 다를 수 있음
    mapy: "", // NaverPlaceSearch에서 오는 값
    ceremony_times: "", // 백엔드에서 JSON string으로 넘어왔던 값
  });

  // 홀 정보 상태
  const [hallData, setHallData] = useState({
    name: "",
    interval_minutes: 60,
    guarantees: 100,
    parking: 50,
    type: "컨벤션", // 기본값
    mood: "밝은", // 기본값
  });

  // 웨딩홀 포함 사항 목록 상태
  const [hallIncludeList, setHallIncludeList] = useState<
    { id?: number; category: string; subcategory: string }[] // 수정 시 id 포함될 수 있음
  >([]);

  // 견적 기본 정보 상태 (대관료, 종류, 날짜)
  const [estimateData, setEstimateData] = useState({
    hall_price: 0,
    meal_type: "", // 이 필드의 목적에 따라 initialData에서 값을 가져와야 함 (MealPrice 배열과 다름)
    type: "admin", // 기본값
    date: "", // ISO 날짜 문자열
    time: "",
    penalty_amount: 0,
    penalty_detail: "",
  });

  // 식대 항목 목록 상태
  const [mealTypes, setMealTypes] = useState<
    {
      id?: number;
      meal_type: string;
      category: string;
      price: number;
      extra: string;
    }[] // 수정 시 id 포함될 수 있음
  >([{ meal_type: "", category: "대인", price: 0, extra: "" }]); // 기본 항목 (initialData 없을 때)

  // 웨딩 패키지 상태 (단일 객체로 가정, 백엔드는 배열) - 백엔드 구조에 맞춰 배열로 관리하는 것이 더 정확할 수 있습니다.
  // 현재는 단일 객체로 가정하고 initialData의 첫 번째 패키지를 사용합니다.
  const [packageData, setPackageData] = useState({
    type: "스드메", // 기본값
    name: "",
    total_price: 0,
    is_total_price: true, // 기본값
  });

  // 패키지 개별 항목 목록 상태
  const [packageItems, setPackageItems] = useState<
    {
      id?: number;
      type: string;
      company_name: string;
      price: number;
      description: string;
      url: string;
    }[] // 수정 시 id 포함될 수 있음
  >([]); // 기본 빈 배열 (initialData 없을 때)

  // 견적서 옵션 목록 상태
  const [estimateOptions, setEstimateOptions] = useState<
    {
      id?: number;
      name: string;
      price: number;
      is_required: boolean;
      description: string;
      reference_url: string;
    }[] // 수정 시 id 포함될 수 있음
  >([]); // 기본 빈 배열 (initialData 없을 때)

  // 기타 메모사항 상태 (단일 객체로 가정, 백엔드는 etcs 배열) - 백엔드 구조에 맞춰 배열로 관리하는 것이 더 정확할 수 있습니다.
  // 현재는 단일 객체로 가정하고 etcs 배열의 내용을 합쳐 사용합니다.
  const [etcData, setEtcData] = useState({
    content: "", // 여러 etc 내용을 합친 문자열
  });

  // --- useEffect 훅: initialData prop 변경 시 상태 초기화 ---
  useEffect(() => {
    // initialData prop이 제공되면 (수정 모드) 상태들을 initialData 값으로 초기화합니다.
    if (initialData) {
      // 회사 정보 초기화 (Nested WeddingCompany data)
      setCompanyData({
        name: initialData.hall.wedding_company.name || "",
        address: initialData.hall.wedding_company.address || "",
        phone: initialData.hall.wedding_company.phone || "",
        homepage: initialData.hall.wedding_company.homepage || "",
        accessibility: initialData.hall.wedding_company.accessibility || "",
        // 백엔드 lat/lng을 폼의 mapx/mapy에 매핑 (NaverPlaceSearch와 형식 다를 수 있음)
        mapx: initialData.hall.wedding_company.lng?.toString() || "", // Naver Search 결과 형식에 맞춤
        mapy: initialData.hall.wedding_company.lat?.toString() || "", // Naver Search 결과 형식에 맞춤
        ceremony_times: initialData.hall.wedding_company.ceremony_times || "",
      });

      // 홀 정보 초기화 (Nested Hall data)
      setHallData({
        name: initialData.hall.name || "",
        interval_minutes: initialData.hall.interval_minutes ?? 60, // nullish coalescing 사용하여 null/undefined일 경우 기본값 적용
        guarantees: initialData.hall.guarantees ?? 100,
        parking: initialData.hall.parking ?? 50,
        type: initialData.hall.type || "컨벤션", // Enum string
        mood: initialData.hall.mood || "밝은", // Enum string
      });

      // 웨딩홀 포함 사항 목록 초기화 (Array of HallIncludeData)
      setHallIncludeList(
        initialData.hall.hall_includes.map((item) => ({
          id: item.id, // 기존 항목 ID 포함
          category: item.category || "",
          subcategory: item.subcategory || "",
        }))
      );

      // 견적 기본 정보 초기화
      setEstimateData({
        hall_price: initialData.hall_price ?? 0,
        // meal_type 필드는 MealPrice 배열과 별개라면 initialData에서 해당하는 값을 가져와야 합니다.
        meal_type: "", // initialData에 estimateData.meal_type 필드가 없으므로 기본값
        type: initialData.type || "admin", // Enum string
        date: initialData.date || "", // ISO 날짜 문자열
        time: initialData.time || "",
        penalty_amount: initialData.penalty_amount || 0,
        penalty_detail: initialData.penalty_detail || "",
      });

      // 식대 항목 목록 초기화 (Array of MealPriceData)
      setMealTypes(
        initialData.meal_prices.map((item) => ({
          id: item.id, // 기존 항목 ID 포함
          meal_type: item.meal_type || "",
          category: item.category || "대인", // Enum string
          price: item.price ?? 0,
          extra: item.extra || "",
        }))
      );

      // 웨딩 패키지 초기화 (Array of WeddingPackageData - 첫 번째 항목 사용)
      if (
        initialData.wedding_packages &&
        initialData.wedding_packages.length > 0
      ) {
        const firstPackage = initialData.wedding_packages[0];
        setPackageData({
          type: firstPackage.type || "스드메", // Enum string
          name: firstPackage.name || "",
          total_price: firstPackage.total_price ?? 0,
          is_total_price: firstPackage.is_total_price ?? true, // boolean
        });
        // 패키지 아이템 목록 초기화 (Nested Array wedding_package_items)
        setPackageItems(
          firstPackage.wedding_package_items.map((item) => ({
            id: item.id, // 기존 항목 ID 포함
            type: item.type || "스튜디오", // Enum string
            company_name: item.company_name || "",
            price: item.price ?? 0,
            description: item.description || "",
            url: item.url || "",
          }))
        );
      } else {
        // 패키지 정보가 없는 경우 기본값으로 초기화
        setPackageData({
          type: "스드메",
          name: "",
          total_price: 0,
          is_total_price: true,
        });
        setPackageItems([]);
      }

      // 견적서 옵션 목록 초기화 (Array of EstimateOptionData)
      setEstimateOptions(
        initialData.estimate_options.map((item) => ({
          id: item.id, // 기존 항목 ID 포함
          name: item.name || "",
          price: item.price ?? 0,
          is_required: item.is_required ?? false, // boolean
          description: item.description || "",
          reference_url: item.reference_url || "",
        }))
      );

      // 기타 메모사항 초기화 (Array of EtcData - 내용을 합쳐 사용)
      setEtcData({
        content: initialData.etcs.map((item) => item.content).join("\n") || "", // 여러 항목 내용을 줄바꿈으로 합침
      });
    } else {
      // initialData가 null일 경우 (등록 모드) 모든 상태를 기본값으로 초기화합니다.
      // (위에 정의된 useState 초기값과 동일하게 설정)
      setCompanyData({
        name: "",
        address: "",
        phone: "",
        homepage: "",
        accessibility: "",
        mapx: "",
        mapy: "",
        ceremony_times: "",
      });
      setHallData({
        name: "",
        interval_minutes: 60,
        guarantees: 100,
        parking: 50,
        type: "컨벤션",
        mood: "밝은",
      });
      setHallIncludeList([]);
      setEstimateData({
        hall_price: 0,
        meal_type: "",
        type: "admin",
        date: "",
        time: "",
        penalty_amount: 0,
        penalty_detail: "",
      });
      setMealTypes([{ meal_type: "", category: "대인", price: 0, extra: "" }]);
      setPackageData({
        type: "스드메",
        name: "",
        total_price: 0,
        is_total_price: true,
      });
      setPackageItems([]);
      setEstimateOptions([]); // 등록 모드 기본값은 빈 배열
      setEtcData({ content: "" });
    }
  }, [initialData]); // initialData prop이 변경될 때마다 이 훅 실행

  // --- handleSubmit 함수: Payload 구성 및 API 호출 ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    // initialData가 없을 경우 (등록 모드) 유효성 검사 추가
    // if (!initialData && (!companyData.name || !hallData.name || !estimateData.date)) { ... }

    // 관리자 수정 폼은 initialData가 항상 있다고 가정합니다.
    if (!initialData) {
      console.error(
        "Error: This form is intended for editing, but initialData is missing."
      );
      setError("수정할 견적 데이터가 없습니다.");
      setIsLoading(false);
      return;
    }

    const payload: any = {
      // 수정 시에는 ID를 payload에 포함합니다.

      // ForeignKey로 연결된 상위/형제 객체의 ID도 payload에 포함될 수 있습니다.
      hall_id: initialData.hall.id, // 홀 ID
      wedding_company_id: initialData.hall.wedding_company_id, // 업체 ID (FK로 연결)

      hall_price: estimateData.hall_price,
      type: estimateData.type,
      date: estimateData.date,

      etcs:
        etcData.content.trim() !== ""
          ? [
              {
                // 기존 etc 항목 ID (etcs가 배열이고, etcData가 첫 번째 항목을 수정한다고 가정)
                ...(initialData.etcs &&
                  initialData.etcs.length > 0 &&
                  initialData.etcs[0].id && { id: initialData.etcs[0].id }),
                content: etcData.content,
              },
            ]
          : [], // 내용 없으면 빈 배열

      meal_prices: mealTypes.map((item) => ({
        ...(item.id && { id: item.id }), // 기존 식대 항목 ID
        meal_type: item.meal_type,
        category: item.category,
        price: item.price,
        extra: item.extra,
      })),

      estimate_options: estimateOptions.map((item) => ({
        ...(item.id && { id: item.id }), // 기존 옵션 ID
        name: item.name,
        price: item.price,
        is_required: item.is_required,
        description: item.description,
        reference_url: item.reference_url,
      })),

      // WeddingPackage는 단일 객체로 가정
      wedding_package: packageData
        ? {
            ...(initialData.wedding_packages &&
              initialData.wedding_packages.length > 0 &&
              initialData.wedding_packages[0].id && {
                id: initialData.wedding_packages[0].id,
              }),
            ...packageData, // 패키지 기본 정보
            wedding_package_items: packageItems.map((item) => ({
              ...(item.id && { id: item.id }), // 기존 아이템 ID
              type: item.type,
              company_name: item.company_name,
              price: item.price,
              description: item.description,
              url: item.url,
            })),
          }
        : null,

      hall_includes: hallIncludeList.map((item) => ({
        ...(item.id && { id: item.id }), // 기존 포함사항 ID
        category: item.category,
        subcategory: item.subcategory,
      })),

      // 사진 Payload: 관리자 수정에서는 받아온 원본 hall_photos 배열을 그대로 보냅니다.

      // 필요하다면 companyData, hallData 필드들도 명시적으로 포함
      company: {
        id: initialData.hall.wedding_company.id, // 업체 ID
        name: companyData.name, // 수정 가능한 필드만 포함? 또는 전체?
        address: companyData.address,
        phone: companyData.phone,
        homepage: companyData.homepage,
        accessibility: companyData.accessibility,
        lat: companyData.mapy ? Number(companyData.mapy) : null, // mapy -> lat 변환
        lng: companyData.mapx ? Number(companyData.mapx) : null, // mapx -> lng 변환
        ceremony_times: companyData.ceremony_times,
      },
      hall: {
        id: initialData.hall.id, // 홀 ID
        name: hallData.name, // 수정 가능한 필드만 포함? 또는 전체?
        interval_minutes: hallData.interval_minutes,
        guarantees: hallData.guarantees,
        parking: hallData.parking,
        type: hallData.type,
        mood: hallData.mood,
      },
    };

    // 백엔드 API 호출 (수정 엔드포인트 호출)
    // 이 컴포넌트가 관리자 수정 전용이므로 항상 PUT/PATCH 호출
    const apiEndpoint = `http://localhost:8000/admin/update_admin_estimate/${initialData.id}`; // 관리자 수정 엔드포인트 예시
    const httpMethod = "PUT"; // 관리자 수정은 PUT 또는 PATCH 사용

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.log("❌ 오류 응답:", result);
        throw new Error(
          result.detail || `HTTP error! status: ${response.status}`
        );
      }

      // 성공 메시지 및 후처리
      setSuccessMessage(`견적서 수정 성공!`);
      onFormSubmit && onFormSubmit(result, true); // 수정 완료임을 알림
      router.refresh();
    } catch (err: any) {
      console.error("API request failed:", err);
      setError(err.message || "처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX 렌더링 부분 ---
  // 사진 업로드 필드는 제거하고 받아온 사진 URL만 보여줍니다.
  // 이 컴포넌트가 관리자 수정 전용이므로 initialData가 항상 있다고 가정하고 렌더링합니다.

  const formTitle = "관리자 견적서 수정"; // 제목 고정

  return (
    <div
      style={{
        maxWidth: "800px", // 적절한 너비
        margin: "2rem auto",
        padding: "2rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h1 className="text-center text-2xl mt-5 mb-10 font-semibold">
        {formTitle}
      </h1>
      <form onSubmit={handleSubmit}>
        {/* 업체 정보 필드셋 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">업체 정보</legend>
          {/* 업체명은 읽기 전용으로 표시 */}
          <label>업체명</label>
          <div className="w-full mb-2 p-2 border border-gray-300 bg-gray-100 rounded">
            {companyData.name}
          </div>
          {/* 다른 companyData 필드들은 수정 가능하도록 입력 필드 사용 */}
          <label>전화번호</label>
          <input
            readOnly
            type="tel"
            name="phone"
            value={companyData.phone}
            className="w-full mb-2 p-2 border border-gray-300"
            placeholder="전화번호"
          />
          {/* ... 나머지 companyData 수정 필드들 (homepage, accessibility) ... */}
          <label>예식 시간</label>
          <textarea
            readOnly
            name="ceremony_times"
            value={companyData.ceremony_times}
            className="w-full mb-4 p-2 border border-gray-300"
            placeholder="예: 10:00 / 11:00 / 12:00 / 13:00 / 14:00"
          />
        </fieldset>
        {/* 홀 정보 필드셋 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">홀 정보</legend>
          {/* 홀 이름은 읽기 전용으로 표시 */}
          <label>홀 이름</label>
          <div className="w-full mb-4 p-2 border border-gray-300 bg-gray-100 rounded">
            {hallData.name}
          </div>
          {/* 다른 hallData 필드들은 수정 가능하도록 입력 필드 사용 */}
          <label>예식 간격</label>
          <input
            type="number"
            value={hallData.interval_minutes}
            onChange={(e) =>
              setHallData({
                ...hallData,
                interval_minutes: Number(e.target.value),
              })
            }
            className="w-full mb-4 p-2 border border-gray-300"
            placeholder="예식 간격(분)"
          />
          <label>보증 인원</label>
          <input
            type="number"
            value={hallData.guarantees}
            onChange={(e) =>
              setHallData({ ...hallData, guarantees: Number(e.target.value) })
            }
            className="w-full mb-4 p-2 border border-gray-300"
            placeholder="보증 인원"
          />
          <label>주차 대수</label>
          <input
            type="number"
            value={hallData.parking}
            onChange={(e) =>
              setHallData({ ...hallData, parking: Number(e.target.value) })
            }
            className="w-full mb-4 p-2 border border-gray-300"
            placeholder="주차 대수"
          />
          <label>웨딩홀 타입</label>
          <select
            value={hallData.type}
            onChange={(e) => setHallData({ ...hallData, type: e.target.value })}
            className="w-full mb-4 p-2 border border-gray-300"
          >
            {/* 옵션들은 models/enums.py 의 HallTypeEnum 에 맞춰야 함 */}
            {["호텔", "가든", "스몰", "컨벤션", "채플", "야외", "하우스"].map(
              (t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              )
            )}
          </select>
          <label>웨딩홀 분위기</label>
          <select
            value={hallData.mood}
            onChange={(e) => setHallData({ ...hallData, mood: e.target.value })}
            className="w-full mb-4 p-2 border border-gray-300"
          >
            {/* 옵션들은 models/enums.py 의 MoodEnum 에 맞춰야 함 */}
            {["밝은", "어두운"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </fieldset>
        {/* 웨딩홀 포함 사항 필드셋 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">대관료 포함사항</legend>
          {/* hallIncludeList 맵핑 및 입력 필드, 삭제 버튼 */}
          {/* 삭제 버튼은 필요에 따라 관리자 수정에서도 활성화 */}
          {hallIncludeList.map((item, index) => (
            <div
              key={item.id || index}
              className="mb-4 border p-2 rounded relative"
            >
              <label className="block mb-1">대분류</label>
              <input
                type="text"
                value={item.category}
                onChange={(e) => {
                  const updated = [...hallIncludeList];
                  updated[index].category = e.target.value;
                  setHallIncludeList(updated);
                }}
                placeholder="포함사항 대분류"
                className="w-full mb-2 p-2 border border-gray-300"
              />
              <label className="block mb-1">소분류</label>
              <textarea
                value={item.subcategory}
                onChange={(e) => {
                  const updated = [...hallIncludeList];
                  updated[index].subcategory = e.target.value;
                  setHallIncludeList(updated);
                }}
                placeholder="포함사항 소분류"
                className="w-full p-2 border border-gray-300"
              />
              <button
                type="button"
                onClick={() => {
                  const updated = hallIncludeList.filter((_, i) => i !== index);
                  setHallIncludeList(updated);
                }}
                className="absolute top-2 right-2 text-red-500 text-sm cursor-pointer hover:font-semibold"
              >
                {" "}
                삭제{" "}
              </button>
            </div>
          ))}
          {/* 포함사항 추가 버튼 */}
          <button
            type="button"
            onClick={() =>
              setHallIncludeList([
                ...hallIncludeList,
                { category: "", subcategory: "" },
              ])
            }
            className="w-full bg-green-500 text-white p-2 rounded cursor-pointer hover:font-semibold"
          >
            {" "}
            + 포함사항 추가{" "}
          </button>
        </fieldset>
        {/* 견적 정보 필드셋 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">💰 견적 정보</legend>
          {/* estimateData 필드들 (대관료, 종류, 날짜) */}
          <label className="block mb-1">대관료</label>
          <input
            type="text"
            value={estimateData.hall_price.toLocaleString("ko-KR")}
            onChange={(e) => {
              const value = e.target.value.replace(/,/g, "");
              const numeric = Number(value);
              setEstimateData({
                ...estimateData,
                hall_price: isNaN(numeric) ? 0 : numeric,
              });
            }}
            placeholder="숫자만 입력 (예: 1000000)"
            className="w-full p-2 border border-gray-300 rounded-md"
          />

          <label className="block mb-1">견적서 종류</label>
          <select
            value={estimateData.type}
            onChange={(e) =>
              setEstimateData({ ...estimateData, type: e.target.value })
            }
            className="w-full mb-2 p-2 border border-gray-300"
          >
            {/* 옵션들은 models/enums.py 의 EstimateTypeEnum 에 맞춰야 함 */}
            {["admin"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <label className="block mb-1">날짜</label>
          <input
            type="date"
            value={estimateData.date}
            onChange={(e) =>
              setEstimateData({ ...estimateData, date: e.target.value })
            }
            className="w-full mb-2 p-2 border border-gray-300"
          />
          <label className="block mb-1">예식 시작 시간</label>
          <input
            type="time"
            value={estimateData.time}
            onChange={(e) =>
              setEstimateData({
                ...estimateData,
                time: e.target.value,
              })
            }
            className="w-[200px] h-[40px] px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <label className="block mb-1">계약금</label>
          <input
            type="text"
            value={estimateData.penalty_amount.toLocaleString("ko-KR")}
            className="w-[200px] h-[40px] px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onChange={(e) => {
              const value = e.target.value.replace(/,/g, "");
              const numeric = Number(value);
              setEstimateData({
                ...estimateData,
                penalty_amount: isNaN(numeric) ? 0 : numeric,
              });
            }}
          ></input>
          <label className="block mb-1">계약금 조항</label>
          <textarea
            value={estimateData.penalty_detail}
            onChange={(e) =>
              setEstimateData({
                ...estimateData,
                penalty_detail: e.target.value,
              })
            }
            className="w-full h-[160px] px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </fieldset>
        {/* 식대 정보 필드셋 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">🍽 식대 정보</legend>
          {/* mealTypes 맵핑 및 입력 필드, 삭제 버튼 */}
          {mealTypes.map((meal, index) => (
            <div
              key={meal.id || index}
              className="mb-4 border p-3 rounded relative"
            >
              {" "}
              {/* key는 id 또는 index */}
              {/* 삭제 버튼 */}
              <button
                type="button"
                onClick={() => {
                  const updated = mealTypes.filter((_, i) => i !== index);
                  setMealTypes(updated);
                }}
                className="absolute top-2 right-2 text-red-500 text-sm hover:font-semibold cursor-pointer"
              >
                {" "}
                삭제{" "}
              </button>
              {/* 식사 종류 */}
              <label className="block mb-1">식사 종류</label>
              <input
                type="text"
                value={meal.meal_type}
                onChange={(e) => {
                  const updated = [...mealTypes];
                  updated[index].meal_type = e.target.value;
                  setMealTypes(updated);
                }}
                placeholder="예: 뷔페"
                className="w-full mb-2 p-2 border border-gray-300"
              />
              {/* 구분 */}
              <label className="block mb-1">구분</label>
              <select
                value={meal.category}
                onChange={(e) => {
                  const updated = [...mealTypes];
                  updated[index].category = e.target.value;
                  setMealTypes(updated);
                }}
                className="w-full mb-2 p-2 border border-gray-300"
              >
                {/* 옵션들은 models/enums.py 의 MealCategoryEnum 에 맞춰야 함 */}
                {["대인", "소인", "미취학", "음주류"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {/* 가격 */}
              <label className="block mb-1">가격</label>
              <input
                type="text"
                value={meal.price.toLocaleString("ko-KR")}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, "");
                  const numeric = Number(value);
                  const updated = [...mealTypes];
                  updated[index].price = isNaN(numeric) ? 0 : numeric;
                  setMealTypes(updated);
                }}
                placeholder="숫자만 입력"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              {/* 비고 */}
              <label className="block mb-1">비고</label>
              <input
                type="text"
                value={meal.extra}
                onChange={(e) => {
                  const updated = [...mealTypes];
                  updated[index].extra = e.target.value;
                  setMealTypes(updated);
                }}
                placeholder="예: 10명 무료"
                className="w-full mb-2 p-2 border border-gray-300"
              />
            </div>
          ))}
          {/* 식대 항목 추가 버튼 */}
          <button
            type="button"
            onClick={() =>
              setMealTypes([
                ...mealTypes,
                { meal_type: "", category: "대인", price: 0, extra: "" },
              ])
            }
            className="w-full bg-green-500 text-white p-2 rounded hover:font-semibold cursor-pointer"
          >
            {" "}
            + 식대 항목 추가{" "}
          </button>
        </fieldset>
        {/* 웨딩 패키지 필드셋 */}
        {/* WeddingPackageData 단일 객체 상태지만, 백엔드는 배열로 줍니다. 필요에 따라 폼 상태를 배열로 변경 고려 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">🎁 홀 패키지</legend>
          {/* packageData 필드들 */}
          <label className="block mb-1">패키지 종류</label>
          <select
            value={packageData.type}
            onChange={(e) =>
              setPackageData({ ...packageData, type: e.target.value })
            }
            className="w-full mb-2 p-2 border border-gray-300"
          >
            {/* 옵션들은 models/enums.py 의 PackageTypeEnum 에 맞춰야 함 */}
            {["스드메", "개별"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <label className="block mb-1">패키지명</label>
          <input
            type="text"
            value={packageData.name}
            onChange={(e) =>
              setPackageData({ ...packageData, name: e.target.value })
            }
            placeholder="예: 프리미엄 패키지"
            className="w-full mb-2 p-2 border border-gray-300"
          />

          <label className="block mb-1">금액 방식</label>
          <select
            value={packageData.is_total_price ? "true" : "false"}
            onChange={(e) => {
              const isTotal = e.target.value === "true";
              setPackageData({
                ...packageData,
                is_total_price: isTotal,
                total_price: isTotal ? packageData.total_price : 0,
              });
            }}
            className="w-full mb-2 p-2 border border-gray-300"
          >
            <option value="true">통합 금액</option>
            <option value="false">개별 금액</option>
          </select>

          {packageData.is_total_price && (
            <>
              <label className="block mb-1">총 가격</label>
              <input
                type="text"
                value={packageData.total_price.toLocaleString("ko-KR")}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, "");
                  const numeric = Number(value);
                  setPackageData({
                    ...packageData,
                    total_price: isNaN(numeric) ? 0 : numeric,
                  });
                }}
                placeholder="숫자만 입력"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </>
          )}
          {!packageData.is_total_price && (
            <p className="text-sm text-gray-500">
              💡 개별 금액 선택 시 총 가격은 0원으로 자동 설정됩니다.
            </p>
          )}

          {/* 패키지 개별 항목 필드셋 */}
          <fieldset className="mb-4 p-4 border border-gray-200">
            <legend className="text-xl font-semibold">
              📦 개별 패키지 항목
            </legend>
            {/* packageItems 맵핑 및 입력 필드, 삭제 버튼 */}
            {packageItems.map((item, index) => (
              <div
                key={item.id || index}
                className="mb-4 border border-gray-300 p-4 rounded relative"
              >
                {/* 삭제 버튼 */}
                <button
                  type="button"
                  className="absolute top-2 right-2 text-red-500 cursor-pointer hover:font-semibold"
                  onClick={() =>
                    setPackageItems((prev) =>
                      prev.filter((_, i) => i !== index)
                    )
                  }
                >
                  {" "}
                  삭제{" "}
                </button>

                {/* 항목 종류 */}
                <label className="block mb-1">항목 종류</label>
                <select
                  value={item.type}
                  onChange={(e) => {
                    const updated = [...packageItems];
                    updated[index].type = e.target.value;
                    setPackageItems(updated);
                  }}
                  className="w-full mb-2 p-2 border border-gray-300"
                >
                  {packageItemOptions.map((optionItem) => (
                    <option key={optionItem.value} value={optionItem.value}>
                      {optionItem.label}
                    </option>
                  ))}
                </select>

                {/* 업체명 */}
                <label className="block mb-1">업체명</label>
                <input
                  type="text"
                  value={item.company_name}
                  onChange={(e) => {
                    const updated = [...packageItems];
                    updated[index].company_name = e.target.value;
                    setPackageItems(updated);
                  }}
                  className="w-full mb-2 p-2 border border-gray-300"
                  placeholder="예: 플로렌스 드레스"
                />

                {/* 가격 */}
                <label className="block mb-1">가격</label>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => {
                    const updated = [...packageItems];
                    updated[index].price = Number(e.target.value);
                    setPackageItems(updated);
                  }}
                  className="w-full mb-2 p-2 border border-gray-300"
                  placeholder="예: 500000"
                />

                {/* 참고 URL */}
                <label className="block mb-1">참고 URL</label>
                <input
                  type="text"
                  value={item.url}
                  onChange={(e) => {
                    const updated = [...packageItems];
                    updated[index].url = e.target.value;
                    setPackageItems(updated);
                  }}
                  className="w-full mb-2 p-2 border border-gray-300"
                  placeholder="URL 입력"
                />

                {/* 설명 */}
                <label className="block mb-1">설명</label>
                <textarea
                  value={item.description}
                  onChange={(e) => {
                    const updated = [...packageItems];
                    updated[index].description = e.target.value;
                    setPackageItems(updated);
                  }}
                  className="w-full mb-2 p-2 border border-gray-300"
                  placeholder="간단한 설명"
                />
              </div>
            ))}
            {/* 항목 추가 버튼 */}
            <button
              type="button"
              onClick={() =>
                setPackageItems((prev) => [
                  ...prev,
                  {
                    type: "스튜디오",
                    company_name: "",
                    price: 0,
                    description: "",
                    url: "",
                  },
                ])
              }
              className="w-full px-4 py-2 bg-green-500 text-white rounded cursor-pointer hover:font-semibold"
            >
              {" "}
              + 항목 추가{" "}
            </button>
          </fieldset>
        </fieldset>
        {/* 견적서 옵션 필드셋 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">🧩 견적서 옵션</legend>
          {/* estimateOptions 맵핑 및 입력 필드, 필수 여부, 설명, URL, 삭제 버튼 */}
          {estimateOptions.map((option, index) => (
            <div
              key={option.id || index}
              className="mb-4 border border-gray-300 p-4 rounded relative"
            >
              {/* 삭제 버튼 */}
              <button
                type="button"
                className="absolute top-2 right-2 text-red-500 cursor-pointer hover:font-semibold"
                onClick={() =>
                  setEstimateOptions((prev) =>
                    prev.filter((_, i) => i !== index)
                  )
                }
              >
                {" "}
                삭제{" "}
              </button>

              {/* 옵션명 */}
              <label className="block mb-1">옵션명</label>
              <input
                type="text"
                value={option.name}
                onChange={(e) => {
                  const updated = [...estimateOptions];
                  updated[index].name = e.target.value;
                  setEstimateOptions(updated);
                }}
                className="w-full mb-2 p-2 border border-gray-300"
                placeholder="예: 폐백실"
              />

              {/* 가격 */}
              <label className="block mb-1">가격</label>
              <input
                type="number"
                value={option.price}
                onChange={(e) => {
                  const updated = [...estimateOptions];
                  updated[index].price = Number(e.target.value);
                  setEstimateOptions(updated);
                }}
                placeholder="예: 100000"
                className="w-full mb-2 p-2 border border-gray-300"
              />

              {/* 필수 여부 */}
              <label className="block mb-1">필수 여부</label>
              <select
                value={option.is_required ? "true" : "false"}
                onChange={(e) => {
                  const updated = [...estimateOptions];
                  updated[index].is_required = e.target.value === "true";
                  setEstimateOptions(updated);
                }}
                className="w-full mb-2 p-2 border border-gray-300"
              >
                <option value="true">필수</option>
                <option value="false">선택</option>
              </select>

              {/* 설명 */}
              <label className="block mb-1">설명</label>
              <textarea
                value={option.description}
                onChange={(e) => {
                  const updated = [...estimateOptions];
                  updated[index].description = e.target.value;
                  setEstimateOptions(updated);
                }}
                className="w-full mb-2 p-2 border border-gray-300"
                placeholder="옵션 설명"
              />

              {/* 참고 URL */}
              <label className="block mb-1">참고 URL</label>
              <input
                type="url"
                value={option.reference_url}
                onChange={(e) => {
                  const updated = [...estimateOptions];
                  updated[index].reference_url = e.target.value;
                  setEstimateOptions(updated);
                }}
                className="w-full mb-2 p-2 border border-gray-300"
                placeholder="https://example.com"
              />
            </div>
          ))}
          {/* 옵션 추가 버튼 */}
          <button
            type="button"
            onClick={() =>
              setEstimateOptions((prev) => [
                ...prev,
                {
                  name: "",
                  price: 0,
                  is_required: false,
                  description: "",
                  reference_url: "",
                },
              ])
            }
            className="w-full px-4 py-2 bg-green-500 text-white rounded cursor-pointer hover:font-semibold"
          >
            {" "}
            + 옵션 추가{" "}
          </button>
        </fieldset>
        {/* 기타 메모사항 필드셋 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">📝 기타 정보</legend>
          {/* etcData textarea */}
          <label className="block mb-1">기타 내용</label>
          <textarea
            value={etcData.content}
            onChange={(e) =>
              setEtcData({ ...etcData, content: e.target.value })
            }
            className="w-full mb-2 p-2 border border-gray-300"
            placeholder="기타 정보나 전달사항을 적어주세요"
            rows={4}
          />
        </fieldset>
        {/* Feedback & Submit */}
        {error && <p className="text-red-500 cursor-pointer">{error}</p>}       {" "}
        {successMessage && (
          <p className="text-green-500 cursor-pointer">{successMessage}</p>
        )}
               {" "}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-3 rounded cursor-pointer"
        >
                    {isLoading ? "처리 중..." : "수정 완료"}       {" "}
        </button>
                 {/* 취소 버튼 */}         
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full bg-gray-400 text-white p-3 rounded cursor-pointer mt-2"
          >
                             취소              
          </button>
        )}
             {" "}
      </form>
         {" "}
    </div>
  );
}
