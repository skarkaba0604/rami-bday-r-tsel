import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBoNcNsAw_x48i1zG1zzGaSTPArn3nf_jY",
  authDomain: "arnebay-1fd81.firebaseapp.com",
  projectId: "arnebay-1fd81",
  storageBucket: "arnebay-1fd81.firebasestorage.app",
  messagingSenderId: "212876358328",
  appId: "1:212876358328:web:75169cf68e82fcd6ee7a4d",
  // measurementId ist optional (kannst du drin lassen oder weglassen)
  measurementId: "G-S8576VG2NW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
