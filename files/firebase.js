// Firebase 初期化ファイル
// keikamotsu-kyujin プロジェクト用（CarryFlowとは完全に別プロジェクト）

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBCus6jKE94c7IovBgXC1UGMLhm4GYC8N8",
  authDomain: "keikamotsu-kyujin.firebaseapp.com",
  projectId: "keikamotsu-kyujin",
  storageBucket: "keikamotsu-kyujin.firebasestorage.app",
  messagingSenderId: "855755105825",
  appId: "1:855755105825:web:20a32652bb66befcce6560",
  measurementId: "G-6W1Y45K1FR"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
