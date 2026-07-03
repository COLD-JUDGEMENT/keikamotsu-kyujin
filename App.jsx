import { useState } from 'react'

// ===== 全国エリアデータ =====
const regions = [
  {
    id: "hokkaido", name: "北海道",
    prefectures: [{ id: "hokkaido", name: "北海道" }]
  },
  {
    id: "tohoku", name: "東北",
    prefectures: [
      { id: "aomori", name: "青森県" }, { id: "iwate", name: "岩手県" },
      { id: "miyagi", name: "宮城県" }, { id: "akita", name: "秋田県" },
      { id: "yamagata", name: "山形県" }, { id: "fukushima", name: "福島県" }
    ]
  },
  {
    id: "kanto", name: "関東",
    prefectures: [
      {
        id: "tokyo", name: "東京都",
        areas: [
          { id: "tokyo_jouhoku", name: "城北エリア" },
          { id: "tokyo_jouto", name: "城東エリア" },
          { id: "tokyo_jounan", name: "城南エリア" },
          { id: "tokyo_jousai", name: "城西エリア" },
          { id: "tokyo_central", name: "都心エリア" },
          { id: "tokyo_tamakita", name: "多摩北エリア" },
          { id: "tokyo_tamaminami", name: "多摩南エリア" }
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
    id: "chubu", name: "中部・北陸",
    prefectures: [
      { id: "niigata", name: "新潟県" }, { id: "toyama", name: "富山県" },
      { id: "ishikawa", name: "石川県" }, { id: "fukui", name: "福井県" },
      { id: "yamanashi", name: "山梨県" }, { id: "nagano", name: "長野県" },
      { id: "gifu", name: "岐阜県" }, { id: "shizuoka", name: "静岡県" },
      { id: "aichi", name: "愛知県" }
    ]
  },
  {
    id: "kinki", name: "近畿",
    prefectures: [
      { id: "mie", name: "三重県" }, { id: "shiga", name: "滋賀県" },
      { id: "kyoto", name: "京都府" }, { id: "osaka", name: "大阪府" },
      { id: "hyogo", name: "兵庫県" }, { id: "nara", name: "奈良県" },
      { id: "wakayama", name: "和歌山県" }
    ]
  },
  {
    id: "chushikoku", name: "中国・四国",
    prefectures: [
      { id: "tottori", name: "鳥取県" }, { id: "shimane", name: "島根県" },
      { id: "okayama", name: "岡山県" },
      {
        id: "hiroshima", name: "広島県",
        areas: [
          { id: "hiroshima_central", name: "広島市中心エリア" },
          { id: "hiroshima_north", name: "広島市北部エリア" },
          { id: "hiroshima_west", name: "広島西部エリア" },
          { id: "hiroshima_east", name: "広島東部エリア" },
          { id: "bingo", name: "備後エリア" },
          { id: "hokubu", name: "北部山間エリア" }
        ]
      },
      { id: "yamaguchi", name: "山口県" }, { id: "tokushima", name: "徳島県" },
      { id: "kagawa", name: "香川県" }, { id: "ehime", name: "愛媛県" },
      { id: "kochi", name: "高知県" }
    ]
  },
  {
    id: "kyushu", name: "九州・沖縄",
    prefectures: [
      { id: "fukuoka", name: "福岡県" }, { id: "saga", name: "佐賀県" },
      { id: "nagasaki", name: "長崎県" }, { id: "kumamoto", name: "熊本県" },
      { id: "oita", name: "大分県" }, { id: "miyazaki", name: "宮崎県" },
      { id: "kagoshima", name: "鹿児島県" }, { id: "okinawa", name: "沖縄県" }
    ]
  }
]

// ===== Firebase設定 =====
// ※本番用。Vercelの環境変数に設定済み
const firebaseConfig = {
  apiKey: "AIzaSyBCus6jKE94c7IovBgXC1UGMLhm4GYC8N8",
  authDomain: "keikamotsu-kyujin.firebaseapp.com",
  projectId: "keikamotsu-kyujin",
  storageBucket: "keikamotsu-kyujin.firebasestorage.app",
  messagingSenderId: "855755105825",
  appId: "1:855755105825:web:20a32652bb66befcce6560"
}

// ===== ダミー件数データ（本番はFirestoreから取得）=====
const dummyCounts = {
  hokkaido: 1284, tohoku: 2156, kanto: 3924,
  chubu: 1893, kinki: 2341, chushikoku: 987, kyushu: 1562
}
const totalCount = Object.values(dummyCounts).reduce((a, b) => a + b, 0)

// ===== スタイル =====
const styles = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: sans-serif; background: #f5f5f5; color: #222; }
a { text-decoration: none; color: inherit; }
.kk-app { max-width: 1100px; margin: 0 auto; }
.kk-header { background: #1a237e; color: #fff; text-align: center; padding: 20px; }
.kk-site-name { font-size: 28px; font-weight: 700; letter-spacing: 3px; }
.kk-site-sub { font-size: 12px; margin-top: 4px; opacity: 0.8; }
.kk-carryflow-bar { background: #f3f3f3; text-align: center; padding: 7px 12px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
.kk-carryflow-text { color: #555; }
.kk-qr { color: #1565c0; margin-left: 8px; font-weight: 600; cursor: pointer; }
.kk-premium-ad { background: #fff8e1; border-bottom: 2px solid #ffe082; text-align: center; padding: 12px; }
.kk-premium-label { font-size: 11px; color: #f57f17; font-weight: 600; margin-bottom: 4px; }
.kk-premium-company { font-size: 16px; font-weight: 700; color: #333; }
.kk-premium-desc { font-size: 11px; color: #777; margin-top: 4px; }
.kk-nav { background: #fff; display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1px solid #e0e0e0; }
.kk-nav-links { display: flex; gap: 20px; }
.kk-nav-links a { font-size: 13px; color: #444; }
.kk-nav-links a:hover { color: #1565c0; }
.kk-btn-post { background: #1a237e; color: #fff; border: none; border-radius: 5px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }
.kk-search-section { background: #e8eaf6; padding: 14px 16px; border-bottom: 1px solid #e0e0e0; }
.kk-search-box { display: flex; gap: 8px; max-width: 600px; margin: 0 auto; }
.kk-search-input { flex: 1; border: 1px solid #ccc; border-radius: 5px; padding: 8px 12px; font-size: 13px; outline: none; }
.kk-btn-search { background: #1565c0; color: #fff; border: none; border-radius: 5px; padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; }
.kk-area-section { background: #fff; padding: 16px; border-bottom: 1px solid #e0e0e0; }
.kk-section-title { font-size: 15px; font-weight: 700; color: #1a237e; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
.kk-total-count { font-size: 13px; color: #f57f17; font-weight: 700; }
.kk-more-link { font-size: 12px; color: #1565c0; font-weight: 400; cursor: pointer; }
.kk-map-wrap { width: 100%; margin-bottom: 16px; }
.kk-map-svg { width: 100%; max-width: 500px; display: block; margin: 0 auto; background: #e8f4f8; border: 1px solid #ddd; border-radius: 8px; }
.kk-map-region { fill: #bbdefb; stroke: #1565c0; stroke-width: 1.5; cursor: pointer; }
.kk-map-region:hover { fill: #90caf9; }
.kk-map-region.active { fill: #1565c0; }
.kk-map-label { font-size: 11px; fill: #333; font-weight: 600; pointer-events: none; }
.kk-map-count { font-size: 9px; fill: #f57f17; font-weight: 700; pointer-events: none; }
.kk-region-list { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; margin-bottom: 12px; }
.kk-region-item { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; background: #fff; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.kk-region-item:hover { border-color: #1565c0; }
.kk-region-item.active { border-color: #1565c0; background: #e3f2fd; }
.kk-region-name { font-size: 12px; font-weight: 600; color: #333; }
.kk-region-item.active .kk-region-name { color: #1565c0; }
.kk-region-count { font-size: 11px; color: #f57f17; font-weight: 700; }
.kk-pref-panel { border: 1px solid #1565c0; border-radius: 8px; padding: 12px; background: #f8fbff; margin-top: 8px; }
.kk-panel-title { font-size: 11px; color: #1565c0; font-weight: 700; margin-bottom: 8px; }
.kk-pref-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.kk-pref-btn { border: 1px solid #ddd; border-radius: 5px; padding: 6px 10px; font-size: 11px; color: #555; background: #fff; cursor: pointer; text-align: center; }
.kk-pref-btn:hover { border-color: #1565c0; color: #1565c0; }
.kk-pref-btn.active { border-color: #1565c0; background: #e3f2fd; color: #1565c0; font-weight: 700; }
.kk-pref-count { font-size: 10px; color: #f57f17; font-weight: 700; margin-top: 2px; }
.kk-area-panel { margin-top: 12px; padding-top: 12px; border-top: 1px solid #c5d8f0; }
.kk-area-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; margin-top: 6px; }
.kk-area-btn { border: 1px solid #ddd; border-radius: 5px; padding: 6px 8px; font-size: 11px; text-align: center; color: #555; background: #fff; cursor: pointer; }
.kk-area-btn:hover { border-color: #1565c0; color: #1565c0; }
.kk-area-count { font-size: 10px; color: #f57f17; font-weight: 700; margin-top: 2px; }
.kk-tag { display: inline-block; font-size: 10px; padding: 2px 7px; border-radius: 3px; font-weight: 600; }
.kk-tag-premium { background: #ede7f6; color: #512da8; }
.kk-tag-paid { background: #fff8e1; color: #f57f17; }
.kk-tag-free { background: #e8f5e9; color: #2e7d32; }
.kk-jobs-section { background: #fff; padding: 16px; border-bottom: 1px solid #e0e0e0; }
.kk-job-card { border: 1px solid #eee; border-radius: 7px; padding: 10px 14px; margin-bottom: 8px; background: #fff; cursor: pointer; }
.kk-job-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.kk-job-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.kk-job-title { font-size: 13px; font-weight: 600; color: #222; }
.kk-job-meta { font-size: 11px; color: #777; }
.kk-footer { background: #f0f0f0; text-align: center; padding: 16px; }
.kk-footer-links { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
.kk-footer-links a { font-size: 11px; color: #666; }
.kk-footer-copy { font-size: 10px; color: #999; }
@media (max-width: 600px) {
  .kk-site-name { font-size: 20px; }
  .kk-nav { flex-direction: column; gap: 8px; }
  .kk-nav-links { gap: 10px; flex-wrap: wrap; justify-content: center; }
  .kk-region-list { grid-template-columns: repeat(2,1fr); }
  .kk-area-grid { grid-template-columns: repeat(2,1fr); }
}
`

// ===== メインコンポーネント =====
export default function App() {
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [selectedPref, setSelectedPref] = useState(null)
  const [searchText, setSearchText] = useState('')

  const handleRegionClick = (region) => {
    setSelectedRegion(region)
    setSelectedPref(null)
  }

  const handlePrefClick = (pref) => {
    setSelectedPref(pref)
  }

  return (
    <>
      <style>{styles}</style>
      <div className="kk-app">

        {/* ① サイト名 */}
        <header className="kk-header">
          <h1 className="kk-site-name">軽貨物求人.com</h1>
          <p className="kk-site-sub">全国の軽貨物案件をエリアから探せる専門サイト</p>
        </header>

        {/* ② CarryFlow */}
        <div className="kk-carryflow-bar">
          <span className="kk-tag kk-tag-premium">CarryFlow</span>
          <span className="kk-carryflow-text"> 軽貨物ドライバー専用アプリ　無料ダウンロード</span>
          <span className="kk-qr">▣ QR</span>
        </div>

        {/* ③ プレミアム広告 */}
        <div className="kk-premium-ad">
          <div className="kk-premium-label">★ プレミアム広告（全国1社限定）</div>
          <div className="kk-premium-company">株式会社〇〇　軽貨物パートナー募集中</div>
          <div className="kk-premium-desc">全国対応・高単価・即日スタート可　▶ 詳しく見る</div>
        </div>

        {/* ④ ナビ */}
        <nav className="kk-nav">
          <div className="kk-nav-links">
            <a href="#area">エリアから探す</a>
            <a href="#jobs">新着案件</a>
            <a href="#about">掲載について</a>
            <a href="#price">料金プラン</a>
          </div>
          <button className="kk-btn-post">案件を掲載する</button>
        </nav>

        {/* ⑤ 検索 */}
        <div className="kk-search-section">
          <div className="kk-search-box">
            <input
              type="text"
              placeholder="都道府県・エリア・キーワードで検索..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="kk-search-input"
            />
            <button className="kk-btn-search">検索</button>
          </div>
        </div>

        {/* ⑥ エリア */}
        <section id="area" className="kk-area-section">
          <div className="kk-section-title">
            エリアから探す
            <span className="kk-total-count">全国　求人案件 {totalCount.toLocaleString()}件</span>
          </div>

          {/* 地図 */}
          <div className="kk-map-wrap">
            <svg viewBox="0 0 500 420" className="kk-map-svg">
              <ellipse cx="390" cy="50" rx="80" ry="35" className={`kk-map-region ${selectedRegion?.id==='hokkaido'?'active':''}`} onClick={()=>handleRegionClick(regions[0])}/>
              <text x="390" y="46" textAnchor="middle" className="kk-map-label">北海道</text>
              <text x="390" y="60" textAnchor="middle" className="kk-map-count">{dummyCounts.hokkaido.toLocaleString()}件</text>

              <ellipse cx="390" cy="130" rx="55" ry="45" className={`kk-map-region ${selectedRegion?.id==='tohoku'?'active':''}`} onClick={()=>handleRegionClick(regions[1])}/>
              <text x="390" y="126" textAnchor="middle" className="kk-map-label">東北</text>
              <text x="390" y="140" textAnchor="middle" className="kk-map-count">{dummyCounts.tohoku.toLocaleString()}件</text>

              <ellipse cx="340" cy="210" rx="60" ry="45" className={`kk-map-region ${selectedRegion?.id==='kanto'?'active':''}`} onClick={()=>handleRegionClick(regions[2])}/>
              <text x="340" y="206" textAnchor="middle" className="kk-map-label">関東</text>
              <text x="340" y="220" textAnchor="middle" className="kk-map-count">{dummyCounts.kanto.toLocaleString()}件</text>

              <ellipse cx="220" cy="220" rx="55" ry="40" className={`kk-map-region ${selectedRegion?.id==='chubu'?'active':''}`} onClick={()=>handleRegionClick(regions[3])}/>
              <text x="220" y="216" textAnchor="middle" className="kk-map-label">中部・北陸</text>
              <text x="220" y="230" textAnchor="middle" className="kk-map-count">{dummyCounts.chubu.toLocaleString()}件</text>

              <ellipse cx="180" cy="290" rx="50" ry="38" className={`kk-map-region ${selectedRegion?.id==='kinki'?'active':''}`} onClick={()=>handleRegionClick(regions[4])}/>
              <text x="180" y="286" textAnchor="middle" className="kk-map-label">近畿</text>
              <text x="180" y="300" textAnchor="middle" className="kk-map-count">{dummyCounts.kinki.toLocaleString()}件</text>

              <ellipse cx="130" cy="345" rx="55" ry="32" className={`kk-map-region ${selectedRegion?.id==='chushikoku'?'active':''}`} onClick={()=>handleRegionClick(regions[5])}/>
              <text x="130" y="341" textAnchor="middle" className="kk-map-label">中国・四国</text>
              <text x="130" y="355" textAnchor="middle" className="kk-map-count">{dummyCounts.chushikoku.toLocaleString()}件</text>

              <ellipse cx="110" cy="400" rx="50" ry="30" className={`kk-map-region ${selectedRegion?.id==='kyushu'?'active':''}`} onClick={()=>handleRegionClick(regions[6])}/>
              <text x="110" y="396" textAnchor="middle" className="kk-map-label">九州・沖縄</text>
              <text x="110" y="410" textAnchor="middle" className="kk-map-count">{dummyCounts.kyushu.toLocaleString()}件</text>
            </svg>
          </div>

          {/* 地方リスト */}
          <div className="kk-region-list">
            {regions.map(region => (
              <div key={region.id} className={`kk-region-item ${selectedRegion?.id===region.id?'active':''}`} onClick={()=>handleRegionClick(region)}>
                <span className="kk-region-name">{region.name}</span>
                <span className="kk-region-count">{(dummyCounts[region.id]||0).toLocaleString()}件</span>
              </div>
            ))}
          </div>

          {/* 都道府県 */}
          {selectedRegion && (
            <div className="kk-pref-panel">
              <div className="kk-panel-title">{selectedRegion.name}　都道府県を選択</div>
              <div className="kk-pref-grid">
                {selectedRegion.prefectures.map(pref => (
                  <div key={pref.id} className={`kk-pref-btn ${selectedPref?.id===pref.id?'active':''}`} onClick={()=>handlePrefClick(pref)}>
                    <div>{pref.name}</div>
                    <div className="kk-pref-count">---件</div>
                  </div>
                ))}
              </div>

              {/* エリア */}
              {selectedPref && selectedPref.areas && (
                <div className="kk-area-panel">
                  <div className="kk-panel-title">{selectedPref.name}　エリアを選択</div>
                  <div className="kk-area-grid">
                    {selectedPref.areas.map(area => (
                      <div key={area.id} className="kk-area-btn">
                        <div>{area.name}</div>
                        <div className="kk-area-count">---件</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ⑦ 新着案件 */}
        <section id="jobs" className="kk-jobs-section">
          <div className="kk-section-title">
            新着案件
            <span className="kk-more-link">もっと見る →</span>
          </div>
          {[
            { title: '城北エリア　定期委託ドライバー募集', area: '東京都北区・足立区', detail: '週5日　単価180円〜', paid: true },
            { title: '城東エリア　スポット便　即日対応可', area: '東京都江東区・墨田区', detail: 'スポット歓迎', paid: true },
            { title: '大宮エリア　医療用品配送', area: 'さいたま市大宮区', detail: '平日のみ　経験者優遇', paid: false },
          ].map((job, i) => (
            <div key={i} className="kk-job-card">
              <div className="kk-job-header">
                <span className="kk-job-title">{job.title}</span>
                <span className={`kk-tag ${job.paid?'kk-tag-paid':'kk-tag-free'}`}>{job.paid?'有料':'無料'}</span>
              </div>
              <div className="kk-job-meta">{job.area}　{job.detail}</div>
            </div>
          ))}
        </section>

        {/* フッター */}
        <footer className="kk-footer">
          <div className="kk-footer-links">
            <a href="#">掲載のお問い合わせ</a>
            <a href="#">特定商取引法に基づく表記</a>
            <a href="#">利用規約</a>
            <a href="#">プライバシーポリシー</a>
          </div>
          <div className="kk-footer-copy">© 2026 軽貨物求人.com All rights reserved.</div>
        </footer>

      </div>
    </>
  )
}
