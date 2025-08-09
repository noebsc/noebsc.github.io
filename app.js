import { auth, db } from "./firebase-config.js";
import { 
    onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const accountBtn = document.getElementById("account-btn");
const accountMenu = document.getElementById("account-menu");
const accountInfo = document.getElementById("account-info");
const accountActions = document.getElementById("account-actions");
const projectsContainer = document.getElementById("projects-container");
const noProjects = document.getElementById("no-projects");

const authPopup = document.getElementById("auth-popup");
const closeAuthBtn = document.getElementById("close-auth");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const showSignupLink = document.getElementById("show-signup");
const showLoginLink = document.getElementById("show-login");

// Toggle menu
accountBtn.addEventListener("click", () => {
    accountMenu.classList.toggle("hidden");
});

// Fermer menu si clic extérieur
document.addEventListener("click", (e) => {
    if (!accountBtn.contains(e.target) && !accountMenu.contains(e.target)) {
        accountMenu.classList.add("hidden");
    }
});

// Chargement projets
async function loadProjects() {
    const querySnapshot = await getDocs(collection(db, "projects"));
    projectsContainer.innerHTML = "";
    if (querySnapshot.empty) {
        noProjects.classList.remove("hidden");
        return;
    }
    noProjects.classList.add("hidden");
    querySnapshot.forEach(doc => {
        const project = doc.data();
        const div = document.createElement("div");
        div.classList.add("project-card");
        div.innerHTML = `<h3>${project.name}</h3><a href="${project.url}" target="_blank">Ouvrir</a>`;
        projectsContainer.appendChild(div);
    });
}

// Auth state
onAuthStateChanged(auth, user => {
    accountActions.innerHTML = "";
    if (user) {
        accountInfo.innerHTML = `<strong>${user.email}</strong>`;
        accountActions.innerHTML = `<button id="logout-btn">Déconnexion</button>`;
        document.getElementById("logout-btn").addEventListener("click", () => {
            signOut(auth);
        });
    } else {
        accountInfo.innerHTML = `<em>Non connecté</em>`;
        accountActions.innerHTML = `
            <button id="login-btn">Connexion</button>
            <button id="signup-btn">Créer un compte</button>
        `;
        document.getElementById("login-btn").addEventListener("click", () => {
            authPopup.classList.remove("hidden");
            loginForm.classList.add("active");
            signupForm.classList.remove("active");
        });
        document.getElementById("signup-btn").addEventListener("click", () => {
            authPopup.classList.remove("hidden");
            signupForm.classList.add("active");
            loginForm.classList.remove("active");
        });
    }
    loadProjects();
});

// Fermer popup
closeAuthBtn.addEventListener("click", () => {
    authPopup.classList.add("hidden");
});

// Switch entre login/signup
showSignupLink.addEventListener("click", () => {
    loginForm.classList.remove("active");
    signupForm.classList.add("active");
});
showLoginLink.addEventListener("click", () => {
    signupForm.classList.remove("active");
    loginForm.classList.add("active");
});

// Soumission formulaire connexion
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm["login-email"].value;
    const password = loginForm["login-password"].value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        authPopup.classList.add("hidden");
        loginForm.reset();
    } catch (error) {
        alert("Erreur connexion : " + error.message);
    }
});

// Soumission formulaire inscription
signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = signupForm["signup-email"].value;
    const password = signupForm["signup-password"].value;
    const confirm = signupForm["signup-password-confirm"].value;
    if(password !== confirm) {
        alert("Les mots de passe ne correspondent pas.");
        return;
    }
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        authPopup.classList.add("hidden");
        signupForm.reset();
    } catch (error) {
        alert("Erreur inscription : " + error.message);
    }
});

// Licence
document.getElementById("licence-link").addEventListener("click", () => {
    document.getElementById("licence-popup").classList.remove("hidden");
});
document.getElementById("close-licence").addEventListener("click", () => {
    document.getElementById("licence-popup").classList.add("hidden");
});
