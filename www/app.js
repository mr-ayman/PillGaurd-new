// ================= CONFIGURATION =================
console.log("🔥 app.js loaded");

const firebaseConfig = {
    apiKey: "AIzaSyDizcwmj7NQgii6IW34khKdnTGn_4MNmFk",
    authDomain: "pillgaurd.firebaseapp.com",
    projectId: "pillgaurd",
    storageBucket: "pillgaurd.firebasestorage.app",
    messagingSenderId: "359502691060",
    appId: "1:359502691060:web:a8b1ceae0524c0d5193ca1",
    databaseURL: "https://pillgaurd-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// ================= INIT SAFE =================
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const firestoreDB = firebase.firestore();
const rtdb = firebase.database();

console.log("✅ Firebase Connected");


// ================= HELPER (IMPORTANT FIX) =================
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

    const name = getValue("name");
    const email = getValue("email");
    const password = getValue("pass");
    const prescriptionEl = document.getElementById("prescription");

    const addressEl = document.getElementById("address");
    const codeEl = document.getElementById("code");

    const role = localStorage.getItem("pillguard_role");

    if (!role) return alert("No role selected. Go back and choose a role.");
    if (!name || !email || !password) return alert("Fill all required fields");

    let address = "";
    let code = "";

    if (role === "Caretaker") {
        address = addressEl && addressEl.value ? addressEl.value.trim() : "";
        code = codeEl && codeEl.value ? codeEl.value.trim().toUpperCase() : "";
        prescription = prescriptionEl && prescriptionEl.value ?
            prescriptionEl.value.trim() :
            "";
        if (!address) return alert("Please enter your home address");
        if (!code) return alert("Please enter your device box code");
    }

    try {
        const userCred = await auth.createUserWithEmailAndPassword(email, password);

        const userData = {
            name: name,
            email: email,
            role: role
        };

        if (role === "Caretaker") {
            userData.address = address;
            userData.code = code;
            userData.prescription = prescription;
        }

        if (role === "Pharmacy") {
            userData.devices = [];
        }

        await firestoreDB.collection("users")
            .doc(userCred.user.uid)
            .set(userData);

        alert("Account created ✅ Please log in.");
        window.location.href = "login.html";

    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}


// ================= LOGIN =================
async function handleLogin() {

    const email = getValue("email");
    const password = getValue("pass");
    const role = localStorage.getItem("pillguard_role");

    if (!role) return alert("Select a role first");
    if (!email || !password) return alert("Enter email and password");

    const spinner = document.getElementById("spinner");
    if (spinner) spinner.style.display = "block";

    try {
        const userCred = await auth.signInWithEmailAndPassword(email, password);

        const docSnap = await firestoreDB
            .collection("users")
            .doc(userCred.user.uid)
            .get();

        const data = docSnap.data();

        if (!data) return alert("User record not found");
        if (data.role !== role) return alert("Wrong role selected");

        localStorage.setItem("pillguard_uid", userCred.user.uid);
        localStorage.setItem("pillguard_name", data.name || "");

        if (role === "Caretaker") {
            if (!data.code) return alert("No device code assigned");
            localStorage.setItem("pillguard_code", data.code);
            window.location.href = "caretaker_dashboard.html";
        } else {
            window.location.href = "pharmacy_dashboard.html";
        }

    } catch (err) {
        console.error(err);
        alert(err.message);
    } finally {
        if (spinner) spinner.style.display = "none";
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
        label: label
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