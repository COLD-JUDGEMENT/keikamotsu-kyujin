import { useState } from 'react'
import { regions } from './data/areas'
import './App.css'

// ダミーの件数データ（本番はFirestoreから取得）
const dummyCounts = {
  hokkaido: 1284, tohoku: 2156, kanto: 3924,
  chubu: 1893, kinki: 2341, chushikoku: 987, kyushu: 1562
}
const totalCount = Object.values(dummyCounts).reduce((a, b) => a + b, 0)

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
    <div className="kk-app">

      {/* ① サイト名ヘッダー */}
      <header className="kk-header">
        <h1 className="kk-site-name">軽貨物求人.com</h1>
        <p className="kk-site-sub">全国の軽貨物案件をエリアから探せる専門サイト</p>
      </header>

      {/* ② CarryFlowバナー */}
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

      {/* ④ ナビゲーション */}
      <nav className="kk-nav">
        <div className="kk-nav-links">
          <a href="#area">エリアから探す</a>
          <a href="#jobs">新着案件</a>
          <a href="#about">掲載について</a>
          <a href="#price">料金プラン</a>
        </div>
        <button className="kk-btn-post">案件を掲載する</button>
      </nav>

      {/* ⑤ 検索ボックス */}
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

      {/* ⑥ 日本地図＋エリア選択 */}
      <section id="area" className="kk-area-section">
        <div className="kk-section-title">
          エリアから探す
          <span className="kk-total-count">全国　求人案件 {totalCount.toLocaleString()}件</span>
        </div>

        {/* 地図（SVG簡易版） */}
        <div className="kk-map-wrap">
          <svg viewBox="0 0 500 420" className="kk-map-svg">
            {/* 北海道 */}
            <ellipse cx="390" cy="50" rx="80" ry="35" className={`kk-map-region ${selectedRegion?.id==='hokkaido'?'active':''}`} onClick={()=>handleRegionClick(regions[0])}/>
            <text x="390" y="46" textAnchor="middle" className="kk-map-label">北海道</text>
            <text x="390" y="60" textAnchor="middle" className="kk-map-count">{dummyCounts.hokkaido.toLocaleString()}件</text>
            {/* 東北 */}
            <ellipse cx="390" cy="130" rx="55" ry="45" className={`kk-map-region ${selectedRegion?.id==='tohoku'?'active':''}`} onClick={()=>handleRegionClick(regions[1])}/>
            <text x="390" y="126" textAnchor="middle" className="kk-map-label">東北</text>
            <text x="390" y="140" textAnchor="middle" className="kk-map-count">{dummyCounts.tohoku.toLocaleString()}件</text>
            {/* 関東 */}
            <ellipse cx="340" cy="210" rx="60" ry="45" className={`kk-map-region ${selectedRegion?.id==='kanto'?'active':''}`} onClick={()=>handleRegionClick(regions[2])}/>
            <text x="340" y="206" textAnchor="middle" className="kk-map-label">関東</text>
            <text x="340" y="220" textAnchor="middle" className="kk-map-count">{dummyCounts.kanto.toLocaleString()}件</text>
            {/* 中部 */}
            <ellipse cx="220" cy="220" rx="55" ry="40" className={`kk-map-region ${selectedRegion?.id==='chubu'?'active':''}`} onClick={()=>handleRegionClick(regions[3])}/>
            <text x="220" y="216" textAnchor="middle" className="kk-map-label">中部・北陸</text>
            <text x="220" y="230" textAnchor="middle" className="kk-map-count">{dummyCounts.chubu.toLocaleString()}件</text>
            {/* 近畿 */}
            <ellipse cx="180" cy="290" rx="50" ry="38" className={`kk-map-region ${selectedRegion?.id==='kinki'?'active':''}`} onClick={()=>handleRegionClick(regions[4])}/>
            <text x="180" y="286" textAnchor="middle" className="kk-map-label">近畿</text>
            <text x="180" y="300" textAnchor="middle" className="kk-map-count">{dummyCounts.kinki.toLocaleString()}件</text>
            {/* 中国四国 */}
            <ellipse cx="130" cy="345" rx="55" ry="32" className={`kk-map-region ${selectedRegion?.id==='chushikoku'?'active':''}`} onClick={()=>handleRegionClick(regions[5])}/>
            <text x="130" y="341" textAnchor="middle" className="kk-map-label">中国・四国</text>
            <text x="130" y="355" textAnchor="middle" className="kk-map-count">{dummyCounts.chushikoku.toLocaleString()}件</text>
            {/* 九州 */}
            <ellipse cx="110" cy="400" rx="50" ry="30" className={`kk-map-region ${selectedRegion?.id==='kyushu'?'active':''}`} onClick={()=>handleRegionClick(regions[6])}/>
            <text x="110" y="396" textAnchor="middle" className="kk-map-label">九州・沖縄</text>
            <text x="110" y="410" textAnchor="middle" className="kk-map-count">{dummyCounts.kyushu.toLocaleString()}件</text>
          </svg>
        </div>

        {/* 地方リスト */}
        <div className="kk-region-list">
          {regions.map(region => (
            <div
              key={region.id}
              className={`kk-region-item ${selectedRegion?.id===region.id?'active':''}`}
              onClick={() => handleRegionClick(region)}
            >
              <span className="kk-region-name">{region.name}</span>
              <span className="kk-region-count">{(dummyCounts[region.id]||0).toLocaleString()}件</span>
            </div>
          ))}
        </div>

        {/* 都道府県リスト */}
        {selectedRegion && (
          <div className="kk-pref-panel">
            <div className="kk-panel-title">{selectedRegion.name}　都道府県を選択</div>
            <div className="kk-pref-grid">
              {selectedRegion.prefectures.map(pref => (
                <div
                  key={pref.id}
                  className={`kk-pref-btn ${selectedPref?.id===pref.id?'active':''}`}
                  onClick={() => handlePrefClick(pref)}
                >
                  <div>{pref.name}</div>
                  <div className="kk-pref-count">---件</div>
                </div>
              ))}
            </div>

            {/* エリアリスト */}
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
  )
}
