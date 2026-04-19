// app.js
// ================= CONFIGURATION =================
console.log("🔥 app.js loaded");

const firebaseConfig = {
    apiKey: "AIzaSyDizcwmj7NQgii6IW34khKdnTGn_4MNmFk",
    authDomain: "pillgaurd.firebaseapp.com",
    projectId: "pillgaurd",
    messagingSenderId: "359502691060",
    appId: "1:359502691060:web:a8b1ceae0524c0d5193ca1",
    databaseURL: "https://pillgaurd-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// ================= INIT SAFE =================
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const firestoreDB = firebase.firestore();
const rtdb = firebase.database();

console.log("✅ Firebase Connected");

// ================= HELPER =================
function getValue(id) {
    const el = document.getElementById(id);
    return el && el.value ? el.value.trim() : "";
}

// ================= ROLE =================
function setRole(role) {
    localStorage.setItem("pillguard_role", role);
}

// ================= SIGNUP =================
async function handleSignup() {
    const role = localStorage.getItem("pillguard_role");
    const name = getValue("name");
    const email = getValue("email");
    const password = getValue("pass");

    if (!role) return alert("Select role first");
    if (!name || !email || !password) {
        return alert("Please fill all required fields");
    }

    const btn = document.querySelector(".submit-btn");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Creating account...";
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        let userData = {
            uid,
            name,
            email,
            role
        };

        // ================= CARETAKER DATA =================
        if (role === "Caretaker") {
            const address = getValue("address");
            const code = getValue("code");
            const prescriptionText = getValue("prescriptionText");

            userData.address = address;
            userData.code = code;
            userData.prescriptionText = prescriptionText || "";
        }

        // ================= PHARMACY DATA =================
        if (role === "Pharmacy") {
            userData.devices = [];
        }

        await firestoreDB.collection("users").doc(uid).set(userData);

        // Save caretaker UID in RTDB
        if (userData.code) {
            await rtdb.ref("device/" + userData.code + "/caretaker").set(uid);
        }

        localStorage.setItem("pillguard_uid", uid);
        localStorage.setItem("pillguard_code", userData.code || "");
        localStorage.setItem("pillguard_role", role);

        alert("✅ Account created successfully");

        window.location.href =
            role === "Caretaker" ?
            "caretaker_dashboard.html" :
            "pharmacy_dashboard.html";

    } catch (error) {
        console.error("Signup error:", error);
        alert(error.message);
    }

    if (btn) {
        btn.disabled = false;
        btn.textContent = "Create Account";
    }
}

// ================= LOGIN =================
async function handleLogin() {
    const email = getValue("email");
    const password = getValue("pass");

    if (!email || !password) {
        return alert("Enter email and password");
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        const doc = await firestoreDB.collection("users").doc(uid).get();
        const userData = doc.data();

        localStorage.setItem("pillguard_uid", uid);
        localStorage.setItem("pillguard_code", userData.code || "");
        localStorage.setItem("pillguard_role", userData.role || "");

        window.location.href =
            userData.role === "Caretaker" ?
            "caretaker_dashboard.html" :
            "pharmacy_dashboard.html";

    } catch (error) {
        console.error("Login error:", error);
        alert(error.message);
    }
}

// ================= UPDATE PRESCRIPTION TEXT =================
async function updatePrescriptionText(newText) {
    try {
        const uid = localStorage.getItem("pillguard_uid");
        if (!uid) return false;

        await firestoreDB.collection("users").doc(uid).update({
            prescriptionText: newText
        });

        return true;
    } catch (error) {
        console.error("Update prescription failed:", error);
        return false;
    }
}

// ================= SAVE PRESCRIPTION TEXT (UI HANDLER) =================
async function savePrescriptionText() {
    const textArea = document.getElementById("prescription-text");
    const statusEl = document.getElementById("upload-status");

    if (!textArea) return;

    const text = textArea.value.trim();

    statusEl.style.display = "block";
    statusEl.textContent = "⏳ Saving...";

    const success = await updatePrescriptionText(text);

    if (success) {
        statusEl.textContent = "✅ Saved successfully!";
    } else {
        statusEl.textContent = "❌ Failed to save";
    }

    setTimeout(() => {
        statusEl.style.display = "none";
    }, 3000);
}
// ================= LOGOUT =================
function logout() {
    auth.signOut().then(() => {
        localStorage.clear();
        window.location.href = "index.html";
    });
}

// ================= PHARMACY: ADD DEVICE =================
async function addDevice(code) {
    const uid = localStorage.getItem("pillguard_uid");
    if (!uid || !code) return;

    await firestoreDB.collection("users").doc(uid).update({
        devices: firebase.firestore.FieldValue.arrayUnion(code.trim().toUpperCase())
    });
}

// ================= PHARMACY: REMOVE DEVICE =================
async function removeDevice(code) {
    const uid = localStorage.getItem("pillguard_uid");
    if (!uid || !code) return;

    await firestoreDB.collection("users").doc(uid).update({
        devices: firebase.firestore.FieldValue.arrayRemove(code.trim().toUpperCase())
    });
}

// ================= CARETAKER: SET ALARM =================
async function setAlarm(hour, minute, label) {
    const code = localStorage.getItem("pillguard_code");
    if (!code) return;

    await rtdb.ref(`/device/${code}/alarms/${label}`).set({
        hour: Number(hour),
        minute: Number(minute),
        label
    });
}

// ================= CARETAKER: DELETE ALARM =================
async function deleteAlarm(label) {
    const code = localStorage.getItem("pillguard_code");
    if (!code) return;

    await rtdb.ref(`/device/${code}/alarms/${label}`).remove();
}

// ================= CARETAKER: SET LED SLOT =================
async function setLedSlot(slot, enabled) {
    const code = localStorage.getItem("pillguard_code");
    if (!code) return;

    await rtdb.ref(`/device/${code}/leds/${slot}`).set(!!enabled);
}