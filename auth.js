// Google Sign-In for ERASync
// Only approved NEU students and authorized administrators.

import {
    GoogleAuthProvider, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import {
    ALLOWED_DOMAIN, USER_DASHBOARD, ADMIN_DASHBOARD
} from "./firebase-config.js";

import {
    isConfigured, auth, db, isSchoolUser
} from "./auth-common.js";

const googleBtn = document.getElementById("google-btn");
const adminBtn = document.getElementById("admin-btn");
const errorBox = document.getElementById("auth-error");

function showError(msg) {
    errorBox.textContent = msg;
}

const REASONS = {
    config: "ERASync is not configured yet.",
    domain: "Access denied. Please use your @" + ALLOWED_DOMAIN + " school email.",
    role: "Your account has no valid assigned role.",
    forbidden: "Your account does not have permission to open that page.",
    pending: "Your account is pending approval. Please contact the administrator."
};

const reason = new URLSearchParams(window.location.search).get("error");

if (reason && REASONS[reason]) {
    showError(REASONS[reason]);
}

if (!isConfigured) {
    showError(REASONS.config);
    googleBtn.disabled = true;
} else {
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
        hd: ALLOWED_DOMAIN,
        prompt: "select_account"
    });

    googleBtn.addEventListener("click", async () => {
        showError("");
        googleBtn.disabled = true;

        const wantsAdmin = adminBtn.classList.contains("active-admin");

        try {
            const { user } = await signInWithPopup(auth, provider);

            // 1. Verify the NEU school email.
            if (!isSchoolUser(user)) {
                await signOut(auth);
                showError(REASONS.domain);
                return;
            }

            // 2. Check the account in Firestore.
            const ref = doc(db, "users", user.uid);
            const snap = await getDoc(ref);

            // 3. Register new accounts as pending approval.
            if (!snap.exists()) {
                await setDoc(ref, {
                    email: user.email,
                    displayName: user.displayName || "",
                    role: "user",
                    approved: false,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });

                await signOut(auth);
                showError(REASONS.pending);
                return;
            }

            const account = snap.data();

            // 4. Allow only manually approved accounts.
            if (account.approved !== true) {
                await signOut(auth);
                showError(REASONS.pending);
                return;
            }

            // 5. Validate the assigned role.
            if (account.role !== "user" && account.role !== "admin") {
                await signOut(auth);
                showError(REASONS.role);
                return;
            }

            // 6. Restrict Admin access.
            if (wantsAdmin && account.role !== "admin") {
                await signOut(auth);
                showError("This account does not have Admin access.");
                return;
            }

            // 7. Restrict the student portal to approved students.
            if (!wantsAdmin && account.role !== "user") {
                await signOut(auth);
                showError("Please select Admin to access your account.");
                return;
            }

            // 8. Update the last successful login.
            await updateDoc(ref, {
                displayName: user.displayName || "",
                lastLogin: serverTimestamp()
            });

            // 9. Redirect to the correct dashboard.
            window.location.href =
                account.role === "admin"
                    ? ADMIN_DASHBOARD
                    : USER_DASHBOARD;

        } catch (err) {
            console.error(err);

            try {
                await signOut(auth);
            } catch (_) {}

            if (
                err.code === "auth/popup-closed-by-user" ||
                err.code === "auth/cancelled-popup-request"
            ) {
                showError("Sign-in was cancelled.");
            } else if (err.code === "auth/unauthorized-domain") {
                showError("This website is not authorized in Firebase.");
            } else if (err.code === "permission-denied") {
                showError("Access denied by the database security rules.");
            } else {
                showError("Google sign-in failed. Please try again.");
            }

        } finally {
            googleBtn.disabled = false;
        }
    });
}
