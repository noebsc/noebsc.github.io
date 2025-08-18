import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Variables globales
let projects = [];
let currentUser = null;
let editingProjectId = null;


// Gestion de la fermeture
document.addEventListener('click', (e) => {
  if (e.target.id === 'close-donation-popup' || e.target === donationPopup) {
    donationPopup.style.display = 'none';
    console.log('Pop-up don fermé');
  }
});


// ===============================
// POP-UP PROJET - CRÉATION
// ===============================
const projectPopup = document.createElement("div");
projectPopup.id = "project-popup";
projectPopup.classList.add("hidden");
projectPopup.innerHTML = `
<div class="project-modal">
    <button id="close-project-popup" title="Fermer">&times;</button>
    <h2>Ajouter/Modifier un projet</h2>
    <form id="project-form">
        <input type="text" id="project-title" placeholder="Titre du projet" required>
        <input type="text" id="project-description" placeholder="Description" required>
        <input type="url" id="project-url" placeholder="URL du projet" required>
        <button type="submit">Enregistrer le projet</button>
    </form>
</div>
`;
document.body.appendChild(projectPopup);

// ===============================
// AUTHENTIFICATION
// ===============================
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        accountInfo.innerHTML = `
            <div style="font-size: 0.9rem; color: #ccc;">Connecté en tant que</div>
            <div style="font-weight: 600;">${user.email}</div>
        `;
        
        if (user.email === ADMIN_EMAIL) {
            accountActions.innerHTML = `
                <button onclick="addProject()">Ajouter un projet</button>
                <button onclick="signOut(auth)">Se déconnecter</button>
            `;
        } else {
            accountActions.innerHTML = `
                <button onclick="signOut(auth)">Se déconnecter</button>
            `;
        }
        
        await loadProjects();
    } else {
        accountInfo.innerHTML = `<div>Non connecté</div>`;
        accountActions.innerHTML = `
            <button onclick="showAuthPopup()">Se connecter</button>
        `;
        await loadProjects();
    }
});

// Gestion du menu compte
accountBtn.addEventListener("click", () => {
    accountMenu.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (!accountBtn.contains(e.target) && !accountMenu.contains(e.target)) {
        accountMenu.classList.add("hidden");
    }
});

// ===============================
// FONCTIONS D'AUTHENTIFICATION
// ===============================
function showAuthPopup() {
    authPopup.classList.remove("hidden");
    loginForm.classList.add("active");
    signupForm.classList.remove("active");
}

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
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        authPopup.classList.add("hidden");
    } catch (error) {
        alert("Erreur de connexion : " + error.message);
    }
});

signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        authPopup.classList.add("hidden");
    } catch (error) {
        alert("Erreur d'inscription : " + error.message);
    }
});

// ===============================
// GESTION DES PROJETS
// ===============================
async function loadProjects() {
    try {
        const querySnapshot = await getDocs(collection(db, "projects"));
        projects = [];
        querySnapshot.forEach((doc) => {
            projects.push({ id: doc.id, ...doc.data() });
        });
        
        displayProjects();
    } catch (error) {
        console.error("Erreur lors du chargement des projets:", error);
    }
}

function displayProjects() {
    if (projects.length === 0) {
        projectsContainer.innerHTML = '<div id="no-projects">Aucun projet pour le moment.</div>';
        return;
    }
    
    projectsContainer.innerHTML = projects.map(project => `
        <div class="project-card">
            <h3>${project.title || 'Titre non défini'}</h3>
            <p>${project.description || 'Description non définie'}</p>
            <a href="${project.url || '#'}" target="_blank">Voir le projet</a>
            ${currentUser && currentUser.email === ADMIN_EMAIL ? 
                `<button onclick="editProject('${project.id}')">Modifier</button>
                 <button onclick="deleteProject('${project.id}')">Supprimer</button>` : ''}
        </div>
    `).join('');
}

// ===============================
// FONCTIONS ADMIN PROJETS
// ===============================
function addProject() {
    if (currentUser && currentUser.email === ADMIN_EMAIL) {
        editingProjectId = null;
        document.getElementById("project-title").value = "";
        document.getElementById("project-description").value = "";
        document.getElementById("project-url").value = "";
        projectPopup.classList.remove("hidden");
    }
}

function editProject(projectId) {
    if (currentUser && currentUser.email === ADMIN_EMAIL) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            editingProjectId = projectId;
            document.getElementById("project-title").value = project.title || '';
            document.getElementById("project-description").value = project.description || '';
            document.getElementById("project-url").value = project.url || '';
            projectPopup.classList.remove("hidden");
        }
    }
}

async function deleteProject(projectId) {
    if (currentUser && currentUser.email === ADMIN_EMAIL) {
        if (confirm("Êtes-vous sûr de vouloir supprimer ce projet ?")) {
            try {
                await deleteDoc(doc(db, "projects", projectId));
                await loadProjects();
            } catch (error) {
                alert("Erreur lors de la suppression : " + error.message);
            }
        }
    }
}

// ===============================
// FORMULAIRE PROJET
// ===============================
document.getElementById("project-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) return;
    
    const title = document.getElementById("project-title").value;
    const description = document.getElementById("project-description").value;
    const url = document.getElementById("project-url").value;
    
    try {
        if (editingProjectId) {
            await updateDoc(doc(db, "projects", editingProjectId), {
                title,
                description,
                url,
                updatedAt: new Date()
            });
        } else {
            await addDoc(collection(db, "projects"), {
                title,
                description,
                url,
                createdAt: new Date()
            });
        }
        
        projectPopup.classList.add("hidden");
        await loadProjects();
    } catch (error) {
        alert("Erreur lors de l'enregistrement : " + error.message);
    }
});

// Fermeture du popup projet
document.getElementById("close-project-popup").addEventListener("click", () => {
    projectPopup.classList.add("hidden");
});

// ===============================
// FONCTIONS GLOBALES
// ===============================
window.addProject = addProject;
window.editProject = editProject;
window.deleteProject = deleteProject;
window.showAuthPopup = showAuthPopup;
