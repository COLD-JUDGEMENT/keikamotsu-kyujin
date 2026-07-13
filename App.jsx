import { useState, useEffect } from 'react'
import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, updateDoc,
} from 'firebase/firestore'

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

// ===== Firebase初期化 =====
const firebaseApp = initializeApp(firebaseConfig)
const db = getFirestore(firebaseApp)

// ===== 管理画面 暫定パスワード =====
// ⚠️【暫定措置】Firebase Authenticationを導入するまでの繋ぎ。本番公開前に必ずFirebase Authへ置き換えること。
// このパスワードはビルド後のJSファイルに平文で残るため、抑止力程度のセキュリティしかない点に注意。
const ADMIN_PASSWORD = 'natsuki0810'
const dummyCounts = {
  hokkaido: 1284, tohoku: 2156, kanto: 3924,
  chubu: 1893, kinki: 2341, chushikoku: 987, kyushu: 1562
}
const totalCount = Object.values(dummyCounts).reduce((a, b) => a + b, 0)

// ===== 都道府県SVGパスデータ（Natural Earth 10mデータより生成・パブリックドメイン） =====
const MAP_VIEWBOX = "0 0 480 610.3"
const OKI_BOX = { x: 5, y: 506.1, w: 150, h: 99.2 }
const prefecturePaths = [
  { id: "hokkaido", name: "北海道", regionId: "hokkaido", d: "M289.2,31.4 L290.7,31.6 L287.7,31.0 L289.2,31.4Z M324.6,49.2 L325.7,49.5 L322.0,50.9 L320.1,54.2 L312.7,55.1 L312.4,56.1 L313.3,56.3 L310.2,57.1 L310.4,58.3 L308.2,58.6 L306.3,57.0 L305.2,59.8 L300.0,59.5 L297.3,58.0 L289.0,61.7 L280.7,70.6 L278.5,74.7 L278.5,78.7 L276.8,82.8 L271.5,78.7 L262.1,74.9 L256.5,70.5 L249.9,67.3 L246.5,66.9 L242.5,68.1 L234.3,74.2 L229.4,68.1 L224.2,68.1 L221.3,72.1 L221.1,75.1 L225.6,78.6 L230.2,78.8 L234.3,83.4 L238.2,85.8 L234.6,87.8 L231.1,86.4 L228.9,87.0 L229.3,85.5 L228.0,85.1 L227.0,87.2 L224.1,88.5 L223.7,91.9 L220.7,93.1 L219.5,94.9 L216.5,94.2 L215.2,91.3 L218.0,85.2 L218.3,81.5 L211.7,75.7 L211.2,73.5 L212.5,71.4 L213.2,65.8 L216.3,65.3 L219.3,62.4 L220.9,63.7 L225.4,58.2 L221.9,53.2 L222.4,50.6 L224.8,49.5 L230.6,53.6 L234.7,52.8 L234.9,54.1 L237.4,54.8 L240.2,53.5 L242.5,50.8 L240.8,41.7 L241.7,39.8 L246.6,36.5 L247.0,27.8 L249.4,21.3 L248.7,14.6 L245.3,7.2 L247.0,1.6 L247.5,2.7 L250.0,2.3 L252.6,0.2 L271.9,21.5 L279.9,27.7 L287.0,30.7 L285.1,30.8 L286.0,32.4 L293.4,32.1 L294.4,32.6 L293.2,34.3 L294.1,34.6 L295.8,32.3 L298.7,36.2 L305.2,37.0 L316.6,27.1 L317.1,29.3 L311.4,40.2 L317.5,51.0 L315.2,50.1 L315.1,50.8 L319.9,52.8 L319.5,51.8 L321.1,50.3 L324.6,49.2Z M207.0,75.5 L205.1,79.9 L204.7,76.7 L207.0,75.5Z M316.0,44.4 L317.0,45.3 L315.5,46.1 L316.4,45.1 L313.9,43.9 L316.0,44.4Z M240.6,8.0 L239.2,9.7 L237.3,8.6 L237.0,7.1 L238.9,6.4 L240.6,8.0Z M235.5,1.6 L235.1,5.9 L233.8,1.3 L235.5,1.6Z M203.7,92.1 L203.2,92.8 L203.7,92.1Z" },
  { id: "aomori", name: "青森県", regionId: "tohoku", d: "M214.5,117.3 L214.5,114.7 L212.9,113.2 L216.4,109.5 L217.9,110.1 L220.1,109.2 L221.6,103.5 L222.5,104.5 L223.3,103.6 L220.2,101.3 L221.6,100.7 L222.0,98.1 L224.3,99.9 L225.9,99.0 L227.5,99.7 L228.8,107.6 L230.7,107.9 L231.7,106.9 L232.4,103.9 L236.8,107.1 L238.0,106.2 L239.7,100.6 L238.4,98.1 L237.5,97.8 L235.6,100.0 L230.0,100.8 L232.6,92.0 L239.7,96.0 L243.2,94.3 L241.8,105.7 L243.6,114.0 L247.3,116.8 L245.2,118.8 L240.2,119.0 L234.5,122.4 L233.1,121.6 L233.5,116.6 L232.0,115.8 L228.1,117.7 L225.8,117.8 L223.3,116.1 L214.5,117.3Z" },
  { id: "iwate", name: "岩手県", regionId: "tohoku", d: "M247.3,116.8 L250.2,121.4 L250.4,125.6 L252.6,128.0 L253.5,132.5 L252.6,136.2 L254.1,135.5 L254.7,137.8 L252.5,139.6 L254.5,139.5 L251.6,142.7 L253.1,142.7 L251.5,143.9 L252.4,145.0 L251.1,145.8 L252.0,146.0 L250.4,146.8 L251.7,148.0 L249.9,148.2 L250.6,149.7 L248.2,149.4 L248.0,151.5 L247.6,150.4 L243.9,150.6 L242.8,154.7 L240.3,154.6 L238.6,155.9 L236.6,154.4 L236.9,153.4 L229.9,151.4 L230.6,146.2 L228.0,141.2 L230.9,135.7 L230.4,130.7 L232.0,130.0 L231.7,123.1 L233.1,121.6 L234.5,122.4 L240.2,119.0 L245.2,118.8 L247.3,116.8Z" },
  { id: "miyagi", name: "宮城県", regionId: "tohoku", d: "M246.6,151.0 L247.2,153.7 L245.6,153.0 L244.3,155.6 L245.2,157.1 L243.2,158.1 L244.6,158.7 L243.3,160.2 L244.8,161.4 L243.4,163.3 L244.8,164.4 L243.9,164.8 L244.4,167.1 L242.6,164.5 L240.8,163.9 L238.3,164.4 L237.7,165.9 L236.0,165.0 L233.8,169.4 L233.2,175.9 L231.9,176.0 L231.5,178.1 L230.3,178.6 L228.7,178.0 L227.9,176.0 L220.6,174.1 L221.1,172.0 L224.1,169.8 L226.7,162.6 L225.7,158.8 L226.9,158.1 L227.2,155.7 L225.6,153.0 L231.0,151.5 L236.9,153.4 L237.2,155.2 L238.8,155.9 L240.3,154.6 L242.8,154.7 L243.9,150.6 L246.6,151.0Z" },
  { id: "akita", name: "秋田県", regionId: "tohoku", d: "M213.3,147.6 L216.5,138.6 L216.7,133.5 L214.9,130.0 L211.0,130.5 L209.8,127.5 L212.2,128.1 L215.1,124.3 L216.0,119.0 L214.5,117.3 L223.3,116.1 L225.5,117.7 L228.1,117.7 L231.6,115.7 L232.9,116.1 L233.8,118.7 L231.7,123.1 L232.0,130.0 L230.4,130.7 L230.9,135.7 L228.0,141.2 L230.6,146.2 L229.9,151.4 L225.8,153.2 L222.0,150.2 L213.3,147.6Z" },
  { id: "yamagata", name: "山形県", regionId: "tohoku", d: "M207.0,160.8 L211.3,154.5 L213.3,147.6 L222.0,150.2 L225.6,153.0 L227.2,155.7 L226.9,158.1 L225.7,158.8 L226.7,162.6 L224.1,169.8 L220.9,172.3 L219.8,179.2 L217.5,179.7 L208.6,176.1 L209.6,168.7 L211.9,168.3 L213.1,166.4 L210.1,164.4 L209.8,161.8 L207.0,160.8Z" },
  { id: "fukushima", name: "福島県", regionId: "tohoku", d: "M233.2,175.9 L234.9,179.6 L235.3,187.7 L233.7,197.1 L230.6,199.9 L226.4,198.0 L226.2,199.5 L224.1,201.1 L220.0,198.1 L218.9,195.0 L214.0,193.0 L203.4,198.6 L200.8,198.0 L201.1,193.1 L199.6,191.2 L200.2,186.7 L207.1,184.7 L206.7,182.2 L210.3,177.5 L214.0,177.6 L217.8,179.7 L220.5,178.6 L220.6,174.1 L227.9,176.0 L230.0,178.6 L231.5,178.1 L231.9,176.0 L233.2,175.9Z" },
  { id: "ibaraki", name: "茨城県", regionId: "kanto", d: "M230.6,199.9 L226.2,212.9 L227.8,219.1 L231.8,225.6 L226.0,222.0 L218.0,222.8 L209.6,216.5 L209.0,214.7 L215.1,210.9 L219.0,209.8 L220.6,202.8 L220.0,198.1 L224.1,201.1 L226.2,199.5 L226.4,198.0 L230.6,199.9Z" },
  { id: "tochigi", name: "栃木県", regionId: "kanto", d: "M205.0,213.2 L203.0,210.9 L205.1,206.2 L202.4,204.5 L203.4,198.6 L213.4,193.2 L217.4,193.9 L220.0,196.6 L220.6,202.8 L219.0,209.8 L214.7,211.1 L209.9,214.7 L205.0,213.2Z" },
  { id: "gunma", name: "群馬県", regionId: "kanto", d: "M198.4,195.5 L200.9,198.1 L203.4,198.6 L202.4,204.5 L205.1,206.2 L203.1,211.1 L205.0,213.2 L208.1,213.6 L209.4,215.9 L198.7,213.2 L197.3,216.2 L191.0,220.1 L188.5,215.9 L189.4,210.2 L185.5,209.8 L185.4,206.3 L187.3,203.5 L194.6,200.4 L196.0,197.1 L198.4,195.5Z" },
  { id: "saitama", name: "埼玉県", regionId: "kanto", d: "M198.8,213.2 L209.4,215.9 L212.9,221.7 L213.0,224.5 L203.9,225.1 L196.9,222.2 L195.2,223.2 L191.3,221.8 L191.6,219.1 L197.3,216.2 L198.8,213.2Z" },
  { id: "chiba", name: "千葉県", regionId: "kanto", d: "M231.8,225.5 L231.8,226.6 L228.1,226.6 L224.7,229.4 L222.8,233.7 L223.0,237.9 L221.9,239.2 L218.1,239.6 L214.2,244.6 L212.6,244.8 L211.0,243.5 L213.1,242.5 L212.1,238.8 L213.0,236.8 L211.4,235.1 L213.5,234.1 L213.9,232.4 L217.5,229.4 L215.2,227.0 L213.0,227.9 L213.1,222.4 L210.9,217.6 L218.0,222.8 L226.0,222.0 L231.8,225.5Z" },
  { id: "tokyo", name: "東京都", regionId: "kanto", d: "M213.0,227.9 L211.6,228.5 L211.1,227.4 L211.5,230.7 L206.8,228.3 L205.2,228.7 L205.4,231.2 L204.2,229.6 L197.3,226.4 L195.2,223.2 L196.9,222.2 L203.9,225.1 L211.9,224.2 L213.0,224.5 L213.0,227.9Z M241.2,477.8 L239.9,479.2 L240.1,477.8 L241.2,477.8Z M257.0,435.0 L255.5,433.2 L257.0,435.0Z M257.0,424.7 L257.8,424.6 L257.5,425.9 L257.0,424.7Z M211.6,285.4 L213.2,286.5 L212.4,287.6 L210.6,285.5 L211.6,285.4Z M205.9,264.1 L207.2,262.9 L207.3,264.2 L205.9,264.1Z M201.8,256.4 L202.3,255.9 L201.7,258.1 L201.8,256.4Z M204.6,247.5 L205.0,249.9 L203.3,248.9 L203.4,247.1 L204.6,247.5Z M239.9,463.3 L239.7,462.5 L239.9,463.3Z M256.9,423.5 L257.0,422.5 L256.9,423.5Z M208.4,268.1 L207.6,268.7 L208.4,268.1Z" },
  { id: "kanagawa", name: "神奈川県", regionId: "kanto", d: "M211.5,230.7 L208.8,232.0 L209.6,232.5 L208.7,233.2 L208.9,235.6 L210.7,236.7 L209.2,238.0 L209.4,239.3 L208.3,239.4 L208.4,237.4 L206.9,235.4 L204.5,235.1 L200.1,236.4 L199.6,239.3 L197.6,239.5 L196.1,237.7 L196.4,233.7 L194.8,233.7 L198.4,230.6 L198.9,227.4 L204.2,229.6 L205.4,231.2 L205.2,228.7 L206.6,228.3 L211.5,230.7Z" },
  { id: "niigata", name: "新潟県", regionId: "chubu", d: "M170.4,196.9 L179.6,192.4 L182.4,192.1 L188.7,187.1 L194.0,177.3 L204.4,170.3 L207.0,160.8 L209.9,161.9 L209.9,164.1 L212.6,165.7 L213.0,167.2 L209.6,168.7 L208.3,175.4 L210.3,177.5 L206.7,182.2 L207.1,184.7 L200.2,186.7 L199.6,191.2 L201.1,193.1 L200.7,197.6 L198.2,195.5 L196.0,197.1 L194.6,200.4 L190.6,202.6 L190.2,199.8 L187.6,196.0 L184.6,196.9 L182.7,199.8 L178.6,200.8 L177.5,198.7 L175.3,198.2 L172.7,201.5 L172.0,198.4 L170.4,196.9Z M186.4,171.7 L188.6,171.6 L187.2,175.5 L181.9,177.9 L184.2,174.1 L182.4,173.8 L182.5,171.2 L187.5,165.9 L186.4,171.7Z" },
  { id: "toyama", name: "富山県", regionId: "chubu", d: "M159.7,197.4 L158.9,200.1 L161.8,201.9 L165.1,201.8 L168.3,197.4 L170.4,196.9 L171.8,198.1 L172.6,205.1 L169.5,210.7 L163.8,209.0 L161.3,209.6 L158.0,213.1 L156.9,211.6 L154.5,212.7 L154.6,202.8 L156.8,198.1 L159.7,197.4Z" },
  { id: "ishikawa", name: "石川県", regionId: "chubu", d: "M144.2,212.8 L148.1,209.4 L153.0,202.6 L154.4,196.8 L153.7,193.4 L152.6,192.9 L154.1,188.1 L165.3,184.4 L165.5,186.1 L163.6,186.5 L163.7,189.1 L160.9,189.8 L159.1,192.1 L157.9,191.0 L156.3,193.8 L156.2,194.6 L158.4,195.3 L159.6,194.0 L159.9,197.1 L156.8,198.1 L154.6,202.8 L154.2,209.7 L155.4,214.0 L153.5,217.7 L146.0,215.6 L144.2,212.8Z M159.7,192.8 L157.8,194.1 L157.0,193.0 L159.7,192.8Z" },
  { id: "fukui", name: "福井県", regionId: "chubu", d: "M130.1,229.9 L131.0,231.1 L133.3,229.9 L132.8,231.2 L135.0,231.0 L134.4,229.5 L136.8,230.1 L136.4,227.6 L139.4,228.0 L139.1,225.7 L140.3,224.8 L141.2,227.2 L141.8,224.6 L139.1,220.0 L142.3,213.6 L144.2,212.8 L146.0,215.6 L153.5,217.7 L153.1,220.7 L155.1,222.9 L154.4,224.2 L149.1,225.4 L146.0,224.9 L144.8,227.6 L142.3,227.2 L142.7,229.3 L141.4,230.6 L138.5,231.0 L137.6,233.7 L134.0,234.8 L131.2,234.1 L129.5,232.0 L130.1,229.9Z" },
  { id: "yamanashi", name: "山梨県", regionId: "chubu", d: "M184.5,220.4 L189.5,222.8 L191.3,221.8 L195.2,223.2 L198.9,227.4 L198.4,230.6 L194.8,233.7 L190.9,234.4 L188.0,232.8 L187.4,237.9 L186.4,238.8 L185.0,238.1 L184.2,235.7 L182.2,235.5 L182.3,230.5 L180.9,226.3 L181.8,222.9 L183.2,222.6 L184.5,220.4Z" },
  { id: "nagano", name: "長野県", regionId: "chubu", d: "M190.6,202.6 L187.3,203.5 L184.9,209.1 L186.0,210.2 L189.4,210.2 L188.5,215.9 L191.3,221.8 L189.5,222.8 L184.3,220.5 L181.1,224.3 L181.4,228.0 L179.9,234.2 L174.1,238.0 L169.5,238.0 L170.1,231.6 L167.2,225.5 L164.9,224.0 L169.7,218.7 L169.0,216.7 L170.6,212.1 L169.5,210.7 L172.4,205.8 L172.7,201.5 L175.3,198.2 L177.5,198.7 L178.6,200.8 L182.7,199.8 L184.6,196.9 L187.6,196.0 L190.2,199.8 L190.6,202.6Z" },
  { id: "gifu", name: "岐阜県", regionId: "chubu", d: "M164.0,209.0 L169.5,210.7 L170.6,212.1 L169.0,216.7 L169.4,219.4 L164.9,224.0 L167.2,225.5 L169.9,231.0 L170.3,233.6 L169.2,236.2 L166.8,237.5 L164.1,236.2 L162.0,236.9 L157.7,233.6 L154.3,234.4 L152.6,239.3 L149.7,237.1 L147.5,237.8 L147.4,232.0 L144.8,227.6 L145.8,225.1 L154.2,224.4 L155.1,222.9 L153.1,220.4 L155.4,214.0 L154.5,212.7 L156.9,211.6 L158.0,213.1 L161.3,209.6 L164.0,209.0Z" },
  { id: "shizuoka", name: "静岡県", regionId: "chubu", d: "M198.4,239.7 L199.3,245.4 L196.6,248.6 L196.5,250.5 L193.5,251.8 L191.8,249.2 L192.1,242.9 L192.6,241.8 L194.9,241.7 L192.9,239.6 L190.9,239.2 L188.2,240.2 L187.5,242.9 L184.4,244.7 L181.8,249.1 L182.1,251.8 L177.1,250.1 L173.8,250.8 L167.7,250.0 L168.2,246.6 L170.3,245.5 L174.1,238.0 L180.1,233.9 L181.4,228.0 L182.2,235.5 L184.2,235.7 L185.9,238.8 L187.4,237.9 L188.3,232.8 L190.9,234.4 L196.2,233.5 L196.1,237.7 L198.4,239.7Z" },
  { id: "aichi", name: "愛知県", regionId: "chubu", d: "M167.7,250.0 L159.1,252.2 L160.2,250.2 L160.9,251.1 L165.3,248.8 L164.1,246.9 L162.5,246.9 L162.1,247.9 L159.2,247.4 L158.0,246.3 L158.4,244.2 L157.2,247.6 L158.3,249.4 L155.9,248.2 L155.5,243.5 L156.7,240.4 L154.6,242.0 L152.6,239.3 L154.3,234.4 L157.9,233.6 L162.0,236.9 L164.1,236.2 L166.8,237.5 L169.2,236.2 L169.7,238.1 L174.1,238.0 L170.3,245.5 L168.2,246.6 L167.7,250.0Z M155.0,245.3 L155.2,246.2 L155.0,245.3Z" },
  { id: "mie", name: "三重県", regionId: "kinki", d: "M154.1,241.8 L152.4,242.8 L149.7,249.8 L150.3,251.6 L157.4,255.7 L156.5,257.0 L156.9,259.3 L154.9,259.7 L155.9,258.4 L153.6,258.8 L153.3,257.8 L146.3,261.3 L145.8,263.3 L144.0,263.8 L145.1,266.2 L144.3,265.7 L144.2,266.9 L141.9,268.0 L139.8,272.7 L137.0,269.2 L140.2,265.4 L141.8,265.2 L142.2,259.9 L141.2,256.8 L143.9,254.6 L141.0,252.5 L141.3,250.4 L140.0,247.7 L142.0,245.4 L146.8,244.6 L148.3,239.4 L147.5,237.8 L150.1,237.3 L154.1,241.8Z M156.7,253.3 L156.0,253.6 L156.7,253.3Z" },
  { id: "shiga", name: "滋賀県", regionId: "kinki", d: "M144.8,227.6 L147.4,232.0 L147.0,237.1 L148.3,239.2 L147.7,242.9 L146.4,244.9 L142.0,245.4 L140.0,247.7 L137.2,245.2 L136.7,236.7 L135.1,234.7 L137.6,233.7 L138.6,230.9 L139.5,231.4 L142.5,229.6 L142.3,227.2 L144.8,227.6Z" },
  { id: "kyoto", name: "京都府", regionId: "kinki", d: "M118.4,227.3 L119.6,227.7 L125.3,224.7 L126.8,227.0 L124.6,229.9 L125.7,228.8 L125.5,230.0 L127.4,230.7 L127.0,232.1 L128.6,231.3 L127.4,230.1 L129.8,228.5 L129.5,232.0 L130.8,233.8 L135.1,234.7 L136.6,236.4 L137.2,245.2 L139.7,246.7 L140.5,249.3 L135.2,248.8 L133.0,244.5 L131.9,243.6 L130.5,244.2 L127.5,242.1 L128.4,240.1 L124.8,238.5 L123.9,236.8 L119.8,235.7 L119.7,233.7 L121.6,233.8 L121.9,231.3 L119.3,230.6 L118.4,227.3Z" },
  { id: "osaka", name: "大阪府", regionId: "kinki", d: "M122.6,258.6 L125.9,256.8 L128.7,253.0 L129.3,244.7 L127.9,242.5 L131.2,244.5 L131.9,243.6 L134.5,247.4 L132.8,252.7 L133.5,256.9 L124.6,259.2 L122.6,258.6Z M124.9,255.6 L125.9,255.5 L124.9,255.6Z" },
  { id: "hyogo", name: "兵庫県", regionId: "kinki", d: "M109.0,228.6 L112.3,227.0 L117.2,227.1 L118.4,227.3 L119.3,230.6 L121.7,230.6 L121.9,233.3 L119.7,233.7 L119.5,235.3 L122.5,237.1 L123.9,236.8 L124.8,238.5 L128.4,240.1 L127.4,241.9 L129.3,244.7 L129.2,249.2 L125.8,249.3 L125.6,250.5 L124.5,249.9 L121.9,251.1 L115.3,247.6 L111.3,247.4 L107.9,249.2 L107.1,242.4 L109.6,239.2 L109.6,237.2 L110.8,237.3 L111.8,235.8 L109.0,228.6Z M121.1,251.5 L121.6,252.2 L119.0,256.9 L120.2,259.3 L115.9,261.1 L114.5,258.9 L115.0,257.9 L121.1,251.5Z" },
  { id: "nara", name: "奈良県", regionId: "kinki", d: "M140.6,249.0 L141.0,252.5 L143.9,254.3 L141.2,256.8 L142.2,259.9 L141.8,265.2 L140.2,265.4 L137.0,269.2 L136.1,268.3 L132.7,268.8 L131.3,264.0 L134.4,260.6 L132.8,253.0 L133.6,249.9 L134.4,248.0 L136.7,249.4 L140.6,249.0Z" },
  { id: "wakayama", name: "和歌山県", regionId: "kinki", d: "M139.8,272.7 L139.2,274.9 L135.4,278.6 L135.5,277.4 L128.7,275.3 L127.2,273.1 L128.4,272.1 L123.3,268.0 L122.1,268.3 L122.4,266.0 L124.1,264.9 L122.8,263.9 L123.3,262.3 L124.6,262.0 L122.6,258.6 L124.6,259.2 L133.2,256.9 L134.4,260.6 L131.4,263.6 L132.4,268.4 L136.5,268.4 L139.8,272.7Z" },
  { id: "tottori", name: "鳥取県", regionId: "chushikoku", d: "M88.1,230.1 L90.8,232.0 L93.1,230.4 L102.8,230.5 L109.0,228.6 L111.8,235.8 L110.6,237.4 L105.4,238.7 L104.2,236.4 L101.9,235.0 L98.8,236.9 L94.7,235.0 L92.7,238.4 L90.7,238.8 L90.0,240.3 L88.2,241.3 L85.6,240.9 L86.3,237.7 L88.9,235.9 L89.3,232.8 L87.0,230.6 L88.1,230.1Z" },
  { id: "shimane", name: "島根県", regionId: "chushikoku", d: "M85.5,216.9 L84.7,218.9 L85.5,216.9Z M84.6,216.5 L83.9,218.2 L82.2,218.0 L84.6,216.5Z M58.1,250.0 L61.6,249.0 L72.0,238.4 L76.4,235.7 L76.3,232.3 L82.6,230.5 L84.9,228.6 L86.1,229.5 L89.4,229.3 L87.0,230.5 L89.3,233.1 L88.9,235.9 L86.3,237.7 L85.6,240.9 L80.1,240.9 L76.4,244.9 L76.9,246.2 L68.8,247.6 L67.0,249.2 L63.3,258.4 L59.8,258.0 L59.9,255.9 L58.2,255.2 L58.1,250.0Z M83.4,219.1 L84.7,219.6 L83.4,219.1Z M90.1,213.1 L89.4,215.8 L86.8,214.7 L86.9,213.0 L88.7,211.5 L90.1,213.1Z" },
  { id: "okayama", name: "岡山県", regionId: "chushikoku", d: "M107.9,249.2 L106.0,248.7 L107.4,249.4 L104.2,252.0 L100.9,252.0 L103.0,252.1 L100.9,255.1 L98.2,255.3 L96.9,253.3 L92.1,255.7 L93.1,254.4 L91.6,254.6 L88.2,241.3 L90.7,238.8 L92.7,238.4 L94.7,235.0 L98.5,236.9 L101.9,235.0 L104.2,236.4 L105.4,238.7 L109.6,237.2 L109.6,239.2 L107.1,242.4 L107.9,249.2Z" },
  { id: "hiroshima", name: "広島県", regionId: "chushikoku", d: "M91.6,254.6 L88.5,258.1 L89.1,257.1 L87.9,255.7 L86.6,257.6 L87.0,258.8 L85.0,259.7 L84.6,258.2 L86.4,257.3 L85.0,256.5 L84.3,257.8 L80.1,258.3 L78.9,260.1 L74.8,261.1 L74.2,257.5 L71.9,257.0 L68.5,260.0 L68.7,261.1 L66.7,259.8 L65.1,254.1 L67.0,249.2 L68.8,247.6 L76.9,246.2 L76.4,244.9 L80.1,240.9 L83.1,240.6 L88.2,241.3 L91.6,254.6Z M74.8,263.9 L72.9,263.5 L74.3,261.4 L74.8,263.9Z M78.2,261.0 L78.3,261.8 L77.3,261.1 L78.2,261.0Z M81.7,259.1 L80.6,260.7 L81.7,259.1Z M70.7,258.5 L69.3,259.9 L70.7,258.5Z" },
  { id: "yamaguchi", name: "山口県", regionId: "chushikoku", d: "M68.8,261.1 L68.3,265.7 L66.8,266.9 L67.3,269.1 L65.1,270.7 L66.2,268.4 L61.5,265.5 L60.1,266.2 L61.0,265.0 L59.4,264.2 L56.6,264.6 L56.3,265.8 L54.5,264.8 L53.7,266.0 L52.7,264.6 L50.5,267.2 L48.7,267.1 L46.0,264.4 L43.8,267.5 L43.1,266.9 L43.8,265.2 L42.8,262.9 L43.9,261.1 L42.9,259.1 L43.5,257.3 L46.0,256.7 L44.4,255.8 L47.9,256.0 L48.6,257.0 L48.6,255.6 L50.1,255.4 L50.7,256.1 L49.7,255.9 L49.3,257.0 L53.2,255.7 L57.0,250.2 L58.2,250.1 L58.2,255.2 L59.9,255.9 L60.0,258.3 L63.3,258.4 L65.2,254.9 L66.7,259.8 L68.8,261.1Z M68.9,270.3 L69.5,270.7 L67.8,270.6 L68.9,270.3Z M68.7,268.5 L67.8,267.3 L68.6,266.6 L70.4,267.9 L73.2,266.9 L71.4,269.1 L68.7,268.5Z" },
  { id: "tokushima", name: "徳島県", regionId: "chushikoku", d: "M110.5,260.7 L114.3,260.0 L113.4,265.3 L115.4,266.9 L114.3,268.9 L116.3,269.3 L109.2,273.9 L107.7,276.3 L105.7,275.8 L105.1,273.4 L103.2,272.9 L102.6,270.0 L100.3,270.5 L95.4,268.8 L95.7,265.5 L97.5,264.1 L100.2,263.2 L101.8,263.8 L106.3,261.7 L109.8,261.9 L110.5,260.7Z" },
  { id: "kagawa", name: "香川県", regionId: "chushikoku", d: "M94.4,264.9 L95.4,261.6 L93.7,259.5 L96.5,260.2 L101.1,256.8 L103.6,257.5 L104.8,256.5 L105.2,258.0 L106.2,257.3 L110.5,260.7 L109.8,261.9 L106.3,261.7 L101.8,263.8 L98.9,263.4 L95.7,265.5 L94.4,264.9Z M109.0,252.7 L108.7,255.6 L108.2,254.7 L106.7,255.9 L106.7,254.8 L105.3,254.8 L105.4,253.5 L109.0,252.7Z M96.7,256.4 L96.5,257.4 L96.7,256.4Z M103.0,254.6 L104.1,254.2 L103.0,254.6Z" },
  { id: "ehime", name: "愛媛県", regionId: "chushikoku", d: "M76.4,290.6 L74.8,290.0 L73.8,291.0 L73.2,287.6 L71.5,288.1 L72.0,286.9 L73.2,287.3 L73.5,285.6 L71.7,283.8 L73.5,284.6 L74.7,283.3 L73.4,282.2 L74.2,281.3 L71.4,281.2 L72.2,278.3 L70.1,277.8 L66.8,280.2 L64.5,280.5 L77.1,272.0 L78.8,265.6 L81.7,263.9 L81.2,262.9 L82.1,262.2 L86.0,267.1 L89.3,265.7 L92.9,266.3 L95.4,265.2 L95.4,268.8 L86.4,270.9 L83.2,277.6 L79.6,278.3 L81.0,281.3 L77.2,285.7 L75.9,285.2 L77.1,289.4 L76.4,290.6Z M83.2,260.7 L82.3,260.9 L83.8,258.7 L84.2,260.4 L83.2,260.7Z M76.4,265.2 L75.4,266.5 L76.4,265.2Z M85.0,261.5 L83.5,262.8 L83.8,261.1 L85.0,261.5Z" },
  { id: "kochi", name: "高知県", regionId: "chushikoku", d: "M107.7,276.3 L105.4,283.1 L100.7,277.2 L97.2,276.2 L92.0,278.1 L91.5,279.3 L88.3,280.5 L87.5,284.9 L84.9,288.1 L83.5,288.0 L82.3,292.8 L83.7,295.0 L81.6,293.7 L79.2,294.5 L77.7,293.4 L76.1,294.3 L77.7,290.6 L76.4,290.6 L77.1,289.4 L75.9,285.2 L77.2,285.7 L80.9,281.6 L79.6,278.3 L83.2,277.6 L86.4,270.9 L93.8,268.9 L100.3,270.5 L102.4,269.9 L103.2,272.9 L105.1,273.4 L105.7,275.8 L107.7,276.3Z M74.9,294.5 L74.7,295.4 L74.9,294.5Z" },
  { id: "fukuoka", name: "福岡県", regionId: "kyushu", d: "M27.1,278.0 L29.6,276.2 L28.2,275.3 L30.4,273.2 L32.0,275.3 L33.9,274.6 L34.0,273.1 L33.1,273.8 L31.9,272.8 L34.1,272.7 L35.7,268.8 L39.6,266.9 L43.7,268.0 L45.5,266.3 L44.6,269.7 L45.5,269.8 L46.9,273.9 L49.2,274.4 L48.2,277.1 L45.3,277.0 L43.2,278.7 L42.2,286.7 L39.4,285.3 L34.6,289.0 L33.0,284.4 L36.5,280.8 L36.3,278.8 L34.3,279.6 L31.7,277.8 L27.1,278.0Z" },
  { id: "saga", name: "佐賀県", regionId: "kyushu", d: "M23.0,280.9 L23.7,282.1 L24.0,279.4 L22.4,278.1 L23.0,277.4 L23.9,278.5 L23.7,275.8 L25.4,276.3 L26.3,278.2 L31.7,277.8 L34.3,279.6 L36.3,278.8 L36.6,279.9 L33.5,283.3 L33.1,285.3 L31.0,284.2 L28.9,285.8 L30.3,289.8 L27.6,289.2 L25.0,287.0 L24.9,285.2 L21.9,282.4 L23.0,280.9Z" },
  { id: "nagasaki", name: "長崎県", regionId: "kyushu", d: "M30.3,289.8 L28.5,291.4 L29.4,292.2 L32.9,291.8 L33.6,293.6 L32.9,296.2 L29.6,297.9 L28.9,295.8 L30.4,294.3 L28.2,293.3 L25.5,294.1 L24.5,296.3 L21.6,298.5 L23.8,294.9 L19.6,290.2 L20.4,286.4 L21.9,287.4 L21.6,288.7 L23.1,289.0 L22.5,290.6 L23.5,292.3 L24.3,291.4 L26.5,292.1 L25.2,290.2 L25.4,288.2 L24.2,287.1 L21.9,287.2 L21.0,284.8 L20.2,286.2 L19.8,284.0 L18.2,283.7 L18.5,280.0 L20.3,279.4 L20.8,280.4 L22.8,280.5 L21.9,282.4 L24.9,285.2 L25.0,287.0 L27.6,289.2 L30.3,289.8Z M5.3,296.1 L5.7,296.8 L3.3,296.8 L3.3,298.4 L0.0,297.4 L1.1,293.5 L2.0,294.4 L3.9,293.2 L5.3,296.1Z M9.4,288.8 L11.0,288.9 L8.8,292.7 L7.2,289.5 L9.1,288.0 L9.6,284.7 L9.4,288.8Z M18.1,279.1 L16.9,282.9 L14.0,284.4 L14.2,283.6 L15.2,284.1 L15.9,280.5 L18.1,279.1Z M22.2,270.7 L21.2,272.5 L20.0,271.4 L20.6,268.5 L22.1,269.1 L22.2,270.7Z M13.5,259.0 L12.8,262.5 L10.8,263.0 L11.5,257.9 L13.5,259.0Z M16.1,251.2 L14.4,256.2 L15.3,257.4 L13.7,258.5 L13.4,256.6 L13.0,257.6 L11.9,257.3 L13.4,254.9 L13.0,252.4 L13.7,250.6 L16.3,249.3 L16.1,251.2Z M5.7,292.7 L4.5,293.7 L4.6,292.3 L5.7,292.7Z M6.7,291.4 L6.4,293.0 L5.3,291.7 L6.7,291.4Z M8.1,290.8 L8.0,292.0 L7.1,291.7 L7.3,290.2 L8.1,290.8Z M10.1,281.6 L10.0,282.8 L9.0,282.6 L10.1,281.6Z M18.1,277.2 L17.1,277.6 L18.1,277.2Z" },
  { id: "kumamoto", name: "熊本県", regionId: "kyushu", d: "M33.0,307.9 L35.3,303.6 L36.2,303.8 L37.0,300.0 L37.8,299.9 L37.1,299.0 L39.1,296.6 L34.9,297.3 L38.3,295.2 L37.7,292.8 L34.6,289.0 L39.4,285.3 L45.2,287.8 L44.9,284.8 L47.1,284.7 L51.5,292.6 L49.8,293.5 L45.8,299.3 L46.8,308.0 L39.9,309.5 L37.6,307.8 L34.5,309.0 L33.0,307.9Z M29.4,306.9 L29.6,309.0 L28.6,307.5 L29.4,306.9Z M34.2,299.8 L35.3,299.8 L33.9,302.4 L31.0,302.5 L30.7,301.0 L34.2,299.8Z M29.5,299.0 L30.4,303.6 L26.4,307.2 L26.6,305.8 L25.7,305.8 L27.7,304.5 L26.1,303.9 L26.5,299.3 L29.5,299.0Z M31.1,304.6 L30.5,305.8 L31.1,304.6Z M34.9,297.8 L34.5,299.2 L34.0,297.9 L34.9,297.8Z" },
  { id: "oita", name: "大分県", regionId: "kyushu", d: "M49.2,274.4 L53.3,275.1 L56.2,272.8 L58.4,273.8 L59.4,276.1 L58.7,279.1 L57.5,278.9 L56.3,280.6 L54.9,280.2 L55.0,282.2 L62.4,282.4 L60.7,285.6 L62.6,285.7 L62.0,286.8 L63.8,287.2 L64.2,286.4 L64.5,287.4 L62.9,287.5 L62.5,288.9 L65.9,290.1 L63.9,291.1 L63.4,292.5 L64.2,292.9 L62.1,293.5 L61.9,294.7 L59.8,292.6 L55.6,294.5 L54.4,292.8 L51.9,292.9 L46.5,284.4 L44.9,284.8 L45.2,287.8 L42.2,286.7 L43.2,278.7 L45.3,277.0 L48.2,277.1 L49.2,274.4Z" },
  { id: "miyazaki", name: "宮崎県", regionId: "kyushu", d: "M61.9,294.7 L58.7,298.2 L58.3,299.5 L59.3,300.3 L57.8,300.6 L58.4,301.9 L56.6,304.6 L53.8,314.4 L54.8,316.3 L52.3,325.0 L51.6,326.2 L50.1,325.7 L48.2,323.8 L48.9,321.1 L46.1,319.8 L43.4,316.6 L43.0,314.2 L39.7,310.0 L46.8,308.0 L47.0,304.1 L45.4,300.7 L50.5,292.9 L54.1,292.7 L55.6,294.5 L59.8,292.6 L61.9,294.7Z" },
  { id: "kagoshima", name: "鹿児島県", regionId: "kyushu", d: "M22.4,316.2 L22.7,317.5 L20.7,320.3 L19.9,319.4 L22.4,316.2Z M48.2,323.8 L46.4,324.5 L45.6,326.3 L47.9,328.2 L45.5,329.5 L44.3,331.8 L38.9,334.6 L41.5,326.7 L39.6,322.1 L37.6,321.1 L39.5,320.4 L40.6,321.7 L41.8,319.6 L39.4,317.9 L38.1,318.9 L36.2,324.2 L37.3,327.4 L38.9,328.4 L38.6,330.3 L37.6,331.1 L35.0,328.9 L30.7,329.0 L30.2,326.5 L28.7,325.2 L30.8,325.8 L32.0,324.4 L32.8,320.2 L29.7,316.4 L30.9,315.7 L29.9,309.4 L33.0,307.9 L34.2,309.0 L38.0,308.0 L43.0,314.2 L43.4,316.6 L46.1,319.8 L48.9,321.1 L48.2,323.8Z M21.1,365.6 L21.2,366.8 L21.1,365.6Z M24.5,360.6 L25.0,361.8 L23.4,361.1 L24.5,360.6Z M39.2,349.0 L37.9,351.9 L35.7,352.5 L34.7,352.2 L33.6,348.6 L35.9,346.9 L39.2,349.0Z M46.4,338.3 L46.5,343.6 L44.7,346.6 L44.7,349.1 L42.9,349.8 L42.5,347.0 L44.1,345.2 L44.2,342.2 L46.4,338.3Z M30.6,346.8 L31.4,347.7 L30.5,348.0 L29.1,346.4 L30.6,346.8Z M25.4,358.5 L24.7,357.7 L25.4,358.5Z M25.4,338.2 L24.8,338.8 L25.4,338.2Z M25.2,314.6 L24.4,315.9 L23.1,315.2 L23.5,314.3 L25.2,314.6Z" },
  { id: "okinawa", name: "沖縄県", regionId: "kyushu", d: "M24.6,597.8 L26.6,598.2 L25.6,600.3 L22.4,599.8 L23.9,597.3 L24.6,597.8Z M11.1,596.2 L11.0,596.9 L10.0,596.8 L11.1,596.2Z M33.2,594.2 L31.8,598.3 L30.1,598.7 L29.0,597.0 L29.9,596.3 L31.3,596.7 L33.2,594.2Z M50.9,590.5 L52.0,591.2 L48.7,591.4 L48.7,588.6 L50.9,590.5Z M148.8,570.1 L148.7,571.2 L148.1,571.0 L148.8,570.1Z M74.6,561.3 L74.3,562.2 L72.7,560.9 L73.6,560.5 L74.6,561.3Z M100.1,553.0 L99.6,554.8 L97.1,556.3 L96.8,557.5 L95.4,557.6 L93.5,559.5 L92.0,559.6 L93.1,562.0 L91.6,561.9 L90.6,563.8 L91.5,564.3 L91.1,565.2 L88.7,566.2 L88.4,563.8 L90.2,561.8 L89.8,559.8 L93.8,557.3 L92.7,556.5 L92.4,554.9 L94.3,554.9 L94.5,556.0 L96.3,555.3 L98.7,551.3 L100.1,553.0Z M106.2,540.7 L104.7,542.4 L103.3,542.3 L103.5,541.4 L106.2,540.7Z M111.0,534.1 L111.6,535.1 L110.0,536.4 L109.3,535.4 L109.5,532.5 L110.6,532.5 L111.0,534.1Z M116.1,528.3 L117.0,528.9 L114.8,528.7 L114.2,527.0 L115.6,527.3 L116.1,528.3Z M128.3,523.6 L127.8,525.1 L126.4,525.0 L128.3,523.6Z M123.0,522.0 L123.1,522.6 L121.5,523.1 L119.5,525.2 L118.6,525.1 L118.2,525.9 L119.0,526.5 L117.0,527.6 L117.4,528.3 L115.6,526.3 L113.6,525.9 L115.7,525.8 L116.0,525.3 L115.0,524.9 L115.6,524.4 L119.1,522.7 L119.8,523.2 L121.6,521.6 L121.7,522.5 L122.4,521.1 L123.0,522.0Z M91.3,554.1 L90.4,554.5 L91.3,554.1Z M94.4,547.5 L93.2,549.0 L94.4,547.5Z M149.4,568.7 L149.9,569.2 L149.4,568.7Z M102.0,548.3 L101.1,548.4 L102.0,548.3Z M47.8,589.3 L47.8,590.1 L46.7,589.9 L47.1,589.1 L47.8,589.3Z M83.9,563.8 L83.5,564.9 L83.9,563.8Z M20.1,572.3 L19.6,572.1 L20.1,572.3Z" },
]

const regionColors = {
  hokkaido: "#64b5f6", tohoku: "#81c784", kanto: "#ffb74d",
  chubu: "#ba68c8", kinki: "#e57373", chushikoku: "#4db6ac", kyushu: "#dce775"
}

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
.kk-map-pref { cursor: pointer; transition: filter 0.12s, stroke-width 0.12s; }
.kk-map-pref:hover { filter: brightness(0.88); }
.kk-map-label { font-size: 11px; fill: #666; font-weight: 600; pointer-events: none; }
.kk-map-count { font-size: 9px; fill: #f57f17; font-weight: 700; pointer-events: none; }

.kk-listing-section { background: #fff; padding: 16px; border-bottom: 1px solid #e0e0e0; min-height: 300px; }
.kk-back-btn { border: none; background: none; color: #1565c0; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0 0 12px 0; }
.kk-back-btn:hover { text-decoration: underline; }
.kk-breadcrumb { font-size: 12px; color: #888; margin-bottom: 8px; }
.kk-breadcrumb-sep { margin: 0 6px; color: #ccc; }
.kk-listing-empty { text-align: center; padding: 40px 16px; color: #777; }
.kk-listing-empty p { margin-bottom: 16px; font-size: 13px; }

.kk-postform-section { background: #fff; padding: 16px; border-bottom: 1px solid #e0e0e0; }
.kk-postform { display: flex; flex-direction: column; gap: 14px; margin-top: 12px; }
.kk-form-group { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.kk-form-group label { font-size: 12px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 6px; }
.kk-required { font-size: 10px; background: #ffebee; color: #c62828; padding: 1px 6px; border-radius: 3px; font-weight: 700; }
.kk-form-group input, .kk-form-group select, .kk-form-group textarea {
  border: 1px solid #ccc; border-radius: 5px; padding: 8px 10px; font-size: 13px; font-family: inherit; width: 100%; box-sizing: border-box;
}
.kk-form-group textarea { resize: vertical; }
.kk-form-row { display: flex; gap: 10px; }
.kk-form-row .kk-form-group, .kk-form-row select { flex: 1; min-width: 0; }
.kk-form-area-select { margin-top: 8px; }
.kk-form-section-title { font-size: 14px; font-weight: 700; color: #1a237e; border-bottom: 2px solid #1a237e; padding-bottom: 6px; margin-top: 8px; }
.kk-form-group input[type=text].kk-inline-detail, .kk-form-group > input[type=text]:nth-of-type(2) { margin-top: 8px; }
.kk-chip-group { display: flex; flex-wrap: wrap; gap: 6px; }
.kk-chip { display: inline-flex; align-items: center; height: 36px; gap: 5px; font-size: 12px; border: 1px solid #ccc; border-radius: 5px; padding: 0 10px; cursor: pointer; background: #fff; white-space: nowrap; box-sizing: border-box; transition: background 0.1s, border-color 0.1s; }
.kk-chip input { margin: 0; width: 14px; height: 14px; }
.kk-chip:has(input:checked) { background: #e8eaf6; border-color: #1a237e; font-weight: 600; }
.kk-hint { font-size: 11px; color: #888; font-weight: 400; }
.kk-form-agree { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #333; cursor: pointer; }
.kk-form-agree input { margin-top: 3px; }
.kk-form-agree a { color: #1565c0; }
.kk-form-error { color: #c62828; font-size: 12px; background: #ffebee; padding: 8px 10px; border-radius: 5px; }
.kk-form-submit { padding: 12px; font-size: 14px; opacity: 1; }
.kk-form-submit:disabled { background: #bbb; cursor: not-allowed; }
.kk-postform-success { text-align: center; padding: 40px 16px; }
.kk-postform-success p { font-size: 14px; color: #333; margin-bottom: 8px; }
.kk-postform-success-sub { font-size: 12px !important; color: #777 !important; margin-bottom: 20px !important; }
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

/* ===== 管理画面 ===== */
.kk-admin-login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f2f5; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; }
.kk-admin-login-box { background: #fff; padding: 32px; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 12px; width: 280px; }
.kk-admin-login-title { font-size: 16px; font-weight: 700; text-align: center; margin-bottom: 8px; }
.kk-admin-login-box input { border: 1px solid #ccc; border-radius: 5px; padding: 10px; font-size: 14px; }
.kk-admin-wrap { max-width: 640px; margin: 0 auto; padding: 20px 16px 60px; font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; background: #f5f6f8; min-height: 100vh; }
.kk-admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.kk-admin-title { font-size: 18px; font-weight: 700; color: #1a237e; }
.kk-admin-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 16px; }
.kk-admin-stat { background: #fff; border-radius: 8px; padding: 10px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.kk-admin-stat span { display: block; font-size: 11px; color: #888; }
.kk-admin-stat b { font-size: 18px; color: #1a237e; }
.kk-admin-filters { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
.kk-admin-filter-btn { border: 1px solid #ccc; background: #fff; border-radius: 16px; padding: 5px 14px; font-size: 12px; cursor: pointer; }
.kk-admin-filter-btn.active { background: #1a237e; color: #fff; border-color: #1a237e; }
.kk-admin-loading, .kk-admin-empty { text-align: center; padding: 40px 0; color: #888; font-size: 13px; }
.kk-admin-card { background: #fff; border-radius: 8px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.kk-admin-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.kk-admin-company { font-weight: 700; font-size: 14px; }
.kk-admin-status { font-size: 11px; padding: 2px 10px; border-radius: 10px; font-weight: 700; }
.kk-admin-status-pending_review { background: #fff3e0; color: #e65100; }
.kk-admin-status-approved { background: #e8f5e9; color: #2e7d32; }
.kk-admin-status-rejected { background: #ffebee; color: #c62828; }
.kk-admin-card-row { font-size: 12px; color: #555; margin-bottom: 3px; }
.kk-admin-card-desc { font-size: 12px; color: #777; background: #f9f9f9; padding: 8px; border-radius: 5px; margin-top: 6px; white-space: pre-wrap; }
.kk-royalty-yes { color: #c62828; font-weight: 700; }
.kk-admin-card-actions { display: flex; gap: 8px; margin-top: 10px; }
.kk-admin-card-actions button { border: none; border-radius: 5px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
.kk-admin-card-actions button:disabled { opacity: 0.4; cursor: not-allowed; }
.kk-admin-btn-approve { background: #2e7d32; color: #fff; }
.kk-admin-btn-reject { background: #c62828; color: #fff; }
.kk-admin-btn-reset { background: #eee; color: #555; }

.kk-payment-banner { position: relative; padding: 12px 36px 12px 14px; font-size: 13px; text-align: center; }
.kk-payment-banner-success { background: #e8f5e9; color: #2e7d32; }
.kk-payment-banner-cancelled { background: #fff3e0; color: #e65100; }
.kk-payment-banner-close { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); border: none; background: none; font-size: 16px; cursor: pointer; color: inherit; }
`

// ===== 都道府県ID → {地方, 都道府県} 逆引きテーブル =====
const prefLookup = {}
regions.forEach(region => {
  region.prefectures.forEach(pref => {
    prefLookup[pref.id] = { region, pref }
  })
})

// 管理画面などで regionId/prefId/areaId から表示用ラベルを組み立てるヘルパー
const getAreaLabel = (listing) => {
  const found = prefLookup[listing.prefId]
  if (!found) return '(不明なエリア)'
  let label = `${found.region.name} / ${found.pref.name}`
  if (listing.areaId && found.pref.areas) {
    const area = found.pref.areas.find(a => a.id === listing.areaId)
    if (area) label += ` / ${area.name}`
  }
  return label
}

const PLAN_LABELS = { free: '無料掲載', area: 'エリア有料枠', premium: 'トップ特別広告' }
const STATUS_LABELS = { pending_review: '審査待ち', approved: '承認済み', rejected: '却下' }
const PAYMENT_STATUS_LABELS = { not_required: '対象外（無料）', unpaid: '未払い', paid: '支払い済み', payment_failed: '支払い失敗', cancelled: '解約済み' }
const JOB_TYPE_LABELS = { commission: '業務委託', spot: 'スポット', contract: '契約社員', employee: '社員', other: 'その他' }
const VEHICLE_CONDITION_LABELS = { own_required: '持込み可', rental_available: '貸与あり', either: 'どちらでも可' }
const PAYMENT_TERMS_LABELS = { end_of_month_next: '月末締め翌月末払い', end_of_month_next_next: '月末締め翌々月末払い', weekly: '週払い', daily: '日払い', other: 'その他' }
const WORK_DAYS_LABELS = { full_shift: '完全シフト制', free_shift: '自由シフト', three_plus: '週3日以上', any_days: '週何日でもOK' }


// ===== 求人ダミーデータ（Firestore連携までの仮データ。key = pref.id または area.id） =====
const dummyJobs = {
  tokyo_jouhoku: [
    { title: '城北エリア　定期委託ドライバー募集', meta: '東京都北区・足立区　週5日　単価180円〜', paid: true },
  ],
  tokyo_jouto: [
    { title: '城東エリア　スポット便　即日対応可', meta: '東京都江東区・墨田区　スポット歓迎', paid: true },
  ],
  saitama: [
    { title: '大宮エリア　医療用品配送', meta: 'さいたま市大宮区　平日のみ　経験者優遇', paid: false },
  ],
}

// ===== メインコンポーネント =====
const WORK_DAYS_OPTIONS = [
  { id: 'full_shift', label: '完全シフト制' },
  { id: 'free_shift', label: '自由シフト' },
  { id: 'three_plus', label: '週3日以上' },
  { id: 'any_days', label: '週何日でもOK' },
]

const JOB_TYPE_OPTIONS = [
  { id: 'commission', label: '業務委託' },
  { id: 'spot', label: 'スポット' },
  { id: 'contract', label: '契約社員' },
  { id: 'employee', label: '社員' },
  { id: 'other', label: 'その他' },
]

const PAYMENT_TERMS_OPTIONS = [
  { id: 'end_of_month_next', label: '月末締め翌月末払い' },
  { id: 'end_of_month_next_next', label: '月末締め翌々月末払い' },
  { id: 'weekly', label: '週払い' },
  { id: 'daily', label: '日払い' },
  { id: 'other', label: 'その他' },
]

const emptyListingForm = {
  // 企業情報
  companyName: '', companyAddress: '', contactName: '', phone: '', email: '', businessDescription: '',
  // エリア
  regionId: '', prefId: '', areaId: '',
  // 求人詳細
  jobTitle: '',
  jobTypes: [], jobTypeOther: '', // 複数選択（JOB_TYPE_OPTIONSのidの配列）
  vehicleCondition: '', vehicleConditionDetail: '',
  payRate: '', monthlyIncomeExample: '', dailyGuarantee: '',
  paymentTermsList: [], paymentTermsOther: '', // 複数選択（PAYMENT_TERMS_OPTIONSのidの配列）
  workDays: [], // チェックボックス複数選択（WORK_DAYS_OPTIONSのidの配列）
  hasRoyalty: '',
  workLocation: '', jobDescription: '', benefits: '', qualifications: '', requirements: '',
  // プラン・同意
  plan: 'free', agree: false,
}

export default function App() {
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [selectedPref, setSelectedPref] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [view, setView] = useState('home') // 'home' | 'listing' | 'postForm'
  const [listingSelection, setListingSelection] = useState(null) // { region, pref, area }
  const [postForm, setPostForm] = useState(emptyListingForm)
  const [postStatus, setPostStatus] = useState('idle') // 'idle' | 'submitting' | 'success' | 'error'
  const [postError, setPostError] = useState('')

  // ===== 管理画面 =====
  const [adminAuthed, setAdminAuthed] = useState(false)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [adminError, setAdminError] = useState('')
  const [listings, setListings] = useState([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [adminFilter, setAdminFilter] = useState('all') // 'all' | 'pending_review' | 'approved' | 'rejected'

  // ===== Stripe決済から戻ってきたときの結果表示 =====
  const [paymentBanner, setPaymentBanner] = useState(null) // { type: 'success' | 'cancelled' }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    if (payment === 'success' || payment === 'cancelled') {
      setPaymentBanner({ type: payment })
      // URLをきれいにしてから履歴に残す（リロードで再表示されないように）
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      url.searchParams.delete('listingId')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // URLに ?admin=1 が付いていたら管理画面へ。ログイン状態はタブを閉じるまで保持。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('admin') === '1') {
      setView('admin')
      if (sessionStorage.getItem('kk_admin_authed') === '1') {
        setAdminAuthed(true)
      }
    }
  }, [])

  // 管理画面認証後、掲載申込一覧をリアルタイム購読
  useEffect(() => {
    if (view !== 'admin' || !adminAuthed) return
    setListingsLoading(true)
    const q = query(collection(db, 'listingRequests'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setListings(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
        setListingsLoading(false)
      },
      (err) => {
        console.error('掲載申込一覧の取得に失敗しました', err)
        setListingsLoading(false)
      }
    )
    return () => unsubscribe()
  }, [view, adminAuthed])

  const handleAdminLogin = (e) => {
    e.preventDefault()
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setAdminAuthed(true)
      setAdminError('')
      sessionStorage.setItem('kk_admin_authed', '1')
    } else {
      setAdminError('パスワードが違います')
    }
  }

  const handleAdminLogout = () => {
    setAdminAuthed(false)
    sessionStorage.removeItem('kk_admin_authed')
  }

  const handleUpdateListingStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'listingRequests', id), { status: newStatus })
    } catch (err) {
      console.error('ステータス更新に失敗しました', err)
      alert('更新に失敗しました。通信状況をご確認のうえ再度お試しください。')
    }
  }

  const handleRegionClick = (region) => {
    setSelectedRegion(region)
    setSelectedPref(null)
  }

  // 案件一覧ページへ遷移
  const goToListing = (region, pref, area) => {
    setListingSelection({ region, pref, area })
    setView('listing')
    window.scrollTo(0, 0)
  }

  const handleBackToSearch = () => {
    setView('home')
  }

  // 掲載フォームを開く（任意で初期エリアを指定可能）
  const openPostForm = (regionId = '', prefId = '', areaId = '') => {
    setPostForm({ ...emptyListingForm, regionId, prefId, areaId })
    setPostStatus('idle')
    setPostError('')
    setView('postForm')
    window.scrollTo(0, 0)
  }

  const updatePostForm = (field, value) => {
    setPostForm(prev => {
      const next = { ...prev, [field]: value }
      // 地方を変えたら都道府県・エリアをリセット、都道府県を変えたらエリアをリセット
      if (field === 'regionId') { next.prefId = ''; next.areaId = '' }
      if (field === 'prefId') { next.areaId = '' }
      return next
    })
  }

  // field（workDays / jobTypes / paymentTermsList）の配列に対して選択・解除をトグルする汎用関数
  const toggleMultiSelect = (field, optionId) => {
    setPostForm(prev => {
      const current = prev[field]
      const has = current.includes(optionId)
      const next = has ? current.filter(id => id !== optionId) : [...current, optionId]
      return { ...prev, [field]: next }
    })
  }

  const handlePostSubmit = async (e) => {
    e.preventDefault()
    if (!postForm.agree) return
    setPostStatus('submitting')
    setPostError('')
    try {
      // Firestoreへの書き込みが通信不良等で無応答のまま保留し続けないよう、
      // 一定時間で強制的にタイムアウトさせる
      const writePromise = addDoc(collection(db, 'listingRequests'), {
        companyName: postForm.companyName,
        companyAddress: postForm.companyAddress,
        contactName: postForm.contactName,
        phone: postForm.phone,
        email: postForm.email,
        businessDescription: postForm.businessDescription,
        regionId: postForm.regionId,
        prefId: postForm.prefId,
        areaId: postForm.areaId || null,
        jobTitle: postForm.jobTitle,
        jobTypes: postForm.jobTypes,
        jobTypeOther: postForm.jobTypes.includes('other') ? postForm.jobTypeOther : '',
        vehicleCondition: postForm.vehicleCondition,
        vehicleConditionDetail: postForm.vehicleConditionDetail,
        payRate: postForm.payRate,
        monthlyIncomeExample: postForm.monthlyIncomeExample,
        dailyGuarantee: postForm.dailyGuarantee,
        paymentTermsList: postForm.paymentTermsList,
        paymentTermsOther: postForm.paymentTermsList.includes('other') ? postForm.paymentTermsOther : '',
        workDays: postForm.workDays,
        hasRoyalty: postForm.hasRoyalty,
        workLocation: postForm.workLocation,
        jobDescription: postForm.jobDescription,
        benefits: postForm.benefits,
        qualifications: postForm.qualifications,
        requirements: postForm.requirements,
        plan: postForm.plan,
        status: 'pending_review', // AI審査待ち
        paymentStatus: postForm.plan === 'free' ? 'not_required' : 'unpaid',
        createdAt: serverTimestamp(),
      })
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 15000)
      })
      const docRef = await Promise.race([writePromise, timeoutPromise])

      // LINE通知を送る（失敗しても申込自体は成立させるため、エラーは握りつぶしてログのみ）
      try {
        const region = regions.find(r => r.id === postForm.regionId)
        const pref = region?.prefectures.find(p => p.id === postForm.prefId)
        const area = pref?.areas?.find(a => a.id === postForm.areaId)
        const areaLabel = [region?.name, pref?.name, area?.name].filter(Boolean).join(' / ')
        await fetch('/api/notify-line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_listing',
            listingId: docRef.id,
            companyName: postForm.companyName,
            jobTitle: postForm.jobTitle,
            areaLabel,
          }),
        })
      } catch (notifyErr) {
        console.error('LINE通知の送信でエラーが発生しました（申込自体は正常に完了しています）', notifyErr)
      }

      // 無料プランはここで完了。有料プランはStripeの決済画面へ移動する
      if (postForm.plan === 'free') {
        setPostStatus('success')
        return
      }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: postForm.plan,
          listingId: docRef.id,
          email: postForm.email,
          companyName: postForm.companyName,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'checkout_session_failed')
      }
      // Stripeの決済ページへ移動（このページを離れるため、以降の状態更新は不要）
      window.location.href = data.url
    } catch (err) {
      console.error('掲載申込の送信に失敗しました', err)
      setPostStatus('error')
      if (err?.message === 'timeout') {
        setPostError('通信状況が不安定なようです。電波の良い場所で再度お試しいただくか、しばらくしてから再送信してください。')
      } else if (err?.message === 'checkout_session_failed') {
        setPostError('申込内容は保存されましたが、決済画面への移動に失敗しました。お手数ですが運営までお問い合わせください。')
      } else {
        setPostError('送信に失敗しました。時間をおいて再度お試しください。')
      }
    }
  }

  // 都道府県クリック：サブエリアが無ければ即座に案件一覧へ、あればエリアパネルを表示
  const handlePrefClick = (pref, region) => {
    setSelectedPref(pref)
    if (!pref.areas) {
      goToListing(region, pref, null)
    }
  }

  // エリアクリック（東京都・広島県など）：案件一覧へ
  const handleAreaClick = (area, region, pref) => {
    goToListing(region, pref, area)
  }

  // 地図上の都道府県クリック → 地方＋都道府県を自動選択し、サブエリアが無ければそのまま案件一覧へ
  const handleMapPrefClick = (prefId) => {
    const found = prefLookup[prefId]
    if (found) {
      setSelectedRegion(found.region)
      handlePrefClick(found.pref, found.region)
    }
  }

  // ===== 管理画面（独立ビュー。サイト本体のヘッダー等は表示しない） =====
  if (view === 'admin') {
    if (!adminAuthed) {
      return (
        <>
          <style>{styles}</style>
          <div className="kk-admin-login-wrap">
            <form className="kk-admin-login-box" onSubmit={handleAdminLogin}>
              <div className="kk-admin-login-title">🔒 管理画面ログイン</div>
              <input
                type="password"
                placeholder="パスワード"
                value={adminPasswordInput}
                onChange={e=>setAdminPasswordInput(e.target.value)}
                autoFocus
              />
              {adminError && <div className="kk-form-error">{adminError}</div>}
              <button type="submit" className="kk-btn-post">ログイン</button>
            </form>
          </div>
        </>
      )
    }

    const filteredListings = adminFilter === 'all' ? listings : listings.filter(l => l.status === adminFilter)
    const statusCounts = listings.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1
      return acc
    }, {})

    return (
      <>
        <style>{styles}</style>
        <div className="kk-admin-wrap">
          <div className="kk-admin-header">
            <div className="kk-admin-title">軽貨物求人.com 管理画面</div>
            <button className="kk-back-btn" onClick={handleAdminLogout}>ログアウト</button>
          </div>

          <div className="kk-admin-stats">
            <div className="kk-admin-stat"><span>全件</span><b>{listings.length}</b></div>
            <div className="kk-admin-stat"><span>審査待ち</span><b>{statusCounts.pending_review || 0}</b></div>
            <div className="kk-admin-stat"><span>承認済み</span><b>{statusCounts.approved || 0}</b></div>
            <div className="kk-admin-stat"><span>却下</span><b>{statusCounts.rejected || 0}</b></div>
          </div>

          <div className="kk-admin-filters">
            {['all', 'pending_review', 'approved', 'rejected'].map(f => (
              <button
                key={f}
                className={`kk-admin-filter-btn ${adminFilter===f?'active':''}`}
                onClick={()=>setAdminFilter(f)}
              >
                {f === 'all' ? 'すべて' : STATUS_LABELS[f]}
              </button>
            ))}
          </div>

          {listingsLoading && <div className="kk-admin-loading">読み込み中...</div>}

          {!listingsLoading && filteredListings.length === 0 && (
            <div className="kk-admin-empty">該当する掲載申込はありません。</div>
          )}

          {filteredListings.map(listing => (
            <div key={listing.id} className="kk-admin-card">
              <div className="kk-admin-card-header">
                <span className="kk-admin-company">{listing.companyName}</span>
                <span className={`kk-admin-status kk-admin-status-${listing.status}`}>
                  {STATUS_LABELS[listing.status] || listing.status}
                </span>
              </div>
              <div className="kk-admin-card-row">{getAreaLabel(listing)}</div>
              <div className="kk-admin-card-row"><b>{listing.jobTitle}</b>（{PLAN_LABELS[listing.plan] || listing.plan}）</div>
              <div className="kk-admin-card-row">
                業務形態：{(listing.jobTypes || []).map(id => id === 'other' ? (listing.jobTypeOther || 'その他') : (JOB_TYPE_LABELS[id] || id)).join('・') || '未回答'}
                　車両条件：{VEHICLE_CONDITION_LABELS[listing.vehicleCondition] || '未回答'}
                {listing.vehicleConditionDetail && `（${listing.vehicleConditionDetail}）`}
              </div>
              <div className="kk-admin-card-row">
                支払条件：{(listing.paymentTermsList || []).map(id => id === 'other' ? (listing.paymentTermsOther || 'その他') : (PAYMENT_TERMS_LABELS[id] || id)).join('・') || '未回答'}
                　勤務日数：{(listing.workDays || []).map(id => WORK_DAYS_LABELS[id] || id).join('・') || '未回答'}
              </div>
              <div className="kk-admin-card-row">
                ロイヤリティ・管理費：{listing.hasRoyalty === 'yes' ? <span className="kk-royalty-yes">あり</span> : listing.hasRoyalty === 'no' ? 'なし' : '未回答'}
              </div>
              {(listing.payRate || listing.monthlyIncomeExample || listing.dailyGuarantee) && (
                <div className="kk-admin-card-row">
                  {listing.payRate && `単価：${listing.payRate}　`}
                  {listing.monthlyIncomeExample && `月収例：${listing.monthlyIncomeExample}　`}
                  {listing.dailyGuarantee && `日当保証：${listing.dailyGuarantee}`}
                </div>
              )}
              {listing.plan !== 'free' && (
                <div className="kk-admin-card-row">支払い状況：{PAYMENT_STATUS_LABELS[listing.paymentStatus] || listing.paymentStatus || '不明'}</div>
              )}
              <div className="kk-admin-card-row">担当：{listing.contactName}　TEL：{listing.phone}　Mail：{listing.email}</div>
              {listing.companyAddress && <div className="kk-admin-card-row">所在地：{listing.companyAddress}</div>}
              {listing.businessDescription && <div className="kk-admin-card-desc">【事業内容】{listing.businessDescription}</div>}
              {listing.workLocation && <div className="kk-admin-card-desc">【勤務地】{listing.workLocation}</div>}
              {listing.jobDescription && <div className="kk-admin-card-desc">【仕事内容】{listing.jobDescription}</div>}
              {listing.benefits && <div className="kk-admin-card-desc">【待遇・福利厚生】{listing.benefits}</div>}
              {listing.qualifications && <div className="kk-admin-card-desc">【資格・学歴】{listing.qualifications}</div>}
              {listing.requirements && <div className="kk-admin-card-desc">【必須条件】{listing.requirements}</div>}
              <div className="kk-admin-card-actions">
                <button
                  className="kk-admin-btn-approve"
                  disabled={listing.status === 'approved'}
                  onClick={()=>handleUpdateListingStatus(listing.id, 'approved')}
                >承認</button>
                <button
                  className="kk-admin-btn-reject"
                  disabled={listing.status === 'rejected'}
                  onClick={()=>handleUpdateListingStatus(listing.id, 'rejected')}
                >却下</button>
                {listing.status !== 'pending_review' && (
                  <button
                    className="kk-admin-btn-reset"
                    onClick={()=>handleUpdateListingStatus(listing.id, 'pending_review')}
                  >審査待ちに戻す</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    )
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
          <button className="kk-btn-post" onClick={()=>openPostForm()}>案件を掲載する</button>
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

        {/* 決済結果バナー */}
        {paymentBanner && (
          <div className={`kk-payment-banner kk-payment-banner-${paymentBanner.type}`}>
            {paymentBanner.type === 'success' ? (
              <>✅ お申し込みありがとうございます。決済が完了しました。担当より内容確認のご連絡をいたします。</>
            ) : (
              <>決済がキャンセルされました。申込内容は保存されていますので、もう一度お申し込みの際はお問い合わせください。</>
            )}
            <button className="kk-payment-banner-close" onClick={()=>setPaymentBanner(null)}>×</button>
          </div>
        )}

        {view === 'home' && (
        <>
        {/* ⑥ エリア */}
        <section id="area" className="kk-area-section">
          <div className="kk-section-title">
            エリアから探す
            <span className="kk-total-count">全国　求人案件 {totalCount.toLocaleString()}件</span>
          </div>

          {/* 地図（実座標ベースの都道府県ポリゴン） */}
          <div className="kk-map-wrap">
            <svg viewBox={MAP_VIEWBOX} className="kk-map-svg">
              {prefecturePaths.map(p => {
                const isSelectedRegion = selectedRegion?.id === p.regionId
                const isSelectedPref = selectedPref?.id === p.id
                return (
                  <path
                    key={p.id}
                    d={p.d}
                    fill={regionColors[p.regionId]}
                    fillOpacity={isSelectedRegion ? 1 : 0.5}
                    stroke={isSelectedPref ? '#1a237e' : '#fff'}
                    strokeWidth={isSelectedPref ? 2.2 : 0.6}
                    className="kk-map-pref"
                    onClick={() => handleMapPrefClick(p.id)}
                  >
                    <title>{p.name}</title>
                  </path>
                )
              })}
              {/* 沖縄の別枠表示 */}
              <rect
                x={OKI_BOX.x} y={OKI_BOX.y} width={OKI_BOX.w} height={OKI_BOX.h}
                fill="none" stroke="#aaa" strokeDasharray="3,3" strokeWidth="1"
              />
              <text x={OKI_BOX.x + 4} y={OKI_BOX.y - 6} className="kk-map-label" fontSize="10">沖縄県</text>
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
                  <div key={pref.id} className={`kk-pref-btn ${selectedPref?.id===pref.id?'active':''}`} onClick={()=>handlePrefClick(pref, selectedRegion)}>
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
                      <div key={area.id} className="kk-area-btn" onClick={()=>handleAreaClick(area, selectedRegion, selectedPref)}>
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
        </>
        )}

        {/* ⑥' 案件一覧ページ（都道府県／エリアクリック後の遷移先） */}
        {view === 'listing' && listingSelection && (
          <section id="listing" className="kk-listing-section">
            <button className="kk-back-btn" onClick={handleBackToSearch}>← エリア検索に戻る</button>

            <div className="kk-breadcrumb">
              {listingSelection.region.name}
              <span className="kk-breadcrumb-sep">›</span>
              {listingSelection.pref.name}
              {listingSelection.area && (
                <>
                  <span className="kk-breadcrumb-sep">›</span>
                  {listingSelection.area.name}
                </>
              )}
            </div>

            <div className="kk-section-title">
              {(listingSelection.area || listingSelection.pref).name}の軽貨物求人一覧
            </div>

            {(() => {
              const key = (listingSelection.area || listingSelection.pref).id
              const jobs = dummyJobs[key] || []
              if (jobs.length === 0) {
                return (
                  <div className="kk-listing-empty">
                    <p>現在、{(listingSelection.area || listingSelection.pref).name}の求人情報を準備中です。近日公開予定！</p>
                    <button className="kk-btn-post" onClick={()=>openPostForm(listingSelection.region.id, listingSelection.pref.id, listingSelection.area?.id || '')}>この地域に案件を掲載する</button>
                  </div>
                )
              }
              return jobs.map((job, i) => (
                <div key={i} className="kk-job-card">
                  <div className="kk-job-header">
                    <span className="kk-job-title">{job.title}</span>
                    <span className={`kk-tag ${job.paid?'kk-tag-paid':'kk-tag-free'}`}>{job.paid?'有料':'無料'}</span>
                  </div>
                  <div className="kk-job-meta">{job.meta}</div>
                </div>
              ))
            })()}
          </section>
        )}

        {/* 企業掲載フォーム */}
        {view === 'postForm' && (
          <section id="postForm" className="kk-postform-section">
            <button className="kk-back-btn" onClick={handleBackToSearch}>← エリア検索に戻る</button>
            <div className="kk-section-title">案件を掲載する</div>

            {postStatus === 'success' ? (
              <div className="kk-postform-success">
                <p>掲載申込を受け付けました。ありがとうございます！</p>
                <p className="kk-postform-success-sub">内容を確認のうえ、担当より折り返しご連絡いたします（AI審査でグレー判定の場合は運営者から個別確認のご連絡が入ることがあります）。</p>
                <button className="kk-btn-post" onClick={handleBackToSearch}>トップに戻る</button>
              </div>
            ) : (
              <form className="kk-postform" onSubmit={handlePostSubmit}>
                <div className="kk-form-section-title">企業情報</div>

                <div className="kk-form-group">
                  <label>企業名<span className="kk-required">必須</span></label>
                  <input type="text" required value={postForm.companyName} onChange={e=>updatePostForm('companyName', e.target.value)} />
                </div>
                <div className="kk-form-group">
                  <label>本社所在地（事業所所在地）<span className="kk-required">必須</span></label>
                  <input type="text" required placeholder="例：東京都千代田区〇〇1-2-3" value={postForm.companyAddress} onChange={e=>updatePostForm('companyAddress', e.target.value)} />
                </div>
                <div className="kk-form-group">
                  <label>ご担当者名<span className="kk-required">必須</span></label>
                  <input type="text" required value={postForm.contactName} onChange={e=>updatePostForm('contactName', e.target.value)} />
                </div>
                <div className="kk-form-row">
                  <div className="kk-form-group">
                    <label>電話番号<span className="kk-required">必須</span></label>
                    <input type="tel" required value={postForm.phone} onChange={e=>updatePostForm('phone', e.target.value)} />
                  </div>
                  <div className="kk-form-group">
                    <label>メールアドレス<span className="kk-required">必須</span></label>
                    <input type="email" required value={postForm.email} onChange={e=>updatePostForm('email', e.target.value)} />
                  </div>
                </div>
                <div className="kk-form-group">
                  <label>事業・サービス内容</label>
                  <textarea rows={2} placeholder="例：関東エリアを中心とした軽貨物運送・企業配・宅配便業務" value={postForm.businessDescription} onChange={e=>updatePostForm('businessDescription', e.target.value)} />
                </div>

                <div className="kk-form-section-title">掲載エリア</div>

                <div className="kk-form-group">
                  <label>掲載エリア<span className="kk-required">必須</span></label>
                  <div className="kk-form-row">
                    <select required value={postForm.regionId} onChange={e=>updatePostForm('regionId', e.target.value)}>
                      <option value="">地方を選択</option>
                      {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <select
                      required
                      disabled={!postForm.regionId}
                      value={postForm.prefId}
                      onChange={e=>updatePostForm('prefId', e.target.value)}
                    >
                      <option value="">都道府県を選択</option>
                      {(regions.find(r=>r.id===postForm.regionId)?.prefectures || []).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {(() => {
                    const pref = regions.find(r=>r.id===postForm.regionId)?.prefectures.find(p=>p.id===postForm.prefId)
                    if (!pref || !pref.areas) return null
                    return (
                      <select
                        className="kk-form-area-select"
                        value={postForm.areaId}
                        onChange={e=>updatePostForm('areaId', e.target.value)}
                      >
                        <option value="">エリアを選択（任意）</option>
                        {pref.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    )
                  })()}
                </div>

                <div className="kk-form-section-title">求人詳細</div>

                <div className="kk-form-group">
                  <label>求人タイトル<span className="kk-required">必須</span></label>
                  <input type="text" required placeholder="例：定期委託ドライバー募集" value={postForm.jobTitle} onChange={e=>updatePostForm('jobTitle', e.target.value)} />
                </div>

                <div className="kk-form-group">
                  <label>業務形態<span className="kk-required">必須</span>　<span className="kk-hint">（複数選択可）</span></label>
                  <div className="kk-chip-group">
                    {JOB_TYPE_OPTIONS.map(opt => (
                      <label key={opt.id} className="kk-chip">
                        <input
                          type="checkbox"
                          checked={postForm.jobTypes.includes(opt.id)}
                          onChange={()=>toggleMultiSelect('jobTypes', opt.id)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {postForm.jobTypes.includes('other') && (
                    <input type="text" placeholder="業務形態の詳細をご記入ください" value={postForm.jobTypeOther} onChange={e=>updatePostForm('jobTypeOther', e.target.value)} />
                  )}
                </div>

                <div className="kk-form-group">
                  <label>車両条件<span className="kk-required">必須</span></label>
                  <select required value={postForm.vehicleCondition} onChange={e=>updatePostForm('vehicleCondition', e.target.value)}>
                    <option value="">選択してください</option>
                    <option value="own_required">持込み可</option>
                    <option value="rental_available">貸与あり</option>
                    <option value="either">どちらでも可</option>
                  </select>
                  <input type="text" placeholder="例：車両サイズ、リース料金の目安など" value={postForm.vehicleConditionDetail} onChange={e=>updatePostForm('vehicleConditionDetail', e.target.value)} />
                </div>

                <div className="kk-form-row">
                  <div className="kk-form-group">
                    <label>単価・給与目安</label>
                    <input type="text" placeholder="例：単価180円〜" value={postForm.payRate} onChange={e=>updatePostForm('payRate', e.target.value)} />
                  </div>
                  <div className="kk-form-group">
                    <label>月収例</label>
                    <input type="text" placeholder="例：月収35万円〜" value={postForm.monthlyIncomeExample} onChange={e=>updatePostForm('monthlyIncomeExample', e.target.value)} />
                  </div>
                </div>
                <div className="kk-form-group">
                  <label>日当保証</label>
                  <input type="text" placeholder="例：一稼働14,000円保証" value={postForm.dailyGuarantee} onChange={e=>updatePostForm('dailyGuarantee', e.target.value)} />
                </div>

                <div className="kk-form-group">
                  <label>報酬の支払条件<span className="kk-required">必須</span>　<span className="kk-hint">（複数選択可）</span></label>
                  <div className="kk-chip-group">
                    {PAYMENT_TERMS_OPTIONS.map(opt => (
                      <label key={opt.id} className="kk-chip">
                        <input
                          type="checkbox"
                          checked={postForm.paymentTermsList.includes(opt.id)}
                          onChange={()=>toggleMultiSelect('paymentTermsList', opt.id)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {postForm.paymentTermsList.includes('other') && (
                    <input type="text" placeholder="支払条件の詳細をご記入ください" value={postForm.paymentTermsOther} onChange={e=>updatePostForm('paymentTermsOther', e.target.value)} />
                  )}
                </div>

                <div className="kk-form-group">
                  <label>勤務日数<span className="kk-required">必須</span>　<span className="kk-hint">（複数選択可）</span></label>
                  <div className="kk-chip-group">
                    {WORK_DAYS_OPTIONS.map(opt => (
                      <label key={opt.id} className="kk-chip">
                        <input
                          type="checkbox"
                          checked={postForm.workDays.includes(opt.id)}
                          onChange={()=>toggleMultiSelect('workDays', opt.id)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="kk-form-group">
                  <label>ロイヤリティ・管理費<span className="kk-required">必須</span></label>
                  <select required value={postForm.hasRoyalty} onChange={e=>updatePostForm('hasRoyalty', e.target.value)}>
                    <option value="">選択してください</option>
                    <option value="no">なし</option>
                    <option value="yes">あり</option>
                  </select>
                </div>

                <div className="kk-form-group">
                  <label>【勤務地】</label>
                  <textarea rows={2} placeholder="例：〇〇市を中心とした担当エリア内" value={postForm.workLocation} onChange={e=>updatePostForm('workLocation', e.target.value)} />
                </div>
                <div className="kk-form-group">
                  <label>【仕事内容】</label>
                  <textarea rows={3} placeholder="例：ネット通販商品の配送、企業配など" value={postForm.jobDescription} onChange={e=>updatePostForm('jobDescription', e.target.value)} />
                </div>
                <div className="kk-form-group">
                  <label>【待遇・福利厚生】</label>
                  <textarea rows={3} placeholder="例：研修制度あり、団体傷害保険加入、Wワーク可など" value={postForm.benefits} onChange={e=>updatePostForm('benefits', e.target.value)} />
                </div>
                <div className="kk-form-group">
                  <label>【資格・学歴】</label>
                  <textarea rows={2} placeholder="例：普通自動車免許（AT限定可）、学歴不問" value={postForm.qualifications} onChange={e=>updatePostForm('qualifications', e.target.value)} />
                </div>
                <div className="kk-form-group">
                  <label>【必須条件】</label>
                  <textarea rows={2} placeholder="例：未経験可、要普通免許" value={postForm.requirements} onChange={e=>updatePostForm('requirements', e.target.value)} />
                </div>

                <div className="kk-form-section-title">掲載プラン</div>

                <div className="kk-form-group">
                  <label>掲載プラン<span className="kk-required">必須</span></label>
                  <select required value={postForm.plan} onChange={e=>updatePostForm('plan', e.target.value)}>
                    <option value="free">無料掲載</option>
                    <option value="area">エリア有料枠（10,000円/月・税抜）</option>
                    <option value="premium">トップ特別広告（50,000円/月・税抜・全国1社限定）</option>
                  </select>
                </div>

                <label className="kk-form-agree">
                  <input type="checkbox" checked={postForm.agree} onChange={e=>updatePostForm('agree', e.target.checked)} />
                  <span><a href="#" onClick={e=>e.stopPropagation()}>利用規約</a>および<a href="#" onClick={e=>e.stopPropagation()}>プライバシーポリシー</a>に同意します（必須）</span>
                </label>

                {postStatus === 'error' && <div className="kk-form-error">{postError}</div>}

                <button
                  type="submit"
                  className="kk-btn-post kk-form-submit"
                  disabled={
                    !postForm.agree ||
                    postStatus === 'submitting' ||
                    postForm.jobTypes.length === 0 ||
                    postForm.paymentTermsList.length === 0 ||
                    postForm.workDays.length === 0
                  }
                >
                  {postStatus === 'submitting' ? '送信中...' : 'この内容で申し込む'}
                </button>
              </form>
            )}
          </section>
        )}



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
