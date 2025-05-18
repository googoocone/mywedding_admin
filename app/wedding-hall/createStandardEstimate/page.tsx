"use client"; // Next.js App Router 사용 시 필요

import React, {
  useState,
  FormEvent,
  ChangeEvent,
  useCallback,
  useEffect,
} from "react";
import NaverPlaceSearch from "@/components/NaverAddressSearch";
import { uploadImage } from "@/utils/uploadImage";

// Dnd Kit 라이브러리 import
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useAuthGuard } from "@/context/UseAuthGuard";

// --- 타입 정의 ---
interface SubPhotoItem {
  id: string; // 각 사진 항목을 식별할 고유 ID
  file: File; // 실제 파일 객체
  preview: string; // 미리보기용 Object URL
}

const packageItemOptions = [
  { value: "스튜디오", label: "스튜디오" },
  { value: "드레스", label: "드레스" },
  { value: "헤어메이크업", label: "헤어&메이크업" },
  { value: "부케", label: "부케" },
];

// 웨딩홀 타입 옵션
const weddingHallTypeOptions = [
  "호텔",
  "가든",
  "스몰",
  "컨벤션",
  "채플",
  "하우스",
  "야외",
];

const generateId = () =>
  `photo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

function SortablePhotoItem({
  photo,
  onRemove,
}: {
  photo: SubPhotoItem; // 타입 명시
  onRemove: (id: string) => void; // 타입 명시
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: photo.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : "auto",
    touchAction: "none",
  };

  return (
    <div className="relative group">
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="relative w-28 h-28 border border-gray-200 rounded overflow-hidden cursor-grab bg-gray-100 flex items-center justify-center"
      >
        <img
          src={photo.preview}
          alt={`추가 사진 ${photo.id}`}
          className="w-full h-full object-cover"
        />
      </div>
      <button
        type="button"
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity p-0 leading-none"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(photo.id);
        }}
        aria-label="사진 삭제"
        data-dnd-kit-disabled-dnd="true"
      >
        ×
      </button>
    </div>
  );
}

export default function CreateStandardEstimate() {
  useAuthGuard();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [mainPhoto, setMainPhoto] = useState<File | null>(null);
  const [mainPhotoPreview, setMainPhotoPreview] = useState<string | null>(null);
  const [subPhotoItems, setSubPhotoItems] = useState<SubPhotoItem[]>([]);

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
    type: [] as string[], // ✨ 홀 타입을 문자열 배열로 변경, 초기값 빈 배열
    mood: "밝은",
  });

  const [hallIncludeList, setHallIncludeList] = useState<
    { category: string; subcategory: string }[]
  >([]);

  const [estimateData, setEstimateData] = useState({
    hall_price: 0,
    // meal_type: "", // 이 필드는 mealTypes 배열로 관리되므로 여기서는 불필요할 수 있습니다.
    // 백엔드 스키마에 따라 포함 여부 결정
    type: "standard", // 견적서 타입은 'standard'로 고정
    date: "",
    time: "",
    penalty_amount: 0,
    penalty_detail: "",
  });

  const [mealTypes, setMealTypes] = useState<
    { meal_type: string; category: string; price: number; extra: string }[]
  >([{ meal_type: "", category: "대인", price: 0, extra: "" }]);

  const [packageData, setPackageData] = useState({
    type: "스드메", // 기본값
    name: "",
    total_price: 0,
    is_total_price: true, // 기본값
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
    content:
      "-홀 상세: 몇 층, 홀 내부 좌석 수, 분리예식 or 동시예식, 천고 높이, 버진로드 길이 \n-주차 : \n-식사 : \n-시식 : \n-프로모션 : \n  ",
  });

  const handleCompanyChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setCompanyData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMainPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (mainPhotoPreview) {
      URL.revokeObjectURL(mainPhotoPreview);
    }
    if (file) {
      setMainPhoto(file);
      setMainPhotoPreview(URL.createObjectURL(file));
    } else {
      setMainPhoto(null);
      setMainPhotoPreview(null);
    }
    e.target.value = "";
  };

  const handleSubPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentCount = subPhotoItems.length;
    if (files.length === 0) return;
    if (files.length + currentCount > 9) {
      alert("추가 사진은 최대 9장까지 업로드 가능합니다.");
      e.target.value = ""; // 파일 입력 초기화
      return;
    }
    const newPhotoItems: SubPhotoItem[] = files.map((file) => ({
      id: generateId(),
      file: file,
      preview: URL.createObjectURL(file),
    }));
    setSubPhotoItems((prev) => [...prev, ...newPhotoItems]);
    e.target.value = "";
  };

  const handleRemoveSubPhoto = useCallback((idToRemove: string) => {
    setSubPhotoItems((prev) => {
      const itemToRemove = prev.find((item) => item.id === idToRemove);
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.preview);
      }
      return prev.filter((item) => item.id !== idToRemove);
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSubPhotoItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (mainPhotoPreview) {
        URL.revokeObjectURL(mainPhotoPreview);
      }
      subPhotoItems.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [mainPhotoPreview, subPhotoItems]);

  // ✨ 웨딩홀 타입 변경 핸들러
  const handleHallTypeChange = (selectedType: string) => {
    setHallData((prevHallData) => {
      const currentTypes = prevHallData.type;
      const newTypes = currentTypes.includes(selectedType)
        ? currentTypes.filter((type) => type !== selectedType)
        : [...currentTypes, selectedType];
      return { ...prevHallData, type: newTypes };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!companyData.name) {
      setError("업체명을 입력해주세요.");
      setIsLoading(false);
      window.scrollTo(0, 0); // 에러 메시지 확인을 위해 상단으로 스크롤
      return;
    }
    if (!hallData.name) {
      setError("홀 이름을 입력해주세요.");
      setIsLoading(false);
      window.scrollTo(0, 0);
      return;
    }
    if (hallData.type.length === 0) {
      setError("웨딩홀 타입을 하나 이상 선택해주세요.");
      setIsLoading(false);
      window.scrollTo(0, 0);
      return;
    }
    // date, time 필드에 대한 유효성 검사 (선택 사항)
    if (!estimateData.date) {
      setError("견적 날짜를 입력해주세요.");
      setIsLoading(false);
      window.scrollTo(0, 0);
      return;
    }
    if (!estimateData.time) {
      setError("예식 시작 시간을 입력해주세요.");
      setIsLoading(false);
      window.scrollTo(0, 0);
      return;
    }

    // 페이로드 생성
    const payload: any = {
      name: companyData.name, // companyData의 나머지 필드들도 필요하면 명시적으로 추가
      address: companyData.address,
      phone: companyData.phone,
      homepage: companyData.homepage,
      accessibility: companyData.accessibility,
      mapx: companyData.mapx,
      mapy: companyData.mapy,
      ceremony_times: companyData.ceremony_times,

      hall: hallData, // hallData.type은 string[] 형태

      hall_includes: hallIncludeList.filter(
        (item) => item.category || item.subcategory
      ),

      // estimateData에서 meal_type을 제외하거나 백엔드와 협의 필요
      // 현재 estimateData 정의에 meal_type이 있으므로, 백엔드가 이를 어떻게 처리하는지 확인
      estimate: estimateData,

      // wedding_package는 내용이 있을 때만 보내도록 수정
      wedding_package:
        packageData.name || packageItems.some((item) => item.company_name)
          ? packageData
          : undefined,
      package_items: packageItems.filter((item) => item.company_name),

      meal_price: mealTypes.filter((item) => item.meal_type && item.price > 0), // 유효한 식대만
      estimate_options: estimateOptions.filter((item) => item.name),
      etc: etcData.content.trim() !== "" ? etcData : undefined,
      hall_photos: [], // 아래에서 채워짐
    };

    try {
      const uploaded_hall_photos = []; // 임시 배열 이름 변경
      if (mainPhoto) {
        const mainUrl = await uploadImage(
          mainPhoto,
          `halls/${companyData.name || "unknown"}/main_${Date.now()}`
        );
        uploaded_hall_photos.push({
          url: String(mainUrl),
          order_num: 1,
          caption: "대표 사진",
          is_visible: true,
        });
      }

      for (let i = 0; i < subPhotoItems.length; i++) {
        const item = subPhotoItems[i];
        const url = await uploadImage(
          item.file,
          `halls/${companyData.name || "unknown"}/sub_${i + 1}_${Date.now()}`
        );
        uploaded_hall_photos.push({
          url: String(url),
          order_num: i + 2, // 대표 사진이 1번이므로 추가 사진은 2번부터
          caption: `추가 사진 ${i + 1}`,
          is_visible: true,
        });
      }
      payload.hall_photos = uploaded_hall_photos;

      console.log("Submitting payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/create-standard-estimate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        console.error("❌ API Error Response:", result);
        throw new Error(
          result.detail || `HTTP error! status: ${response.status}`
        );
      }
      setSuccessMessage(`업체 등록 성공! 업체 ID: ${result.company_id}`);
      // TODO: 성공 후 폼 초기화 로직 추가
      // setCompanyData({ name: "", address: "", ... });
      // setHallData({ name: "", type: [], ... });
      // setSubPhotoItems([]);
      // setMainPhoto(null); setMainPhotoPreview(null);
      // ... 등등
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError(err.message || "등록 중 오류가 발생했습니다.");
      window.scrollTo(0, 0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 border border-gray-300 rounded-lg shadow-md bg-white">
      <h1 className="text-center text-2xl font-semibold mt-5 mb-10">
        웨딩 업체 표준견적서 등록
      </h1>
      <div className="mb-4">
        <NaverPlaceSearch setCompanyData={setCompanyData} />
        <label
          htmlFor="address_display"
          className="block mb-1 text-sm font-medium text-gray-700 mt-2"
        >
          주소 :
        </label>
        <div
          id="address_display"
          className="w-full min-h-[2.5rem] p-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
        >
          {companyData.address || (
            <span className="text-gray-400">주소를 검색해주세요.</span>
          )}
        </div>
      </div>

      {/* 에러/성공 메시지 표시 위치 (폼 상단) */}
      {error && (
        <p className="text-red-600 text-sm mb-3 p-3 bg-red-50 rounded-md">
          {error}
        </p>
      )}
      {successMessage && (
        <p className="text-green-600 text-sm mb-3 p-3 bg-green-50 rounded-md">
          {successMessage}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">🏢 업체 정보</legend>
          <div className="space-y-3 mt-2">
            <input
              type="text"
              name="name"
              value={companyData.name}
              onChange={handleCompanyChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="업체명 *"
            />
            <input
              type="tel"
              name="phone"
              value={companyData.phone}
              onChange={handleCompanyChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="전화번호"
            />
            <input
              type="url"
              name="homepage"
              value={companyData.homepage}
              onChange={handleCompanyChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="홈페이지 (http://...)"
            />
            <textarea
              name="accessibility"
              value={companyData.accessibility}
              onChange={handleCompanyChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="오시는 길 설명 (주차, 대중교통 등)"
            />
            <div>
              <label
                htmlFor="ceremony_times"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                예식 시간 정보
              </label>
              <textarea
                id="ceremony_times"
                name="ceremony_times"
                placeholder="예: 11:00 / 12:30 / 14:00 (각 홀별 시간이 다를 경우 명시)"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={companyData.ceremony_times}
                onChange={handleCompanyChange}
                rows={2}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">🏛️ 홀 정보</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label
                htmlFor="hall_name_input"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                홀 이름 *
              </label>
              <input
                type="text"
                id="hall_name_input"
                value={hallData.name}
                onChange={(e) =>
                  setHallData({ ...hallData, name: e.target.value })
                }
                placeholder="홀 이름"
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label
                htmlFor="interval_minutes"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                예식 간격 (분)
              </label>
              <input
                type="number"
                id="interval_minutes"
                min="0" // 음수 방지
                value={hallData.interval_minutes}
                onChange={(e) =>
                  setHallData({
                    ...hallData,
                    interval_minutes: Math.max(0, Number(e.target.value) || 0), // 음수 방지
                  })
                }
                placeholder="예: 60"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label
                htmlFor="guarantees"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                보증 인원
              </label>
              <input
                type="number"
                id="guarantees"
                min="0"
                value={hallData.guarantees}
                onChange={(e) =>
                  setHallData({
                    ...hallData,
                    guarantees: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                placeholder="예: 100"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label
                htmlFor="parking"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                주차 대수
              </label>
              <input
                type="number"
                id="parking"
                min="0"
                value={hallData.parking}
                onChange={(e) =>
                  setHallData({
                    ...hallData,
                    parking: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                placeholder="예: 50"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* ✨ 웨딩홀 타입 선택 UI (체크박스) */}
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                웨딩홀 타입 (중복 선택 가능) *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                {weddingHallTypeOptions.map((typeOption) => (
                  <label
                    key={typeOption}
                    className="flex items-center space-x-2 cursor-pointer text-sm hover:bg-gray-50 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      value={typeOption}
                      checked={hallData.type.includes(typeOption)}
                      onChange={() => handleHallTypeChange(typeOption)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 h-4 w-4"
                    />
                    <span>{typeOption}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="hall_mood"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                웨딩홀 분위기
              </label>
              <select
                id="hall_mood"
                value={hallData.mood}
                onChange={(e) =>
                  setHallData({ ...hallData, mood: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
              >
                {["밝은", "어두운"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        {/* 견적 정보 필드셋 */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">💰 견적 정보</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                대관료 (원)
              </label>
              <input
                type="text"
                value={
                  estimateData.hall_price > 0
                    ? estimateData.hall_price.toLocaleString("ko-KR")
                    : ""
                }
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
            </div>
            {/* estimateData.type은 'standard'로 고정되어 UI에서 입력받을 필요 없을 수 있음 */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                견적 기준 날짜 *
              </label>
              <input
                type="date"
                value={estimateData.date}
                onChange={(e) =>
                  setEstimateData({ ...estimateData, date: e.target.value })
                }
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                예식 시작 시간 *
              </label>
              <input
                type="time"
                step={600} // 10분 단위
                value={estimateData.time}
                onChange={(e) =>
                  setEstimateData({ ...estimateData, time: e.target.value })
                }
                required
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                계약금 (원)
              </label>
              <input
                type="text"
                value={
                  estimateData.penalty_amount > 0
                    ? estimateData.penalty_amount.toLocaleString("ko-KR")
                    : ""
                }
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, "");
                  const numeric = Number(value);
                  setEstimateData({
                    ...estimateData,
                    penalty_amount: isNaN(numeric) ? 0 : numeric,
                  });
                }}
                placeholder="숫자만 입력 (예: 300000)"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">
                계약금/위약금 조항
              </label>
              <textarea
                value={estimateData.penalty_detail}
                onChange={(e) =>
                  setEstimateData({
                    ...estimateData,
                    penalty_detail: e.target.value,
                  })
                }
                placeholder="계약금 환불 및 위약금 관련 규정"
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={4}
              />
            </div>
          </div>
        </fieldset>

        {/* 대관료 포함사항 필드셋 */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">
            ✨ 대관료 포함사항
          </legend>
          <div className="space-y-4 mt-2">
            {hallIncludeList.map((item, index) => (
              <div
                key={`include-${index}`}
                className="border p-3 rounded relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      대분류
                    </label>
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => {
                        const updatedList = [...hallIncludeList];
                        updatedList[index].category = e.target.value;
                        setHallIncludeList(updatedList);
                      }}
                      placeholder="예: 기본 연출"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      소분류 (상세 내용)
                    </label>
                    <textarea
                      value={item.subcategory}
                      onChange={(e) => {
                        const updatedList = [...hallIncludeList];
                        updatedList[index].subcategory = e.target.value;
                        setHallIncludeList(updatedList);
                      }}
                      placeholder="예: 혼구용품, 웨딩캔들, 포토테이블"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      rows={2}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHallIncludeList((prev) =>
                      prev.filter((_, i) => i !== index)
                    );
                  }}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold p-1 rounded hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setHallIncludeList((prev) => [
                  ...prev,
                  { category: "", subcategory: "" },
                ])
              }
              className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
            >
              + 포함사항 추가
            </button>
          </div>
        </fieldset>

        {/* 식대 정보 필드셋 */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">🍽 식대 정보</legend>
          <div className="space-y-4 mt-2">
            {mealTypes.map((meal, index) => (
              <div
                key={`meal-${index}`}
                className="border p-3 rounded relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      식사 종류
                    </label>
                    <input
                      type="text"
                      value={meal.meal_type}
                      onChange={(e) => {
                        const updated = [...mealTypes];
                        updated[index].meal_type = e.target.value;
                        setMealTypes(updated);
                      }}
                      placeholder="예: 뷔페 A코스"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      구분
                    </label>
                    <select
                      value={meal.category}
                      onChange={(e) => {
                        const updated = [...mealTypes];
                        updated[index].category = e.target.value;
                        setMealTypes(updated);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    >
                      {["대인", "소인", "미취학", "음주류"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      가격 (원)
                    </label>
                    <input
                      type="text"
                      value={
                        meal.price > 0 ? meal.price.toLocaleString("ko-KR") : ""
                      }
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
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      비고
                    </label>
                    <input
                      type="text"
                      value={meal.extra}
                      onChange={(e) => {
                        const updated = [...mealTypes];
                        updated[index].extra = e.target.value;
                        setMealTypes(updated);
                      }}
                      placeholder="예: 소인(8~13세)"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMealTypes((prev) => prev.filter((_, i) => i !== index));
                  }}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold p-1 rounded hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setMealTypes((prev) => [
                  ...prev,
                  { meal_type: "", category: "대인", price: 0, extra: "" },
                ])
              }
              className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
            >
              + 식대 항목 추가
            </button>
          </div>
        </fieldset>

        {/* 웨딩홀 패키지 필드셋 */}
        {/* <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">
            🎁 홀 패키지 (선택)
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                패키지 종류
              </label>
              <select
                value={packageData.type}
                onChange={(e) =>
                  setPackageData({ ...packageData, type: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
              >
                {["스드메", "개별"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                패키지명
              </label>
              <input
                type="text"
                value={packageData.name}
                onChange={(e) =>
                  setPackageData({ ...packageData, name: e.target.value })
                }
                placeholder="예: 실속 스드메 패키지"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                금액 방식
              </label>
              <select
                value={packageData.is_total_price ? "true" : "false"}
                onChange={(e) => {
                  const isTotal = e.target.value === "true";
                  setPackageData({
                    ...packageData,
                    is_total_price: isTotal,
                    total_price: isTotal ? packageData.total_price : 0, // 개별 합산 시 총 가격 0으로 리셋
                  });
                }}
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="true">통합 금액</option>
                <option value="false">개별 금액 합산</option>
              </select>
            </div>
            {packageData.is_total_price && (
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  총 가격 (원)
                </label>
                <input
                  type="text"
                  value={
                    packageData.total_price > 0
                      ? packageData.total_price.toLocaleString("ko-KR")
                      : ""
                  }
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
              </div>
            )}
            {!packageData.is_total_price && (
              <div className="md:col-span-2 text-sm text-gray-500 mt-1">
                💡 개별 금액 합산 선택 시, 아래 '개별 패키지 항목'들의 가격
                합계가 사용됩니다. (총 가격은 참고용)
              </div>
            )}
          </div>
        </fieldset> */}

        {/* 패키지 개별 항목 필드셋 */}
        {/* <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">
            📦 개별 패키지 항목 (선택)
          </legend>
          <div className="space-y-4 mt-2">
            {packageItems.map((item, index) => (
              <div
                key={`package-item-${index}`}
                className="border p-3 rounded relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      항목 종류
                    </label>
                    <select
                      value={item.type}
                      onChange={(e) => {
                        const updated = [...packageItems];
                        updated[index].type = e.target.value;
                        setPackageItems(updated);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="">선택</option>
                      {packageItemOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      업체명
                    </label>
                    <input
                      type="text"
                      value={item.company_name}
                      onChange={(e) => {
                        const updated = [...packageItems];
                        updated[index].company_name = e.target.value;
                        setPackageItems(updated);
                      }}
                      placeholder="예: 제니하우스"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      가격 (원)
                    </label>
                    <input
                      type="text"
                      value={
                        item.price > 0 ? item.price.toLocaleString("ko-KR") : ""
                      }
                      disabled={packageData.is_total_price} // 통합 가격일 때 비활성화
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, "");
                        const numeric = Number(value);
                        const updated = [...packageItems];
                        updated[index].price = isNaN(numeric) ? 0 : numeric;
                        setPackageItems(updated);
                      }}
                      placeholder={
                        packageData.is_total_price
                          ? "통합 가격 사용 중"
                          : "숫자만 입력"
                      }
                      className={`w-full p-2 border border-gray-300 rounded-md ${
                        packageData.is_total_price ? "bg-gray-100" : ""
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      참고 URL
                    </label>
                    <input
                      type="url"
                      value={item.url}
                      onChange={(e) => {
                        const updated = [...packageItems];
                        updated[index].url = e.target.value;
                        setPackageItems(updated);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      설명
                    </label>
                    <textarea
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...packageItems];
                        updated[index].description = e.target.value;
                        setPackageItems(updated);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="간단한 포함 내역이나 특징"
                      rows={2}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold p-1 rounded hover:bg-red-50"
                  onClick={() => {
                    setPackageItems((prev) =>
                      prev.filter((_, i) => i !== index)
                    );
                  }}
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setPackageItems((prev) => [
                  ...prev,
                  {
                    type: packageItemOptions[0].value,
                    company_name: "",
                    price: 0,
                    description: "",
                    url: "",
                  },
                ])
              }
              className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
            >
              + 개별 항목 추가
            </button>
          </div>
        </fieldset> */}

        {/* 견적서 옵션 필드셋 */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">
            🧩 견적서 옵션 (선택)
          </legend>
          <div className="space-y-4 mt-2">
            {estimateOptions.map((option, index) => (
              <div
                key={`option-${index}`}
                className="border p-3 rounded relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      옵션명
                    </label>
                    <input
                      type="text"
                      value={option.name}
                      onChange={(e) => {
                        const updated = [...estimateOptions];
                        updated[index].name = e.target.value;
                        setEstimateOptions(updated);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="예: 플라워 샤워"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      가격 (원)
                    </label>
                    <input
                      type="text"
                      value={
                        option.price > 0
                          ? option.price.toLocaleString("ko-KR")
                          : ""
                      }
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, "");
                        const numeric = Number(value);
                        const updated = [...estimateOptions];
                        updated[index].price = isNaN(numeric) ? 0 : numeric;
                        setEstimateOptions(updated);
                      }}
                      placeholder="숫자만 입력"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      필수 여부
                    </label>
                    <select
                      value={option.is_required ? "true" : "false"}
                      onChange={(e) => {
                        const updated = [...estimateOptions];
                        updated[index].is_required = e.target.value === "true";
                        setEstimateOptions(updated);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="false">선택</option>
                      <option value="true">필수</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      참고 URL
                    </label>
                    <input
                      type="url"
                      value={option.reference_url}
                      onChange={(e) => {
                        const updated = [...estimateOptions];
                        updated[index].reference_url = e.target.value;
                        setEstimateOptions(updated);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      설명
                    </label>
                    <textarea
                      value={option.description}
                      onChange={(e) => {
                        const updated = [...estimateOptions];
                        updated[index].description = e.target.value;
                        setEstimateOptions(updated);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="옵션에 대한 간단한 설명"
                      rows={2}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold p-1 rounded hover:bg-red-50"
                  onClick={() => {
                    setEstimateOptions((prev) =>
                      prev.filter((_, i) => i !== index)
                    );
                  }}
                >
                  삭제
                </button>
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
              className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
            >
              + 옵션 추가
            </button>
          </div>
        </fieldset>

        {/* 기타 정보 필드셋 */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">📝 기타 정보</legend>
          <div className="mt-2">
            <label
              htmlFor="etc_content"
              className="block mb-1 text-sm font-medium text-gray-700"
            >
              기타 내용
            </label>
            <textarea
              id="etc_content"
              value={etcData.content}
              onChange={(e) =>
                setEtcData({ ...etcData, content: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="기타 전달사항, 할인 정보 등을 자유롭게 기입"
              rows={4}
            />
          </div>
        </fieldset>

        {/* 사진 업로드 필드셋 */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">
            🖼️ 웨딩홀 사진 업로드
          </legend>
          <div className="mb-6 mt-2">
            {" "}
            {/* mt-2 추가 */}
            <label className="block mb-1 font-medium text-gray-700">
              대표 사진 (1장)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleMainPhotoUpload}
              className="mb-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {mainPhotoPreview && (
              <div className="relative w-32 h-32 mt-2">
                <img
                  src={mainPhotoPreview}
                  alt="대표 사진 미리보기"
                  className="w-full h-full object-cover rounded border border-gray-300"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center p-0 leading-none cursor-pointer z-10"
                  onClick={() => {
                    setMainPhoto(null);
                    if (mainPhotoPreview) URL.revokeObjectURL(mainPhotoPreview);
                    setMainPhotoPreview(null);
                  }}
                  aria-label="대표 사진 삭제"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              추가 사진 (최대 9장) -{" "}
              <span className="text-blue-600 font-normal">
                순서를 드래그하여 변경하세요.
              </span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleSubPhotoUpload}
              disabled={subPhotoItems.length >= 9}
              className={`mb-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer ${
                subPhotoItems.length >= 9 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
            {subPhotoItems.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={subPhotoItems.map((p) => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="flex flex-wrap gap-3 p-2 rounded border border-gray-200 bg-gray-50 min-h-[8rem] items-center justify-start">
                    {subPhotoItems.map((photo) => (
                      <SortablePhotoItem
                        key={photo.id}
                        photo={photo}
                        onRemove={handleRemoveSubPhoto}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            {subPhotoItems.length === 0 && (
              <div className="mt-2 p-4 border border-dashed border-gray-300 rounded text-center text-gray-500 text-sm">
                추가 사진을 업로드 해주세요.
              </div>
            )}
          </div>
        </fieldset>

        <div className="mt-8 pt-6 border-t border-gray-300">
          {" "}
          {/* 간격 및 구분선 스타일 개선 */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full px-6 py-3 text-base font-semibold text-white rounded-lg shadow-md transition duration-150 ease-in-out flex items-center justify-center ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            }`}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                등록 처리 중...
              </>
            ) : (
              "웨딩 업체 등록하기"
            )}
          </button>
          {successMessage ? (
            <div className="w-full mt-5 text-lg text-green-500 text-center">
              {successMessage}
            </div>
          ) : (
            ""
          )}
        </div>
      </form>
    </div>
  );
}
