// src/app/admin/standard-estimates/update/[id]/page.tsx
// (또는 사용하는 라우팅 구조에 맞는 경로)
"use client";

import React, {
  useState,
  FormEvent,
  ChangeEvent,
  useCallback,
  useEffect,
  Suspense, // Suspense import 확인
} from "react";
// useParams는 현재 코드에서 사용되지 않으므로 제거해도 됩니다 (searchParams 사용 중).
// 필요하다면 남겨두세요.
import { useRouter, useSearchParams } from "next/navigation";
import { uploadImage } from "@/utils/uploadImage"; // 실제 경로 확인
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
import { useAuthGuard } from "@/context/UseAuthGuard"; // 실제 경로 확인
import {
  DetailedEstimate,
  WeddingCompanyData,
  HallData,
  HallPhotoData,
  HallIncludeData,
  MealPriceData,
  EstimateOptionData,
  EtcData,
  WeddingPackageData,
  WeddingPackageItemData,
  // Enum 타입들도 필요하면 임포트 (예: HallType, MoodType 등)
} from "@/interface/estimates"; // 제공된 인터페이스 경로 및 이름으로 수정

// --- 프론트엔드용 사진 아이템 타입 (dnd-kit 및 파일 처리용) ---
interface SubPhotoItemDnd {
  id: string; // dnd-kit 용 고유 ID (프론트엔드에서만 사용)
  file?: File; // 새로 추가된 파일 객체
  preview: string; // 미리보기 URL (Object URL 또는 기존 이미지 URL)
  originalUrl?: string; // 기존 이미지의 원본 URL (수정 시 비교용)
  dbId?: number; // 데이터베이스 상의 사진 ID (HallPhotoData의 id)
  order_num?: number | null; // 기존 사진의 순서
  caption?: string | null; // 사진 캡션
  is_visible?: boolean | null;
}

const weddingHallTypeOptions = [
  "호텔",
  "가든",
  "스몰",
  "컨벤션",
  "채플",
  "하우스",
  "야외",
];

const packageItemOptions = [
  { value: "스튜디오", label: "스튜디오" },
  { value: "드레스", label: "드레스" },
  { value: "헤어메이크업", label: "헤어&메이크업" }, // value는 "헤어메이크업", label은 "헤어&메이크업"
  { value: "부케", label: "부케" },
];

const generateDndId = () =>
  `dnd-photo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// --- 개별 사진 아이템 컴포넌트 (SortablePhotoItem) ---
// (내용 동일)
function SortablePhotoItem({
  /* ... */ photo,
  onRemove,
}: {
  photo: SubPhotoItemDnd;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : "auto",
    touchAction: "none", // PointerSensor 사용 시 필요할 수 있음
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
          alt={photo.caption || `사진 ${photo.dbId || photo.id}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // 이미지 로드 실패 시 대체 처리 (선택적)
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder-image.png"; // 대체 이미지 경로
            target.alt = "이미지 로딩 실패";
          }}
        />
      </div>
      <button
        type="button"
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(photo.id);
        }}
        aria-label="사진 삭제"
        // dnd-kit v6 이상에서는 이 속성이 필요 없을 수 있습니다.
        // 문제가 발생하면 제거해보세요.
        data-dnd-kit-disabled-dnd="true"
      >
        ×
      </button>
    </div>
  );
}

// =======================================================================
// ✨ 내부 로직 컴포넌트: 실제 폼 내용과 로직 포함
// =======================================================================
function UpdateFormContent() {
  useAuthGuard();
  const router = useRouter();
  const searchParams = useSearchParams(); // 이 컴포넌트 내부에서 사용
  const estimateId = searchParams.get("id"); // URL 쿼리에서 'id' 파라미터 가져오기

  const [isLoading, setIsLoading] = useState<boolean>(true); // 초기 데이터 로딩 상태
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 사진 상태
  const [mainPhotoFile, setMainPhotoFile] = useState<File | null>(null);
  const [mainPhotoDisplay, setMainPhotoDisplay] =
    useState<SubPhotoItemDnd | null>(null);
  const [subPhotoItems, setSubPhotoItems] = useState<SubPhotoItemDnd[]>([]);
  const [deletedPhotoDbIds, setDeletedPhotoDbIds] = useState<number[]>([]);

  // 폼 데이터 상태
  const [companyData, setCompanyData] = useState<Partial<WeddingCompanyData>>(
    {}
  );
  const [hallData, setHallData] = useState<
    Partial<Omit<HallData, "type">> & { type?: string[] } // type을 string[]으로 명시적으로 설정
  >({ type: [] }); // type을 빈 배열로 초기화
  const [hallIncludeList, setHallIncludeList] = useState<
    Partial<HallIncludeData>[]
  >([]);
  const [estimateData, setEstimateData] = useState<
    Partial<
      Omit<
        DetailedEstimate,
        | "hall"
        | "meal_prices"
        | "estimate_options"
        | "etcs"
        | "wedding_packages"
      >
    >
  >({});
  const [mealTypes, setMealTypes] = useState<Partial<MealPriceData>[]>([]);
  const [packageData, setPackageData] = useState<
    Partial<Omit<WeddingPackageData, "wedding_package_items">>
  >({});
  const [packageItems, setPackageItems] = useState<
    Partial<WeddingPackageItemData>[]
  >([]);
  const [estimateOptions, setEstimateOptions] = useState<
    Partial<EstimateOptionData>[]
  >([]);
  const [etcData, setEtcData] = useState<Partial<EtcData>>({ content: "" });

  // --- 데이터 불러오기 및 폼 상태 초기화 ---
  useEffect(() => {
    // estimateId가 searchParams에서 성공적으로 읽혀야 실행됨
    if (!estimateId) {
      // Suspense로 감싸져 있으므로 이 상태는 searchParams 로딩 후 estimateId가 없을 때만 발생
      setError("수정할 견적서 ID가 URL 파라미터에 없습니다. (?id=...)");
      setIsLoading(false);
      return;
    }

    const fetchEstimateDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/standard_estimates/${estimateId}`
        );
        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(
            errorResult.detail ||
              `HTTP ${response.status}: 견적서 정보를 가져오지 못했습니다.`
          );
        }
        const data: DetailedEstimate = await response.json();
        console.log("data", data);

        // --- 상태 초기화 로직 (기존 코드와 동일하게 유지) ---
        // 회사 정보
        if (data.hall) {
          const { wedding_company, hall_photos, hall_includes, ...hallBase } =
            data.hall;
          setCompanyData({
            ...data.hall.wedding_company,
          });

          // ✨ 수정된 부분: type을 배열로 처리 (백엔드 반환값 형태에 따라 조정)
          const rawHallTypeFromApi = hallBase.type; // API에서 온 원본 값
          console.log("🔵 Raw hallBase.type from API:", rawHallTypeFromApi);

          let hallTypeArray: any = [];
          if (
            typeof rawHallTypeFromApi === "string" &&
            rawHallTypeFromApi.trim() !== ""
          ) {
            // API가 쉼표로 구분된 단일 문자열을 반환하는 경우 (예: "가든,야외")
            hallTypeArray = rawHallTypeFromApi
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          } else if (Array.isArray(rawHallTypeFromApi)) {
            // API가 이미 배열을 반환하지만, 각 요소가 쉼표 포함 문자열일 수 있으므로 추가 처리 (안전장치)
            hallTypeArray = rawHallTypeFromApi.flatMap((item) =>
              typeof item === "string"
                ? item
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : []
            );
          }
          // 중복 제거 (선택 사항이지만 권장)
          hallTypeArray = [...new Set(hallTypeArray)];

          console.log(
            "🟡 Calculated hallTypeArray (after split logic):",
            hallTypeArray
          );

          setHallData({ ...hallBase, type: hallTypeArray }); // type을 배열로 설정
          console.log("halldata", hallData.type);
          // --- 수정 끝 ---

          setHallIncludeList(
            hall_includes?.map((item) => ({ ...item, id: item.id })) || []
          );
        }

        // 견적 기본 정보 (중첩 제외)
        const {
          hall,
          meal_prices,
          estimate_options,
          etcs,
          wedding_packages,
          ...estimateBase
        } = data;
        setEstimateData({
          ...estimateBase,
          date: estimateBase.date
            ? new Date(estimateBase.date).toISOString().split("T")[0]
            : "",
        });

        // 식대 정보
        setMealTypes(
          meal_prices?.map((item) => ({ ...item, id: item.id })) || [
            { meal_type: "", category: "대인", price: 0, extra: "" },
          ] // 기본값
        );

        // 웨딩 패키지 (배열의 첫 항목 가정)
        if (wedding_packages && wedding_packages.length > 0) {
          const firstPackage = wedding_packages[0];
          const { wedding_package_items, ...packageBase } = firstPackage;
          setPackageData({ ...packageBase, id: firstPackage.id }); // id 포함
          setPackageItems(
            wedding_package_items?.map((item) => ({ ...item, id: item.id })) ||
              []
          ); // id 포함
        } else {
          setPackageData({
            type: "스드메",
            name: "",
            total_price: 0,
            is_total_price: true,
          });
          setPackageItems([]);
        }

        // 견적서 옵션
        setEstimateOptions(
          estimate_options?.map((item) => ({ ...item, id: item.id })) || [
            { name: "", price: 0, is_required: false },
          ] // 기본값
        );

        // 기타 정보 (etcs 배열의 첫 항목 가정)
        if (etcs && etcs.length > 0) {
          setEtcData({ ...etcs[0], id: etcs[0].id }); // id 포함
        } else {
          setEtcData({ content: "" });
        }

        // 사진 데이터 초기화
        const photosFromApi: HallPhotoData[] = data.hall?.hall_photos || [];
        const mainApiPhoto = photosFromApi.find((p) => p.order_num === 1);
        if (mainApiPhoto) {
          setMainPhotoDisplay({
            id: generateDndId(), // DnD용 ID
            preview: mainApiPhoto.url || "",
            originalUrl: mainApiPhoto.url || "",
            dbId: mainApiPhoto.id,
            order_num: mainApiPhoto.order_num,
            caption: mainApiPhoto.caption,
            is_visible: mainApiPhoto.is_visible,
          });
        } else {
          setMainPhotoDisplay(null);
        }

        setSubPhotoItems(
          photosFromApi
            .filter((p) => p.order_num !== 1)
            .sort(
              (a, b) => (a.order_num || Infinity) - (b.order_num || Infinity)
            )
            .map((p) => ({
              id: generateDndId(), // DnD용 ID
              preview: p.url || "",
              originalUrl: p.url || "",
              dbId: p.id,
              order_num: p.order_num,
              caption: p.caption,
              is_visible: p.is_visible,
            }))
        );
      } catch (err: any) {
        console.error("견적서 상세 정보 로딩 실패:", err);
        setError(err.message || "견적서 정보를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEstimateDetails();
  }, [estimateId]); // estimateId가 변경될 때만 실행
  useEffect(() => {
    console.log(
      "🧹 Component did mount. Clearing any stale file states from Fast Refresh."
    );

    // 1. 메인 사진 정리: File 객체가 있거나(새로 추가됨), preview가 blob이면 초기화.
    // API에서 불러온 originalUrl만 있는 경우는 유지합니다.
    setMainPhotoDisplay((prev) => {
      if (prev && (prev.file || prev.preview.startsWith("blob:"))) {
        if (prev.preview.startsWith("blob:")) {
          URL.revokeObjectURL(prev.preview); // 메모리 누수 방지
        }
        // DB에서 온 원본 이미지가 있다면 거기로 되돌리고, 아니면 null로 만든다.
        return prev.originalUrl
          ? { ...prev, file: undefined, preview: prev.originalUrl }
          : null;
      }
      return prev; // API에서 온 데이터는 그대로 둔다.
    });

    // mainPhotoFile 상태는 무조건 초기화합니다.
    setMainPhotoFile(null);

    // 2. 추가 사진들 정리: File 객체가 있는 항목들(새로 추가된 항목)만 필터링해서 제거합니다.
    setSubPhotoItems((prevItems) => {
      // 제거해야 할 항목과 유지해야 할 항목을 분리
      const itemsToKeep = prevItems.filter(
        (item) => !item.file && !item.preview.startsWith("blob:")
      );
      const itemsToRemove = prevItems.filter(
        (item) => item.file || item.preview.startsWith("blob:")
      );

      // 제거할 항목들의 blob URL 해제
      itemsToRemove.forEach((item) => {
        if (item.preview.startsWith("blob:")) {
          URL.revokeObjectURL(item.preview);
        }
      });

      // 최종적으로 API에서 가져온, 유효한 사진 목록만 남깁니다.
      return itemsToKeep;
    });
  }, []); // 의존성 배열을 비워 최초 마운트 시에만 단 한 번 실행되도록 합니다.

  // --- 입력 핸들러 함수들 (기존 코드와 동일하게 유지) ---
  const handleCompanyInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCompanyData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHallInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const numFields = ["interval_minutes", "parking"];
    setHallData((prev) => ({
      ...prev,
      [name]: numFields.includes(name) ? Number(value) || null : value,
    }));
  };

  const handleHallTypeChange = (selectedType: string) => {
    setHallData((prevHallData) => {
      const currentTypes = prevHallData.type || []; // 항상 배열 보장
      const newTypes = currentTypes.includes(selectedType)
        ? currentTypes.filter((type) => type !== selectedType)
        : [...currentTypes, selectedType];
      return { ...prevHallData, type: newTypes };
    });
  };

  const handleEstimateInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const numFields = ["hall_price", "guarantees", "penalty_amount"];
    const boolFields = [""]; // boolean 타입 필드 (예시, 현재 없음)

    setEstimateData((prev) => ({
      ...prev,
      [name]: numFields.includes(name)
        ? Number(value.replace(/,/g, "")) || null // 숫자 필드 처리
        : boolFields.includes(name)
        ? value === "true" // 불리언 필드 처리
        : value, // 나머지 텍스트 필드
    }));
  };

  // 식대 항목 변경 핸들러
  const handleMealTypeChange = (
    index: number,
    field: keyof MealPriceData,
    value: any
  ) => {
    const updated = [...mealTypes];
    const item = { ...updated[index] } as Partial<MealPriceData>; // Partial 사용

    if (field === "price") {
      item[field] = Number(String(value).replace(/,/g, "")) || null; // 문자열 변환 후 처리
    } else if (
      field === "category" ||
      field === "meal_type" ||
      field === "extra"
    ) {
      item[field] = value;
    }
    // 'id' 필드는 직접 수정하지 않음

    updated[index] = item;
    setMealTypes(updated);
  };
  const addMealType = () =>
    setMealTypes([
      ...mealTypes,
      { meal_type: "", category: "대인", price: 0, extra: "" },
    ]);
  const removeMealType = (index: number) => {
    const itemToRemove = mealTypes[index];
    if (itemToRemove?.id) {
      // TODO: 백엔드에 삭제 요청 API가 있다면 여기서 호출하거나,
      // handleSubmit에서 삭제할 ID 목록을 보낼 수 있음
      console.log("삭제될 식대 항목 ID (필요시 백엔드 전달):", itemToRemove.id);
    }
    setMealTypes(mealTypes.filter((_, i) => i !== index));
  };

  // Hall Include 핸들러
  const handleHallIncludeChange = (
    index: number,
    field: keyof HallIncludeData,
    value: string
  ) => {
    const updated = [...hallIncludeList];
    const item = { ...updated[index] } as Partial<HallIncludeData>;
    // 'id' 필드는 직접 수정하지 않음
    if (field === "category" || field === "subcategory") {
      item[field] = value;
    }
    updated[index] = item;
    setHallIncludeList(updated);
  };
  const addHallInclude = () =>
    setHallIncludeList([...hallIncludeList, { category: "", subcategory: "" }]);
  const removeHallInclude = (index: number) => {
    const itemToRemove = hallIncludeList[index];
    if (itemToRemove?.id) {
      console.log(
        "삭제될 홀 포함사항 ID (필요시 백엔드 전달):",
        itemToRemove.id
      );
    }
    setHallIncludeList(hallIncludeList.filter((_, i) => i !== index));
  };

  // Package Data 핸들러
  const handlePackageDataChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox" || name === "is_total_price") {
      // 라디오 버튼도 고려
      const checked = (e.target as HTMLInputElement).checked;
      // is_total_price 는 라디오 버튼일 가능성이 높으므로 value로 boolean 변환
      const boolValue = value === "true";
      setPackageData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : boolValue,
      }));
    } else {
      setPackageData((prev) => ({
        ...prev,
        [name]:
          name === "total_price"
            ? Number(String(value).replace(/,/g, "")) || null
            : value,
      }));
    }
  };
  // Package Item 핸들러
  const handlePackageItemChange = (
    index: number,
    field: keyof WeddingPackageItemData,
    value: any
  ) => {
    const updated = [...packageItems];
    const item = { ...updated[index] } as Partial<WeddingPackageItemData>;
    if (field === "price") {
      item[field] = Number(String(value).replace(/,/g, "")) || null;
    } else if (
      field === "type" ||
      field === "company_name" ||
      field === "url" ||
      field === "description"
    ) {
      item[field] = value;
    }
    updated[index] = item;
    setPackageItems(updated);
  };
  const addPackageItem = () =>
    setPackageItems([
      ...packageItems,
      { type: "스튜디오", company_name: "", price: 0 },
    ]);
  const removePackageItem = (index: number) => {
    const itemToRemove = packageItems[index];
    if (itemToRemove?.id) {
      console.log(
        "삭제될 패키지 아이템 ID (필요시 백엔드 전달):",
        itemToRemove.id
      );
    }
    setPackageItems(packageItems.filter((_, i) => i !== index));
  };

  // Estimate Option 핸들러
  const handleEstimateOptionChange = (
    index: number,
    field: keyof EstimateOptionData,
    value: any
  ) => {
    const updated = [...estimateOptions];
    const item = { ...updated[index] } as Partial<EstimateOptionData>;
    if (field === "price") {
      item[field] = Number(String(value).replace(/,/g, "")) || null;
    } else if (field === "is_required") {
      item[field] = value === true || value === "true"; // boolean 처리
    } else if (
      field === "name" ||
      field === "reference_url" ||
      field === "description"
    ) {
      item[field] = value;
    }
    updated[index] = item;
    setEstimateOptions(updated);
  };
  const addEstimateOption = () =>
    setEstimateOptions([
      ...estimateOptions,
      { name: "", price: 0, is_required: false },
    ]);
  const removeEstimateOption = (index: number) => {
    const itemToRemove = estimateOptions[index];
    if (itemToRemove?.id) {
      console.log("삭제될 견적 옵션 ID (필요시 백엔드 전달):", itemToRemove.id);
    }
    setEstimateOptions(estimateOptions.filter((_, i) => i !== index));
  };

  // Etc Data 핸들러
  const handleEtcDataChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setEtcData((prev) => ({ ...prev, content: e.target.value }));
  };

  // --- 사진 관련 핸들러들 (기존 코드와 동일하게 유지) ---
  // 대표 사진 업로드/변경
  const handleMainPhotoUploadChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (
      mainPhotoDisplay?.preview &&
      mainPhotoDisplay.preview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(mainPhotoDisplay.preview); // 이전 Object URL 해제
    }
    if (file) {
      setMainPhotoFile(file);
      setMainPhotoDisplay((prev) => ({
        // 기존 dbId, originalUrl, caption, is_visible 등을 유지하면서 preview와 file만 업데이트
        ...(prev || { id: generateDndId(), order_num: 1, is_visible: true }), // 새로 만드는 경우 기본값 설정
        preview: URL.createObjectURL(file), // 새 미리보기
        file: file, // 새 파일 객체 저장
      }));
    } else {
      // 파일 선택 취소 시: 새 파일과 blob 미리보기 제거, 원본 URL이 있으면 복원
      setMainPhotoFile(null);
      setMainPhotoDisplay((prev) =>
        prev?.originalUrl
          ? { ...prev, preview: prev.originalUrl, file: undefined }
          : null
      );
    }
    e.target.value = ""; // input 값 초기화 (같은 파일 다시 선택 가능하도록)
  };

  // 대표 사진 표시 제거
  const handleRemoveMainPhotoDisplay = () => {
    if (
      mainPhotoDisplay?.preview &&
      mainPhotoDisplay.preview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(mainPhotoDisplay.preview);
    }
    setMainPhotoFile(null);
    // dbId가 있는 기존 사진을 '제거'하는 것이므로 삭제 목록에 추가 (중복 방지)
    if (
      mainPhotoDisplay?.dbId &&
      !deletedPhotoDbIds.includes(mainPhotoDisplay.dbId)
    ) {
      setDeletedPhotoDbIds((prev) => [...prev, mainPhotoDisplay!.dbId!]);
    }
    setMainPhotoDisplay(null); // 화면에서 제거
  };

  // 추가 사진 업로드
  const handleSubPhotoItemsUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    // 현재 subPhotoItems 개수 + 새로 추가할 파일 개수가 9개를 넘지 않도록 체크
    if (subPhotoItems.length + files.length > 9) {
      alert(
        `추가 사진은 최대 9장까지 업로드 가능합니다. 현재 ${
          subPhotoItems.length
        }장 있으며, ${9 - subPhotoItems.length}장 더 추가할 수 있습니다.`
      );
      e.target.value = "";
      return;
    }
    const newItems: SubPhotoItemDnd[] = files.map((file) => ({
      id: generateDndId(),
      file: file,
      preview: URL.createObjectURL(file),
      caption: "추가 사진", // 기본 캡션
      is_visible: true, // 기본값
    }));
    setSubPhotoItems((prev) => [...prev, ...newItems]);
    e.target.value = ""; // input 초기화
  };

  // 추가 사진 삭제
  const handleRemoveSubPhotoItem = useCallback(
    (dndIdToRemove: string) => {
      setSubPhotoItems((prevItems) => {
        const itemToRemove = prevItems.find(
          (item) => item.id === dndIdToRemove
        );
        if (itemToRemove) {
          // Blob URL 해제
          if (itemToRemove.preview.startsWith("blob:")) {
            URL.revokeObjectURL(itemToRemove.preview);
          }
          // DB에 저장된 사진이었다면 삭제 목록에 추가 (중복 방지)
          if (
            itemToRemove.dbId &&
            !deletedPhotoDbIds.includes(itemToRemove.dbId)
          ) {
            // 상태 업데이트 함수 내에서 다른 상태를 직접 업데이트 하는 것은 지양.
            // 삭제 ID는 별도로 처리하거나, useEffect 등을 활용하는 것이 좋으나,
            // 여기서는 일단 콜백 내에서 처리하는 것으로 유지. (더 복잡해질 경우 리팩토링 고려)
            setDeletedPhotoDbIds((prev) => [...prev, itemToRemove!.dbId!]);
          }
        }
        // 해당 dndId를 가진 아이템을 제외한 새 배열 반환
        return prevItems.filter((item) => item.id !== dndIdToRemove);
      });
    },
    [deletedPhotoDbIds] // deletedPhotoDbIds가 변경될 때마다 콜백 함수 재생성
    // (상태 업데이트 함수 내에서 setDeletedPhotoDbIds를 호출하므로 의존성 추가)
  );

  // DnD 센서 및 드래그 종료 핸들러
  const dndSensors = useSensors(
    // 모바일 터치 및 드래그 개선을 위해 PointerSensor 설정 조정 가능
    useSensor(PointerSensor, {
      activationConstraint: {
        // 작은 움직임에도 드래그가 시작되도록 설정 (필요에 따라 조정)
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDndDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSubPhotoItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        // arrayMove는 불변성을 유지하며 새 배열 반환
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []); // 의존성 배열 비어있음 (내부에서 상태 업데이트 함수만 사용)

  // Object URL 정리 (메모리 누수 방지)
  useEffect(() => {
    // 컴포넌트 언마운트 시 실행될 클린업 함수
    return () => {
      if (
        mainPhotoDisplay?.preview &&
        mainPhotoDisplay.preview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(mainPhotoDisplay.preview);
      }
      subPhotoItems.forEach((item) => {
        if (item.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
      });
    };
  }, [mainPhotoDisplay, subPhotoItems]); // mainPhotoDisplay 또는 subPhotoItems 배열이 변경될 때마다 실행

  // --- 폼 제출 핸들러 (기존 코드와 거의 동일, 사진 로직 검토) ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!estimateId) {
      setError("견적 ID가 없어 수정할 수 없습니다.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    if (!companyData.name) {
      setError("업체명을 입력해주세요.");
      setIsSubmitting(false);
      window.scrollTo(0, 0); // 폼 상단으로 스크롤
      return;
    }
    if (!hallData.name) {
      setError("홀 이름을 입력해주세요.");
      setIsSubmitting(false);
      window.scrollTo(0, 0);
      return;
    }

    if (!hallData.type || hallData.type.length === 0) {
      setError("웨딩홀 타입을 하나 이상 선택해주세요.");
      setIsSubmitting(false);
      window.scrollTo(0, 0);
      return;
    }

    // 사진 관련 유효성 검사 (예: 대표 사진 필수 등)
    if (!mainPhotoDisplay?.preview && !mainPhotoFile) {
      setError("대표 사진을 등록해주세요.");
      setIsSubmitting(false);
      // 사진 섹션으로 스크롤하는 로직 추가 가능
      return;
    }

    // 최종적으로 백엔드에 전달할 사진 정보 목록
    const finalPhotosForPayload: {
      id?: number;
      url: string;
      order_num: number;
      caption?: string | null;
      is_visible?: boolean | null;
    }[] = [];

    let currentPayloadOrderNum = 1; // 사진 순서는 1부터 시작

    try {
      // --- 사진 정보 구성 시작 ---

      // 1. 대표 사진 처리
      if (mainPhotoFile && mainPhotoDisplay?.preview?.startsWith("blob:")) {
        // 새 파일로 업로드 또는 교체하는 경우
        console.log("대표 사진: 새 파일 업로드 시도 중...");
        const mainUrl = await uploadImage(
          mainPhotoFile,
          // 경로 규칙은 백엔드와 협의 필요
          `halls/${companyData.name || "unknown"}/main_${Date.now()}`
        );
        finalPhotosForPayload.push({
          // dbId는 새 파일이므로 보내지 않음 (백엔드에서 생성)
          id: mainPhotoDisplay.dbId,
          url: String(mainUrl),
          order_num: currentPayloadOrderNum++,
          caption: mainPhotoDisplay.caption || "대표 사진",
          is_visible: mainPhotoDisplay.is_visible ?? true,
        });
        console.log("대표 사진: 새 파일 업로드 완료 및 payload에 추가");
      } else if (mainPhotoDisplay?.originalUrl && mainPhotoDisplay.dbId) {
        // 기존 대표 사진을 '유지' + 정보 업데이트 가능 (파일 변경 없음)
        console.log("대표 사진: 기존 사진 정보 유지/업데이트");
        finalPhotosForPayload.push({
          id: mainPhotoDisplay.dbId, // ✅ 기존 사진의 DB ID 전달 (업데이트 대상 식별용)
          url: mainPhotoDisplay.originalUrl, // URL은 변경되지 않음
          order_num: currentPayloadOrderNum++,
          // 캡션이나 표시 여부는 업데이트 가능
          caption: mainPhotoDisplay.caption,
          is_visible: mainPhotoDisplay.is_visible,
        });
        console.log("대표 사진: 기존 정보 payload에 추가");
      }
      // else: 대표 사진이 제거된 경우(mainPhotoDisplay가 null), payload에 포함 안함

      // 2. 추가 사진들 처리 (subPhotoItems 순서대로)
      console.log(
        "추가 사진 처리 시작, subPhotoItems 개수:",
        subPhotoItems.length
      );
      for (const item of subPhotoItems) {
        if (item.file && item.preview?.startsWith("blob:")) {
          // 새로 추가/업로드된 파일인 경우
          console.log(
            `추가 사진 (순서 ${currentPayloadOrderNum}): 새 파일 업로드 시도 - ${item.file.name}`
          );
          const subUrl = await uploadImage(
            item.file,
            `halls/${
              companyData.name || "unknown"
            }/sub_${currentPayloadOrderNum}_${Date.now()}`
          );
          finalPhotosForPayload.push({
            // dbId 없음
            url: String(subUrl),
            order_num: currentPayloadOrderNum++,
            caption: item.caption,
            is_visible: item.is_visible ?? true,
          });
          console.log("추가 사진: 새 파일 업로드 완료 및 payload에 추가");
        } else if (item.originalUrl && item.dbId) {
          // '유지'되는 기존 추가 사진 + 정보 업데이트 가능
          console.log(
            `추가 사진 (순서 ${currentPayloadOrderNum}): 기존 사진 정보 유지/업데이트 - ${item.originalUrl}`
          );
          finalPhotosForPayload.push({
            id: item.dbId, // ✅ 기존 ID 전달
            url: item.originalUrl,
            order_num: currentPayloadOrderNum++,
            caption: item.caption,
            is_visible: item.is_visible,
          });
          console.log("추가 사진: 기존 정보 payload에 추가");
        } else {
          console.warn(
            "추가 사진 항목에 유효한 파일 또는 원본 URL/dbId가 없어 건너뜁니다:",
            item
          );
        }
      }

      const payload = {
        // 견적서 직접 필드들
        hall_price: estimateData.hall_price,
        type: estimateData.type, // 'standard' 등 고정값 또는 입력값
        date: estimateData.date || null, // 빈 문자열 대신 null
        time: estimateData.time || null, // 빈 문자열 대신 null
        guarantees: estimateData.guarantees || null,
        penalty_amount: estimateData.penalty_amount,
        penalty_detail: estimateData.penalty_detail,

        // 업체 정보 (id가 있어야 업데이트 가능)
        wedding_company_update_data: companyData.id
          ? {
              id: companyData.id,
              name: companyData.name,
              address: companyData.address,
              phone: companyData.phone,
              homepage: companyData.homepage,
              accessibility: companyData.accessibility,
              ceremony_times: companyData.ceremony_times,
              lat: companyData.lat, // 위도 경도 필드 확인
              lng: companyData.lng,
            }
          : undefined, // id 없으면 업데이트 불가 (백엔드 스키마 확인)

        // 홀 정보 (id가 있어야 업데이트 가능)
        hall_update_data: hallData.id
          ? {
              id: hallData.id,
              name: hallData.name,
              interval_minutes: hallData.interval_minutes,
              guarantees: hallData.guarantees,
              parking: hallData.parking,
              type: hallData.type || [], // 항상 배열 전달
              mood: hallData.mood || null,
            }
          : undefined,

        // 홀 포함사항 (스키마 필드명 확인: hall_includes_update_data or hall_includes)
        hall_includes: hallIncludeList
          .map((item) => ({
            id: item.id, // 기존 항목 업데이트 시 ID (신규는 null/undefined)
            category: item.category,
            subcategory: item.subcategory,
          }))
          .filter((item) => item.category || item.subcategory), // 내용 있는 것만

        // 식대 정보 (스키마 필드명 확인: meal_prices)
        meal_prices: mealTypes
          .map((item) => ({
            id: item.id, // 기존 ID
            meal_type: item.meal_type,
            category: item.category,
            price: item.price,
            extra: item.extra,
          }))
          .filter(
            (item) => item.meal_type // 필수 필드 확인 (예: meal_type)
          ),

        // 견적 옵션 (스키마 필드명 확인: estimate_options)
        estimate_options: estimateOptions
          .map((item) => ({
            id: item.id, // 기존 ID
            name: item.name,
            price: item.price,
            is_required: item.is_required,
            reference_url: item.reference_url,
            description: item.description,
          }))
          .filter((item) => item.name), // 이름 있는 것만

        // 기타 정보 (스키마 필드명 확인: etcs) - 배열 형태 예상
        etcs: etcData.content?.trim()
          ? [{ id: etcData.id, content: etcData.content }] // 기존 ID 포함
          : [], // 내용 없으면 빈 배열

        // 웨딩 패키지 (스키마 필드명 확인: wedding_packages) - 배열 형태 예상
        wedding_packages:
          packageData.name || packageItems.length > 0
            ? [
                {
                  id: packageData.id, // 기존 패키지 ID
                  type: packageData.type,
                  name: packageData.name,
                  total_price: packageData.is_total_price
                    ? packageData.total_price
                    : null, // 통합 가격일 때만 값 전달
                  is_total_price: packageData.is_total_price,
                  wedding_package_items: packageItems
                    .map((item) => ({
                      id: item.id, // 기존 아이템 ID
                      type: item.type,
                      company_name: item.company_name,
                      price: packageData.is_total_price ? null : item.price, // 개별 가격일 때만 값 전달
                      url: item.url,
                      description: item.description,
                    }))
                    .filter((item) => item.company_name), // 업체명 있는 것만
                },
              ]
            : [], // 패키지 정보 없으면 빈 배열

        // ✅ 사진 정보: 백엔드 스키마의 필드명 확인! ('final_photos', 'photos' 등)
        // final_photos: finalPhotosForPayload, // 예시 필드명
        photos_data: finalPhotosForPayload, // 스키마에 따라 변경 (예: photos_data)

        // ✅ 삭제할 사진 ID 목록: 백엔드 스키마 필드명 확인! ('photo_ids_to_delete' 등)
        photo_ids_to_delete: Array.from(new Set(deletedPhotoDbIds)),
        // TODO: 백엔드 스키마에 따라 삭제할 meal_price_ids, hall_include_ids 등도 유사하게 추가 필요
      };

      // payload에서 undefined인 최상위 속성들 제거 (선택 사항, 백엔드 처리 방식에 따라)
      // Object.keys(payload).forEach((key) => {
      //   if ((payload as any)[key] === undefined) {
      //     delete (payload as any)[key];
      //   }
      // });

      console.log(
        "백엔드로 보낼 최종 payload:",
        JSON.stringify(payload, null, 2)
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/standard_estimates/${estimateId}`,
        {
          method: "PUT", // 수정은 PUT 또는 PATCH
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        console.error("API Error (Update Standard Estimate):", result);
        // 백엔드 에러 메시지 상세 표시
        const errorDetail = result.detail
          ? typeof result.detail === "string"
            ? result.detail
            : JSON.stringify(result.detail)
          : `HTTP ${response.status} 에러`;
        throw new Error(`표준 견적서 수정 실패: ${errorDetail}`);
      }

      setSuccessMessage(
        `표준 견적서(ID: ${estimateId})가 성공적으로 수정되었습니다!`
      );
      // 성공 후 폼 초기화나 페이지 이동 등
      // router.push("/admin/standard-estimates"); // 목록 페이지로 이동 예시
      window.scrollTo(0, 0); // 성공 메시지 보이도록 위로 스크롤
    } catch (err: any) {
      console.error("표준 견적서 수정 작업 실패:", err);
      setError(
        err.message || "표준 견적서 수정 중 예상치 못한 오류가 발생했습니다."
      );
      window.scrollTo(0, 0); // 에러 메시지 보이도록 위로 스크롤
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- JSX 렌더링 ---
  // 로딩 상태: Suspense fallback에서 처리되므로 여기서는 제거하거나 다른 로직 추가 가능
  // if (isLoading) return <div>데이터 로딩 중... (Form Content)</div>; // Suspense fallback이 있으므로 불필요할 수 있음

  // 초기 에러 상태 (estimateId 없을 때 등): estimateId 확인 후 useEffect에서 처리
  if (error && !isLoading && !companyData.name)
    // 데이터 로딩 완료 후에도 에러가 있고, 데이터가 없는 경우 (fetch 실패 등)
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <p className="text-xl text-red-600 mb-4">오류: {error}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          이전 페이지로
        </button>
      </div>
    );

  // 데이터 로딩은 완료되었으나 fetch 과정에서 에러 발생 시 폼 위에 에러 메시지 표시 (handleSubmit 에러 포함)
  const renderError = () =>
    error && (
      <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-md text-center">
        오류: {error}
      </p>
    );
  const renderSuccess = () =>
    successMessage && (
      <p className="text-green-600 text-sm mb-4 p-3 bg-green-50 rounded-md text-center">
        {successMessage}
      </p>
    );

  // 폼 렌더링
  return (
    <div className="max-w-4xl mx-auto my-10 p-6 sm:p-8 border border-gray-300 rounded-xl shadow-lg bg-white">
      <h1 className="text-center text-3xl font-bold text-gray-800 mb-8">
        표준 견적서 수정 (ID: {estimateId})
      </h1>

      {/* 에러/성공 메시지 표시 영역 */}
      {renderError()}
      {renderSuccess()}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* --- 업체 정보 --- */}
        <fieldset className="p-5 border border-gray-200 rounded-lg shadow-sm">
          <legend className="text-xl font-semibold text-gray-700 px-2">
            🏢 업체 정보
          </legend>
          <div className="space-y-4 mt-3">
            <div>
              <label
                htmlFor="company_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                업체명 *
              </label>
              <input
                type="text"
                id="company_name"
                name="name"
                value={companyData.name || ""}
                onChange={handleCompanyInputChange}
                required
                readOnly
                className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            {/* 주소, 전화번호 등 나머지 업체 정보 필드들 (기존 코드 유지) */}
            <div>
              <label
                htmlFor="company_address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                주소
              </label>
              <input
                type="text"
                id="company_address"
                name="address"
                value={companyData.address || ""}
                readOnly
                onChange={handleCompanyInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="company_phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                전화번호
              </label>
              <input
                type="tel"
                id="company_phone"
                name="phone"
                value={companyData.phone || ""}
                onChange={handleCompanyInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="company_homepage"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                홈페이지
              </label>
              <input
                type="url"
                id="company_homepage"
                name="homepage"
                value={companyData.homepage || ""}
                onChange={handleCompanyInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                placeholder="http://"
              />
            </div>
            <div>
              <label
                htmlFor="company_accessibility"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                오시는 길
              </label>
              <textarea
                id="company_accessibility"
                name="accessibility"
                value={companyData.accessibility || ""}
                onChange={handleCompanyInputChange}
                rows={3}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="company_ceremony_times"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                예식 시간 정보
              </label>
              <textarea
                id="company_ceremony_times"
                name="ceremony_times"
                value={companyData.ceremony_times || ""}
                onChange={handleCompanyInputChange}
                rows={2}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* --- 홀 정보 --- */}
        <fieldset className="p-5 border border-gray-200 rounded-lg shadow-sm">
          <legend className="text-xl font-semibold text-gray-700 px-2">
            🏛️ 홀 정보
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-3">
            <div>
              <label
                htmlFor="hall_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                홀 이름
              </label>
              <input
                type="text"
                id="hall_name"
                name="name"
                required
                value={hallData.name || ""}
                onChange={handleHallInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            {/* 나머지 홀 정보 필드들 (기존 코드 유지) */}
            <div>
              <label
                htmlFor="hall_interval_minutes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                예식 간격 (분)
              </label>
              <input
                type="number"
                id="hall_interval_minutes"
                name="interval_minutes"
                value={hallData.interval_minutes || ""}
                onChange={handleHallInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="estimate_guarantees"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                보증 인원
              </label>
              <input
                type="number"
                id="estimate_guarantees"
                name="guarantees"
                value={estimateData.guarantees || ""}
                onChange={handleEstimateInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="hall_parking"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                주차 가능 대수
              </label>
              <input
                type="number"
                id="hall_parking"
                name="parking"
                value={hallData.parking || ""}
                onChange={handleHallInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>

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
                      checked={(hallData.type || []).includes(typeOption)}
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
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                웨딩홀 분위기
              </label>
              <select
                id="hall_mood"
                name="mood"
                value={hallData.mood || ""}
                onChange={handleHallInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="">선택</option>
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
        <fieldset className="p-5 border border-gray-200 rounded-lg shadow-sm">
          <legend className="text-xl font-semibold text-gray-700 px-2">
            ✨ 대관료 포함사항
          </legend>
          <div className="space-y-4 mt-3">
            {hallIncludeList.map((item, index) => (
              <div
                key={item.id || `include-${index}`}
                className="p-3 border border-gray-200 rounded-md relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      대분류
                    </label>
                    <input
                      type="text"
                      value={item.category || ""}
                      onChange={(e) =>
                        handleHallIncludeChange(
                          index,
                          "category",
                          e.target.value
                        )
                      }
                      placeholder="예: 기본 연출"
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      소분류 (상세 내용)
                    </label>
                    <textarea
                      value={item.subcategory || ""}
                      onChange={(e) =>
                        handleHallIncludeChange(
                          index,
                          "subcategory",
                          e.target.value
                        )
                      }
                      placeholder="예: 혼구용품, 웨딩캔들, 포토테이블, 성혼선언문 등"
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      rows={2}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeHallInclude(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold p-1 rounded hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addHallInclude}
              className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white p-2.5 rounded-md text-sm font-medium"
            >
              + 포함사항 추가
            </button>
          </div>
        </fieldset>

        {/* --- 견적 기본 정보 --- */}
        <fieldset className="p-5 border border-gray-200 rounded-lg shadow-sm">
          <legend className="text-xl font-semibold text-gray-700 px-2">
            💰 견적 기본 정보
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-3">
            <div>
              <label
                htmlFor="estimate_hall_price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                대관료 (원)
              </label>
              <input
                type="text"
                id="estimate_hall_price"
                name="hall_price"
                value={
                  estimateData.hall_price
                    ? estimateData.hall_price.toLocaleString("ko-KR")
                    : ""
                }
                onChange={handleEstimateInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="estimate_date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                견적 날짜
              </label>
              <input
                type="date"
                id="estimate_date"
                name="date"
                value={estimateData.date || ""}
                onChange={handleEstimateInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="estimate_time"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                예식 시작 시간
              </label>
              <input
                type="time"
                id="estimate_time"
                name="time"
                value={estimateData.time || ""}
                onChange={handleEstimateInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="estimate_penalty_amount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                계약금 (원)
              </label>
              <input
                type="text"
                id="estimate_penalty_amount"
                name="penalty_amount"
                value={
                  estimateData.penalty_amount
                    ? estimateData.penalty_amount.toLocaleString("ko-KR")
                    : ""
                }
                onChange={handleEstimateInputChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="estimate_penalty_detail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                계약금/위약금 조항
              </label>
              <textarea
                id="estimate_penalty_detail"
                name="penalty_detail"
                value={estimateData.penalty_detail || ""}
                onChange={handleEstimateInputChange}
                rows={4}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* --- 식대 정보 --- */}
        <fieldset className="p-5 border border-gray-200 rounded-lg shadow-sm">
          <legend className="text-xl font-semibold text-gray-700 px-2">
            🍽 식대 정보
          </legend>
          <div className="space-y-4 mt-3">
            {mealTypes.map((meal, index) => (
              <div
                key={meal.id || `meal-${index}`}
                className="p-3 border border-gray-200 rounded-md relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      식사 종류
                    </label>
                    <input
                      type="text"
                      value={meal.meal_type || ""}
                      onChange={(e) =>
                        handleMealTypeChange(index, "meal_type", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      구분
                    </label>
                    <select
                      value={meal.category || ""}
                      onChange={(e) =>
                        handleMealTypeChange(index, "category", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
                    >
                      <option value="">선택</option>
                      {["대인", "소인", "미취학", "음주류"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      가격 (원)
                    </label>
                    <input
                      type="text"
                      value={
                        meal.price ? meal.price.toLocaleString("ko-KR") : ""
                      }
                      onChange={(e) =>
                        handleMealTypeChange(index, "price", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      비고
                    </label>
                    <input
                      type="text"
                      value={meal.extra || ""}
                      onChange={(e) =>
                        handleMealTypeChange(index, "extra", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeMealType(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold p-1 rounded hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addMealType}
              className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white p-2.5 rounded-md text-sm font-medium"
            >
              + 식대 항목 추가
            </button>
          </div>
        </fieldset>

        {/* --- 웨딩 패키지 --- */}
        <fieldset className="p-5 border border-gray-200 rounded-lg shadow-sm">
          <legend className="text-xl font-semibold text-gray-700 px-2">
            🎁 홀 패키지
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-3">
            <div>
              <label
                htmlFor="package_type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                패키지 종류
              </label>
              <select
                id="package_type"
                name="type"
                value={packageData.type || ""}
                onChange={handlePackageDataChange}
                className="w-full p-2.5 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="">선택</option>
                {["스드메", "개별"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="package_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                패키지명
              </label>
              <input
                type="text"
                id="package_name"
                name="name"
                value={packageData.name || ""}
                onChange={handlePackageDataChange}
                className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                금액 방식
              </label>
              <div className="flex items-center space-x-4 mt-1">
                <label
                  htmlFor="is_total_price_true"
                  className="flex items-center text-sm"
                >
                  <input
                    type="radio"
                    id="is_total_price_true"
                    name="is_total_price"
                    value="true"
                    checked={packageData.is_total_price === true}
                    onChange={handlePackageDataChange}
                    className="mr-1.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  통합 금액
                </label>
                <label
                  htmlFor="is_total_price_false"
                  className="flex items-center text-sm"
                >
                  <input
                    type="radio"
                    id="is_total_price_false"
                    name="is_total_price"
                    value="false"
                    checked={packageData.is_total_price === false}
                    onChange={handlePackageDataChange}
                    className="mr-1.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  개별 금액 합산
                </label>
              </div>
            </div>
            {packageData.is_total_price && (
              <div>
                <label
                  htmlFor="package_total_price"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  총 가격 (원)
                </label>
                <input
                  type="text"
                  id="package_total_price"
                  name="total_price"
                  value={
                    packageData.total_price
                      ? packageData.total_price.toLocaleString("ko-KR")
                      : ""
                  }
                  onChange={handlePackageDataChange}
                  className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
                  disabled={!packageData.is_total_price} // 통합 가격일 때만 활성화
                />
              </div>
            )}
          </div>
          <div className="mt-6 space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-md font-semibold text-gray-700">
              개별 패키지 항목{" "}
              {packageData.is_total_price === false
                ? "(개별 가격 입력)"
                : "(참고용 정보)"}
            </h3>
            {packageItems.map((item, index) => (
              <div
                key={item.id || `pkgitem-${index}`}
                className="p-3 border border-gray-200 rounded-md relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      항목 종류
                    </label>
                    <select
                      value={item.type || ""}
                      onChange={(e) =>
                        handlePackageItemChange(index, "type", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
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
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      업체명
                    </label>
                    <input
                      type="text"
                      value={item.company_name || ""}
                      onChange={(e) =>
                        handlePackageItemChange(
                          index,
                          "company_name",
                          e.target.value
                        )
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs font-medium mb-0.5 ${
                        packageData.is_total_price
                          ? "text-gray-400"
                          : "text-gray-600"
                      }`}
                    >
                      가격 (원){" "}
                      {packageData.is_total_price ? "(통합가격 사용중)" : ""}
                    </label>
                    <input
                      type="text"
                      value={
                        item.price ? item.price.toLocaleString("ko-KR") : ""
                      }
                      onChange={(e) =>
                        handlePackageItemChange(index, "price", e.target.value)
                      }
                      className={`w-full p-2 border border-gray-300 rounded-md text-sm ${
                        packageData.is_total_price ? "bg-gray-100" : ""
                      }`}
                      disabled={packageData.is_total_price === true} // 통합 가격이면 비활성화
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      설명
                    </label>
                    <textarea
                      value={item.description || ""}
                      onChange={(e) =>
                        handlePackageItemChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                      rows={2}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      참고 URL
                    </label>
                    <input
                      type="url"
                      value={item.url || ""}
                      onChange={(e) =>
                        handlePackageItemChange(index, "url", e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      placeholder="http://"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePackageItem(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold p-1 rounded hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPackageItem}
              className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white p-2.5 rounded-md text-sm font-medium"
            >
              + 개별 항목 추가
            </button>
          </div>
        </fieldset>

        {/* --- 견적서 옵션 --- */}
        <fieldset className="p-5 border border-gray-200 rounded-lg shadow-sm">
          <legend className="text-xl font-semibold text-gray-700 px-2">
            🧩 견적서 옵션
          </legend>
          <div className="space-y-4 mt-3">
            {estimateOptions.map((option, index) => (
              <div
                key={option.id || `option-${index}`}
                className="p-3 border border-gray-200 rounded-md relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      옵션명
                    </label>
                    <input
                      type="text"
                      value={option.name || ""}
                      onChange={(e) =>
                        handleEstimateOptionChange(
                          index,
                          "name",
                          e.target.value
                        )
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      가격 (원)
                    </label>
                    <input
                      type="text"
                      value={
                        option.price ? option.price.toLocaleString("ko-KR") : ""
                      }
                      onChange={(e) =>
                        handleEstimateOptionChange(
                          index,
                          "price",
                          e.target.value
                        )
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      필수 여부
                    </label>
                    <select
                      value={option.is_required ? "true" : "false"}
                      onChange={(e) =>
                        handleEstimateOptionChange(
                          index,
                          "is_required",
                          e.target.value === "true"
                        )
                      }
                      className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm"
                    >
                      <option value="false">선택</option>
                      <option value="true">필수</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      설명
                    </label>
                    <textarea
                      value={option.description || ""}
                      onChange={(e) =>
                        handleEstimateOptionChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                      rows={2}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      참고 URL
                    </label>
                    <input
                      type="url"
                      value={option.reference_url || ""}
                      onChange={(e) =>
                        handleEstimateOptionChange(
                          index,
                          "reference_url",
                          e.target.value
                        )
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      placeholder="http://"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeEstimateOption(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold p-1 rounded hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addEstimateOption}
              className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white p-2.5 rounded-md text-sm font-medium"
            >
              + 옵션 추가
            </button>
          </div>
        </fieldset>

        {/* --- 기타 정보 --- */}
        <fieldset className="p-5 border border-gray-200 rounded-lg shadow-sm">
          <legend className="text-xl font-semibold text-gray-700 px-2">
            📝 기타 정보
          </legend>
          <div className="mt-3">
            <label
              htmlFor="etc_content"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              기타 내용
            </label>
            <textarea
              id="etc_content"
              value={etcData.content || ""}
              onChange={handleEtcDataChange}
              rows={4}
              className="w-full p-2.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </fieldset>

        {/* --- 사진 업로드 --- */}
        <fieldset className="p-5 border border-gray-200 rounded-lg shadow-sm">
          <legend className="text-xl font-semibold text-gray-700 px-2">
            🖼️ 웨딩홀 사진 수정
          </legend>
          <div className="mb-6 mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              대표 사진 (1장) *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleMainPhotoUploadChange}
              className="mb-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {mainPhotoDisplay?.preview && (
              <div className="relative w-32 h-32 mt-2 group">
                <img
                  src={mainPhotoDisplay.preview}
                  alt="대표 사진 미리보기"
                  className="w-full h-full object-cover rounded border border-gray-300"
                  onError={(e) => {
                    // 이미지 로드 실패 처리
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-image.png"; // 대체 이미지
                    target.alt = "대표 사진 로드 실패";
                  }}
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleRemoveMainPhotoDisplay}
                  aria-label="대표 사진 제거"
                >
                  ×
                </button>
              </div>
            )}
            {!mainPhotoDisplay?.preview && (
              <p className="text-xs text-red-500 mt-1">
                대표 사진을 업로드해주세요.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              추가 사진 (최대 9장) -{" "}
              <span className="text-blue-600 font-normal">
                순서 변경 가능 (드래그 앤 드롭)
              </span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleSubPhotoItemsUpload}
              disabled={subPhotoItems.length >= 9}
              className={`mb-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 ${
                subPhotoItems.length >= 9 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            />
            {subPhotoItems.length > 0 ? (
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDndDragEnd}
              >
                <SortableContext
                  items={subPhotoItems.map((p) => p.id)} // dnd id 배열 전달
                  strategy={rectSortingStrategy} // 그리드 정렬 전략
                >
                  {/* 정렬 가능한 아이템들을 렌더링할 컨테이너 */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-2 rounded border border-gray-200 bg-gray-50 min-h-[8rem]">
                    {subPhotoItems.map((photo) => (
                      <SortablePhotoItem
                        key={photo.id}
                        photo={photo}
                        onRemove={handleRemoveSubPhotoItem}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="mt-2 p-4 border-dashed border-2 border-gray-300 rounded text-center text-gray-500 text-sm">
                추가 사진 없음 (여기에 파일을 드롭하거나 위 버튼으로 업로드)
              </div>
            )}
          </div>
        </fieldset>

        {/* --- 제출 버튼 --- */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          {/* 에러/성공 메시지 영역을 폼 상단으로 옮김 */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading} // 초기 로딩 중에도 비활성화
            className={`w-full px-6 py-3 text-base font-semibold text-white rounded-lg shadow-md transition duration-150 ease-in-out flex items-center justify-center ${
              isSubmitting || isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            }`}
          >
            {isSubmitting ? (
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
                저장 중...
              </>
            ) : (
              "표준 견적서 수정 완료"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// =======================================================================
// ✨ 페이지 컴포넌트 (Default Export)
// =======================================================================
export default function UpdateStandardEstimatePage() {
  // 이 컴포넌트는 Suspense로 감싸는 역할만 합니다.
  return (
    // Suspense로 useSearchParams를 사용하는 컴포넌트를 감쌉니다.
    <Suspense
      fallback={
        // Suspense 로딩 중 표시할 UI (페이지 전체 또는 주요 부분의 스켈레톤 UI 권장)
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-pulse">
            <p className="text-xl text-gray-500">
              견적서 수정 페이지를 불러오는 중...
            </p>
            {/* 간단한 스피너나 스켈레톤 UI 추가 가능 */}
          </div>
        </div>
      }
    >
      {/* 실제 로직이 담긴 컴포넌트를 렌더링 */}
      <UpdateFormContent />
    </Suspense>
  );
}
