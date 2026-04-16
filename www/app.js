// app.js
// ================= CONFIGURATION =================
console.log("🔥 app.js loaded");

const firebaseConfig = {
    apiKey: "AIzaSyDizcwmj7NQgii6IW34khKdnTGn_4MNmFk",
    authDomain: "pillgaurd.firebaseapp.com",
    projectId: "pillgaurd",
    messagingSenderId: "359502691060",
    appId: "1:359502691060:web:a8b1ceae0524c0d5193ca1",
    databaseURL: "https://pillgaurd-default-rtdb.asia-southeast1.firebasedatabase.app",
    storageBucket: "pillgaurd.appspot.com"
};

// ================= INIT SAFE =================
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const firestoreDB = firebase.firestore();
const rtdb = firebase.database();
const storage = firebase.storage();

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

// ================= UPLOAD PRESCRIPTION IMAGE =================
async function uploadPrescriptionImage(file, uid) {
    try {
        if (!file) return "";

        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = storage.ref(`prescriptions/${uid}/${fileName}`);

        await storageRef.put(file);
        return await storageRef.getDownloadURL();
    } catch (error) {
        console.error("Prescription upload failed:", error);
        return "";
    }
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
            const prescriptionText = getValue("prescriptionText"); // ✅ OCR text
            const fileInput = document.getElementById("prescriptionImg");
            const file = fileInput ? fileInput.files[0] : null;

            userData.address = address;
            userData.code = code;
            userData.prescriptionText = prescriptionText || "";

            if (file) {
                const imageUrl = await uploadPrescriptionImage(file, uid);
                userData.prescriptionURL = imageUrl;
            }
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
            role === "Caretaker"
                ? "caretaker_dashboard.html"
                : "pharmacy_dashboard.html";

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
            userData.role === "Caretaker"
                ? "caretaker_dashboard.html"
                : "pharmacy_dashboard.html";

    } catch (error) {
        console.error("Login error:", error);
        alert(error.message);
    }
}

// ================= UPDATE PRESCRIPTION IMAGE =================
async function updatePrescriptionImage(file) {
    try {
        const uid = localStorage.getItem("pillguard_uid");
        if (!uid || !file) return "";

        const imageUrl = await uploadPrescriptionImage(file, uid);

        await firestoreDB.collection("users").doc(uid).update({
            prescriptionURL: imageUrl
        });

        return imageUrl;
    } catch (error) {
        console.error("Update prescription failed:", error);
        return "";
    }
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