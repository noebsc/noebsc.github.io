import { auth, db } from "./firebase-config.js";
import { 
    onAuthStateChanged, signOut 
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
            alert("Formulaire de connexion ici");
        });
        document.getElementById("signup-btn").addEventListener("click", () => {
            alert("Formulaire d'inscription ici");
        });
    }
    loadProjects();
});

// Licence
document.getElementById("licence-link").addEventListener("click", () => {
    document.getElementById("licence-popup").classList.remove("hidden");
});
document.getElementById("close-licence").addEventListener("click", () => {
    document.getElementById("licence-popup").classList.add("hidden");
});
