import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const analyticsBtn = document.getElementById("analytics-btn");
const analyticsPopup = document.getElementById("analytics-popup");
const closeAnalyticsBtn = document.getElementById("close-analytics");

// Variables globales
let projects = [];
let currentUser = null;
let editingProjectId = null;
let clicksData = [];

// =============================== 
// SYSTÈME DE TAGS PERSONNALISÉ
// ===============================
const deviceOptions = {
    'desktop': { label: 'Ordinateur', icon: 'desktop', color: 'blue' },
    'desktop-recommended': { label: 'Ordinateur recommandé', icon: 'desktop', color: 'warning' },
    'desktop-only': { label: 'PC uniquement', icon: 'desktop', color: 'purple' },
    'mobile': { label: 'Téléphone', icon: 'mobile-alt', color: 'green' },
    'tablet': { label: 'Tablette', icon: 'tablet-alt', color: 'orange' },
    'android-only': { label: 'Android uniquement', icon: 'android', color: 'android' },
    'ios-only': { label: 'iOS uniquement', icon: 'apple', color: 'ios' },
    'all-devices': { label: 'Tous appareils', icon: 'globe', color: 'success' }
};

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
            
            <div class="devices-selection">
                <label class="form-label">Appareils supportés :</label>
                <div class="devices-checkboxes">
                    ${Object.entries(deviceOptions).map(([key, option]) => `
                        <label class="checkbox-label">
                            <input type="checkbox" value="${key}" class="device-checkbox">
                            <i class="fas fa-${option.icon}"></i>
                            ${option.label}
                        </label>
                    `).join('')}
                </div>
            </div>
            
            <div class="new-project-selection">
                <label class="checkbox-label new-project-label">
                    <input type="checkbox" id="project-is-new" class="new-project-checkbox">
                    <i class="fas fa-star"></i>
                    Marquer comme nouveau projet
                </label>
            </div>
            
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

// Fonction pour générer les tags basés sur la sélection d'appareils
function generateDeviceTags(selectedDevices) {
    if (!selectedDevices || selectedDevices.length === 0) {
        return [{ class: 'all-devices', text: 'Multi-plateformes', icon: 'globe' }];
    }

    const tags = [];
    
    // Logique spéciale pour les combinaisons
    if (selectedDevices.includes('desktop-recommended') && selectedDevices.includes('mobile')) {
        tags.push({ class: 'desktop-recommended', text: 'PC Recommandé + Mobile', icon: 'desktop' });
    } else if (selectedDevices.includes('desktop-recommended') && selectedDevices.includes('tablet')) {
        tags.push({ class: 'desktop-recommended', text: 'PC Recommandé + Tablette', icon: 'desktop' });
    } else if (selectedDevices.includes('desktop') && selectedDevices.includes('mobile') && selectedDevices.includes('tablet')) {
        tags.push({ class: 'all-devices', text: 'Multi-plateformes', icon: 'globe' });
    } else {
        // Tags individuels
        selectedDevices.forEach(device => {
            const option = deviceOptions[device];
            if (option) {
                let text = option.label;
                if (device === 'desktop') text = 'PC';
                if (device === 'desktop-recommended') text = 'PC Recommandé';
                if (device === 'desktop-only') text = 'PC Uniquement';
                if (device === 'mobile') text = 'Mobile';
                
                tags.push({
                    class: device,
                    text: text,
                    icon: option.icon
                });
            }
        });
    }
    
    return tags;
}

// Fonction pour créer une carte de projet
function createProjectCard(project) {
    const deviceTags = generateDeviceTags(project.supportedDevices);
    const isNew = project.isNew || false;
    
    return `
        <div class="project-card ${isNew ? 'new-project' : ''}" data-id="${project.id}">
            <div class="project-header">
                <h3 class="project-title">${project.title}</h3>
            </div>
            
            <div class="project-tags">
                ${isNew ? `
                    <span class="project-tag new-tag">
                        <i class="fas fa-star"></i>
                        NOUVEAU
                    </span>
                ` : ''}
                ${deviceTags.map(tag => `
                    <span class="project-tag ${tag.class}">
                        <i class="fas fa-${tag.icon}"></i>
                        ${tag.text}
                    </span>
                `).join('')}
            </div>
            
            <p class="project-description">${project.description || 'Description non définie'}</p>
            
            <div class="project-actions">
                <a href="${project.url}" target="_blank" class="project-btn primary" onclick="trackClick('${project.id}', '${project.title}', '${project.url}')">
                    <i class="fas fa-external-link-alt"></i>
                    Voir le projet
                </a>
            </div>
            
            ${currentUser && currentUser.email === ADMIN_EMAIL ? `
                <div class="admin-actions">
                    <button class="admin-btn ${isNew ? 'new-active' : 'new'}" onclick="toggleNewProject('${project.id}')">
                        <i class="fas fa-star"></i>
                        ${isNew ? 'Retirer nouveau' : 'Définir comme nouveau'}
                    </button>
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

// Fonction pour basculer le statut "nouveau" d'un projet
window.toggleNewProject = async (projectId) => {
    try {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        
        const newStatus = !project.isNew;
        
        await updateDoc(doc(db, "projects", projectId), {
            isNew: newStatus,
            updatedAt: new Date().toISOString()
        });
        
        // Mettre à jour localement
        project.isNew = newStatus;
        displayProjects();
        
    } catch (error) {
        console.error("Erreur lors de la mise à jour du statut nouveau:", error);
        alert("Erreur lors de la mise à jour du statut");
    }
};

// =============================== 
// ANALYTICS & TRACKING
// ===============================

// Fonction pour tracker les clics
window.trackClick = async (projectId, projectTitle, projectUrl) => {
    try {
        // Récupérer des informations sur l'utilisateur
        const userAgent = navigator.userAgent;
        const timestamp = new Date();
        
        // Détection du navigateur
        let browser = 'Unknown';
        if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';
        
        // Détection de l'appareil
        let device = 'Desktop';
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            device = 'Mobile';
        } else if (/iPad/i.test(userAgent)) {
            device = 'Tablet';
        }
        
        // Récupérer la localisation approximative (via IP)
        let country = 'Unknown';
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            country = data.country_name || 'Unknown';
        } catch (e) {
            console.log('Could not get location');
        }
        
        const clickData = {
            projectId,
            projectTitle,
            projectUrl,
            timestamp: serverTimestamp(),
            userAgent,
            browser,
            device,
            country,
            sessionId: getSessionId()
        };
        
        await addDoc(collection(db, "analytics"), clickData);
    } catch (error) {
        console.error("Erreur lors du tracking:", error);
    }
};

// Fonction pour générer un ID de session unique
function getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
}

// Fonction pour afficher les analytics
window.showAnalytics = async () => {
    analyticsPopup.classList.remove('hidden');
    accountMenu.classList.add('hidden');
    
    try {
        // Charger les données d'analytics
        const analyticsQuery = query(collection(db, "analytics"), orderBy("timestamp", "desc"), limit(100));
        const analyticsSnapshot = await getDocs(analyticsQuery);
        
        clicksData = [];
        analyticsSnapshot.forEach((doc) => {
            clicksData.push({ id: doc.id, ...doc.data() });
        });
        
        updateAnalyticsDisplay();
    } catch (error) {
        console.error("Erreur lors du chargement des analytics:", error);
    }
};

// Fonction pour mettre à jour l'affichage des analytics
function updateAnalyticsDisplay() {
    // Statistiques générales
    const totalClicks = clicksData.length;
    const uniqueVisitors = new Set(clicksData.map(click => click.sessionId)).size;
    
    // Projet le plus populaire
    const projectCounts = {};
    clicksData.forEach(click => {
        projectCounts[click.projectTitle] = (projectCounts[click.projectTitle] || 0) + 1;
    });
    const topProject = Object.keys(projectCounts).length > 0 
        ? Object.keys(projectCounts).reduce((a, b) => projectCounts[a] > projectCounts[b] ? a : b)
        : '-';
    
    document.getElementById('total-clicks').textContent = totalClicks;
    document.getElementById('unique-visitors').textContent = uniqueVisitors;
    document.getElementById('top-project').textContent = topProject;
    
    // Graphique des clics par projet
    updateProjectClicksChart(projectCounts);
    
    // Graphique d'activité quotidienne
    updateDailyActivityChart();
    
    // Table des clics récents
    updateClicksTable();
}

// Mise à jour du graphique des clics par projet
function updateProjectClicksChart(projectCounts) {
    const ctx = document.getElementById('projectClicksChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(projectCounts),
            datasets: [{
                data: Object.values(projectCounts),
                backgroundColor: [
                    '#4ea1f7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                    '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6366f1'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

// Mise à jour du graphique d'activité quotidienne
function updateDailyActivityChart() {
    const ctx = document.getElementById('dailyActivityChart').getContext('2d');
    
    // Grouper par jour sur les 7 derniers jours
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date.toLocaleDateString('fr-FR'));
    }
    
    const dailyCounts = last7Days.map(day => {
        return clicksData.filter(click => {
            if (!click.timestamp || !click.timestamp.toDate) return false;
            const clickDate = click.timestamp.toDate().toLocaleDateString('fr-FR');
            return clickDate === day;
        }).length;
    });
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Clics',
                data: dailyCounts,
                borderColor: '#4ea1f7',
                backgroundColor: 'rgba(78, 161, 247, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y: {
                    ticks: { color: '#ffffff' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

// Mise à jour de la table des clics récents
function updateClicksTable() {
    const tbody = document.getElementById('clicks-table-body');
    
    const recentClicks = clicksData.slice(0, 20);
    
    tbody.innerHTML = recentClicks.map(click => `
        <tr>
            <td>${click.projectTitle}</td>
            <td>${click.timestamp && click.timestamp.toDate ? click.timestamp.toDate().toLocaleString('fr-FR') : 'N/A'}</td>
            <td>${click.country}</td>
            <td>${click.browser}</td>
            <td>${click.device}</td>
        </tr>
    `).join('');
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

// Gestion du bouton analytics
analyticsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showAnalytics();
});

// Fermer les menus en cliquant ailleurs
document.addEventListener("click", (e) => {
    if (!accountMenu.contains(e.target) && !accountBtn.contains(e.target)) {
        accountMenu.classList.add("hidden");
    }
});

// Observer d'état d'authentification
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateAccountMenu();
    displayProjects();
    
    // Afficher/masquer le bouton analytics pour les admins
    if (currentUser && currentUser.email === ADMIN_EMAIL) {
        analyticsBtn.classList.remove('hidden');
    } else {
        analyticsBtn.classList.add('hidden');
    }
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

// Événements des pop-ups
closeAuthBtn.addEventListener("click", () => {
    authPopup.classList.add("hidden");
});

closeAnalyticsBtn.addEventListener("click", () => {
    analyticsPopup.classList.add("hidden");
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
        
        // Trier les projets : nouveaux en premier, puis par date de création
        projects.sort((a, b) => {
            // D'abord par statut "nouveau" (les nouveaux en premier)
            if (a.isNew && !b.isNew) return -1;
            if (!a.isNew && b.isNew) return 1;
            
            // Ensuite par date de création (plus récents en premier)
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
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
    
    // Décocher toutes les checkboxes
    document.querySelectorAll('.device-checkbox').forEach(cb => cb.checked = false);
    document.getElementById("project-is-new").checked = false;
    
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
    document.getElementById("project-is-new").checked = project.isNew || false;
    
    // Cocher les appareils supportés
    document.querySelectorAll('.device-checkbox').forEach(cb => {
        cb.checked = project.supportedDevices && project.supportedDevices.includes(cb.value);
    });
    
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
    
    // Récupérer les appareils sélectionnés
    const selectedDevices = Array.from(document.querySelectorAll('.device-checkbox:checked'))
        .map(cb => cb.value);
    
    const projectData = {
        title: document.getElementById("project-name").value,
        description: document.getElementById("project-description").value,
        url: document.getElementById("project-url").value,
        supportedDevices: selectedDevices,
        isNew: document.getElementById("project-is-new").checked,
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (editingProjectId) {
            await updateDoc(doc(db, "projects", editingProjectId), projectData);
        } else {
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

setTimeout(() => {
    if (donationPopup) {
        donationPopup.classList.remove("donation-popup-hidden");
    }
}, 30000);

if (closeDonationBtn) {
    closeDonationBtn.addEventListener("click", () => {
        donationPopup.classList.add("donation-popup-hidden");
    });
}

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

document.addEventListener("DOMContentLoaded", () => {
    loadProjects();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        authPopup.classList.add("hidden");
        projectPopup.classList.add("hidden");
        analyticsPopup.classList.add("hidden");
        donationPopup.classList.add("donation-popup-hidden");
        accountMenu.classList.add("hidden");
    }
});
