import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyARem_muDvfxKQGMXFav0248NlQ-14FFO4",
  authDomain: "insuronews.firebaseapp.com",
  projectId: "insuronews",
  storageBucket: "insuronews.firebasestorage.app",
  messagingSenderId: "1015135556735",
  appId: "1:1015135556735:web:d93a3e959d7d61aa581b4a",
  measurementId: "G-8TEZB3RXRW"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

