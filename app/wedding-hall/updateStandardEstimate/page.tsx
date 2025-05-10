// src/app/admin/standard-estimates/update/[id]/page.tsx
// (또는 사용하는 라우팅 구조에 맞는 경로)
"use client";

import React, {
  useState,
  FormEvent,
  ChangeEvent,
  useCallback,
  useEffect,
} from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation"; // useParams로 ID 가져오기
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

const packageItemOptions = [
  { value: "스튜디오", label: "스튜디오" },
  { value: "드레스", label: "드레스" },
  { value: "헤어메이크업", label: "헤어&메이크업" }, // value는 "헤어메이크업", label은 "헤어&메이크업"
  { value: "부케", label: "부케" },
];

const generateDndId = () =>
  `dnd-photo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// --- 개별 사진 아이템 컴포넌트 (SortablePhotoItem) ---
// (이전 답변의 SortablePhotoItem 컴포넌트 코드를 여기에 붙여넣으세요. 내용은 동일합니다.)
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
    touchAction: "none",
  };
  return (
    <div className="relative group">
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="relative w-28 h-28 border border-gray-200 rounded overflow-hidden cursor-grab"
      >
        <img
          src={photo.preview}
          alt={photo.caption || `사진 ${photo.dbId || photo.id}`}
          className="w-full h-full object-cover"
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
        data-dnd-kit-disabled-dnd="true"
      >
        ×
      </button>
    </div>
  );
}

// --- 메인 수정 폼 컴포넌트 ---
export default function UpdateStandardEstimatePage() {
  useAuthGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const estimateId = searchParams.get("id");

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

  // 폼 데이터 상태 (친구의 UpdateAdminEstimate.tsx의 상태 구조 참고)
  const [companyData, setCompanyData] = useState<Partial<WeddingCompanyData>>(
    {}
  );
  const [hallData, setHallData] = useState<
    Partial<Omit<HallData, "wedding_company" | "hall_photos" | "hall_includes">>
  >({});
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
  const [etcData, setEtcData] = useState<Partial<EtcData>>({ content: "" }); // etcs 배열의 첫번째 또는 단일 항목으로 가정

  // --- 데이터 불러오기 및 폼 상태 초기화 ---
  useEffect(() => {
    if (!estimateId) {
      setError("수정할 견적서 ID가 유효하지 않습니다.");
      setIsLoading(false);
      return;
    }

    const fetchEstimateDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // ✅ 중요: 이 API 엔드포인트는 실제 표준 견적서 단건 조회 API로 변경해야 합니다.
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

        // --- UpdateAdminEstimate.tsx의 useEffect 내부 로직을 참고하여 상태 초기화 ---
        // 회사 정보
        if (data.hall?.wedding_company) {
          setCompanyData({
            ...data.hall.wedding_company,
            // mapx, mapy는 백엔드의 lat, lng에 해당하므로 변환 또는 그대로 사용
            // 여기서는 WeddingCompanyData에 lat, lng이 있으므로 그대로 사용
          });
        }

        // 홀 정보 (중첩 제외)
        if (data.hall) {
          const { wedding_company, hall_photos, hall_includes, ...hallBase } =
            data.hall;
          setHallData(hallBase);
          setHallIncludeList(
            hall_includes?.map((item) => ({ ...item, id: item.id })) || []
          ); // id 포함
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

        // 기타 정보 (etcs 배열의 첫 항목 가정, 또는 모든 내용을 합치는 방식도 고려)
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

  // --- 입력 핸들러 함수들 (친구의 UpdateAdminEstimate.tsx의 핸들러들 참고하여 작성) ---
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
    const numFields = ["interval_minutes", "guarantees", "parking"];
    setHallData((prev) => ({
      ...prev,
      [name]: numFields.includes(name) ? Number(value) || null : value,
    }));
  };

  const handleEstimateInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const numFields = ["hall_price", "penalty_amount"];
    setEstimateData((prev) => ({
      ...prev,
      [name]: numFields.includes(name)
        ? Number(value.replace(/,/g, "")) || null
        : value,
    }));
  };

  // (hallIncludeList, mealTypes, packageItems, estimateOptions 핸들러들은 이전 답변의 배열 항목 추가/삭제/변경 로직 참고)
  // 예시: 식대 항목 변경 핸들러
  const handleMealTypeChange = (
    index: number,
    field: keyof MealPriceData,
    value: any
  ) => {
    const updated = [...mealTypes];
    const item = { ...updated[index] } as any; // 타입 단언
    item[field] =
      field === "price" ? Number(value.replace(/,/g, "")) || null : value;
    updated[index] = item;
    setMealTypes(updated);
  };
  const addMealType = () =>
    setMealTypes([
      ...mealTypes,
      { meal_type: "", category: "대인", price: 0, extra: "" },
    ]);
  const removeMealType = (index: number) =>
    setMealTypes(mealTypes.filter((_, i) => i !== index));

  // (나머지 배열 상태 핸들러들도 유사하게 작성)
  // Hall Include 핸들러
  const handleHallIncludeChange = (
    index: number,
    field: keyof HallIncludeData,
    value: string
  ) => {
    const updated = [...hallIncludeList];
    const item = { ...updated[index] } as any;
    item[field] = value;
    updated[index] = item;
    setHallIncludeList(updated);
  };
  const addHallInclude = () =>
    setHallIncludeList([...hallIncludeList, { category: "", subcategory: "" }]);
  const removeHallInclude = (index: number) =>
    setHallIncludeList(hallIncludeList.filter((_, i) => i !== index));

  // Package Data 핸들러
  const handlePackageDataChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setPackageData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setPackageData((prev) => ({
        ...prev,
        [name]:
          name === "total_price"
            ? Number(value.replace(/,/g, "")) || null
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
    const item = { ...updated[index] } as any;
    item[field] =
      field === "price" ? Number(value.replace(/,/g, "")) || null : value;
    updated[index] = item;
    setPackageItems(updated);
  };
  const addPackageItem = () =>
    setPackageItems([
      ...packageItems,
      { type: "스튜디오", company_name: "", price: 0 },
    ]);
  const removePackageItem = (index: number) =>
    setPackageItems(packageItems.filter((_, i) => i !== index));

  // Estimate Option 핸들러
  const handleEstimateOptionChange = (
    index: number,
    field: keyof EstimateOptionData,
    value: any
  ) => {
    const updated = [...estimateOptions];
    const item = { ...updated[index] } as any;
    if (field === "price") {
      item[field] = Number(value.replace(/,/g, "")) || null;
    } else if (field === "is_required") {
      item[field] = value === true || value === "true";
    } else {
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
  const removeEstimateOption = (index: number) =>
    setEstimateOptions(estimateOptions.filter((_, i) => i !== index));

  // Etc Data 핸들러
  const handleEtcDataChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setEtcData((prev) => ({ ...prev, content: e.target.value }));
  };

  // --- 사진 관련 핸들러들 (이전 답변의 사진 핸들러들 참고) ---
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
        ...(prev || {
          id: generateDndId(),
          order_num: 1,
          caption: "대표 사진",
        }), // 기존 dbId, originalUrl 유지
        preview: URL.createObjectURL(file), // 새 미리보기
      }));
    } else {
      // 파일 선택 취소 시
      setMainPhotoFile(null);
      setMainPhotoDisplay((prev) =>
        prev?.originalUrl ? { ...prev, preview: prev.originalUrl } : null
      );
    }
    e.target.value = "";
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
    if (
      mainPhotoDisplay?.dbId &&
      !deletedPhotoDbIds.includes(mainPhotoDisplay.dbId)
    ) {
      // dbId가 있는 기존 사진을 '제거'하는 것이므로 삭제 목록에 추가
      setDeletedPhotoDbIds((prev) => [...prev, mainPhotoDisplay.dbId!]);
    }
    setMainPhotoDisplay(null); // 화면에서 제거
  };

  // 추가 사진 업로드
  const handleSubPhotoItemsUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (subPhotoItems.length + files.length > 9) {
      alert("추가 사진은 최대 9장까지 업로드 가능합니다.");
      e.target.value = "";
      return;
    }
    const newItems: SubPhotoItemDnd[] = files.map((file) => ({
      id: generateDndId(),
      file: file,
      preview: URL.createObjectURL(file),
      caption: "추가 사진",
      is_visible: true,
    }));
    setSubPhotoItems((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  // 추가 사진 삭제
  const handleRemoveSubPhotoItem = useCallback(
    (dndIdToRemove: string) => {
      setSubPhotoItems((prevItems) => {
        const itemToRemove = prevItems.find(
          (item) => item.id === dndIdToRemove
        );
        if (itemToRemove) {
          if (itemToRemove.preview.startsWith("blob:")) {
            URL.revokeObjectURL(itemToRemove.preview);
          }
          if (
            itemToRemove.dbId &&
            !deletedPhotoDbIds.includes(itemToRemove.dbId)
          ) {
            setDeletedPhotoDbIds((prev) => [...prev, itemToRemove.dbId!]);
          }
        }
        return prevItems.filter((item) => item.id !== dndIdToRemove);
      });
    },
    [deletedPhotoDbIds]
  );

  // DnD 센서 및 드래그 종료 핸들러
  const dndSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDndDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSubPhotoItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // Object URL 정리 (메모리 누수 방지)
  useEffect(() => {
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
  }, [mainPhotoDisplay, subPhotoItems]);

  // --- 폼 제출 핸들러 (수정) ---
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
      return;
    }

    // 최종적으로 백엔드에 전달할 사진 정보 목록 (백엔드 FinalHallPhotoSchema 형태에 맞춰야 함)
    const finalPhotosForPayload: {
      dbId?: number;
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
        // 새 파일로 업로드 또는 교체하는 경우 (미리보기가 blob URL로 바뀐 경우)
        console.log("대표 사진: 새 파일 업로드 시도 중...");
        const mainUrl = await uploadImage(
          mainPhotoFile,
          `halls/${companyData.name || "unknown"}/main_${Date.now()}`
        );
        console.log("mainUrl)", mainUrl);
        finalPhotosForPayload.push({
          url: String(mainUrl),
          order_num: currentPayloadOrderNum++, // 대표 사진 순서 할당 후 증가
          caption: mainPhotoDisplay.caption || "대표 사진",
          is_visible: mainPhotoDisplay.is_visible ?? true,
        });
        console.log(
          "대표 사진: 새 파일 업로드 완료 및 payload에 추가",
          finalPhotosForPayload[finalPhotosForPayload.length - 1]
        );
      } else if (mainPhotoDisplay?.originalUrl) {
        // 기존 대표 사진을 '유지'하는 경우 (파일 변경 없음, originalUrl이 있는 경우)
        console.log("대표 사진: 기존 사진 정보 유지");
        finalPhotosForPayload.push({
          dbId: mainPhotoDisplay.dbId, // ✅ 기존 사진의 DB ID 전달
          url: mainPhotoDisplay.originalUrl,
          order_num: currentPayloadOrderNum++,
          caption: mainPhotoDisplay.caption,
          is_visible: mainPhotoDisplay.is_visible,
        });

        console.log(
          "대표 사진: 기존 정보 payload에 추가",
          finalPhotosForPayload[finalPhotosForPayload.length - 1]
        );
      }
      // mainPhotoDisplay가 null이거나 originalUrl이 없으면 (사용자가 대표 사진을 '삭제'했거나 원래 없었으면)
      // finalPhotosForPayload에 대표 사진 정보를 포함하지 않음. 이 경우 currentPayloadOrderNum은 1로 유지되어
      // 추가 사진이 1번부터 시작될 수 있음.

      // 2. 추가 사진들 처리 (subPhotoItems는 현재 화면에 최종적으로 보여야 할 추가 사진 목록)
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
          console.log("subUrl", subUrl);
          finalPhotosForPayload.push({
            url: String(subUrl),
            order_num: currentPayloadOrderNum++, // 현재 순서 할당 후 증가
            caption: item.caption,
            is_visible: item.is_visible ?? true,
          });
          console.log(
            "추가 사진: 새 파일 업로드 완료 및 payload에 추가",
            finalPhotosForPayload[finalPhotosForPayload.length - 1]
          );
        } else if (item.originalUrl) {
          // '유지'되는 기존 추가 사진 (파일 변경 없음, originalUrl이 있는 경우)
          console.log(
            `추가 사진 (순서 ${currentPayloadOrderNum}): 기존 사진 정보 유지 - ${item.originalUrl}`
          );
          finalPhotosForPayload.push({
            dbId: item.dbId,
            url: item.originalUrl,
            order_num: currentPayloadOrderNum++, // 현재 순서 할당 후 증가
            caption: item.caption,
            is_visible: item.is_visible,
          });
          console.log(
            "추가 사진: 기존 정보 payload에 추가",
            finalPhotosForPayload[finalPhotosForPayload.length - 1]
          );
        } else {
          console.warn(
            "추가 사진 항목에 유효한 파일 또는 원본 URL이 없어 건너뜁니다:",
            item
          );
        }
      }
      // --- 사진 정보 구성 끝 ---

      // --- 페이로드 구성 ---
      const payload = {
        // 견적서 직접 필드들 (이전과 동일)
        hall_price: estimateData.hall_price,
        type: estimateData.type,
        date: estimateData.date,
        time: estimateData.time,
        penalty_amount: estimateData.penalty_amount,
        penalty_detail: estimateData.penalty_detail,

        // 업체 정보 (id가 있어야 업데이트 가능)
        wedding_company_update_data: companyData.id
          ? { id: companyData.id, ...companyData }
          : undefined, // id 없으면 보내지 않거나, 백엔드에서 신규 생성 로직 필요 (지금은 업데이트만 가정)

        // 홀 정보 (id가 있어야 업데이트 가능)
        hall_update_data: hallData.id
          ? {
              id: hallData.id,
              name: hallData.name,
              interval_minutes: hallData.interval_minutes,
              guarantees: hallData.guarantees,
              parking: hallData.parking,
              type: hallData.type,
              mood: hallData.mood,
              // hall_includes는 별도 필드로 처리하는 것이 스키마와 더 맞을 수 있음
              // 아래 hall_includes_update_data 와 중복되지 않도록 주의
            }
          : undefined,

        // 홀 포함사항 (이 필드명은 백엔드 스키마 StandardEstimateUpdateRequestSchemaV2와 일치해야 함)
        hall_includes_update_data: hallIncludeList
          .map((item) => ({
            id: item.id, // 기존 항목 업데이트 시 ID
            category: item.category,
            subcategory: item.subcategory,
          }))
          .filter((item) => item.category || item.subcategory), // 내용 있는 것만

        // 식대 정보
        meal_prices: mealTypes
          .map((item) => ({ ...item, id: item.id })) // 기존 id 포함
          .filter(
            (item) =>
              item.meal_type && item.price !== undefined && item.price !== null
          ), // 유효한 것만

        // 견적 옵션
        estimate_options: estimateOptions
          .map((item) => ({ ...item, id: item.id }))
          .filter((item) => item.name),

        // 기타 정보 (etcs가 배열이므로, 단일 etcData를 배열로 감싸줌)
        etcs: etcData.content?.trim()
          ? [{ id: etcData.id, content: etcData.content }]
          : [], // 내용 없으면 빈 배열 또는 null (백엔드 스키마에 따라)

        // 웨딩 패키지 (wedding_packages가 배열이므로, 단일 packageData를 배열로 감싸줌)
        wedding_packages:
          packageData.name || packageItems.length > 0
            ? [
                {
                  id: packageData.id, // 기존 패키지 ID
                  type: packageData.type,
                  name: packageData.name,
                  total_price: packageData.total_price,
                  is_total_price: packageData.is_total_price,
                  wedding_package_items: packageItems
                    .map((item) => ({ ...item, id: item.id }))
                    .filter((item) => item.company_name),
                },
              ]
            : [], // 패키지 정보 없으면 빈 배열 또는 null

        // ✅ 사진 정보: 백엔드 스키마의 필드명 ('final_photos')과 일치해야 함!
        final_photos: finalPhotosForPayload,
        photo_ids_to_delete: Array.from(new Set(deletedPhotoDbIds)),
      };

      // payload에서 undefined인 최상위 속성들 제거 (선택 사항)
      Object.keys(payload).forEach((key) => {
        if ((payload as any)[key] === undefined) {
          delete (payload as any)[key];
        }
      });

      console.log(
        "백엔드로 보낼 최종 payload:",
        JSON.stringify(payload, null, 2)
      );
      console.log(payload);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/standard_estimates/${estimateId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        console.error("API Error (Update Standard Estimate):", result);
        throw new Error(
          result.detail ||
            `HTTP ${
              response.status
            }: 표준 견적서 수정 실패. 서버 메시지: ${JSON.stringify(
              result.detail
            )}`
        );
      }

      setSuccessMessage(
        `표준 견적서(ID: ${estimateId})가 성공적으로 수정되었습니다!`
      );
      // 성공 후 페이지 이동 또는 현재 페이지 새로고침 등
      // router.push("/admin/standard-estimates-list");
      // router.refresh();
    } catch (err: any) {
      console.error("표준 견적서 수정 작업 실패:", err);
      setError(
        err.message || "표준 견적서 수정 중 예상치 못한 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- JSX 렌더링 ---
  // (이전 답변의 JSX 구조를 여기에 붙여넣고, 상태 변수명과 핸들러 함수명만 이 파일에 맞게 수정합니다.)
  // (NaverPlaceSearch 관련 부분은 제거합니다.)
  // (사진 업로드/수정 UI는 이 파일의 사진 상태(mainPhotoDisplay, subPhotoItems)와 핸들러를 사용합니다.)
  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-blue-600">견적서 정보를 불러오는 중...</p>
      </div>
    );
  if (error && !companyData.name)
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center">
        <p className="text-xl text-red-600 mb-4">오류: {error}</p>{" "}
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          이전 페이지로
        </button>{" "}
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto my-10 p-6 sm:p-8 border border-gray-300 rounded-xl shadow-lg bg-white">
      <h1 className="text-center text-3xl font-bold text-gray-800 mb-8">
        표준 견적서 수정 (ID: {estimateId})
      </h1>

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
                className="w-full p-2.5 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
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
                onChange={handleCompanyInputChange}
                className="w-full p-2.5 border-gray-300 rounded-md shadow-sm bg-gray-100 text-sm"
                placeholder="주소 정보"
                readOnly
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
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
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
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
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
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
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
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
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
                value={hallData.name || ""}
                onChange={handleHallInputChange}
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
              />
            </div>
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
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="hall_guarantees"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                보증 인원
              </label>
              <input
                type="number"
                id="hall_guarantees"
                name="guarantees"
                value={hallData.guarantees || ""}
                onChange={handleHallInputChange}
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
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
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="hall_type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                웨딩홀 타입
              </label>
              <select
                id="hall_type"
                name="type"
                value={hallData.type || ""}
                onChange={handleHallInputChange}
                className="w-full p-2.5 border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="">선택</option>
                {[
                  "야외",
                  "호텔",
                  "가든",
                  "스몰",
                  "하우스",
                  "컨벤션",
                  "채플",
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
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                웨딩홀 분위기
              </label>
              <select
                id="hall_mood"
                name="mood"
                value={hallData.mood || ""}
                onChange={handleHallInputChange}
                className="w-full p-2.5 border-gray-300 rounded-md bg-white text-sm"
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
                key={item.id || index}
                className="p-3 border-gray-200 rounded-md relative bg-gray-50"
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
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
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
                      placeholder="예: 혼구용품..."
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
                      rows={2}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeHallInclude(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50"
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
                value={(estimateData.hall_price || 0).toLocaleString("ko-KR")}
                onChange={handleEstimateInputChange}
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
              />
            </div>
            {/* estimateData.type 은 standard로 고정되거나 백엔드에서 관리될 수 있음 */}
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
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="estimate_time"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                견적 시간
              </label>
              <input
                type="time"
                id="estimate_time"
                name="time"
                value={estimateData.time || ""}
                onChange={handleEstimateInputChange}
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
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
                value={(estimateData.penalty_amount || 0).toLocaleString(
                  "ko-KR"
                )}
                onChange={handleEstimateInputChange}
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
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
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
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
                key={meal.id || index}
                className="p-3 border-gray-200 rounded-md relative bg-gray-50"
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
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
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
                      className="w-full p-2 border-gray-300 rounded-md bg-white text-sm"
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
                      value={(meal.price || 0).toLocaleString("ko-KR")}
                      onChange={(e) =>
                        handleMealTypeChange(index, "price", e.target.value)
                      }
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
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
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeMealType(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold"
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
                className="w-full p-2.5 border-gray-300 rounded-md bg-white text-sm"
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
                className="w-full p-2.5 border-gray-300 rounded-md text-sm"
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
                    onChange={(e) =>
                      setPackageData((prev) => ({
                        ...prev,
                        is_total_price: true,
                      }))
                    }
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
                    onChange={(e) =>
                      setPackageData((prev) => ({
                        ...prev,
                        is_total_price: false,
                      }))
                    }
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
                  value={(packageData.total_price || 0).toLocaleString("ko-KR")}
                  onChange={handlePackageDataChange}
                  className="w-full p-2.5 border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
          </div>
          <div className="mt-6 space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-md font-semibold text-gray-700">
              개별 패키지 항목
            </h3>
            {packageItems.map((item, index) => (
              <div
                key={item.id || index}
                className="p-3 border-gray-200 rounded-md relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      항목 종류
                    </label>
                    <select
                      value={item.type || ""}
                      onChange={(e) =>
                        handlePackageItemChange(index, "type", e.target.value)
                      }
                      className="w-full p-2 border-gray-300 rounded-md bg-white text-sm"
                    >
                      <option value="">선택</option>
                      {packageItemOptions.map((optionItem) => (
                        <option key={optionItem.value} value={optionItem.value}>
                          {optionItem.label}
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
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      가격 (원)
                    </label>
                    <input
                      type="text"
                      value={(item.price || 0).toLocaleString("ko-KR")}
                      onChange={(e) =>
                        handlePackageItemChange(index, "price", e.target.value)
                      }
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
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
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
                      placeholder="http://"
                    />
                  </div>
                  <div className="md:col-span-2">
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
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold"
                  onClick={() => removePackageItem(index)}
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
                key={option.id || index}
                className="p-3 border-gray-200 rounded-md relative bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
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
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">
                      가격 (원)
                    </label>
                    <input
                      type="text"
                      value={(option.price || 0).toLocaleString("ko-KR")}
                      onChange={(e) =>
                        handleEstimateOptionChange(
                          index,
                          "price",
                          e.target.value
                        )
                      }
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
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
                      className="w-full p-2 border-gray-300 rounded-md bg-white text-sm"
                    >
                      <option value="false">선택</option>
                      <option value="true">필수</option>
                    </select>
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
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
                      placeholder="http://"
                    />
                  </div>
                  <div className="md:col-span-2">
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
                      className="w-full p-2 border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-semibold"
                  onClick={() => removeEstimateOption(index)}
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
              className="w-full p-2.5 border-gray-300 rounded-md text-sm"
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
              대표 사진 (1장)
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
                  alt="대표 사진"
                  className="w-full h-full object-cover rounded border-gray-300"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100"
                  onClick={handleRemoveMainPhotoDisplay}
                  aria-label="대표 사진 제거"
                >
                  ×
                </button>
              </div>
            )}
            {!mainPhotoDisplay?.preview && (
              <p className="text-xs text-gray-500 mt-1">
                대표 사진을 업로드해주세요.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              추가 사진 (최대 9장) -{" "}
              <span className="text-blue-600 font-normal">순서 변경 가능</span>
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
                  items={subPhotoItems.map((p) => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-2 rounded border-gray-200 bg-gray-50 min-h-[8rem]">
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
              <div className="mt-2 p-4 border-dashed border-gray-300 rounded text-center text-gray-500 text-sm">
                추가 사진 없음
              </div>
            )}
          </div>
        </fieldset>

        {/* --- 제출 버튼 --- */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          {error && (
            <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-md text-center">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="text-green-600 text-sm mb-4 p-3 bg-green-50 rounded-md text-center">
              {successMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className={`w-full px-6 py-3 text-base font-semibold text-white rounded-lg shadow-md transition duration-150 ease-in-out ${
              isSubmitting || isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500" // 저장 버튼 색상 변경
            }`}
          >
            {isSubmitting
              ? "수정 내용 저장 중..."
              : isLoading
              ? "정보 로딩 중..."
              : "표준 견적서 수정 완료"}
          </button>
        </div>
      </form>
    </div>
  );
}
