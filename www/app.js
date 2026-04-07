// ================= CONFIGURATION =================
console.log("🔥 app.js loaded");

const firebaseConfig = {
    apiKey: "AIzaSyDizcwmj7NQgii6IW34khKdnTGn_4MNmFk",
    authDomain: "pillgaurd.firebaseapp.com",
    projectId: "pillgaurd",
    storageBucket: "pillgaurd.firebasestorage.app",
    messagingSenderId: "359502691060",
    appId: "1:359502691060:web:a8b1ceae0524c0d5193ca1",
    measurementId: "G-GTL403NW6F"
};

// ================= INITIALIZE FIREBASE =================
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// safer references
const auth = firebase.auth();
const db = firebase.firestore();

console.log("Connected Project:", firebase.app().options.projectId);

// ================= ROLE MANAGEMENT =================
function setRole(role) {
    localStorage.setItem("pillguard_role", role);
    console.log("Role Selected:", role);
}

// ================= SIGNUP =================
function handleSignup() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("pass").value.trim();
    const code = document.getElementById("code").value.trim();
    const role = localStorage.getItem("pillguard_role");

    if (!role) {
        alert("Please select a role first.");
        return;
    }

    if (!name || !email || !password) {
        alert("Please fill all required fields.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(async(userCredential) => {
            const user = userCredential.user;

            await db.collection("users").doc(user.uid).set({
                name,
                email,
                role,
                code: code || "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert("Signup successful ✅");
            window.location.href = "login.html";
        })
        .catch((error) => {
            console.error("Signup Error:", error);
            alert(error.message);
        });
}

// ================= LOGIN =================
async function handleLogin() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("pass").value.trim();
    const selectedRole = localStorage.getItem("pillguard_role");

    if (!selectedRole) {
        alert("Please select role first.");
        window.location.href = "SelectRole.html";
        return;
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        const doc = await db.collection("users").doc(user.uid).get();

        if (!doc.exists) {
            alert("User data not found.");
            await auth.signOut();
            return;
        }

        const data = doc.data();

        if (data.role !== selectedRole) {
            alert(`Access Denied! Your role is ${data.role}`);
            await auth.signOut();
            return;
        }

        alert(`Welcome ${data.name} ✅`);

        if (data.role === "Caretaker") {
            window.location.href = "caretaker_dashboard.html";
        } else if (data.role === "Pharmacy") {
            window.location.href = "pharmacy_dashboard.html";
        }

    } catch (error) {
        console.error("Login Error:", error);

        if (error.code === "auth/invalid-login-credentials") {
            alert("Wrong email or password.");
        } else {
            alert(error.message);
        }
    }
}

// ================= LOGOUT =================
function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem("pillguard_role");
        alert("Logged out successfully");
        window.location.href = "index.html";
    });
}