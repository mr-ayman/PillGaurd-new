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

// ================= INITIALIZE =================
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ✅ SERVICES
const auth = firebase.auth();
const firestoreDB = firebase.firestore();

console.log("✅ Firebase Connected");

// ================= ROLE =================
function setRole(role) {
    localStorage.setItem("pillguard_role", role);
}

// ================= SIGNUP =================
async function handleSignup() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("pass").value.trim();
    const code = document.getElementById("code").value.trim();
    const role = localStorage.getItem("pillguard_role");

    if (!role || !name || !email || !password) {
        alert("Fill all fields");
        return;
    }

    try {
        const userCred =
            await auth.createUserWithEmailAndPassword(email, password);

        await firestoreDB.collection("users").doc(userCred.user.uid).set({
            name,
            email,
            role,
            code
        });

        alert("Signup Success ✅");
        window.location.href = "login.html";

    } catch (err) {
        alert(err.message);
    }
}

// ================= LOGIN =================
async function handleLogin() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("pass").value.trim();
    const role = localStorage.getItem("pillguard_role");

    if (!role) {
        alert("Select role first");
        return;
    }

    try {
        const userCred =
            await auth.signInWithEmailAndPassword(email, password);

        const doc =
            await firestoreDB.collection("users").doc(userCred.user.uid).get();

        const data = doc.data();

        if (!data.code) {
            alert("No device linked");
            return;
        }

        localStorage.setItem("pillguard_code", data.code);

        if (data.role !== role) {
            alert("Wrong role");
            return;
        }

        if (role === "Caretaker") {
            window.location.href = "caretaker_dashboard.html";
        } else {
            window.location.href = "pharmacy_dashboard.html";
        }

    } catch (err) {
        alert(err.message);
    }
}

// ================= LOGOUT =================
function logout() {
    auth.signOut().then(() => {
        localStorage.clear();
        window.location.href = "index.html";
    });
}