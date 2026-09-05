/**
 * The Lab Indonesia - Landing Page Interactive Script
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Modal Logic
    const modal = document.getElementById('inquiryModal');
    const openBtns = document.querySelectorAll('.open-inquiry-modal');
    const closeBtn = document.getElementById('closeModalBtn');
    const inquiryForm = document.getElementById('inquiryForm');

    openBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (modal) modal.classList.add('active');
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (modal) modal.classList.remove('active');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    if (inquiryForm) {
        inquiryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('inqName');
            const name = nameInput ? nameInput.value : 'Future Trainee';
            alert(`Thank you, ${name}! Your inquiry for The Lab Indonesia Training Cohort has been received. Our admissions team will reach out via WhatsApp / Email within 24 hours.`);
            inquiryForm.reset();
            if (modal) modal.classList.remove('active');
        });
    }

    // 2. Dynamic Count-Up Animation
    const stats = document.querySelectorAll('.stat-count');
    stats.forEach(stat => {
        const target = parseFloat(stat.getAttribute('data-target'));
        const suffix = stat.getAttribute('data-suffix') || '';
        const isDecimal = String(target).includes('.');
        let current = 0;
        const step = target / 40;

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                stat.textContent = `${isDecimal ? target.toFixed(1) : Math.round(target)}${suffix}`;
                clearInterval(timer);
            } else {
                stat.textContent = `${isDecimal ? current.toFixed(1) : Math.round(current)}${suffix}`;
            }
        }, 25);
    });

    // 3. Smooth Anchor Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
