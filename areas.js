// 全国エリアデータ構造
// 地方 → 都道府県 → エリア（市区町村括り）の3階層
// 軽貨物求人.com 全体で共通利用するマスターデータ

export const regions = [
  {
    id: "hokkaido",
    name: "北海道",
    prefectures: [
      { id: "hokkaido", name: "北海道" }
    ]
  },
  {
    id: "tohoku",
    name: "東北",
    prefectures: [
      { id: "aomori", name: "青森県" },
      { id: "iwate", name: "岩手県" },
      { id: "miyagi", name: "宮城県" },
      { id: "akita", name: "秋田県" },
      { id: "yamagata", name: "山形県" },
      { id: "fukushima", name: "福島県" }
    ]
  },
  {
    id: "kanto",
    name: "関東",
    prefectures: [
      {
        id: "tokyo", name: "東京都",
        areas: [
          { id: "tokyo_jouhoku", name: "城北エリア", cities: ["北区", "足立区", "荒川区", "板橋区", "練馬区"] },
          { id: "tokyo_jouto", name: "城東エリア", cities: ["江東区", "墨田区", "江戸川区", "葛飾区"] },
          { id: "tokyo_jounan", name: "城南エリア", cities: ["品川区", "大田区", "目黒区", "世田谷区"] },
          { id: "tokyo_jousai", name: "城西エリア", cities: ["渋谷区", "新宿区", "杉並区", "中野区"] },
          { id: "tokyo_central", name: "都心エリア", cities: ["千代田区", "中央区", "港区", "文京区", "台東区"] },
          { id: "tokyo_tamakita", name: "多摩北エリア", cities: ["立川市", "八王子市", "青梅市"] },
          { id: "tokyo_tamaminami", name: "多摩南エリア", cities: ["府中市", "調布市", "町田市"] }
        ]
      },
      { id: "kanagawa", name: "神奈川県" },
      { id: "saitama", name: "埼玉県" },
      { id: "chiba", name: "千葉県" },
      { id: "ibaraki", name: "茨城県" },
      { id: "tochigi", name: "栃木県" },
      { id: "gunma", name: "群馬県" }
    ]
  },
  {
    id: "chubu",
    name: "中部・北陸",
    prefectures: [
      { id: "niigata", name: "新潟県" },
      { id: "toyama", name: "富山県" },
      { id: "ishikawa", name: "石川県" },
      { id: "fukui", name: "福井県" },
      { id: "yamanashi", name: "山梨県" },
      { id: "nagano", name: "長野県" },
      { id: "gifu", name: "岐阜県" },
      { id: "shizuoka", name: "静岡県" },
      { id: "aichi", name: "愛知県" }
    ]
  },
  {
    id: "kinki",
    name: "近畿",
    prefectures: [
      { id: "mie", name: "三重県" },
      { id: "shiga", name: "滋賀県" },
      { id: "kyoto", name: "京都府" },
      { id: "osaka", name: "大阪府" },
      { id: "hyogo", name: "兵庫県" },
      { id: "nara", name: "奈良県" },
      { id: "wakayama", name: "和歌山県" }
    ]
  },
  {
    id: "chushikoku",
    name: "中国・四国",
    prefectures: [
      { id: "tottori", name: "鳥取県" },
      { id: "shimane", name: "島根県" },
      { id: "okayama", name: "岡山県" },
      {
        id: "hiroshima", name: "広島県",
        areas: [
          { id: "hiroshima_central", name: "広島市中心エリア", cities: ["中区", "東区", "南区", "西区"] },
          { id: "hiroshima_north", name: "広島市北部エリア", cities: ["安佐南区", "安佐北区", "安芸区", "佐伯区"] },
          { id: "hiroshima_west", name: "広島西部エリア", cities: ["廿日市市", "大竹市"] },
          { id: "hiroshima_east", name: "広島東部エリア", cities: ["東広島市", "呉市", "竹原市", "江田島市"] },
          { id: "bingo", name: "備後エリア", cities: ["福山市", "尾道市", "三原市", "府中市", "世羅町"] },
          { id: "hokubu_sankan", name: "北部山間エリア", cities: ["三次市", "庄原市", "安芸高田市", "神石高原町"] }
        ]
      },
      { id: "yamaguchi", name: "山口県" },
      { id: "tokushima", name: "徳島県" },
      { id: "kagawa", name: "香川県" },
      { id: "ehime", name: "愛媛県" },
      { id: "kochi", name: "高知県" }
    ]
  },
  {
    id: "kyushu",
    name: "九州・沖縄",
    prefectures: [
      { id: "fukuoka", name: "福岡県" },
      { id: "saga", name: "佐賀県" },
      { id: "nagasaki", name: "長崎県" },
      { id: "kumamoto", name: "熊本県" },
      { id: "oita", name: "大分県" },
      { id: "miyazaki", name: "宮崎県" },
      { id: "kagoshima", name: "鹿児島県" },
      { id: "okinawa", name: "沖縄県" }
    ]
  }
];

// 都道府県IDからエリア一覧を取得するヘルパー関数
export function getAreasByPrefId(prefId) {
  for (const region of regions) {
    const pref = region.prefectures.find(p => p.id === prefId);
    if (pref) return pref.areas || [];
  }
  return [];
}

// 都道府県IDから都道府県情報を取得
export function getPrefById(prefId) {
  for (const region of regions) {
    const pref = region.prefectures.find(p => p.id === prefId);
    if (pref) return pref;
  }
  return null;
}
