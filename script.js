document.addEventListener("DOMContentLoaded", () => {
    // Animation d'apparition
    const sections = document.querySelectorAll(".section");
    const options = { threshold: 0.5 };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("fadeIn");
            }
        });
    }, options);

    sections.forEach((section) => observer.observe(section));
});