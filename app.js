const userIcon = document.getElementById('user-icon');
const userEmailDisplay = document.getElementById('user-email');
const projectList = document.getElementById('project-list');
const adminPanel = document.getElementById('admin-panel');
const noProjectMsg = document.getElementById('no-project-msg');

// Auth
userIcon.addEventListener('click', () => {
    if (!auth.currentUser) {
        const choice = confirm("Vous n'êtes pas connecté. Voulez-vous vous inscrire ?");
        const email = prompt("Email :");
        const password = prompt("Mot de passe :");
        if (choice) {
            auth.createUserWithEmailAndPassword(email, password).catch(err => alert(err.message));
        } else {
            auth.signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
        }
    }
});

auth.onAuthStateChanged(user => {
    if (user) {
        userEmailDisplay.textContent = user.email;
        if (user.email === "besancon.noe@gmail.com") adminPanel.style.display = "block";
    } else {
        userEmailDisplay.textContent = "";
        adminPanel.style.display = "none";
    }
});

function loadProjects() {
    db.collection("projects").onSnapshot(snapshot => {
        projectList.innerHTML = "";
        if (snapshot.empty) {
            noProjectMsg.style.display = "block";
        } else {
            noProjectMsg.style.display = "none";
            snapshot.forEach(doc => {
                const proj = doc.data();
                const card = document.createElement("div");
                card.className = "project-card";
                card.innerHTML = `<h3>${proj.name}</h3><p>${proj.url}</p>`;
                card.onclick = () => window.open(proj.url, "_blank");
                projectList.appendChild(card);
            });
        }
    }, err => {
        console.error("Erreur Firestore:", err);
    });
}
loadProjects();

document.getElementById("add-project-btn").addEventListener("click", () => {
    const name = document.getElementById("project-name").value;
    const url = document.getElementById("project-url").value;
    if (name && url) {
        db.collection("projects").add({ name, url });
    }
});

// Licence modal
const modal = document.getElementById("license-modal");
document.getElementById("license-link").onclick = () => modal.style.display = "block";
document.querySelector(".close-btn").onclick = () => modal.style.display = "none";
window.onclick = e => { if (e.target == modal) modal.style.display = "none"; };
