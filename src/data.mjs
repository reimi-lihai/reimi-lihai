export const languages = [
  { code: "ja", label: "日本語", locale: "ja-JP" },
  { code: "en", label: "English", locale: "en-US" },
  { code: "zh-Hant", label: "繁體中文", locale: "zh-Hant-TW" },
  { code: "zh-Hans", label: "简体中文", locale: "zh-Hans-CN" },
  { code: "ko", label: "한국어", locale: "ko-KR" }
];

export const company = {
  legalName: "株式会社麗海",
  englishName: "REIKAI Co., Ltd.",
  address: "大阪市大正区三軒家西二丁目14番6号",
  representative: "島尾拓也",
  established: "令和8年8月18日（2026年8月18日）",
  currentBusiness: "民泊運営管理、不動産管理",
  concept: "伝統の品格と、未来の使いやすさ。",
  closingMessage: "麗海の品格を、世界と事業の未来へ。"
};

export const accommodations = [
  {
    id: "demo-minato-suite",
    demo: true,
    area: "大阪ベイエリア",
    name: {
      ja: "掲載例 水鏡スイート",
      en: "Sample Listing: Mizukagami Suite",
      "zh-Hant": "刊登範例 水鏡套房",
      "zh-Hans": "刊登示例 水镜套房",
      ko: "게시 예시 미즈카가미 스위트"
    },
    short: {
      ja: "水面の静けさをテーマにした和モダン滞在の掲載例です。",
      en: "A sample modern Japanese stay inspired by quiet waterfront light.",
      "zh-Hant": "以水面靜謐光影為主題的和風現代住宿範例。",
      "zh-Hans": "以水面静谧光影为主题的和风现代住宿示例。",
      ko: "수면의 고요한 빛을 담은 와모던 숙소 게시 예시입니다."
    },
    roomType: "suite",
    capacity: 4,
    beds: "2 beds",
    baseNightlyRate: 28000,
    cleaningFee: 7800,
    optionFee: 2200,
    minNights: 1,
    galleryTone: "aqua",
    amenities: ["smartLock", "wifi", "kitchen", "washer"]
  },
  {
    id: "demo-komorebi-house",
    demo: true,
    area: "大阪市内",
    name: {
      ja: "掲載例 木洩日ハウス",
      en: "Sample Listing: Komorebi House",
      "zh-Hant": "刊登範例 木漏日民宿",
      "zh-Hans": "刊登示例 木漏日民宿",
      ko: "게시 예시 코모레비 하우스"
    },
    short: {
      ja: "格子と木目を抽象的に取り入れた家族向け掲載例です。",
      en: "A family-friendly sample stay with lattice and wood-grain details.",
      "zh-Hant": "融入格柵與木紋意象的家庭住宿範例。",
      "zh-Hans": "融入格栅与木纹意象的家庭住宿示例。",
      ko: "격자와 나뭇결 감성을 더한 가족형 숙소 예시입니다."
    },
    roomType: "house",
    capacity: 6,
    beds: "4 beds",
    baseNightlyRate: 36000,
    cleaningFee: 9800,
    optionFee: 2800,
    minNights: 2,
    galleryTone: "wood",
    amenities: ["smartLock", "wifi", "kitchen", "projector", "washer"]
  },
  {
    id: "demo-namba-studio",
    demo: true,
    area: "なんば周辺",
    name: {
      ja: "掲載例 藍のスタジオ",
      en: "Sample Listing: Ai Studio",
      "zh-Hant": "刊登範例 藍之套房",
      "zh-Hans": "刊登示例 蓝之套房",
      ko: "게시 예시 아이 스튜디오"
    },
    short: {
      ja: "短期滞在とビジネス利用を想定したコンパクトな掲載例です。",
      en: "A compact sample stay for short visits and business travel.",
      "zh-Hant": "適合短期停留與商務用途的精簡住宿範例。",
      "zh-Hans": "适合短期停留与商务用途的精简住宿示例。",
      ko: "단기 체류와 비즈니스 이용을 고려한 컴팩트 숙소 예시입니다."
    },
    roomType: "studio",
    capacity: 2,
    beds: "1 bed",
    baseNightlyRate: 19000,
    cleaningFee: 5200,
    optionFee: 1200,
    minNights: 1,
    galleryTone: "indigo",
    amenities: ["smartLock", "wifi", "desk"]
  }
];

export const properties = [
  {
    id: "demo-taisho-building",
    demo: true,
    deal: "sale",
    area: "大阪市大正区",
    type: "building",
    layout: "一棟",
    priceLabel: "価格はお問い合わせください",
    priceValue: 0,
    minpakuConsult: true,
    managementConsult: true,
    galleryTone: "estate",
    name: {
      ja: "掲載例 大正区一棟物件",
      en: "Sample Listing: Taisho Ward Building",
      "zh-Hant": "刊登範例 大正區整棟物件",
      "zh-Hans": "刊登示例 大正区整栋物业",
      ko: "게시 예시 다이쇼구 건물"
    },
    point: {
      ja: "民泊活用と管理運営相談の掲載例です。実在物件としての募集ではありません。",
      en: "A sample for stay-operation and property-management consultation, not an active listing.",
      "zh-Hant": "民宿活用與管理營運諮詢範例，並非實際招租物件。",
      "zh-Hans": "民宿活用与管理运营咨询示例，并非实际招租物业。",
      ko: "민박 활용 및 관리 운영 상담 예시이며 실제 매물 모집이 아닙니다."
    }
  },
  {
    id: "demo-namba-residence",
    demo: true,
    deal: "rent",
    area: "なんば周辺",
    type: "residence",
    layout: "2LDK",
    priceLabel: "賃料はお問い合わせください",
    priceValue: 0,
    minpakuConsult: false,
    managementConsult: true,
    galleryTone: "tower",
    name: {
      ja: "掲載例 なんばレジデンス",
      en: "Sample Listing: Namba Residence",
      "zh-Hant": "刊登範例 難波住宅",
      "zh-Hans": "刊登示例 难波住宅",
      ko: "게시 예시 난바 레지던스"
    },
    point: {
      ja: "居住用賃貸と管理相談を想定した掲載例です。",
      en: "A sample rental residence for management consultation.",
      "zh-Hant": "以住宅租賃與管理諮詢為想定的範例。",
      "zh-Hans": "以住宅租赁与管理咨询为设定的示例。",
      ko: "주거 임대와 관리 상담을 가정한 게시 예시입니다."
    }
  },
  {
    id: "demo-bay-office",
    demo: true,
    deal: "rent",
    area: "大阪ベイエリア",
    type: "office",
    layout: "区画",
    priceLabel: "条件はお問い合わせください",
    priceValue: 0,
    minpakuConsult: false,
    managementConsult: true,
    galleryTone: "bay",
    name: {
      ja: "掲載例 ベイサイド区画",
      en: "Sample Listing: Bayside Unit",
      "zh-Hant": "刊登範例 海灣區畫",
      "zh-Hans": "刊登示例 海湾区块",
      ko: "게시 예시 베이사이드 구획"
    },
    point: {
      ja: "事業用途や滞在支援拠点の相談に向けた掲載例です。",
      en: "A sample unit for business use or stay-support consultation.",
      "zh-Hant": "面向商務用途或滯在支援據點諮詢的範例。",
      "zh-Hans": "面向商务用途或停留支援据点咨询的示例。",
      ko: "사업 용도와 체류 지원 거점 상담을 위한 예시입니다."
    }
  }
];

export const inquiryCategories = [
  "checkin",
  "smartLock",
  "facilityIssue",
  "cleaning",
  "noise",
  "bookingChange",
  "extendStay",
  "viewing",
  "realEstate",
  "other"
];

export const servicePillars = [
  "stayManagement",
  "propertyManagement",
  "inboundMedical",
  "beautyTourism",
  "residenceStatus"
];
