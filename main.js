// main.js - Client side logic

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    const sections = document.querySelectorAll('.page-section');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            // Remove active class from all sections
            sections.forEach(sec => {
                sec.classList.remove('active-section');
            });
            
            // Add active class to target section
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.classList.add('active-section');
                // Scroll to top of page when changing view
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });

    console.log("Welcome to Oebay.Bio single page app logic!");
});
