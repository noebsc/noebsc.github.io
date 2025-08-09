import { auth, db } from "./firebase-config.js";
import { 
    onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, getDocs, addDoc, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ADMIN_EMAIL = "besancon.noe@gmail.com";

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

// Nouveau : pop-up ajout/modif projet
const projectPopup = document.createElement("div");
projectPopup.id = "project-popup";
projectPopup.classList.add("hidden");
projectPopup.innerHTML = `
  <div class="project-modal">
    <button id="close-project-popup" title="Fermer">×</button>
    <h2 id="project-popup-title">Ajouter un projet</h2>
    <form id="project-form">
      <input type="text" id="project-name" placeholder="Nom du projet" required>
      <input type="url" id="project-url" placeholder="URL du projet" required>
      <button type="submit">Enregistrer</button>
    </form>
  </div>
`;
document.body.appendChild(projectPopup);

const closeProjectPopupBtn = document.getElementById("close-project-popup");
const projectForm = document.getElementById("project-form");
const projectNameInput = document.getElementById("project-name");
const projectUrlInput = document.getElementById("project-url");
const projectPopupTitle = document.getElementById("project-popup-title");

let editProjectId = null; // null = ajout, sinon id doc à modifier

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

async function loadProjects() {
    const querySnapshot = await getDocs(collection(db, "projects"));
    projectsContainer.innerHTML = "";
    if (querySnapshot.empty) {
        noProjects.classList.remove("hidden");
        return;
    }
    noProjects.classList.add("hidden");

    querySnapshot.forEach(docSnap => {
        const project = docSnap.data();
        const div = document.createElement("div");
        div.classList.add("project-card");
        div.innerHTML = `<h3>${project.name}</h3><a href="${project.url}" target="_blank">Ouvrir</a>`;

        // Si admin, ajouter bouton modifier
        if(currentUser && currentUser.email === ADMIN_EMAIL){
            const editBtn = document.createElement("button");
            editBtn.textContent = "Modifier";
            editBtn.style.marginLeft = "10px";
            editBtn.style.cursor = "pointer";
            editBtn.addEventListener("click", () => {
                openProjectPopup("modifier", docSnap.id, project.name, project.url);
            });
            div.appendChild(editBtn);
        }

        projectsContainer.appendChild(div);
    });
}

let currentUser = null;

onAuthStateChanged(auth, user => {
    currentUser = user;
    accountActions.innerHTML = "";

    if (user) {
        accountInfo.innerHTML = `<strong>${user.email}</strong>`;
        accountActions.innerHTML = `<button id="logout-btn">Déconnexion</button>`;

        // Si admin, ajouter bouton Ajouter projet
        if(user.email === ADMIN_EMAIL){
            const addBtn = document.createElement("button");
            addBtn.id = "add-project-btn";
            addBtn.textContent = "Ajouter un projet";
            addBtn.style.marginLeft = "10px";
            addBtn.addEventListener("click", () => openProjectPopup("ajouter"));
            accountActions.appendChild(addBtn);
        }

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

// Fonctions ouverture/fermeture popup projet
function openProjectPopup(mode, id = null, name = "", url = "") {
    projectPopup.classList.remove("hidden");
    if(mode === "modifier"){
        projectPopupTitle.textContent = "Modifier le projet";
        projectNameInput.value = name;
        projectUrlInput.value = url;
        editProjectId = id;
    } else {
        projectPopupTitle.textContent = "Ajouter un projet";
        projectForm.reset();
        editProjectId = null;
    }
}

closeProjectPopupBtn.addEventListener("click", () => {
    projectPopup.classList.add("hidden");
});

// Enregistrer ajout ou modif projet
projectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = projectNameInput.value.trim();
    const url = projectUrlInput.value.trim();

    if(editProjectId){
        // Modifier projet existant
        const projectRef = doc(db, "projects", editProjectId);
        try {
            await updateDoc(projectRef, { name, url });
            alert("Projet modifié avec succès.");
        } catch (err) {
            alert("Erreur lors de la modification : " + err.message);
        }
    } else {
        // Ajouter nouveau projet
        try {
            await addDoc(collection(db, "projects"), { name, url });
            alert("Projet ajouté avec succès.");
        } catch (err) {
            alert("Erreur lors de l'ajout : " + err.message);
        }
    }
    projectPopup.classList.add("hidden");
    loadProjects();
});

// === Le reste du code auth popup reste inchangé ===

closeAuthBtn.addEventListener("click", () => {
    authPopup.classList.add("hidden");
});

showSignupLink.addEventListener("click", () => {
    loginForm.classList.remove("active");
    signupForm.classList.add("active");
});
showLoginLink.addEventListener("click", () => {
    signupForm.classList.remove("active");
    loginForm.classList.add("active");
});

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

// Licence popup reste inchangé
document.getElementById("licence-link").addEventListener("click", () => {
    document.getElementById("licence-popup").classList.remove("hidden");
});
document.getElementById("close-licence").addEventListener("click", () => {
    document.getElementById("licence-popup").classList.add("hidden");
});
