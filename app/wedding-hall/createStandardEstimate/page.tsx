"use client";

import React, { useState, FormEvent, ChangeEvent } from "react";
import { CompanyFormData } from "@/interface";
import NaverPlaceSearch from "@/components/NaverAddressSearch";
import { uploadImage } from "@/utils/uploadImage";

export default function CreateStandardEstimate() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [mainPhoto, setMainPhoto] = useState<File | null>(null);
  const [subPhotos, setSubPhotos] = useState<File[]>([]);
  const [mainPhotoPreview, setMainPhotoPreview] = useState<string | null>(null);
  const [subPhotoPreviews, setSubPhotoPreviews] = useState<string[]>([]);

  const [companyData, setCompanyData] = useState({
    name: "",
    address: "",
    phone: "",
    homepage: "",
    accessibility: "",
    mapx: "",
    mapy: "",
    ceremony_times: "",
  });

  const [hallData, setHallData] = useState({
    name: "",
    interval_minutes: 60,
    guarantees: 100,
    parking: 50,
    type: "컨벤션",
    mood: "밝은",
  });

  const [hallIncludeList, setHallIncludeList] = useState<
    { category: string; subcategory: string }[]
  >([]);

  const [estimateData, setEstimateData] = useState({
    hall_price: 0,
    meal_type: "",
    type: "standard",
    date: "",
    time: "", //"HH:MM으로 저장할 예정"
    penalty_amount: 0,
    penalty_detail: "",
  });

  const [mealTypes, setMealTypes] = useState<
    { meal_type: string; category: string; price: number; extra: string }[]
  >([{ meal_type: "", category: "대인", price: 0, extra: "" }]);

  const [packageData, setPackageData] = useState({
    type: "스드메",
    name: "",
    total_price: 0,
    is_total_price: true,
  });

  const [packageItems, setPackageItems] = useState<
    {
      type: string;
      company_name: string;
      price: number;
      description: string;
      url: string;
    }[]
  >([]);

  const [estimateOptions, setEstimateOptions] = useState([
    {
      name: "",
      price: 0,
      is_required: false,
      description: "",
      reference_url: "",
    },
  ]);

  const [etcData, setEtcData] = useState({
    content: "",
  });

  const handleCompanyChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCompanyData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMainPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainPhoto(file);
      setMainPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const total = subPhotos.length + files.length;
    if (total > 9) {
      alert("추가 사진은 최대 9장까지 업로드 가능합니다.");
      return;
    }
    setSubPhotos((prev) => [...prev, ...files]);
    setSubPhotoPreviews((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
  };

  const handleRemoveSubPhoto = (index: number) => {
    const newPhotos = [...subPhotos];
    const newPreviews = [...subPhotoPreviews];
    newPhotos.splice(index, 1);
    newPreviews.splice(index, 1);
    setSubPhotos(newPhotos);
    setSubPhotoPreviews(newPreviews);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!companyData.name) {
      setError("업체명을 입력해주세요.");
      setIsLoading(false);
      return;
    }

    const payload: any = {
      ...companyData,
    };

    payload.hall = hallData;
    payload.hall_includes = hallIncludeList;
    payload.estimate = estimateData;
    payload.wedding_package = packageData;
    payload.package_items = packageItems;
    payload.meal_price = mealTypes;

    if (estimateOptions.length > 0) {
      payload.estimate_options = estimateOptions;
    }
    if (etcData.content.trim() !== "") {
      payload.etc = etcData;
    }

    try {
      // ✅ Firebase Storage에 대표 및 추가 사진 업로드 후 URL 저장
      const hall_photos = [];

      if (mainPhoto) {
        const mainUrl = await uploadImage(mainPhoto, "hall/main");
        hall_photos.push({
          url: mainUrl.toString(),
          order_num: 1,
          caption: "대표 사진",
          is_visible: true,
        });
      }

      for (let i = 0; i < subPhotos.length; i++) {
        const url = await uploadImage(subPhotos[i], "hall/sub");
        hall_photos.push({
          url: url.toString(),
          order_num: i + 2,
          caption: `추가 사진 ${i + 1}`,
          is_visible: true,
        });
      }

      payload.hall_photos = hall_photos;
      console.log("payload", payload);

      const response = await fetch(
        `http://localhost:8000/admin/create-standard-estimate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.log("❌ 오류 응답:", result);
        throw new Error(
          result.detail || `HTTP error! status: ${response.status}`
        );
      }

      setSuccessMessage(`업체 등록 성공! 업체 ID: ${result.company_id}`);
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError(err.message || "등록 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "2rem auto",
        padding: "2rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h1 className="text-center text-2xl mt-5 mb-10 font-semibold">
        웨딩 업체 표준견적서 등록
      </h1>

      <div style={{ marginBottom: "1rem" }}>
        <label
          htmlFor="address"
          style={{ display: "block", marginBottom: "0.25rem" }}
        >
          <NaverPlaceSearch setCompanyData={setCompanyData} />
          주소 :
        </label>
        <div className="w-full h-10 border-gray-300 border">
          {companyData.address}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 회사 정보 입력 */}
        <input
          type="text"
          id="name"
          name="name"
          value={companyData.name}
          onChange={handleCompanyChange}
          required
          className="w-full mb-2 p-2 border border-gray-300"
          placeholder="업체명"
        />
        <input
          type="tel"
          id="phone"
          name="phone"
          value={companyData.phone}
          onChange={handleCompanyChange}
          className="w-full mb-2 p-2 border border-gray-300"
          placeholder="전화번호"
        />
        <input
          type="url"
          id="homepage"
          name="homepage"
          value={companyData.homepage}
          onChange={handleCompanyChange}
          className="w-full mb-2 p-2 border border-gray-300"
          placeholder="홈페이지"
        />
        <textarea
          id="accessibility"
          name="accessibility"
          value={companyData.accessibility}
          onChange={handleCompanyChange}
          rows={3}
          className="w-full mb-2 p-2 border border-gray-300"
          placeholder="접근성"
        />

        {/* Ceremony Times 텍스트 입력 */}
        <label>예식 시간 : </label>
        <textarea
          name="ceremony_times"
          placeholder="예: 10:00 / 11:00 / 12:00 / 13:00 / 14:00"
          className="w-full mb-4 p-2 border border-gray-300"
          value={companyData.ceremony_times}
          onChange={handleCompanyChange}
        />

        {/* Hall 정보 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">홀 정보</legend>
          <label>홀 이름</label>
          <input
            type="text"
            value={hallData.name}
            onChange={(e) => setHallData({ ...hallData, name: e.target.value })}
            placeholder="홀 이름"
            className="w-full mb-4 p-2 border border-gray-300"
          />
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
            placeholder="예식 간격(분)"
            className="w-full mb-4 p-2 border border-gray-300"
          />
          <label>보증 인원</label>
          <input
            type="number"
            value={hallData.guarantees}
            onChange={(e) =>
              setHallData({ ...hallData, guarantees: Number(e.target.value) })
            }
            placeholder="보증 인원"
            className="w-full mb-4 p-2 border border-gray-300"
          />
          <label>주차 대수</label>
          <input
            type="number"
            value={hallData.parking}
            onChange={(e) =>
              setHallData({ ...hallData, parking: Number(e.target.value) })
            }
            placeholder="주차 대수"
            className="w-full mb-4 p-2 border border-gray-300"
          />
          <label>웨딩홀 타입</label>
          <select
            value={hallData.type}
            onChange={(e) => setHallData({ ...hallData, type: e.target.value })}
            className="w-full mb-4 p-2 border border-gray-300"
          >
            {["호텔", "가든", "스몰", "컨벤션", "채플"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label>웨딩홀 분위기</label>
          <select
            value={hallData.mood}
            onChange={(e) => setHallData({ ...hallData, mood: e.target.value })}
            className="w-full mb-4 p-2 border border-gray-300"
          >
            {["밝은", "어두운"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </fieldset>

        {/* 웨딩홀 포함 사항 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">웨딩홀 포함사항</legend>

          {hallIncludeList.map((item, index) => (
            <div key={index} className="mb-4 border p-2 rounded relative">
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
                삭제
              </button>
            </div>
          ))}

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
            + 포함사항 추가
          </button>
        </fieldset>
        {/* 견적 정보 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">💰 견적 정보</legend>

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
            placeholder="예: 1,000,000"
            className="w-full mb-2 p-2 border border-gray-300"
          />

          <label className="block mb-1">견적서 종류</label>
          <select
            value={estimateData.type}
            onChange={(e) =>
              setEstimateData({
                ...estimateData,
                type: e.target.value,
              })
            }
            className="w-full mb-2 p-2 border border-gray-300"
          >
            {["standard", "admin", "user"].map((t) => (
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
              setEstimateData({
                ...estimateData,
                date: e.target.value,
              })
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
            onChange={(e) => {
              const value = e.target.value.replace(/,/g, "");
              const numeric = Number(value);
              setEstimateData({
                ...estimateData,
                penalty_amount: isNaN(numeric) ? 0 : numeric,
              });
            }}
            className="w-full h-[40px] px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

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

        {/* 식대 정보 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">🍽 식대 정보</legend>

          {mealTypes.map((meal, index) => (
            <div key={index} className="mb-4 border p-3 rounded relative">
              <label className="block mb-1">식사 종류</label>
              <input
                type="text"
                value={meal.meal_type}
                onChange={(e) => {
                  const updated = [...mealTypes];
                  updated[index].meal_type = e.target.value;
                  setMealTypes(updated);
                }}
                placeholder="예: 뷔페, 코스 등"
                className="w-full mb-2 p-2 border border-gray-300"
              />

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
                {["대인", "소인", "미취학", "음주류"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

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
                placeholder="예: 50,000"
                className="w-full mb-2 p-2 border border-gray-300"
              />

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

              <button
                type="button"
                onClick={() => {
                  const updated = mealTypes.filter((_, i) => i !== index);
                  setMealTypes(updated);
                }}
                className="absolute top-2 right-2 text-red-500 text-sm hover:font-semibold cursor-pointer"
              >
                삭제
              </button>
            </div>
          ))}

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
            + 식대 항목 추가
          </button>
        </fieldset>

        {/* 웨딩홀 패키지 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">🎁 웨딩 패키지</legend>

          <label className="block mb-1">패키지 종류</label>
          <select
            value={packageData.type}
            onChange={(e) =>
              setPackageData({ ...packageData, type: e.target.value })
            }
            className="w-full mb-2 p-2 border border-gray-300"
          >
            {["스드메", "개별 금액"].map((t) => (
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
                total_price: isTotal ? packageData.total_price : 0, // 금액 방식 바꿀 때 처리
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
                placeholder="예: 2,000,000"
                className="w-full mb-2 p-2 border border-gray-300"
              />
            </>
          )}

          {!packageData.is_total_price && (
            <p className="text-sm text-gray-500">
              💡 개별 금액 선택 시 총 가격은 0원으로 자동 설정됩니다.
            </p>
          )}
        </fieldset>

        {/* 패키지 개별 항목 */}

        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">📦 개별 패키지 항목</legend>

          {packageItems.map((item, index) => (
            <div
              key={index}
              className="mb-4 border border-gray-300 p-4 rounded relative"
            >
              <button
                type="button"
                className="absolute top-2 right-2 text-red-500 cursor-pointer hover:font-semibold"
                onClick={() => {
                  setPackageItems((prev) => prev.filter((_, i) => i !== index));
                }}
              >
                삭제
              </button>

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
                {["스튜디오", "드레스", "메이크업"].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

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

              <label className="block mb-1">가격</label>
              <input
                type="text"
                value={item.price.toLocaleString("ko-KR")}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, "");
                  const numeric = Number(value);
                  const updated = [...packageItems];
                  updated[index].price = isNaN(numeric) ? 0 : numeric;
                  setPackageItems(updated);
                }}
                placeholder="예: 300,000"
                className="w-full mb-2 p-2 border border-gray-300"
              />

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
                placeholder="인스타든 블로그든 홈페이지든 URL을 입력해주세요."
              />

              <label className="block mb-1">설명</label>
              <textarea
                value={item.description}
                onChange={(e) => {
                  const updated = [...packageItems];
                  updated[index].description = e.target.value;
                  setPackageItems(updated);
                }}
                className="w-full mb-2 p-2 border border-gray-300"
                placeholder="간단한 설명을 적어주세요"
              />
            </div>
          ))}

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
            + 항목 추가
          </button>
        </fieldset>

        {/* 견적서 옵션 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">🧩 견적서 옵션</legend>

          {estimateOptions.map((option, index) => (
            <div
              key={index}
              className="mb-4 border border-gray-300 p-4 rounded relative"
            >
              <button
                type="button"
                className="absolute top-2 right-2 text-red-500 cursor-pointer hover:font-semibold"
                onClick={() => {
                  setEstimateOptions((prev) =>
                    prev.filter((_, i) => i !== index)
                  );
                }}
              >
                삭제
              </button>

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
                placeholder="예: 폐백실, 신부대기실 등"
              />

              <label className="block mb-1">가격</label>
              <input
                type="text"
                value={option.price.toLocaleString("ko-KR")}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, "");
                  const numeric = Number(value);
                  const updated = [...estimateOptions];
                  updated[index].price = isNaN(numeric) ? 0 : numeric;
                  setEstimateOptions(updated);
                }}
                placeholder="예: 100,000"
                className="w-full mb-2 p-2 border border-gray-300"
              />

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

              <label className="block mb-1">설명</label>
              <textarea
                value={option.description}
                onChange={(e) => {
                  const updated = [...estimateOptions];
                  updated[index].description = e.target.value;
                  setEstimateOptions(updated);
                }}
                className="w-full mb-2 p-2 border border-gray-300"
                placeholder="해당 옵션에 대한 설명"
              />

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
            + 옵션 추가
          </button>
        </fieldset>

        {/* 기타 메모사항 */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">📝 기타 정보</legend>

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

        {/* 사진 업로드  */}
        <fieldset className="mb-4 p-4 border border-gray-200">
          <legend className="text-xl font-semibold">
            🖼️ 웨딩홀 사진 업로드
          </legend>

          {/* 대표 사진 */}
          <div className="mb-8">
            <label className=" block mb-1 font-medium">대표 사진 (1장)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleMainPhotoUpload}
              className="mb-5 w-full px-4 py-2 bg-green-500 text-white rounded cursor-pointer hover:font-semibold"
              placeholder="사진 입력"
            />
            {mainPhotoPreview && (
              <div className="relative w-32 h-32">
                <img
                  src={mainPhotoPreview}
                  alt="대표 사진 미리보기"
                  className="w-full h-full object-cover rounded border"
                />
              </div>
            )}
          </div>

          {/* 추가 사진 */}
          <div>
            <label className="block mb-1 font-medium">
              추가 사진 (최대 9장)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleSubPhotoUpload}
              className="mb-5 w-full px-4 py-2 bg-green-500 text-white rounded cursor-pointer hover:font-semibold"
            />
            <div className="grid grid-cols-3 gap-4">
              {subPhotoPreviews.map((src, index) => (
                <div key={index} className="relative w-28 h-28">
                  <img
                    src={src}
                    alt={`추가 사진 ${index + 1}`}
                    className="w-full h-full object-cover rounded border"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
                    onClick={() => handleRemoveSubPhoto(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </fieldset>

        {/* Feedback & Submit */}
        {error && <p className="text-red-500 cursor-pointer">{error}</p>}
        {successMessage && (
          <p className="text-green-500 cursor-pointer">{successMessage}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-3 rounded cursor-pointer"
        >
          {isLoading ? "등록 중..." : "업체 등록하기"}
        </button>
      </form>
    </div>
  );
}
