"use client"; // Next.js App Router 사용 시 필요

import React, {
  useState,
  FormEvent,
  ChangeEvent,
  useCallback,
  useEffect,
} from "react";
import NaverPlaceSearch from "@/components/NaverAddressSearch"; // 경로는 실제 프로젝트 구조에 맞게 확인하세요
import { uploadImage } from "@/utils/uploadImage"; // 경로는 실제 프로젝트 구조에 맞게 확인하세요

// Dnd Kit 라이브러리 import
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent, // DragEndEvent 타입 import
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

// 고유 ID 생성 함수 (간단 버전)
const generateId = () =>
  `photo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// --- 개별 사진 아이템 컴포넌트 (Draggable + Sortable) ---
function SortablePhotoItem({
  photo, // 표시할 사진 데이터 (id, preview 등 포함)
  onRemove, // 삭제 버튼 클릭 시 호출될 함수
}: {
  photo: any; // photo prop의 타입 (정확한 SubPhotoItem 타입 사용 권장)
  onRemove: (id: any) => void; // onRemove 함수의 타입 (id 타입도 정확히 명시 권장)
}) {
  // useSortable 훅을 사용하여 정렬 가능한 항목으로 만듭니다.
  const {
    attributes, // 드래그 가능한 요소에 필요한 HTML 속성
    listeners, // 드래그 이벤트를 감지하는 이벤트 리스너 (이 요소에 연결)
    setNodeRef, // 드래그 가능한 DOM 노드를 dnd-kit에 연결하는 ref
    transform, // 드래그 시 항목의 위치 변화 (transform 스타일 객체)
    transition, // 드래그 후 원래 위치로 돌아올 때 부드러운 전환 효과 (transition 스타일 문자열)
    isDragging, // 현재 이 항목이 드래그 중인지 여부를 나타내는 boolean 값
  } = useSortable({
    id: photo.id, // photo 객체의 고유 id를 useSortable에 전달
  }); // dnd-kit이 계산한 transform과 transition 스타일을 항목에 적용합니다.

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform), // transform 객체를 CSS transform 문자열로 변환
    transition, // transition 스타일 적용
    opacity: isDragging ? 0.7 : 1, // 드래그 중일 때 투명도 조절
    zIndex: isDragging ? 10 : "auto", // 드래그 중인 항목이 다른 항목들 위로 올라오도록 z-index 설정
    touchAction: "none", // 터치 장치에서 기본 스크롤/확대 동작을 방지하여 드래그를 원활하게 합니다. (dnd-kit 권장)
  };

  return (
    // 이 div 요소가 dnd-kit에 의해 드래그 가능한 항목으로 관리됩니다.
    // ref, style, attributes, listeners를 이 요소에 연결합니다.
    <div className="relative">
      <div
        ref={setNodeRef} // dnd-kit과 DOM 노드 연결
        style={style} // dnd-kit 스타일 적용
        {...attributes} // 접근성 및 드래그 속성
        {...listeners} // 드래그 이벤트 리스너
        className="relative w-28 h-28 border border-gray-200 rounded overflow-hidden" // 항목의 기본 크기, 테두리, 모양 스타일
      >
        {/* 사진 이미지 */}
        <img
          src={photo.preview} // 사진 이미지 소스 URL (photo 객체의 preview 속성 사용)
          alt={`추가 사진`} // 이미지 설명 (접근성 및 이미지가 로드되지 않았을 때 표시)
          className="w-full h-full object-cover" // 이미지가 부모 div를 꽉 채우면서 비율을 유지하도록 설정
        />
      </div>
      {/* 삭제 버튼 */}
      <button
        type="button" // 버튼의 type을 명시합니다.
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-10 h-5 text-xs flex items-center justify-center z-55 cursor-pointer p-0 leading-none" // 버튼의 스타일
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(photo.id);
        }}
        aria-label="사진 삭제" // 접근성 레이블 // 이 속성은 shouldCancelStart 함수에서 클릭된 요소인지 확인하는 데 사용됩니다.
        data-dnd-kit-disabled-dnd="true"
      >
        삭제
      </button>
    </div>
  );
}

// --- 메인 폼 컴포넌트 ---
export default function CreateStandardEstimate() {
  useAuthGuard();

  // --- 상태 변수들 ---
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 사진 상태 관리 (DnD 적용)
  const [mainPhoto, setMainPhoto] = useState<File | null>(null);
  const [mainPhotoPreview, setMainPhotoPreview] = useState<string | null>(null);
  const [subPhotoItems, setSubPhotoItems] = useState<SubPhotoItem[]>([]); // File과 Preview URL, id를 함께 관리

  // 나머지 폼 데이터 상태 (기존 코드 유지)
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
    time: "",
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
  const [etcData, setEtcData] = useState({ content: "" });

  // --- 핸들러 함수들 ---

  // 일반적인 입력 변경 핸들러
  const handleCompanyChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    // Select 타입 추가
    const { name, value } = e.target;
    setCompanyData((prev) => ({ ...prev, [name]: value }));
  };

  // 대표 사진 업로드 핸들러 (메모리 누수 방지 추가)
  const handleMainPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 이전 미리보기 URL 해제
    if (mainPhotoPreview) {
      URL.revokeObjectURL(mainPhotoPreview);
    }

    if (file) {
      setMainPhoto(file);
      setMainPhotoPreview(URL.createObjectURL(file)); // 새 미리보기 생성
    } else {
      setMainPhoto(null);
      setMainPhotoPreview(null); // 파일 선택 취소 시 초기화
    }
    e.target.value = ""; // input 값 초기화
  };

  // 추가 사진 업로드 핸들러 (DnD 적용)
  const handleSubPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentCount = subPhotoItems.length;

    if (files.length === 0) return; // 선택된 파일 없으면 종료

    if (files.length + currentCount > 9) {
      alert("추가 사진은 최대 9장까지 업로드 가능합니다.");
      e.target.value = ""; // 입력 초기화
      return;
    }

    const newPhotoItems: SubPhotoItem[] = files.map((file) => ({
      id: generateId(), // 고유 ID 생성
      file: file,
      preview: URL.createObjectURL(file), // 미리보기 URL 생성
    }));

    setSubPhotoItems((prev) => [...prev, ...newPhotoItems]); // 상태 업데이트
    e.target.value = ""; // 입력 초기화
  };

  // 추가 사진 삭제 핸들러 (DnD 적용 - id 기반)
  const handleRemoveSubPhoto = useCallback((idToRemove: string) => {
    setSubPhotoItems((prev) => {
      const itemToRemove = prev.find((item) => item.id === idToRemove);
      // Object URL 메모리 해제
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.preview);
      }
      // 해당 id를 제외한 새 배열 반환
      return prev.filter((item) => item.id !== idToRemove);
    });
  }, []); // 의존성 없음

  // Dnd Kit 센서 설정 (마우스, 터치, 키보드)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 종료 시 호출될 핸들러 (DnD 적용)
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // 드롭 위치가 유효하고, 시작 위치와 다른 경우에만 순서 변경
    if (over && active.id !== over.id) {
      setSubPhotoItems((items) => {
        // 현재 아이템들의 id 배열에서 인덱스 찾기
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // arrayMove 유틸리티로 순서 변경된 새 배열 반환
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []); // 의존성 없음

  // 컴포넌트 언마운트 시 Object URL 메모리 해제 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      console.log("Cleaning up Object URLs...");
      if (mainPhotoPreview) {
        URL.revokeObjectURL(mainPhotoPreview);
      }
      subPhotoItems.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [mainPhotoPreview, subPhotoItems]); // 이 상태들이 변경될 때마다 effect 재등록

  // 폼 제출 핸들러 (DnD 적용된 사진 순서 반영)
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

    // 페이로드 생성 (기존 로직)
    const payload: any = {
      ...companyData,
      hall: hallData,
      hall_includes: hallIncludeList.filter(
        (item) => item.category || item.subcategory
      ), // 내용 있는 것만 포함
      estimate: estimateData,
      wedding_package: packageData,
      package_items: packageItems.filter((item) => item.company_name), // 내용 있는 것만 포함
      meal_price: mealTypes.filter((item) => item.meal_type), // 내용 있는 것만 포함
      estimate_options: estimateOptions.filter((item) => item.name), // 내용 있는 것만 포함
      etc: etcData.content.trim() !== "" ? etcData : undefined, // 내용 있을 때만 포함
    };

    try {
      const hall_photos = [];

      // 대표 사진 업로드
      if (mainPhoto) {
        const mainUrl = await uploadImage(
          mainPhoto,
          `halls/${companyData.name || "unknown"}/main_${Date.now()}`
        ); // 고유 경로 생성 권장
        hall_photos.push({
          url: String(mainUrl), // URL을 문자열로 변환 가정
          order_num: 1,
          caption: "대표 사진",
          is_visible: true,
        });
      }

      // 추가 사진 업로드 (!!! 순서 변경된 subPhotoItems 사용 !!!)
      for (let i = 0; i < subPhotoItems.length; i++) {
        const item = subPhotoItems[i]; // 순서 변경된 배열의 i번째 요소
        const url = await uploadImage(
          item.file,
          `halls/${companyData.name || "unknown"}/sub_${i + 1}_${Date.now()}`
        ); // 고유 경로 생성 권장
        hall_photos.push({
          url: String(url), // URL을 문자열로 변환 가정
          order_num: i + 2, // 최종 순서 반영 (i가 0부터 시작하므로 +2)
          caption: `추가 사진 ${i + 1}`,
          is_visible: true,
        });
      }

      payload.hall_photos = hall_photos; // 최종 페이로드에 사진 정보 추가
      console.log("Submitting payload:", JSON.stringify(payload, null, 2)); // 전송 데이터 확인

      // API 호출
      const response = await fetch(
        `http://localhost:8000/admin/create-standard-estimate`, // 실제 API 엔드포인트
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
      // 성공 후 폼 초기화 또는 리디렉션 등 추가 작업
      // 예: setCompanyData({...초기값}); setSubPhotoItems([]); ...
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError(err.message || "등록 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX 렌더링 ---
  return (
    <div className="max-w-2xl mx-auto my-8 p-6 border border-gray-300 rounded-lg shadow-md">
      {/* Tailwind 스타일 적용 */}
      <h1 className="text-center text-2xl font-semibold mt-5 mb-10">
        웨딩 업체 표준견적서 등록
      </h1>
      {/* 주소 검색 섹션 */}
      <div className="mb-4">
        <label
          htmlFor="address"
          className="block mb-1 text-sm font-medium text-gray-700"
        >
          {/* NaverPlaceSearch 컴포넌트는 setCompanyData 함수를 prop으로 받음 */}
          <NaverPlaceSearch setCompanyData={setCompanyData} />
          주소 :
        </label>
        <div className="w-full min-h-[2.5rem] p-2 border border-gray-300 rounded-md bg-gray-50 text-sm">
          {/* 스타일 조정 */}
          {companyData.address || (
            <span className="text-gray-400">주소를 검색해주세요.</span>
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 폼 요소 간 간격 추가 */}
        {/* --- 회사 정보 입력 --- */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">🏢 업체 정보</legend>
          <div className="space-y-3 mt-2">
            {/* 내부 요소 간 간격 */}
            <input
              type="text"
              id="name"
              name="name"
              value={companyData.name}
              onChange={handleCompanyChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="업체명 *"
            />
            <input
              type="tel"
              id="phone"
              name="phone"
              value={companyData.phone}
              onChange={handleCompanyChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="전화번호"
            />
            <input
              type="url"
              id="homepage"
              name="homepage"
              value={companyData.homepage}
              onChange={handleCompanyChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="홈페이지 (http://...)"
            />
            <textarea
              id="accessibility"
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
                예식 시간
              </label>
              <textarea
                id="ceremony_times"
                name="ceremony_times"
                placeholder="예: 10:00 / 11:00 / 12:00 / 13:00 / 14:00"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={companyData.ceremony_times}
                onChange={handleCompanyChange}
                rows={2}
              />
            </div>
          </div>
        </fieldset>
        {/* --- Hall 정보 --- */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">🏛️ 홀 정보</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* 그리드 레이아웃 적용 */}
            <div>
              <label
                htmlFor="hall_name"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                홀 이름
              </label>
              <input
                type="text"
                id="hall_name"
                value={hallData.name}
                onChange={(e) =>
                  setHallData({ ...hallData, name: e.target.value })
                }
                placeholder="홀 이름"
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
                value={hallData.interval_minutes}
                onChange={(e) =>
                  setHallData({
                    ...hallData,
                    interval_minutes: Number(e.target.value) || 0,
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
                value={hallData.guarantees}
                onChange={(e) =>
                  setHallData({
                    ...hallData,
                    guarantees: Number(e.target.value) || 0,
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
                value={hallData.parking}
                onChange={(e) =>
                  setHallData({
                    ...hallData,
                    parking: Number(e.target.value) || 0,
                  })
                }
                placeholder="예: 50"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label
                htmlFor="hall_type"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                웨딩홀 타입
              </label>
              <select
                id="hall_type"
                value={hallData.type}
                onChange={(e) =>
                  setHallData({ ...hallData, type: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
              >
                {[
                  "호텔",
                  "가든",
                  "스몰",
                  "컨벤션",
                  "채플",
                  "하우스",
                  "야외",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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
        {/* --- 웨딩홀 포함 사항 --- */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">
            ✨ 웨딩홀 포함사항
          </legend>
          <div className="space-y-4 mt-2">
            {hallIncludeList.map((item, index) => (
              <div
                key={index}
                className="border p-3 rounded relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-sm font-medium">
                      대분류
                    </label>
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => {
                        const updated = [...hallIncludeList];
                        updated[index].category = e.target.value;
                        setHallIncludeList(updated);
                      }}
                      placeholder="예: 기본 연출"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">
                      소분류 (상세 내용)
                    </label>
                    <textarea
                      value={item.subcategory}
                      onChange={(e) => {
                        const updated = [...hallIncludeList];
                        updated[index].subcategory = e.target.value;
                        setHallIncludeList(updated);
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
                    const updated = hallIncludeList.filter(
                      (_, i) => i !== index
                    );
                    setHallIncludeList(updated);
                  }}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold"
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
              className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
            >
              + 포함사항 추가
            </button>
          </div>
        </fieldset>
        {/* --- 견적 정보 --- */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">💰 견적 정보</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block mb-1 text-sm font-medium">
                대관료 (원)
              </label>
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
            </div>
            {/* <div>
                 <label className="block mb-1 text-sm font-medium">견적서 종류</label>
                 <select value={estimateData.type} onChange={(e) => setEstimateData({ ...estimateData, type: e.target.value })} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                     {["standard", "admin", "user"].map((t) => (<option key={t} value={t}>{t}</option>))}
                 </select>
            </div> */}
            <div>
              <label className="block mb-1 text-sm font-medium">날짜</label>
              <input
                type="date"
                value={estimateData.date}
                onChange={(e) =>
                  setEstimateData({ ...estimateData, date: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">
                예식 시작 시간
              </label>
              <input
                type="time"
                value={estimateData.time}
                onChange={(e) =>
                  setEstimateData({ ...estimateData, time: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">
                계약금 (원)
              </label>
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
                placeholder="숫자만 입력 (예: 300000)"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              {/* 계약금 조항은 넓게 */}
              <label className="block mb-1 text-sm font-medium">
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
        {/* --- 식대 정보 --- */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">🍽 식대 정보</legend>
          <div className="space-y-4 mt-2">
            {mealTypes.map((meal, index) => (
              <div
                key={index}
                className="border p-3 rounded relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block mb-1 text-sm font-medium">
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
                    <label className="block mb-1 text-sm font-medium">
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
                    <label className="block mb-1 text-sm font-medium">
                      가격 (원)
                    </label>
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
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">
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
                    const updated = mealTypes.filter((_, i) => i !== index);
                    setMealTypes(updated);
                  }}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold"
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
              className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white p-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
            >
              + 식대 항목 추가
            </button>
          </div>
        </fieldset>
        {/* --- 웨딩홀 패키지 --- */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">
            🎁 웨딩 패키지 (선택)
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block mb-1 text-sm font-medium">
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
              <label className="block mb-1 text-sm font-medium">패키지명</label>
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
              <label className="block mb-1 text-sm font-medium">
                금액 방식
              </label>
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
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="true">통합 금액</option>
                <option value="false">개별 금액 합산</option>
              </select>
            </div>
            {packageData.is_total_price && (
              <div>
                <label className="block mb-1 text-sm font-medium">
                  총 가격 (원)
                </label>
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
              </div>
            )}
            {!packageData.is_total_price && (
              <div className="md:col-span-2 text-sm text-gray-500 mt-1">
                💡 개별 금액 합산 선택 시, 아래 '개별 패키지 항목'들의 가격
                합계가 사용됩니다. (총 가격은 0으로 자동 설정)
              </div>
            )}
          </div>
        </fieldset>
        {/* --- 패키지 개별 항목 --- */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">
            📦 개별 패키지 항목 (선택)
          </legend>
          <div className="space-y-4 mt-2">
            {packageItems.map((item, index) => (
              <div
                key={index}
                className="border p-3 rounded relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-sm font-medium">
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
                      {["스튜디오", "드레스", "메이크업"].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">
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
                    <label className="block mb-1 text-sm font-medium">
                      가격 (원)
                    </label>
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
                      placeholder="숫자만 입력"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">
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
                    <label className="block mb-1 text-sm font-medium">
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
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold"
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
                    type: "스튜디오",
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
        </fieldset>
        {/* --- 견적서 옵션 --- */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">
            🧩 견적서 옵션 (선택)
          </legend>
          <div className="space-y-4 mt-2">
            {estimateOptions.map((option, index) => (
              <div
                key={index}
                className="border p-3 rounded relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-sm font-medium">
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
                    <label className="block mb-1 text-sm font-medium">
                      가격 (원)
                    </label>
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
                      placeholder="숫자만 입력"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium">
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
                    <label className="block mb-1 text-sm font-medium">
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
                    <label className="block mb-1 text-sm font-medium">
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
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold"
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
        {/* --- 기타 메모사항 --- */}
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
        {/* --- 사진 업로드 (DnD 적용) --- */}
        <fieldset className="p-4 border border-gray-200 rounded-md">
          <legend className="text-lg font-semibold px-2">
            🖼️ 웨딩홀 사진 업로드
          </legend>

          {/* 대표 사진 */}
          <div className="mb-6">
            {/* 하단 마진 추가 */}
            <label className="block mb-1 font-medium text-gray-700">
              대표 사진 (1장)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleMainPhotoUpload}
              className="mb-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" // Tailwind 스타일 개선
            />
            {mainPhotoPreview && (
              <div className="relative w-32 h-32 mt-2">
                {/* 상단 마진 추가 */}
                <img
                  src={mainPhotoPreview}
                  alt="대표 사진 미리보기"
                  className="w-full h-full object-cover rounded border border-gray-300"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center p-0 leading-none cursor-pointer z-5" // 크기 조정
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

          {/* 추가 사진 (Dnd Kit 적용) */}
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              추가 사진 (최대 9장) -
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
              }`} // Tailwind 스타일 개선
            />
            {/* Dnd Kit 영역 */}
            {subPhotoItems.length > 0 && ( // 사진이 있을 때만 Dnd 영역 렌더링
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={subPhotoItems.map((p) => p.id)} // ID 배열 전달
                  strategy={rectSortingStrategy} // 그리드 전략
                >
                  {/* 그리드 컨테이너 */}
                  <div className="flex items-center justify-center flex-wrap gap-3 p-2 rounded border border-gray-200 bg-gray-50 min-h-[8rem]">
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
            {subPhotoItems.length === 0 && ( // 사진 없을 때 안내 문구
              <div className="mt-2 p-4 border border-dashed border-gray-300 rounded text-center text-gray-500 text-sm">
                추가 사진을 업로드 해주세요.
              </div>
            )}
          </div>
        </fieldset>
        {/* --- 피드백 및 제출 버튼 --- */}
        <div className="mt-6">
          {/* 상단 마진 추가 */}
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          {successMessage && (
            <p className="text-green-600 text-sm mb-3">{successMessage}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full px-4 py-3 text-white rounded-md font-semibold transition duration-150 ease-in-out ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            }`}
          >
            {isLoading ? "등록 처리 중..." : "웨딩 업체 등록하기"}
          </button>
        </div>
      </form>
    </div>
  );
}
