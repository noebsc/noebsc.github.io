const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const projectList = document.getElementById('project-list');
const adminPanel = document.getElementById('admin-panel');

loginBtn.addEventListener('click', () => {
    const email = prompt("Email :");
    const password = prompt("Mot de passe :");
    auth.signInWithEmailAndPassword(email, password)
        .catch(err => alert(err.message));
});

logoutBtn.addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
    if (user) {
        userInfo.textContent = `Connecté : ${user.email}`;
        loginBtn.style.display = "none";
        logoutBtn.style.display = "block";

        if (user.email === "besancon.noe@gmail.com") {
            userInfo.textContent += " (Admin)";
            adminPanel.style.display = "block";
        }
    } else {
        userInfo.textContent = "";
        loginBtn.style.display = "block";
        logoutBtn.style.display = "none";
        adminPanel.style.display = "none";
    }
});

function loadProjects() {
    db.collection("projects").onSnapshot(snapshot => {
        projectList.innerHTML = "";
        snapshot.forEach(doc => {
            const proj = doc.data();
            const card = document.createElement("div");
            card.className = "project-card";
            card.innerHTML = `<h3>${proj.name}</h3><p>${proj.url}</p>`;
            card.onclick = () => window.open(proj.url, "_blank");
            projectList.appendChild(card);
        });
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
