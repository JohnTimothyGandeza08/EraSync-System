
 // Shared authentication helpers for ERASync.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import {
    getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    getFirestore, doc, getDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import {
    firebaseConfig, ALLOWED_DOMAIN, LOGIN_PAGE
} from "./firebase-config.js";

// Check Firebase configuration.
export const isConfigured = Object.values(firebaseConfig).every(
    (v) => typeof v === "string" && v.trim() !== ""
);

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isConfigured ? getAuth(app) : null;
export const db = isConfigured ? getFirestore(app) : null;

// Check verified NEU email.
export function isSchoolUser(user) {
    const email = (user && user.email ? user.email : "").toLowerCase();

    return !!user
        && user.emailVerified === true
        && email.endsWith("@" + ALLOWED_DOMAIN);
}

// Retrieve account information from Firestore.
export async function getUserProfile(user) {
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) return null;

    return snap.data();
}

// Retrieve assigned account role.
export async function getRole(user) {
    const profile = await getUserProfile(user);

    if (!profile) return null;

    const role = profile.role;

    return role === "admin" || role === "user" ? role : null;
}

// Logout.
export async function logout() {
    if (auth) await signOut(auth);

    window.location.replace(LOGIN_PAGE);
}

// Protect User and Admin dashboards.
export function protectPage(allowedRoles, onAllowed) {
    const deny = async (reason) => {
        document.body.style.visibility = "hidden";

        try {
            if (auth && auth.currentUser) {
                await signOut(auth);
            }
        } catch (err) {
            console.error(err);
        }

        window.location.replace(
            LOGIN_PAGE + (reason ? "?error=" + reason : "")
        );
    };

    if (!isConfigured) return deny("config");

    onAuthStateChanged(auth, async (user) => {
        if (!user) return deny("");

        if (!isSchoolUser(user)) {
            return deny("domain");
        }

        try {
            const profile = await getUserProfile(user);

            if (!profile) {
                return deny("role");
            }

            const role = profile.role;

            if (role !== "user" && role !== "admin") {
                return deny("role");
            }

            // Only manually approved accounts are allowed.
            if (profile.approved !== true) {
                return deny("pending");
            }

            // Check dashboard permissions.
            if (!allowedRoles.includes(role)) {
                return deny("forbidden");
            }

            onAllowed(user, role);

            document.body.style.visibility = "visible";

        } catch (err) {
            console.error(err);
            return deny("role");
        }
    });

    // Prevent cached dashboard access after logout.
    window.addEventListener("pageshow", (e) => {
        if (e.persisted) window.location.reload();
    });
}
