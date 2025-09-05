import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ADMIN_EMAIL = "besancon.noe@gmail.com";

// Elements DOM
const accountBtn = document.getElementById("account-btn");
const accountMenu = document.getElementById("account-menu");
const accountInfo = document.getElementById("account-info");
const accountActions = document.getElementById("account-actions");
const projectsGrid = document.getElementById("projects-grid");
const noProjects = document.getElementById("no-projects");
const authPopup = document.getElementById("auth-popup");
const closeAuthBtn = document.getElementById("close-auth");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const showSignupLink = document.getElementById("show-signup");
const showLoginLink = document.getElementById("show-login");
const projectsCount = document.getElementById("projects-count");

// Variables globales
let projects = [];
let currentUser = null;
let editingProjectId = null;

// =============================== 
// POP-UP PROJET - CRÉATION
// ===============================
const projectPopup = document.createElement("div");
projectPopup.id = "project-popup";
projectPopup.classList.add("hidden");
projectPopup.innerHTML = `
    <div class="project-modal">
        <button id="close-project-popup">&times;</button>
        <h2 id="project-modal-title">Ajouter un projet</h2>
        <form id="project-form">
            <input type="text" id="project-name" placeholder="Nom du projet" required>
            <textarea id="project-description" placeholder="Description du projet" rows="4" required></textarea>
            <input type="url" id="project-url" placeholder="URL du projet" required>
            <input type="text" id="project-devices" placeholder="Appareils supportés (ex: Tous appareils, Ordinateur recommandé, Android uniquement)" required>
            <button type="submit">Enregistrer</button>
        </form>
    </div>
`;
document.body.appendChild(projectPopup);

// =============================== 
// POP-UP DE DON
// ===============================
const donationPopup = document.getElementById("donation-popup");
const closeDonationBtn = document.getElementById("close-donation-popup");

// =============================== 
// FONCTIONS UTILITAIRES
// ===============================

// Fonction pour déterminer le tag d'un projet basé sur les appareils
function getDeviceTag(devicesText) {
    const text = devicesText.toLowerCase();
    
    if (text.includes('android') && !text.includes('tous')) {
        return { class: 'android-only', text: 'Android' };
    } else if (text.includes('ordinateur recommandé') || text.includes('optimisé sur ordinateur')) {
        return { class: 'desktop-recommended', text: 'PC Recommandé' };
    } else {
        return { class: 'all-devices', text: 'Multi-plateformes' };
    }
}

// Fonction pour créer une carte de projet
function createProjectCard(project) {
    const deviceTag = getDeviceTag(project.devices || project.description || '');
    
    return `
        <div class="project-card" data-id="${project.id}">
            <div class="project-header">
                <h3 class="project-title">${project.title}</h3>
            </div>
            
            <div class="project-tags">
                <span class="project-tag ${deviceTag.class}">
                    <i class="fas fa-${deviceTag.class === 'android-only' ? 'mobile-alt' : deviceTag.class === 'desktop-recommended' ? 'desktop' : 'globe'}"></i>
                    ${deviceTag.text}
                </span>
            </div>
            
            <p class="project-description">${project.description || 'Description non définie'}</p>
            
            <div class="project-actions">
                <a href="${project.url}" target="_blank" class="project-btn primary">
                    <i class="fas fa-external-link-alt"></i>
                    Voir le projet
                </a>
            </div>
            
            ${currentUser && currentUser.email === ADMIN_EMAIL ? `
                <div class="admin-actions">
                    <button class="admin-btn edit" onclick="editProject('${project.id}')">
                        <i class="fas fa-edit"></i>
                        Modifier
                    </button>
                    <button class="admin-btn delete" onclick="deleteProject('${project.id}')">
                        <i class="fas fa-trash"></i>
                        Supprimer
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Fonction pour afficher les projets
function displayProjects() {
    if (projects.length === 0) {
        projectsGrid.innerHTML = '';
        noProjects.classList.remove('hidden');
        projectsCount.textContent = '0 projet';
        return;
    }

    noProjects.classList.add('hidden');
    projectsCount.textContent = `${projects.length} projet${projects.length > 1 ? 's' : ''}`;
    
    projectsGrid.innerHTML = projects.map(createProjectCard).join('');
}

// =============================== 
// GESTION DE L'AUTHENTIFICATION
// ===============================

// Basculer le menu compte
accountBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    accountMenu.classList.toggle("hidden");
});

// Fermer le menu compte en cliquant ailleurs
document.addEventListener("click", (e) => {
    if (!accountMenu.contains(e.target) && !accountBtn.contains(e.target)) {
        accountMenu.classList.add("hidden");
    }
});

// Observer d'état d'authentification
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAccountMenu();
    displayProjects(); // Mettre à jour l'affichage des projets
});

// Mettre à jour le menu compte
function updateAccountMenu() {
    if (currentUser) {
        accountInfo.innerHTML = `
            <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
                <strong>${currentUser.email}</strong>
                ${currentUser.email === ADMIN_EMAIL ? '<br><span style="color: var(--primary-color); font-size: 0.8rem;">Administrateur</span>' : ''}
            </div>
        `;
        
        accountActions.innerHTML = `
            ${currentUser.email === ADMIN_EMAIL ? `
                <button onclick="showAddProjectForm()">
                    <i class="fas fa-plus"></i>
                    Ajouter un projet
                </button>
            ` : ''}
            <button onclick="logout()">
                <i class="fas fa-sign-out-alt"></i>
                Se déconnecter
            </button>
        `;
    } else {
        accountInfo.innerHTML = '<p style="color: var(--text-secondary); margin-bottom: 10px;">Non connecté</p>';
        accountActions.innerHTML = `
            <button onclick="showAuthPopup()">
                <i class="fas fa-sign-in-alt"></i>
                Se connecter
            </button>
        `;
    }
}

// Fonctions d'authentification
window.showAuthPopup = () => {
    authPopup.classList.remove("hidden");
    accountMenu.classList.add("hidden");
};

window.logout = async () => {
    try {
        await signOut(auth);
        accountMenu.classList.add("hidden");
    } catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
    }
};

// Événements du pop-up d'authentification
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

// Gestion des formulaires d'authentification
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        authPopup.classList.add("hidden");
        loginForm.reset();
    } catch (error) {
        alert("Erreur de connexion: " + error.message);
    }
});

signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = signupForm.querySelector('input[type="email"]').value;
    const password = signupForm.querySelector('input[type="password"]').value;
    
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        authPopup.classList.add("hidden");
        signupForm.reset();
    } catch (error) {
        alert("Erreur d'inscription: " + error.message);
    }
});

// =============================== 
// GESTION DES PROJETS
// ===============================

// Charger les projets depuis Firestore
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

// Afficher le formulaire d'ajout de projet
window.showAddProjectForm = () => {
    editingProjectId = null;
    document.getElementById("project-modal-title").textContent = "Ajouter un projet";
    document.getElementById("project-form").reset();
    projectPopup.classList.remove("hidden");
    accountMenu.classList.add("hidden");
};

// Modifier un projet
window.editProject = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    editingProjectId = projectId;
    document.getElementById("project-modal-title").textContent = "Modifier le projet";
    document.getElementById("project-name").value = project.title || '';
    document.getElementById("project-description").value = project.description || '';
    document.getElementById("project-url").value = project.url || '';
    document.getElementById("project-devices").value = project.devices || '';
    
    projectPopup.classList.remove("hidden");
};

// Supprimer un projet
window.deleteProject = async (projectId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce projet ?")) return;
    
    try {
        await deleteDoc(doc(db, "projects", projectId));
        await loadProjects();
    } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression du projet");
    }
};

// Événements du pop-up de projet
document.getElementById("close-project-popup").addEventListener("click", () => {
    projectPopup.classList.add("hidden");
});

document.getElementById("project-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const projectData = {
        title: document.getElementById("project-name").value,
        description: document.getElementById("project-description").value,
        url: document.getElementById("project-url").value,
        devices: document.getElementById("project-devices").value,
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (editingProjectId) {
            // Modification
            await updateDoc(doc(db, "projects", editingProjectId), projectData);
        } else {
            // Ajout
            projectData.createdAt = new Date().toISOString();
            await addDoc(collection(db, "projects"), projectData);
        }
        
        projectPopup.classList.add("hidden");
        await loadProjects();
        document.getElementById("project-form").reset();
    } catch (error) {
        console.error("Erreur lors de l'enregistrement:", error);
        alert("Erreur lors de l'enregistrement du projet");
    }
});

// =============================== 
// POP-UP DE DON
// ===============================

// Afficher le pop-up de don après un délai
setTimeout(() => {
    if (donationPopup) {
        donationPopup.classList.remove("donation-popup-hidden");
    }
}, 30000); // 30 secondes

// Fermer le pop-up de don
if (closeDonationBtn) {
    closeDonationBtn.addEventListener("click", () => {
        donationPopup.classList.add("donation-popup-hidden");
    });
}

// Fermer le pop-up de don en cliquant à l'extérieur
if (donationPopup) {
    donationPopup.addEventListener("click", (e) => {
        if (e.target === donationPopup) {
            donationPopup.classList.add("donation-popup-hidden");
        }
    });
}

// =============================== 
// INITIALISATION
// ===============================

// Charger les projets au démarrage
document.addEventListener("DOMContentLoaded", () => {
    loadProjects();
});

// Fermer les pop-ups en appuyant sur Échap
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        authPopup.classList.add("hidden");
        projectPopup.classList.add("hidden");
        donationPopup.classList.add("donation-popup-hidden");
        accountMenu.classList.add("hidden");
    }
});
