 // Google Sign-In restricted to @neu.edu.ph (Firebase Authentication)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// ---------------------------------------------------------------
// 1) PASTE YOUR FIREBASE CONFIG HERE
//    Firebase Console > Project settings > Your apps > Web app
// ---------------------------------------------------------------
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    appId: "YOUR_APP_ID"
};

const ALLOWED_DOMAIN = "neu.edu.ph";
const REDIRECT_AFTER_LOGIN = "dashboard.html";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// "hd" only filters the account picker to school accounts (a hint, not security)
provider.setCustomParameters({ hd: ALLOWED_DOMAIN, prompt: "select_account" });

const googleBtn = document.getElementById("google-btn");
const errorBox = document.getElementById("auth-error");

function showError(msg) {
    errorBox.textContent = msg;
}

googleBtn.addEventListener("click", async () => {
    showError("");
    googleBtn.disabled = true;

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const email = (user.email || "").toLowerCase();

        const isSchoolEmail = email.endsWith("@" + ALLOWED_DOMAIN);

        if (!user.emailVerified || !isSchoolEmail) {
            await signOut(auth);
            showError("Access denied. Please use your @" + ALLOWED_DOMAIN + " school email.");
            return;
        }

        window.location.href = REDIRECT_AFTER_LOGIN;
    } catch (err) {
        console.error(err);
        if (err.code === "auth/popup-closed-by-user") {
            showError("Sign-in was cancelled.");
        } else if (err.code === "auth/unauthorized-domain") {
            showError("This site's domain is not authorized in Firebase (Authentication > Settings > Authorized domains).");
        } else {
            showError("Google sign-in failed. Please try again.");
        }
    } finally {
        googleBtn.disabled = false;
    }
});
