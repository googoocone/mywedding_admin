// src/interfaces/estimates.ts (예시 파일 경로)

// 가장 하위 레벨의 객체들부터 정의합니다.

// models/admin.py -> Admin 모델 (현재 상세 견적에 포함되지 않으므로 필요 없음)

// models/enums.py -> Enum 값들 (TypeScript에서는 Union Type으로 표현 가능)
// 백엔드 Enum 값들이 문자열로 넘어온다고 가정합니다.
type HallType = "야외" | "호텔" | "가든" | "스몰" | "하우스" | "컨벤션" | "채플";
type MoodType = "밝은" | "어두운";
type EstimateType = "standard" | "admin" | "user";
type MealCategory = "성인" | "소인" | "미취학" | "주류";
type PackageType = "스드메" | "개별"; // 스키마에는 '스드메 통합' -> '스드메' 로 변경된 것 같습니다.
type PackageItemType = "스튜디오" | "드레스" | "메이크업";


// models/company.py -> WeddingCompany 모델 정보 (Hall 객체 안에 포함됨)
export interface WeddingCompanyData {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    homepage: string | null;
    accessibility: string | null;
    lat: number | null; // 백엔드에서 Integer로 왔지만 TS에서는 Number로 표현
    lng: number | null; // 백엔드에서 Integer로 왔지만 TS에서는 Number로 표현
    ceremony_times: string | null; // 백엔드 JSON에서 string으로 넘어왔습니다. 원래 JSON 타입 필드
}

// models/halls.py -> HallPhoto 모델 정보 (Hall 객체 안에 배열로 포함됨)
export interface HallPhotoData {
    id: number;
    hall_id: number;
    url: string | null;
    order_num: number | null;
    caption: string | null;
    is_visible: boolean | null;
}

// models/halls.py -> HallInclude 모델 정보 (Hall 객체 안에 배열로 포함됨)
export interface HallIncludeData {
    id: number;
    hall_id: number;
    category: string | null;
    subcategory: string | null;
}

// models/halls.py -> Hall 모델 정보 (DetailedEstimate 객체 안에 포함됨)
export interface HallData {
    id: number;
    wedding_company_id: number;
    name: string;
    interval_minutes: number | null;
    guarantees: number | null;
    parking: number | null;
    type: HallType | null; // Enum 타입 사용
    mood: MoodType | null; // Enum 타입 사용
    wedding_company: WeddingCompanyData; // Nested WeddingCompany
    hall_photos: HallPhotoData[]; // Array of HallPhotos
    hall_includes: HallIncludeData[]; // Array of HallIncludes
}

// models/estimate.py -> MealPrice 모델 정보 (DetailedEstimate 객체 안에 배열로 포함됨)
export interface MealPriceData {
    id: number;
    estimate_id: number;
    meal_type: string | null;
    category: MealCategory | null; // Enum 타입 사용
    price: number | null;
    extra: string | null;
}

// models/estimate.py -> EstimateOption 모델 정보 (DetailedEstimate 객체 안에 배열로 포함됨)
export interface EstimateOptionData {
    id: number;
    estimate_id: number;
    name: string | null;
    price: number | null;
    is_required: boolean | null;
    description: string | null;
    reference_url: string | null;
}

// models/estimate.py -> Etc 모델 정보 (DetailedEstimate 객체 안에 배열로 포함됨)
export interface EtcData {
    id: number;
    estimate_id: number;
    content: string | null;
}

// models/package.py -> WeddingPackageItem 모델 정보 (WeddingPackage 객체 안에 배열로 포함됨)
export interface WeddingPackageItemData {
    id: number;
    wedding_package_id: number;
    type: PackageItemType | null; // Enum 타입 사용
    company_name: string | null;
    price: number | null;
    description: string | null;
    url: string | null;
}

// models/package.py -> WeddingPackage 모델 정보 (DetailedEstimate 객체 안에 배열로 포함됨)
export interface WeddingPackageData {
    id: number;
    estimate_id: number;
    type: PackageType | null; // Enum 타입 사용
    name: string | null;
    total_price: number | null;
    is_total_price: boolean | null;
    wedding_package_items: WeddingPackageItemData[]; // Array of WeddingPackageItems
}

// models/users.py -> User 모델 정보 (DetailedEstimate 객체 안에 created_by_user로 포함될 수 있음)
// 현재 백엔드 응답 JSON에는 created_by_user 객체 자체가 포함되어 있지 않고 id만 있습니다.
// 만약 User 객체 전체가 필요하다면 백엔드 쿼리 및 Pydantic 스키마 수정이 필요하며,
// 여기에 UserData 인터페이스를 정의해야 합니다.
// export interface UserData { id: string; name: string | null; /* ... etc */ }


// DetailedEstimate 모델 정보 (백엔드 응답의 각 항목에 해당)
// 이게 프론트엔드에서 'Estimate' 또는 'DetailedEstimate' 타입으로 사용될 메인 인터페이스입니다.
export interface DetailedEstimate {
    id: number; // 견적서 ID
    hall_id: number; // 홀 ID
    hall_price: number | null; // 대관료
    type: EstimateType | null; // 견적서 종류 (Enum 타입 사용)
    date: string | null; // 날짜 (ISO string 형식으로 넘어옴)
    created_by_user_id: string | null; // 작성자 ID (String UUID 등)

    // 관계된 정보들이 Nested 객체 또는 배열로 포함됩니다.
    hall: HallData; // 홀 정보 (Nested HallData)
    meal_prices: MealPriceData[]; // 식대 정보 목록 (Array of MealPriceData)
    estimate_options: EstimateOptionData[]; // 옵션 정보 목록 (Array of EstimateOptionData)
    etcs: EtcData[]; // 기타 정보 목록 (Array of EtcData)
    wedding_packages: WeddingPackageData[]; // 웨딩 패키지 목록 (Array of WeddingPackageData)

    // created_by_user?: UserData; // 만약 백엔드에서 User 객체 전체를 보낸다면 추가
}

// 백엔드 응답 전체 구조 (Optional)
// 이 인터페이스는 API 호출 결과 전체를 타입 정의할 때 유용합니다.
export interface EstimatesResponse {
    message: string;
    data: DetailedEstimate[]; // DetailedEstimate 객체들의 배열
}

// 프론트엔드 컴포넌트에서 사용할 때 이 인터페이스들을 임포트합니다.
// 예: const [estimateList, setEstimateList] = useState<DetailedEstimate[]>([]);
// 예: const [selectedEstimate, setSelectedEstimate] = useState<DetailedEstimate | null>(null);