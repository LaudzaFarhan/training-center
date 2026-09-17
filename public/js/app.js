/**
 * The Lab Indonesia - Training Center Instructor Dashboard
 * Frontend Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // State Store
    let cohorts = [];
    let trainees = [];
    let modules = [];
    let selectedCohortId = null;

    // Timer state
    let timerInterval = null;
    let timerSeconds = 0;
    let isTimerRunning = false;

    // Elements
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const cohortSelect = document.getElementById('cohortSelect');
    const serverClock = document.getElementById('currentTime');
    const traineeTableBody = document.getElementById('traineeTableBody');
    const searchTrainee = document.getElementById('searchTrainee');
    const modulesGrid = document.getElementById('modulesGrid');

    // Timer Elements
    const sessionTimerDisplay = document.getElementById('sessionTimerDisplay');
    const btnStartTimer = document.getElementById('btnStartTimer');
    const btnPauseTimer = document.getElementById('btnPauseTimer');
    const btnResetTimer = document.getElementById('btnResetTimer');
    const sessionStatusBadge = document.getElementById('sessionStatusBadge');

    // Modal Elements
    const scoreModal = document.getElementById('scoreModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnSaveScore = document.getElementById('btnSaveScore');
    const modalStudentName = document.getElementById('modalStudentName');
    const modalStudentId = document.getElementById('modalStudentId');
    const inputScore = document.getElementById('inputScore');
    const selectLabStatus = document.getElementById('selectLabStatus');

    // 1. Session Verification & Auth
    let currentUser = null;

    async function checkAuth() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.status === 401) {
                window.location.href = '/login?redirect=/dashboard';
                return;
            }
            const data = await res.json();
            if (data.user) {
                currentUser = data.user;
                const nameEl = document.getElementById('userName');
                const roleEl = document.getElementById('userRole');
                const initialsEl = document.getElementById('userInitials');
                if (nameEl) nameEl.textContent = data.user.name;
                if (roleEl) {
                    roleEl.textContent = data.user.role || 'Trainer';
                    // Custom role badge styling
                    if (data.user.role === 'Admin') {
                        roleEl.style.color = '#8C5E00';
                        roleEl.style.fontWeight = '700';
                    } else if (data.user.role === 'SPV') {
                        roleEl.style.color = 'var(--brand-navy)';
                        roleEl.style.fontWeight = '700';
                    } else if (data.user.role === 'Trainee') {
                        roleEl.style.color = 'var(--color-emerald)';
                        roleEl.style.fontWeight = '700';
                    } else {
                        roleEl.style.color = 'var(--brand-teal-hover)';
                        roleEl.style.fontWeight = '700';
                    }
                }
                if (initialsEl) {
                    const initials = data.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    initialsEl.textContent = initials;
                }

                // Populate Dropdown Menu User Info
                const dropName = document.getElementById('dropdownUserName');
                const dropEmail = document.getElementById('dropdownUserEmail');
                const dropRole = document.getElementById('dropdownUserRole');
                const dropInitials = document.getElementById('dropdownUserInitials');

                if (dropName) dropName.textContent = data.user.name;
                if (dropEmail) dropEmail.textContent = data.user.email || 'user@thelabindonesia.my.id';
                if (dropRole) {
                    dropRole.textContent = data.user.role || 'Trainer';
                    if (data.user.role === 'Admin') {
                        dropRole.style.background = 'rgba(245, 158, 11, 0.14)';
                        dropRole.style.color = '#8C5E00';
                    } else if (data.user.role === 'SPV') {
                        dropRole.style.background = 'rgba(14, 27, 77, 0.1)';
                        dropRole.style.color = 'var(--brand-navy)';
                    } else if (data.user.role === 'Trainee') {
                        dropRole.style.background = 'rgba(16, 185, 129, 0.12)';
                        dropRole.style.color = 'var(--color-emerald)';
                    } else {
                        dropRole.style.background = 'rgba(69, 183, 205, 0.15)';
                        dropRole.style.color = 'var(--brand-teal-hover)';
                    }
                }
                if (dropInitials && data.user.name) {
                    const initials = data.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    dropInitials.textContent = initials;
                }

                applyRolePermissions(data.user.role || 'Trainer');

                // Enforce first login password reset if flagged
                if (data.user.mustChangePassword) {
                    const firstLoginModal = document.getElementById('firstLoginModal');
                    if (firstLoginModal) {
                        firstLoginModal.classList.add('active');
                    }
                }
            }
        } catch (e) {
            console.warn('Auth check notice:', e);
        }
    }

    function applyRolePermissions(role) {
        const isTrainee = role === 'Trainee';

        // Filter sidebar navigation items based on data-roles
        navItems.forEach(item => {
            const allowedRoles = item.getAttribute('data-roles');
            if (!allowedRoles) return;
            const rolesArr = allowedRoles.split(',').map(r => r.trim());
            if (rolesArr.includes(role)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });

        const navTrainee = document.getElementById('navItemTrainee');
        if (isTrainee) {
            // Trainee view
            if (navTrainee) {
                navTrainee.style.display = 'flex';
                navTrainee.classList.add('active');
            }
            navItems.forEach(b => {
                if (b !== navTrainee) b.classList.remove('active');
            });
            tabPanes.forEach(pane => {
                if (pane.id === 'tab-trainee') {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });

            loadTraineeProfile();
        } else {
            if (navTrainee) navTrainee.style.display = 'none';
            // Ensure an authorized tab is active
            const activeNav = document.querySelector('.nav-item.active');
            if (!activeNav || activeNav.style.display === 'none' || activeNav.getAttribute('data-tab') === 'trainee') {
                const firstAllowed = Array.from(navItems).find(b => b.style.display !== 'none' && b.getAttribute('data-tab') !== 'trainee');
                if (firstAllowed) firstAllowed.click();
            }
        }
    }

    async function loadTraineeProfile() {
        try {
            const res = await fetch('/api/trainee/my-profile');
            if (!res.ok) return;
            const data = await res.json();
            if (!data.success) return;

            const user = data.user || currentUser || { name: 'Trainee' };
            const student = data.student || (data.profile && data.profile.student);
            const cohort = data.cohort || (data.profile && data.profile.cohort);
            const traineeMods = data.modules || (data.profile && data.profile.modules) || [];

            const greetingEl = document.getElementById('traineePortalGreeting');
            if (greetingEl) greetingEl.textContent = `Welcome back, ${user.name || 'Trainee'}!`;

            const badgeStatus = document.getElementById('traineeBadgeStatus');
            if (badgeStatus) badgeStatus.textContent = student?.labStatus === 'Verified' ? 'Verified Trainee ✓' : (student?.labStatus || 'Enrolled Trainee');

            const badgeCohort = document.getElementById('traineeBadgeCohort');
            if (badgeCohort) badgeCohort.textContent = cohort?.name ? cohort.name.split(' - ')[0] : 'The Lab 2026';

            const attVal = document.getElementById('traineeAttendanceVal');
            if (attVal) attVal.textContent = student ? `${student.attendance}%` : 'N/A';

            const scoreVal = document.getElementById('traineeScoreVal');
            if (scoreVal) scoreVal.textContent = student ? `${student.score} / 100` : 'N/A';

            const labStatusSub = document.getElementById('traineeLabStatusSub');
            if (labStatusSub) labStatusSub.textContent = `Status: ${student?.labStatus || 'Pending Review'}`;

            const cohortName = document.getElementById('traineeCohortName');
            if (cohortName) cohortName.textContent = cohort?.name || 'Class Cohort';

            const cohortRoom = document.getElementById('traineeCohortRoom');
            if (cohortRoom) cohortRoom.textContent = cohort?.room || 'The Lab Classroom';

            const cohortIdBadge = document.getElementById('traineeCohortIdBadge');
            if (cohortIdBadge) cohortIdBadge.textContent = cohort?.id || 'TL-2026';

            const cohortFullName = document.getElementById('traineeCohortFullName');
            if (cohortFullName) cohortFullName.textContent = cohort?.name || 'No assigned cohort';

            const cohortInstructor = document.getElementById('traineeCohortInstructor');
            if (cohortInstructor) cohortInstructor.textContent = cohort?.leadInstructor || 'Lead Mentor';

            const cohortSchedule = document.getElementById('traineeCohortSchedule');
            if (cohortSchedule) cohortSchedule.textContent = cohort?.schedule || 'Mon, Wed, Fri (19:00 - 21:30 WIB)';

            const cohortRoomDetail = document.getElementById('traineeCohortRoomDetail');
            if (cohortRoomDetail) cohortRoomDetail.textContent = cohort?.room || 'Lab Alpha';

            const modulesList = document.getElementById('traineeModulesList');
            if (modulesList && traineeMods) {
                modulesList.innerHTML = traineeMods.map(m => `
                    <div class="module-card">
                        <div class="module-header">
                            <span class="module-badge">${m.id}</span>
                            <span class="badge ${m.status === 'Completed' ? 'badge-emerald' : (m.status === 'In Progress' ? 'badge-amber' : 'badge-subtle')}">${m.status}</span>
                        </div>
                        <h4 class="module-title">${m.title}</h4>
                        <div class="module-meta" style="margin-top: 8px;">
                            <span>⏱️ ${m.hours} Hours</span>
                            <span>📈 ${m.completionRate} Progress</span>
                        </div>
                        <div class="progress-bar-wrap" style="margin-top: 10px;">
                            <div class="progress-fill" style="width: ${m.completionRate}; background: ${m.status === 'Completed' ? 'var(--color-emerald)' : 'var(--brand-teal)'};"></div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error('Failed to load trainee profile:', err);
        }
    }

    checkAuth();

    // Combined User Profile & Account Dropdown Interactions
    const btnUserProfile = document.getElementById('btnUserProfile');
    const userProfileDropdown = document.getElementById('userProfileDropdown');
    const userProfileWrapper = document.getElementById('userProfileWrapper');
    const btnOpenChangePassword = document.getElementById('btnOpenChangePassword');

    if (btnUserProfile && userProfileDropdown) {
        btnUserProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = userProfileDropdown.classList.contains('show');
            userProfileDropdown.classList.toggle('show', !isOpen);
            btnUserProfile.setAttribute('aria-expanded', String(!isOpen));
        });

        // Close on clicking outside
        document.addEventListener('click', (e) => {
            if (userProfileWrapper && !userProfileWrapper.contains(e.target)) {
                userProfileDropdown.classList.remove('show');
                btnUserProfile.setAttribute('aria-expanded', 'false');
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && userProfileDropdown.classList.contains('show')) {
                userProfileDropdown.classList.remove('show');
                btnUserProfile.setAttribute('aria-expanded', 'false');
                btnUserProfile.focus();
            }
        });
    }

    if (btnOpenChangePassword) {
        btnOpenChangePassword.addEventListener('click', () => {
            if (userProfileDropdown) {
                userProfileDropdown.classList.remove('show');
                if (btnUserProfile) btnUserProfile.setAttribute('aria-expanded', 'false');
            }
            const firstLoginModal = document.getElementById('firstLoginModal');
            if (firstLoginModal) {
                firstLoginModal.classList.add('active');
            }
        });
    }

    // Logout Handler (Triggered from Account Dropdown)
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (confirm('Log out from The Lab Instructor Center?')) {
                try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch (e) {}
                window.location.href = '/login';
            }
        });
    }

    // 2. Live Server Clock
    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Jakarta'
        });
        if (serverClock) {
            serverClock.textContent = `${timeStr} WIB`;
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // =========================================================================
    // Sidebar Minimize / Collapse Controller
    // =========================================================================
    const appSidebar = document.getElementById('appSidebar');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const btnTopbarSidebarToggle = document.getElementById('btnTopbarSidebarToggle');

    function setSidebarCollapsed(isCollapsed, persist = true) {
        if (!appSidebar) return;
        if (isCollapsed) {
            appSidebar.classList.add('collapsed');
            if (persist) localStorage.setItem('thelab_sidebar_collapsed', 'true');
            if (btnToggleSidebar) btnToggleSidebar.setAttribute('title', 'Expand Sidebar (Ctrl+B)');
            if (btnTopbarSidebarToggle) {
                btnTopbarSidebarToggle.setAttribute('title', 'Expand Sidebar (Ctrl+B)');
                btnTopbarSidebarToggle.classList.add('active');
            }
        } else {
            appSidebar.classList.remove('collapsed');
            if (persist) localStorage.setItem('thelab_sidebar_collapsed', 'false');
            if (btnToggleSidebar) btnToggleSidebar.setAttribute('title', 'Collapse Sidebar (Ctrl+B)');
            if (btnTopbarSidebarToggle) {
                btnTopbarSidebarToggle.setAttribute('title', 'Collapse Sidebar (Ctrl+B)');
                btnTopbarSidebarToggle.classList.remove('active');
            }
        }
    }

    function toggleSidebar() {
        if (!appSidebar) return;
        const willCollapse = !appSidebar.classList.contains('collapsed');
        setSidebarCollapsed(willCollapse);
    }

    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener('click', (e) => {
            e.preventDefault();
            toggleSidebar();
        });
    }

    if (btnTopbarSidebarToggle) {
        btnTopbarSidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            toggleSidebar();
        });
    }

    // Keyboard shortcut: Ctrl + B or Cmd + B
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
                return;
            }
            e.preventDefault();
            toggleSidebar();
        }
    });

    // Restore saved state
    try {
        const savedState = localStorage.getItem('thelab_sidebar_collapsed');
        if (savedState === 'true') {
            setSidebarCollapsed(true, false);
        }
    } catch (e) {}

    // 2. Navigation Tabs
    navItems.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            navItems.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            button.classList.add('active');
            const activePane = document.getElementById(`tab-${targetTab}`);
            if (activePane) activePane.classList.add('active');
            if (targetTab === 'qa' && typeof loadQaData === 'function') {
                loadQaData();
            }
            if (targetTab === 'training-area' && typeof initTrainingArea === 'function') {
                initTrainingArea();
            }
        });
    });

    // 3. Data Fetching
    async function loadInitialData() {
        try {
            const [cohortsRes, traineesRes, modulesRes] = await Promise.all([
                fetch('/api/cohorts').then(r => r.json()).catch(() => fallbackData.cohorts),
                fetch('/api/students').then(r => r.json()).catch(() => fallbackData.students),
                fetch('/api/modules').then(r => r.json()).catch(() => fallbackData.modules)
            ]);

            cohorts = cohortsRes || fallbackData.cohorts;
            trainees = traineesRes || fallbackData.students;
            modules = modulesRes || fallbackData.modules;

            initCohortSelector();
            renderSpotlight();
            renderTrainees();
            renderModules();
        } catch (err) {
            console.warn('Using local fallback data:', err);
            cohorts = fallbackData.cohorts;
            trainees = fallbackData.students;
            modules = fallbackData.modules;
            initCohortSelector();
            renderSpotlight();
            renderTrainees();
            renderModules();
        }
    }

    // Cohort selector
    function initCohortSelector() {
        if (!cohortSelect) return;
        cohortSelect.innerHTML = cohorts.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        selectedCohortId = cohorts[0]?.id;

        cohortSelect.addEventListener('change', (e) => {
            selectedCohortId = e.target.value;
            renderSpotlight();
            renderTrainees();
        });
    }

    // Spotlight Rendering
    function renderSpotlight() {
        const cohort = cohorts.find(c => c.id === selectedCohortId) || cohorts[0];
        if (!cohort) return;

        document.getElementById('spotlightTitle').textContent = cohort.name;
        document.getElementById('spotlightBadge').textContent = cohort.status;
        document.getElementById('spotlightInstructor').textContent = cohort.leadInstructor;
        document.getElementById('spotlightRoom').textContent = cohort.room;
        document.getElementById('spotlightSchedule').textContent = cohort.schedule;

        const progressEl = document.getElementById('spotlightProgress');
        const progressText = document.getElementById('spotlightProgressText');
        if (progressEl && progressText) {
            progressEl.style.width = `${cohort.progress}%`;
            progressText.textContent = `${cohort.progress}%`;
        }
    }

    // Trainees Rendering
    function renderTrainees() {
        if (!traineeTableBody) return;
        const query = (searchTrainee?.value || '').toLowerCase().trim();

        const filtered = trainees.filter(s => {
            const matchesCohort = !selectedCohortId || s.cohortId === selectedCohortId;
            const matchesSearch = s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query);
            return matchesCohort && matchesSearch;
        });

        if (filtered.length === 0) {
            traineeTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No trainees found matching the criteria.</td></tr>`;
            return;
        }

        traineeTableBody.innerHTML = filtered.map(student => `
            <tr>
                <td style="font-family: var(--font-mono); font-weight: 600; color: var(--accent-cyan);">${student.id}</td>
                <td class="student-name-cell">${student.name}</td>
                <td style="color: var(--text-muted);">${student.email}</td>
                <td>
                    <span style="font-weight: 700; color: ${student.attendance >= 90 ? 'var(--color-emerald)' : 'var(--color-amber)'}">
                        ${student.attendance}%
                    </span>
                </td>
                <td>
                    <span style="font-weight: 700; font-family: var(--font-mono); color: var(--text-primary);">
                        ${student.score} / 100
                    </span>
                </td>
                <td>
                    <span class="status-pill ${student.labStatus === 'Verified' ? 'verified' : 'pending'}">
                        ${student.labStatus}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-subtle btn-sm edit-score-btn" data-id="${student.id}" style="padding: 4px 10px; font-size: 12px;">
                            Evaluate
                        </button>
                        <button class="btn btn-sm delete-trainee-btn" data-id="${student.id}" data-name="${student.name}" style="padding: 4px 8px; font-size: 11.5px; background: var(--color-rose-light); color: var(--color-rose); border: 1px solid rgba(244, 63, 94, 0.2);">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Attach action handlers
        document.querySelectorAll('.edit-score-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const target = trainees.find(t => t.id === id);
                if (target) openScoreModal(target);
            });
        });

        document.querySelectorAll('.delete-trainee-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                if (confirm(`Remove trainee "${name}" from this cohort?`)) {
                    try {
                        const res = await fetch('/api/students/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ studentId: id })
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                            trainees = trainees.filter(t => t.id !== id);
                            renderTrainees();
                            loadInitialData();
                        } else {
                            alert(data.error || 'Failed to delete trainee');
                        }
                    } catch (e) {
                        alert('Network error deleting trainee');
                    }
                }
            });
        });
    }

    if (searchTrainee) {
        searchTrainee.addEventListener('input', renderTrainees);
    }

    // Mark all present button
    const btnMarkAllPresent = document.getElementById('btnMarkAllPresent');
    if (btnMarkAllPresent) {
        btnMarkAllPresent.addEventListener('click', async () => {
            trainees.forEach(t => {
                if (!selectedCohortId || t.cohortId === selectedCohortId) {
                    t.attendance = Math.min(100, t.attendance + 2);
                }
            });
            renderTrainees();
            alert('Attendance updated for current cohort session!');
        });
    }

    // Modal Logic
    function openScoreModal(student) {
        modalStudentId.value = student.id;
        modalStudentName.textContent = `Evaluate: ${student.name}`;
        inputScore.value = student.score;
        selectLabStatus.value = student.labStatus;
        scoreModal.classList.add('active');
    }

    function closeModal() {
        scoreModal.classList.remove('active');
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

    if (btnSaveScore) {
        btnSaveScore.addEventListener('click', async () => {
            const id = modalStudentId.value;
            const score = parseInt(inputScore.value, 10);
            const labStatus = selectLabStatus.value;

            try {
                const res = await fetch('/api/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId: id, score, labStatus })
                });
                if (res.ok) {
                    const student = trainees.find(t => t.id === id);
                    if (student) {
                        student.score = isNaN(score) ? student.score : score;
                        student.labStatus = labStatus;
                        renderTrainees();
                    }
                }
            } catch (err) {
                console.warn('Could not persist evaluation to API:', err);
            }
            closeModal();
        });
    }

    // Modules Rendering
    function renderModules() {
        if (!modulesGrid) return;
        modulesGrid.innerHTML = modules.map(m => `
            <div class="module-card">
                <div>
                    <div class="module-id">${m.id}</div>
                    <div class="module-title">${m.title}</div>
                    <span class="badge ${m.status === 'Completed' ? 'badge-emerald' : 'badge-accent'}">${m.status}</span>
                </div>
                <div class="module-meta-row">
                    <span>Duration: ${m.hours} Hours</span>
                    <span>Completion: <strong>${m.completionRate}</strong></span>
                </div>
            </div>
        `).join('');
    }

    // 4. Session Timer Control
    function formatTime(totalSeconds) {
        const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const secs = String(totalSeconds % 60).padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
    }

    if (btnStartTimer) {
        btnStartTimer.addEventListener('click', () => {
            if (!isTimerRunning) {
                isTimerRunning = true;
                btnStartTimer.disabled = true;
                btnPauseTimer.disabled = false;
                sessionStatusBadge.textContent = 'Session In Progress';
                sessionStatusBadge.className = 'badge badge-emerald';

                timerInterval = setInterval(() => {
                    timerSeconds++;
                    sessionTimerDisplay.textContent = formatTime(timerSeconds);
                }, 1000);
            }
        });
    }

    if (btnPauseTimer) {
        btnPauseTimer.addEventListener('click', () => {
            if (isTimerRunning) {
                clearInterval(timerInterval);
                isTimerRunning = false;
                btnStartTimer.disabled = false;
                btnPauseTimer.disabled = true;
                sessionStatusBadge.textContent = 'Session Paused';
                sessionStatusBadge.className = 'badge badge-subtle';
            }
        });
    }

    if (btnResetTimer) {
        btnResetTimer.addEventListener('click', () => {
            clearInterval(timerInterval);
            isTimerRunning = false;
            timerSeconds = 0;
            sessionTimerDisplay.textContent = '00:00:00';
            btnStartTimer.disabled = false;
            btnPauseTimer.disabled = true;
            sessionStatusBadge.textContent = 'Ready To Start';
            sessionStatusBadge.className = 'badge badge-accent';
        });
    }

    // Quick session button on topbar
    const btnQuickSession = document.getElementById('btnQuickSession');
    if (btnQuickSession) {
        btnQuickSession.addEventListener('click', () => {
            // Switch to sessions tab and start
            const sessionNavBtn = document.querySelector('[data-tab="sessions"]');
            if (sessionNavBtn) sessionNavBtn.click();
            btnStartTimer.click();
        });
    }

    // Checklist Counter
    const checkInputs = document.querySelectorAll('.lab-checklist input[type="checkbox"]');
    const checklistCount = document.getElementById('checklistCount');
    function updateChecklist() {
        const checked = Array.from(checkInputs).filter(i => i.checked).length;
        if (checklistCount) {
            checklistCount.textContent = `${checked}/${checkInputs.length} Done`;
        }
    }
    checkInputs.forEach(input => input.addEventListener('change', updateChecklist));

    // Fallback data in case server API is offline
    const fallbackData = {
        cohorts: [
            { id: 'TL-2026-B1', name: 'Cohort #1 - Advanced AI & Agentic Workflows', leadInstructor: 'Farhan Laudza', room: 'Lab Alpha (Workstation Room 101)', startDate: '2026-02-01', status: 'In Progress', progress: 68, schedule: 'Mon, Wed, Fri (19:00 - 21:30 WIB)' },
            { id: 'TL-2026-B2', name: 'Cohort #2 - Fullstack Cloud & DevOps Engineering', leadInstructor: 'Senior Lab Mentor', room: 'Lab Beta (Cloud Terminal)', startDate: '2026-02-15', status: 'In Progress', progress: 45, schedule: 'Tue, Thu, Sat (09:00 - 12:00 WIB)' }
        ],
        students: [
            { id: 'STU-01', cohortId: 'TL-2026-B1', name: 'Rian Pratama', email: 'rian@thelab.id', attendance: 95, score: 88, status: 'Active', labStatus: 'Verified' },
            { id: 'STU-02', cohortId: 'TL-2026-B1', name: 'Siti Nurhaliza', email: 'siti@thelab.id', attendance: 100, score: 94, status: 'Active', labStatus: 'Verified' },
            { id: 'STU-03', cohortId: 'TL-2026-B1', name: 'Budi Santoso', email: 'budi@thelab.id', attendance: 88, score: 79, status: 'Active', labStatus: 'Pending Review' },
            { id: 'STU-04', cohortId: 'TL-2026-B1', name: 'Nadia Safitri', email: 'nadia@thelab.id', attendance: 92, score: 91, status: 'Active', labStatus: 'Verified' },
            { id: 'STU-05', cohortId: 'TL-2026-B1', name: 'Dimas Wicaksono', email: 'dimas@thelab.id', attendance: 85, score: 82, status: 'Active', labStatus: 'Verified' },
            { id: 'STU-06', cohortId: 'TL-2026-B1', name: 'Aisyah Putri', email: 'aisyah@thelab.id', attendance: 100, score: 96, status: 'Active', labStatus: 'Verified' }
        ],
        modules: [
            { id: 'MOD-01', title: 'Module 1: Foundations & Architecture Setup', hours: 8, status: 'Completed', completionRate: '100%' },
            { id: 'MOD-02', title: 'Module 2: Agent Tooling, Multi-Agent & Orchestration', hours: 12, status: 'In Progress', completionRate: '75%' },
            { id: 'MOD-03', title: 'Module 3: Cloud Deployment, VPS & Production Pipeline', hours: 10, status: 'Next Up', completionRate: '0%' },
            { id: 'MOD-04', title: 'Module 4: Capstone Project & Industry Lab Evaluation', hours: 16, status: 'Scheduled', completionRate: '0%' }
        ]
    };

    // 5. User & Role Management Controller
    const usersTableBody = document.getElementById('usersTableBody');
    const btnOpenAddUser = document.getElementById('btnOpenAddUser');
    const addUserModal = document.getElementById('addUserModal');
    const btnCloseAddUserModal = document.getElementById('btnCloseAddUserModal');
    const btnCancelAddUser = document.getElementById('btnCancelAddUser');
    const addUserForm = document.getElementById('addUserForm');
    const newUserRole = document.getElementById('newUserRole');
    const userCohortGroup = document.getElementById('userCohortGroup');
    const userCohortSelect = document.getElementById('userCohortSelect');

    const editRoleModal = document.getElementById('editRoleModal');
    const btnCloseEditRoleModal = document.getElementById('btnCloseEditRoleModal');
    const btnCancelEditRole = document.getElementById('btnCancelEditRole');
    const editRoleForm = document.getElementById('editRoleForm');
    const editRoleUserId = document.getElementById('editRoleUserId');
    const editRoleUserName = document.getElementById('editRoleUserName');
    const editRoleSelect = document.getElementById('editRoleSelect');

    const resetPasswordModal = document.getElementById('resetPasswordModal');
    const btnCloseResetPwdModal = document.getElementById('btnCloseResetPwdModal');
    const btnCancelResetPwd = document.getElementById('btnCancelResetPwd');
    const resetPwdForm = document.getElementById('resetPwdForm');
    const resetPwdUserId = document.getElementById('resetPwdUserId');
    const resetPwdUserRole = document.getElementById('resetPwdUserRole');
    const resetPwdUserName = document.getElementById('resetPwdUserName');
    const defaultPwdDisplay = document.getElementById('defaultPwdDisplay');
    const btnApplyDefaultPwd = document.getElementById('btnApplyDefaultPwd');
    const inputNewPassword = document.getElementById('inputNewPassword');

    const btnUseDefaultPwdAdd = document.getElementById('btnUseDefaultPwdAdd');
    const newUserPwdHint = document.getElementById('newUserPwdHint');
    const newUserPassword = document.getElementById('newUserPassword');

    let currentUsers = [];
    let selectedRoleFilter = 'all';

    // Wire up Role Filter Buttons
    document.querySelectorAll('.role-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.role-filter-btn').forEach(b => {
                b.classList.remove('active');
                b.classList.add('btn-subtle');
            });
            btn.classList.add('active');
            btn.classList.remove('btn-subtle');
            selectedRoleFilter = btn.getAttribute('data-role');
            renderUsers();
        });
    });

    async function loadUsers() {
        if (!usersTableBody) return;
        try {
            const res = await fetch('/api/users');
            if (res.status === 403) {
                // Not authorized to view user management (e.g. Trainee or Trainer)
                return;
            }
            if (!res.ok) return;
            currentUsers = await res.json();
            renderUsers();
        } catch (e) {
            console.warn('Could not load users:', e);
        }
    }

    function renderUsers() {
        if (!usersTableBody) return;

        // Update counts for each role
        const countAll = currentUsers.length;
        const countAdmin = currentUsers.filter(u => u.role === 'Admin').length;
        const countTrainer = currentUsers.filter(u => u.role === 'Trainer').length;
        const countTrainee = currentUsers.filter(u => u.role === 'Trainee').length;
        const countSPV = currentUsers.filter(u => u.role === 'SPV').length;

        const elAll = document.getElementById('countAllUsers');
        const elAdmin = document.getElementById('countAdmin');
        const elTrainer = document.getElementById('countTrainer');
        const elTrainee = document.getElementById('countTrainee');
        const elSPV = document.getElementById('countSPV');

        if (elAll) elAll.textContent = countAll;
        if (elAdmin) elAdmin.textContent = countAdmin;
        if (elTrainer) elTrainer.textContent = countTrainer;
        if (elTrainee) elTrainee.textContent = countTrainee;
        if (elSPV) elSPV.textContent = countSPV;

        const filtered = selectedRoleFilter === 'all' 
            ? currentUsers 
            : currentUsers.filter(u => u.role === selectedRoleFilter);

        if (!filtered || filtered.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No users found in category "${selectedRoleFilter}".</td></tr>`;
            return;
        }

        usersTableBody.innerHTML = filtered.map(user => {
            const initials = (user.name || 'User').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '2026';
            
            let badgeStyle = 'background: var(--brand-teal-light); color: var(--brand-teal-hover); border: 1px solid rgba(69, 183, 205, 0.3);';
            let roleEmoji = '🎓';
            if (user.role === 'Admin') {
                badgeStyle = 'background: var(--brand-yellow-light); color: #8C5E00; border: 1px solid rgba(246, 197, 81, 0.5);';
                roleEmoji = '👑';
            } else if (user.role === 'SPV') {
                badgeStyle = 'background: rgba(14, 27, 77, 0.08); color: var(--brand-navy); border: 1px solid rgba(14, 27, 77, 0.25);';
                roleEmoji = '👔';
            } else if (user.role === 'Trainee') {
                badgeStyle = 'background: var(--color-emerald-light); color: var(--color-emerald); border: 1px solid rgba(16, 185, 129, 0.3);';
                roleEmoji = '🎒';
            }

            return `
                <tr>
                    <td style="font-family: var(--font-mono); font-weight: 700; color: var(--brand-teal-hover);">${user.id}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="avatar-ring" style="width: 32px; height: 32px; font-size: 11px;">${initials}</div>
                            <strong style="color: var(--brand-navy); font-size: 13.5px;">${user.name}</strong>
                        </div>
                    </td>
                    <td style="color: var(--text-secondary); font-family: var(--font-mono); font-size: 12.5px;">${user.email}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span class="badge" style="${badgeStyle}">${roleEmoji} ${user.role}</span>
                            ${user.mustChangePassword 
                                ? `<span class="badge" style="background: rgba(245, 158, 11, 0.12); color: #B45309; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 10px; padding: 2px 6px;" title="User is still using initial default password">Initial Pwd</span>` 
                                : `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.25); font-size: 10px; padding: 2px 6px;" title="User has set a personal password">Personal Pwd</span>`}
                        </div>
                    </td>
                    <td style="color: var(--text-muted); font-size: 12.5px;">${dateStr}</td>
                    <td>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            <button class="btn btn-subtle btn-sm edit-role-btn" data-id="${user.id}" data-name="${user.name}" data-role="${user.role}" style="padding: 4px 8px; font-size: 11.5px;">
                                Role
                            </button>
                            <button class="btn btn-subtle btn-sm reset-pwd-btn" data-id="${user.id}" data-name="${user.name}" data-role="${user.role}" style="padding: 4px 8px; font-size: 11.5px; color: var(--brand-navy); border-color: rgba(14, 27, 77, 0.2);">
                                🔑 Reset
                            </button>
                            <button class="btn btn-sm delete-user-btn" data-id="${user.id}" data-name="${user.name}" style="padding: 4px 8px; font-size: 11.5px; background: var(--color-rose-light); color: var(--color-rose); border: 1px solid rgba(244, 63, 94, 0.2);">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach action handlers
        document.querySelectorAll('.edit-role-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                const role = btn.getAttribute('data-role');
                editRoleUserId.value = id;
                editRoleUserName.textContent = `Edit Role: ${name}`;
                editRoleSelect.value = role;
                editRoleModal.classList.add('active');
            });
        });

        document.querySelectorAll('.reset-pwd-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                const role = btn.getAttribute('data-role') || 'Trainer';
                const defaultPwd = `${role.toLowerCase()}12345`;

                if (resetPwdUserId) resetPwdUserId.value = id;
                if (resetPwdUserRole) resetPwdUserRole.value = role;
                if (resetPwdUserName) resetPwdUserName.textContent = `Reset Password: ${name}`;
                if (defaultPwdDisplay) defaultPwdDisplay.textContent = defaultPwd;
                if (inputNewPassword) inputNewPassword.value = defaultPwd;
                if (resetPasswordModal) resetPasswordModal.classList.add('active');
            });
        });

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                if (confirm(`Are you sure you want to remove user "${name}" from The Lab?`)) {
                    try {
                        const res = await fetch('/api/users/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: id })
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                            loadUsers();
                            checkDbStatus();
                        } else {
                            alert(data.error || 'Failed to delete user');
                        }
                    } catch (e) {
                        alert('Network error while deleting user');
                    }
                }
            });
        });
    }

    if (newUserRole && userCohortGroup) {
        newUserRole.addEventListener('change', (e) => {
            if (e.target.value === 'Trainee') {
                userCohortGroup.style.display = 'block';
                if (userCohortSelect && cohorts && cohorts.length > 0) {
                    userCohortSelect.innerHTML = cohorts.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                }
            } else {
                userCohortGroup.style.display = 'none';
            }
        });
    }

    if (btnOpenAddUser) {
        btnOpenAddUser.addEventListener('click', () => {
            if (userCohortSelect && cohorts && cohorts.length > 0) {
                userCohortSelect.innerHTML = cohorts.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                if (selectedCohortId) userCohortSelect.value = selectedCohortId;
            }
            if (newUserRole && userCohortGroup) {
                userCohortGroup.style.display = newUserRole.value === 'Trainee' ? 'block' : 'none';
            }
            addUserModal.classList.add('active');
        });
    }

    if (btnCloseAddUserModal) {
        btnCloseAddUserModal.addEventListener('click', () => addUserModal.classList.remove('active'));
    }
    if (btnCancelAddUser) {
        btnCancelAddUser.addEventListener('click', () => addUserModal.classList.remove('active'));
    }

    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('newUserName').value.trim();
            const email = document.getElementById('newUserEmail').value.trim();
            const password = document.getElementById('newUserPassword').value;
            const role = document.getElementById('newUserRole').value;
            const cohortId = (role === 'Trainee' && userCohortSelect) ? userCohortSelect.value : undefined;

            try {
                const res = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role, cohortId })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    alert(`Team member "${name}" created successfully as ${role}!`);
                    addUserForm.reset();
                    addUserModal.classList.remove('active');
                    loadUsers();
                    checkDbStatus();
                    if (role === 'Trainee') {
                        loadInitialData();
                    }
                } else {
                    alert(data.error || 'Failed to create user');
                }
            } catch (err) {
                alert('Network error while creating user');
            }
        });
    }

    if (btnCloseEditRoleModal) {
        btnCloseEditRoleModal.addEventListener('click', () => editRoleModal.classList.remove('active'));
    }
    if (btnCancelEditRole) {
        btnCancelEditRole.addEventListener('click', () => editRoleModal.classList.remove('active'));
    }

    if (editRoleForm) {
        editRoleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = editRoleUserId.value;
            const role = editRoleSelect.value;
            try {
                const res = await fetch('/api/users/update-role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: id, role })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    editRoleModal.classList.remove('active');
                    loadUsers();
                } else {
                    alert(data.error || 'Failed to update role');
                }
            } catch (err) {
                alert('Network error updating role');
            }
        });
    }

    // Reset Password Modal Handlers
    if (btnApplyDefaultPwd) {
        btnApplyDefaultPwd.addEventListener('click', () => {
            const role = resetPwdUserRole ? resetPwdUserRole.value : 'Trainer';
            if (inputNewPassword) inputNewPassword.value = `${(role || 'trainer').toLowerCase()}12345`;
        });
    }

    if (btnCloseResetPwdModal) {
        btnCloseResetPwdModal.addEventListener('click', () => resetPasswordModal.classList.remove('active'));
    }
    if (btnCancelResetPwd) {
        btnCancelResetPwd.addEventListener('click', () => resetPasswordModal.classList.remove('active'));
    }

    if (resetPwdForm) {
        resetPwdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = resetPwdUserId.value;
            const newPassword = inputNewPassword.value.trim();
            try {
                const res = await fetch('/api/users/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, password: newPassword })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    alert(`✅ Password for "${data.name}" (${data.role}) successfully reset to:\n\n${data.password}`);
                    resetPasswordModal.classList.remove('active');
                } else {
                    alert(data.error || 'Failed to reset password');
                }
            } catch (err) {
                alert('Network error while resetting password');
            }
        });
    }

    // Default password sync for Add User modal
    function updateAddUserDefaultPwd() {
        if (!newUserRole) return;
        const def = `${newUserRole.value.toLowerCase()}12345`;
        if (newUserPwdHint) newUserPwdHint.innerHTML = `Default password for ${newUserRole.value}: <code>${def}</code>`;
        if (newUserPassword) newUserPassword.placeholder = def;
    }

    if (newUserRole) {
        newUserRole.addEventListener('change', updateAddUserDefaultPwd);
    }
    if (btnUseDefaultPwdAdd && newUserRole && newUserPassword) {
        btnUseDefaultPwdAdd.addEventListener('click', () => {
            newUserPassword.value = `${newUserRole.value.toLowerCase()}12345`;
        });
    }

    // -----------------------------------------------------------------
    // First-Time Login / Forced Password Change Controller
    // -----------------------------------------------------------------
    const firstLoginModal = document.getElementById('firstLoginModal');
    const firstLoginForm = document.getElementById('firstLoginForm');
    const firstLoginNewPwd = document.getElementById('firstLoginNewPwd');
    const firstLoginConfirmPwd = document.getElementById('firstLoginConfirmPwd');
    const firstLoginError = document.getElementById('firstLoginError');

    if (firstLoginForm) {
        firstLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (firstLoginError) firstLoginError.style.display = 'none';

            const pwd = firstLoginNewPwd.value.trim();
            const confirmPwd = firstLoginConfirmPwd.value.trim();

            if (pwd.length < 6) {
                if (firstLoginError) {
                    firstLoginError.textContent = 'Password must be at least 6 characters.';
                    firstLoginError.style.display = 'block';
                }
                return;
            }

            if (pwd !== confirmPwd) {
                if (firstLoginError) {
                    firstLoginError.textContent = 'Passwords do not match. Please re-enter.';
                    firstLoginError.style.display = 'block';
                }
                return;
            }

            try {
                const res = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newPassword: pwd })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    if (firstLoginModal) firstLoginModal.classList.remove('active');
                    alert('🎉 Your personal password has been successfully set! Welcome to The Lab.');
                    if (currentUser) currentUser.mustChangePassword = false;
                    loadUsers();
                } else {
                    if (firstLoginError) {
                        firstLoginError.textContent = data.error || 'Failed to update password.';
                        firstLoginError.style.display = 'block';
                    }
                }
            } catch (err) {
                if (firstLoginError) {
                    firstLoginError.textContent = 'Network error while updating password.';
                    firstLoginError.style.display = 'block';
                }
            }
        });
    }

    // -----------------------------------------------------------------
    // Trainee Enrollment (Add Trainee Modal)
    // -----------------------------------------------------------------
    const addTraineeModal = document.getElementById('addTraineeModal');
    const btnOpenAddTrainee = document.getElementById('btnOpenAddTrainee');
    const btnCloseAddTraineeModal = document.getElementById('btnCloseAddTraineeModal');
    const btnCancelAddTrainee = document.getElementById('btnCancelAddTrainee');
    const addTraineeForm = document.getElementById('addTraineeForm');
    const newTraineeCohort = document.getElementById('newTraineeCohort');

    if (btnOpenAddTrainee) {
        btnOpenAddTrainee.addEventListener('click', () => {
            if (newTraineeCohort && cohorts && cohorts.length > 0) {
                newTraineeCohort.innerHTML = cohorts.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                if (selectedCohortId) newTraineeCohort.value = selectedCohortId;
            }
            addTraineeModal.classList.add('active');
        });
    }

    if (btnCloseAddTraineeModal) {
        btnCloseAddTraineeModal.addEventListener('click', () => addTraineeModal.classList.remove('active'));
    }
    if (btnCancelAddTrainee) {
        btnCancelAddTrainee.addEventListener('click', () => addTraineeModal.classList.remove('active'));
    }

    if (addTraineeForm) {
        addTraineeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('newTraineeName').value.trim();
            const email = document.getElementById('newTraineeEmail').value.trim();
            const cohortId = newTraineeCohort ? newTraineeCohort.value : 'TL-2026-B1';
            const attendance = parseInt(document.getElementById('newTraineeAttendance').value, 10);
            const score = parseInt(document.getElementById('newTraineeScore').value, 10);

            try {
                const res = await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, cohortId, attendance, score, status: 'Active', labStatus: 'Verified' })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    alert(`Trainee "${name}" enrolled successfully!`);
                    addTraineeForm.reset();
                    addTraineeModal.classList.remove('active');
                    loadInitialData();
                    checkDbStatus();
                } else {
                    alert(data.error || 'Failed to enroll trainee');
                }
            } catch (err) {
                alert('Network error enrolling trainee');
            }
        });
    }

    // -----------------------------------------------------------------
    // Live PostgreSQL Telemetry & Health Indicator
    // -----------------------------------------------------------------
    async function checkDbStatus() {
        const dbStatusDot = document.getElementById('dbStatusDot');
        const dbStatusTitle = document.getElementById('dbStatusTitle');
        const dbStatusDetail = document.getElementById('dbStatusDetail');
        const topbarDbDot = document.getElementById('topbarDbDot');
        const topbarDbText = document.getElementById('topbarDbText');
        const usersDbNotice = document.getElementById('usersDbNotice');
        const usersDbIcon = document.getElementById('usersDbIcon');
        const usersDbText = document.getElementById('usersDbText');
        const usersDbCount = document.getElementById('usersDbCount');

        try {
            const res = await fetch('/api/system/db-status');
            if (!res.ok) return;
            const data = await res.json();

            if (data.connected) {
                if (dbStatusDot) dbStatusDot.style.background = '#10b981';
                if (dbStatusTitle) dbStatusTitle.textContent = 'PostgreSQL Active';
                if (dbStatusDetail) dbStatusDetail.textContent = `${data.database} • ${data.latencyMs}ms • Live DB`;

                if (topbarDbDot) topbarDbDot.style.background = '#10b981';
                if (topbarDbText) topbarDbText.textContent = `🐘 PostgreSQL Live (${data.latencyMs}ms)`;

                if (usersDbNotice) {
                    usersDbNotice.style.background = 'rgba(16, 185, 129, 0.08)';
                    usersDbNotice.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                    usersDbNotice.style.color = '#065f46';
                }
                if (usersDbIcon) usersDbIcon.textContent = '🐘';
                if (usersDbText) usersDbText.innerHTML = `<strong>PostgreSQL Connected:</strong> Managing live data in <code>${data.database}</code> (${data.host}).`;
                if (usersDbCount) usersDbCount.textContent = `${data.counts?.users || 0} Registered Users`;
            } else {
                if (dbStatusDot) dbStatusDot.style.background = '#f59e0b';
                if (dbStatusTitle) dbStatusTitle.textContent = 'In-Memory Mode';
                if (dbStatusDetail) dbStatusDetail.textContent = 'Notice: Data not persisted to DB';

                if (topbarDbDot) topbarDbDot.style.background = '#f59e0b';
                if (topbarDbText) topbarDbText.textContent = '🟡 Memory Store';

                if (usersDbNotice) {
                    usersDbNotice.style.background = 'rgba(245, 158, 11, 0.1)';
                    usersDbNotice.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                    usersDbNotice.style.color = '#92400e';
                }
                if (usersDbIcon) usersDbIcon.textContent = '⚠️';
                const errSnippet = data.error ? ` (${data.error.split('\n')[0].substring(0, 45)}...)` : '';
                if (usersDbText) usersDbText.innerHTML = `<strong>Memory Mode:</strong> PostgreSQL is not connected${errSnippet}. Accounts reset on server restart.`;
                if (usersDbCount) usersDbCount.textContent = `${data.counts?.users || 0} Temporary Users`;
            }
        } catch (e) {
            console.warn('Could not check database status:', e);
        }
    }

    // =========================================================================
    // THE QA & BUG TRACKER CONTROLLER (/new/qa-tracker)
    // =========================================================================
    let qaIssues = [];
    let qaStats = { total: 0, open: 0, inProgress: 0, readyForQa: 0, resolved: 0, closed: 0, critical: 0 };
    let qaFilterState = { status: 'all', type: 'all', priority: 'all', module: 'all', q: '' };
    let qaCurrentView = 'list';
    let qaNewIssueAttachments = [];
    let qaCommentAttachments = [];
    let activeDetailIssueId = null;
    const qaAlertsSeen = new Set();

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getClientEnvironment() {
        const ua = navigator.userAgent;
        let browser = 'Chrome';
        if (ua.includes('Edg/')) browser = 'Edge ' + (ua.match(/Edg\/(\d+[\.\d]*)/)?.[1] || '');
        else if (ua.includes('Chrome/')) browser = 'Chrome ' + (ua.match(/Chrome\/(\d+[\.\d]*)/)?.[1] || '');
        else if (ua.includes('Firefox/')) browser = 'Firefox ' + (ua.match(/Firefox\/(\d+[\.\d]*)/)?.[1] || '');
        else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari ' + (ua.match(/Version\/(\d+[\.\d]*)/)?.[1] || '');

        let os = 'Windows 11';
        if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
        else if (ua.includes('Macintosh')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

        const screenRes = `${window.screen.width}x${window.screen.height}`;
        const viewport = `${window.innerWidth}x${window.innerHeight}`;
        const currentUrl = window.location.href;

        return { browser, os, screenRes, viewport, currentUrl };
    }

    function showQaToast(title, message, type = 'info', issueId = null) {
        const container = document.getElementById('qaToastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `qa-toast ${type === 'critical' ? 'critical' : (type === 'high' ? 'high' : '')}`;
        toast.innerHTML = `
            <div style="font-size: 20px; flex-shrink: 0;">${type === 'critical' ? '🚨' : (type === 'high' ? '⚠️' : '🐞')}</div>
            <div class="qa-toast-content" style="flex: 1; cursor: ${issueId ? 'pointer' : 'default'};">
                <h5>${escapeHtml(title)}</h5>
                <p>${escapeHtml(message)}</p>
            </div>
            <button class="qa-toast-close">&times;</button>
        `;
        if (issueId) {
            toast.querySelector('.qa-toast-content').addEventListener('click', () => {
                openQaDetailModal(issueId);
                toast.remove();
            });
        }
        toast.querySelector('.qa-toast-close').addEventListener('click', () => toast.remove());
        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 7000);
    }

    async function loadQaData() {
        await Promise.all([loadQaStats(), loadQaIssues(), populateQaAssignees()]);
        updateDraftBadges();
    }

    async function loadQaStats() {
        try {
            const res = await fetch('/api/qa/stats');
            if (!res.ok) return;
            qaStats = await res.json();

            const statTotal = document.getElementById('qaStatTotal');
            const statOpen = document.getElementById('qaStatOpen');
            const statInProgress = document.getElementById('qaStatInProgress');
            const statReadyQa = document.getElementById('qaStatReadyQa');
            const statResolved = document.getElementById('qaStatResolved');
            const statCritical = document.getElementById('qaStatCritical');
            const sidebarQaBadge = document.getElementById('sidebarQaBadge');

            if (statTotal) statTotal.textContent = qaStats.total || 0;
            if (statOpen) statOpen.textContent = qaStats.open || 0;
            if (statInProgress) statInProgress.textContent = qaStats.inProgress || 0;
            if (statReadyQa) statReadyQa.textContent = qaStats.readyForQa || 0;
            if (statResolved) statResolved.textContent = (qaStats.resolved || 0) + (qaStats.closed || 0);
            if (statCritical) {
                statCritical.textContent = qaStats.critical || 0;
                const cardCrit = document.getElementById('qaKpiCritical');
                if (cardCrit) {
                    if (qaStats.critical > 0) cardCrit.classList.add('critical');
                    else cardCrit.classList.remove('critical');
                }
            }
            if (sidebarQaBadge) {
                if (qaStats.critical > 0) {
                    sidebarQaBadge.textContent = `${qaStats.critical} CRIT`;
                    sidebarQaBadge.style.background = 'rgba(244, 63, 94, 0.2)';
                    sidebarQaBadge.style.color = '#e11d48';
                } else if (qaStats.open > 0) {
                    sidebarQaBadge.textContent = `${qaStats.open} OPEN`;
                    sidebarQaBadge.style.background = 'rgba(59, 130, 246, 0.14)';
                    sidebarQaBadge.style.color = '#2563eb';
                } else {
                    sidebarQaBadge.textContent = 'QA';
                    sidebarQaBadge.style.background = 'rgba(244, 63, 94, 0.14)';
                    sidebarQaBadge.style.color = 'var(--color-rose)';
                }
            }
        } catch (e) {
            console.warn('Failed to load QA stats:', e);
        }
    }

    async function loadQaIssues() {
        try {
            const params = new URLSearchParams();
            if (qaFilterState.status !== 'all') params.append('status', qaFilterState.status);
            if (qaFilterState.type !== 'all') params.append('type', qaFilterState.type);
            if (qaFilterState.priority !== 'all') params.append('priority', qaFilterState.priority);
            if (qaFilterState.module !== 'all') params.append('module', qaFilterState.module);
            if (qaFilterState.q) params.append('q', qaFilterState.q);

            const res = await fetch(`/api/qa/issues?${params.toString()}`);
            if (!res.ok) return;
            qaIssues = await res.json();

            renderQaListView();
            renderQaKanbanView();
        } catch (e) {
            console.warn('Failed to load QA issues:', e);
        }
    }

    async function populateQaAssignees() {
        const select = document.getElementById('qaIssueAssignee');
        if (!select || select.options.length > 1) return;
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const users = await res.json();
                users.forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = JSON.stringify({ id: u.id, name: u.name, email: u.email });
                    opt.textContent = `${u.name} (${u.role})`;
                    select.appendChild(opt);
                });
            }
        } catch (e) {}
    }

    function renderQaListView() {
        const tbody = document.getElementById('qaIssuesTableBody');
        if (!tbody) return;

        if (qaIssues.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 36px 14px; color: var(--text-muted);">
                        <div style="font-size: 30px; margin-bottom: 8px;">🎉</div>
                        <strong>No QA tickets match the selected filter criteria.</strong>
                        <p style="font-size: 12.5px; margin-top: 4px;">Click "Report Issue / Bug" above to record a new defect or observation.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = qaIssues.map(issue => {
            const priorityClass = `badge-priority-${(issue.priority || 'medium').toLowerCase()}`;
            const attachmentsCount = (issue.attachments && Array.isArray(issue.attachments)) ? issue.attachments.length : 0;
            const thumbHtml = attachmentsCount > 0
                ? `<span class="qa-thumb-indicator" data-id="${issue.id}" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--brand-teal-hover); background: var(--brand-teal-light); padding: 2px 7px; border-radius: 4px;" title="View attached screenshot">🖼️ ${attachmentsCount}</span>`
                : `<span style="color: var(--text-muted); font-size: 11px;">--</span>`;

            return `
                <tr data-id="${issue.id}">
                    <td style="text-align: center; white-space: nowrap;">
                        <span class="qa-id-pill">#QA-${String(issue.id).padStart(2, '0')}</span>
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                        <span class="badge ${priorityClass}">${issue.priority}</span>
                    </td>
                    <td>
                        <div style="font-weight: 700; color: var(--brand-navy); font-size: 13.5px; cursor: pointer; line-height: 1.4;" class="qa-title-click" data-id="${issue.id}">
                            ${escapeHtml(issue.title)}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
                            <span class="badge-type-tag">${issue.type || 'Bug'}</span>
                            <span style="font-size: 11.5px; color: var(--text-muted);">Module: <strong style="color: var(--brand-navy);">${issue.module || 'General'}</strong></span>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 600; font-size: 12.5px; color: var(--brand-navy); line-height: 1.25;">${escapeHtml(issue.reporterName || 'Anonymous')}</div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;" title="${escapeHtml(issue.reporterEmail || '')}">${escapeHtml(issue.reporterEmail || '')}</div>
                    </td>
                    <td>
                        <div style="font-weight: 600; font-size: 12.5px; color: ${issue.assigneeName ? 'var(--brand-navy)' : 'var(--text-muted)'}; line-height: 1.25;">
                            ${issue.assigneeName ? '👤 ' + escapeHtml(issue.assigneeName) : '<em>Unassigned</em>'}
                        </div>
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                        ${thumbHtml}
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                        <span style="font-size: 12px; font-weight: 700; color: var(--brand-navy);">💬 ${issue.commentCount || 0}</span>
                    </td>
                    <td>
                        <select class="qa-select-sm qa-inline-status" data-id="${issue.id}">
                            <option value="Open" ${issue.status === 'Open' ? 'selected' : ''}>Open</option>
                            <option value="In Progress" ${issue.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Ready for QA" ${issue.status === 'Ready for QA' ? 'selected' : ''}>Ready for QA</option>
                            <option value="Resolved" ${issue.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                            <option value="Closed" ${issue.status === 'Closed' ? 'selected' : ''}>Closed</option>
                            <option value="Deferred" ${issue.status === 'Deferred' ? 'selected' : ''}>Deferred</option>
                        </select>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                        <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px;">
                            <button class="btn btn-sm btn-subtle qa-btn-details" data-id="${issue.id}" style="padding: 5px 10px; font-size: 11.5px; font-weight: 700;">
                                Details &rarr;
                            </button>
                            <button class="btn btn-sm btn-danger-subtle qa-btn-delete" data-id="${issue.id}" data-title="${escapeHtml(issue.title)}" title="Delete Ticket" style="padding: 5px 8px; font-size: 12px; line-height: 1;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.qa-title-click, .qa-btn-details').forEach(btn => {
            btn.addEventListener('click', () => openQaDetailModal(btn.getAttribute('data-id')));
        });
        tbody.querySelectorAll('.qa-btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const issueId = btn.getAttribute('data-id');
                const title = btn.getAttribute('data-title') || '';
                deleteQaIssue(issueId, title);
            });
        });
        tbody.querySelectorAll('.qa-thumb-indicator').forEach(btn => {
            btn.addEventListener('click', () => {
                const issueId = btn.getAttribute('data-id');
                const issue = qaIssues.find(i => String(i.id) === String(issueId));
                if (issue && issue.attachments && issue.attachments[0]) {
                    openQaLightbox(issue.attachments[0]);
                }
            });
        });
        tbody.querySelectorAll('.qa-inline-status').forEach(select => {
            select.addEventListener('change', async (e) => {
                const issueId = select.getAttribute('data-id');
                const newStatus = e.target.value;
                await updateQaIssueStatus(issueId, newStatus);
            });
        });
    }

    function renderQaKanbanView() {
        const statuses = ['Open', 'In Progress', 'Ready for QA', 'Resolved', 'Closed'];
        statuses.forEach(status => {
            const containerKey = status.replace(/\s+/g, '');
            const cardsContainer = document.getElementById(`kanbanCards${containerKey}`);
            const countPill = document.getElementById(`kanbanCount${containerKey}`);
            if (!cardsContainer) return;

            const columnIssues = qaIssues.filter(i => (i.status || 'Open').toLowerCase() === status.toLowerCase());
            if (countPill) countPill.textContent = columnIssues.length;

            if (columnIssues.length === 0) {
                cardsContainer.innerHTML = `
                    <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 12px; font-style: italic;">
                        No tickets in ${status}
                    </div>
                `;
            } else {
                cardsContainer.innerHTML = columnIssues.map(issue => {
                    const priorityClass = (issue.priority || 'medium').toLowerCase();
                    const nextAction = getNextStatusAction(issue.status);
                    const hasAttachment = (issue.attachments && issue.attachments.length > 0);

                    return `
                        <div class="qa-card ${priorityClass}" draggable="true" data-id="${issue.id}">
                            <div class="qa-card-header">
                                <span class="qa-id-pill">#QA-${String(issue.id).padStart(2, '0')}</span>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span class="badge badge-priority-${priorityClass}">${issue.priority}</span>
                                    <button type="button" class="qa-card-del-btn qa-btn-delete" data-id="${issue.id}" data-title="${escapeHtml(issue.title)}" title="Delete Ticket">&times;</button>
                                </div>
                            </div>
                            <h5 class="qa-card-title" data-id="${issue.id}">${escapeHtml(issue.title)}</h5>
                            <div class="qa-card-meta">
                                <span class="badge-type-tag">${issue.type || 'Bug'}</span>
                                <span style="font-size: 11px;">📂 ${issue.module || 'General'}</span>
                            </div>
                            ${hasAttachment ? `<div style="font-size: 11px; color: var(--brand-teal-hover); display: flex; align-items: center; gap: 4px;">🖼️ 1+ Screenshot</div>` : ''}
                            <div class="qa-card-footer">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span>👤 ${escapeHtml(issue.assigneeName ? issue.assigneeName.split(' ')[0] : 'Unassigned')}</span>
                                    <span>💬 ${issue.commentCount || 0}</span>
                                </div>
                                ${nextAction ? `
                                    <button class="qa-quick-advance-btn" data-id="${issue.id}" data-next="${nextAction.status}">
                                        ${nextAction.label} &rarr;
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                cardsContainer.querySelectorAll('.qa-card').forEach(card => {
                    card.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', card.getAttribute('data-id'));
                        e.dataTransfer.effectAllowed = 'move';
                    });
                    card.querySelector('.qa-card-title').addEventListener('click', () => {
                        openQaDetailModal(card.getAttribute('data-id'));
                    });
                });

                cardsContainer.querySelectorAll('.qa-quick-advance-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const issueId = btn.getAttribute('data-id');
                        const nextStatus = btn.getAttribute('data-next');
                        await updateQaIssueStatus(issueId, nextStatus);
                    });
                });

                cardsContainer.querySelectorAll('.qa-btn-delete').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const issueId = btn.getAttribute('data-id');
                        const title = btn.getAttribute('data-title') || '';
                        deleteQaIssue(issueId, title);
                    });
                });
            }

            cardsContainer.ondragover = (e) => {
                e.preventDefault();
                cardsContainer.classList.add('drag-over');
            };
            cardsContainer.ondragleave = () => {
                cardsContainer.classList.remove('drag-over');
            };
            cardsContainer.ondrop = async (e) => {
                e.preventDefault();
                cardsContainer.classList.remove('drag-over');
                const issueId = e.dataTransfer.getData('text/plain');
                if (issueId) {
                    await updateQaIssueStatus(issueId, status);
                }
            };
        });
    }

    function getNextStatusAction(currentStatus) {
        switch (currentStatus) {
            case 'Open': return { status: 'In Progress', label: 'Fix' };
            case 'In Progress': return { status: 'Ready for QA', label: 'Ready QA' };
            case 'Ready for QA': return { status: 'Resolved', label: 'Verify' };
            case 'Resolved': return { status: 'Closed', label: 'Close' };
            default: return null;
        }
    }

    async function updateQaIssueStatus(issueId, newStatus) {
        try {
            const res = await fetch(`/api/qa/issues/${issueId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showQaToast('Status Updated', `Ticket #QA-${issueId} changed to "${newStatus}"`, 'info');
                await Promise.all([loadQaStats(), loadQaIssues()]);
                if (activeDetailIssueId && String(activeDetailIssueId) === String(issueId)) {
                    openQaDetailModal(issueId);
                }
            } else {
                alert(data.error || 'Failed to update ticket status');
            }
        } catch (err) {
            console.error(err);
            alert('Network error updating ticket status');
        }
    }

    async function deleteQaIssue(issueId, title = '') {
        const titleSnippet = title ? ` "${title}"` : '';
        const confirmMsg = `Are you sure you want to delete QA ticket #QA-${String(issueId).padStart(2, '0')}${titleSnippet}?\n\nThis will permanently remove the ticket and its discussion history.`;
        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`/api/qa/issues/${issueId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (activeDetailIssueId && String(activeDetailIssueId) === String(issueId)) {
                    if (qaDetailModal) qaDetailModal.classList.remove('active');
                    activeDetailIssueId = null;
                }
                showQaToast('Ticket Removed', `Ticket #QA-${String(issueId).padStart(2, '0')} was permanently deleted.`);
                await Promise.all([loadQaStats(), loadQaIssues()]);
            } else {
                alert(data.error || 'Failed to delete QA ticket');
            }
        } catch (err) {
            console.error('Delete QA ticket error:', err);
            alert('Network error deleting QA ticket');
        }
    }

    // =========================================================
    // QA Defect Drafts Engine (Auto-Save on Cancel / Close)
    // =========================================================
    const QA_DRAFTS_STORAGE_KEY = 'thelab_qa_drafts';
    let currentEditingDraftId = null;
    let draftAlertDismissed = false;

    function getQaDrafts() {
        try {
            const raw = localStorage.getItem(QA_DRAFTS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Error reading QA drafts:', e);
            return [];
        }
    }

    function saveQaDraftsList(drafts) {
        try {
            localStorage.setItem(QA_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
        } catch (e) {
            console.error('Error saving QA drafts:', e);
        }
    }

    function saveOrUpdateCurrentDraft() {
        const titleInput = document.getElementById('qaIssueTitle');
        const descInput = document.getElementById('qaIssueDesc');
        const typeInput = document.getElementById('qaIssueType');
        const priorityInput = document.getElementById('qaIssuePriority');
        const moduleInput = document.getElementById('qaIssueModule');
        const assigneeInput = document.getElementById('qaIssueAssignee');

        const title = titleInput ? titleInput.value.trim() : '';
        const description = descInput ? descInput.value.trim() : '';
        const type = typeInput ? typeInput.value : 'Bug';
        const priority = priorityInput ? priorityInput.value : 'Medium';
        const module = moduleInput ? moduleInput.value : 'General';
        const assigneeRaw = assigneeInput ? assigneeInput.value : '';

        let assigneeName = '';
        if (assigneeRaw) {
            try {
                const parsed = JSON.parse(assigneeRaw);
                assigneeName = parsed.name || '';
            } catch (err) {}
        }

        // Check if form is dirty: title or description filled, or screenshots attached
        const hasContent = title.length > 0 || description.length > 0 || (qaNewIssueAttachments && qaNewIssueAttachments.length > 0);
        if (!hasContent) {
            return false;
        }

        const drafts = getQaDrafts();
        const nowIso = new Date().toISOString();

        if (currentEditingDraftId) {
            const idx = drafts.findIndex(d => d.id === currentEditingDraftId);
            if (idx !== -1) {
                drafts[idx] = {
                    ...drafts[idx],
                    title,
                    description,
                    type,
                    priority,
                    module,
                    assignee: assigneeRaw,
                    assigneeName,
                    attachments: [...(qaNewIssueAttachments || [])],
                    updatedAt: nowIso
                };
                saveQaDraftsList(drafts);
                return true;
            }
        }

        // Create new draft record
        const newDraft = {
            id: 'draft_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            title,
            description,
            type,
            priority,
            module,
            assignee: assigneeRaw,
            assigneeName,
            attachments: [...(qaNewIssueAttachments || [])],
            createdAt: nowIso,
            updatedAt: nowIso
        };
        drafts.unshift(newDraft);
        saveQaDraftsList(drafts);
        return true;
    }

    function deleteQaDraft(draftId) {
        const drafts = getQaDrafts().filter(d => d.id !== draftId);
        saveQaDraftsList(drafts);
        updateDraftBadges();
        if (qaCurrentView === 'drafts') {
            renderQaDraftsView(qaSearchInput ? qaSearchInput.value : '');
        }
    }

    function clearAllQaDrafts() {
        const drafts = getQaDrafts();
        if (drafts.length === 0) return;
        if (!confirm('Are you sure you want to discard all saved drafts? All unsaved defect notes and screenshots will be permanently deleted.')) {
            return;
        }
        saveQaDraftsList([]);
        updateDraftBadges();
        if (qaCurrentView === 'drafts') {
            renderQaDraftsView();
        }
        showQaToast('Drafts Cleared 🗑️', 'All uncommitted issue drafts have been discarded.', 'info');
    }

    function checkAndSaveDraftOnClose() {
        if (!qaNewIssueModal || !qaNewIssueModal.classList.contains('active')) return;

        const saved = saveOrUpdateCurrentDraft();
        qaNewIssueModal.classList.remove('active');
        currentEditingDraftId = null;
        resetModalHeaderToDefault();

        if (saved) {
            showQaToast('Draft Auto-Saved 📝', 'Your in-progress defect report was saved to drafts. You can resume it anytime.', 'info');
            updateDraftBadges();
            if (qaCurrentView === 'drafts') {
                renderQaDraftsView(qaSearchInput ? qaSearchInput.value : '');
            }
        }
    }

    function resumeQaDraft(draftId) {
        const drafts = getQaDrafts();
        const draft = drafts.find(d => d.id === draftId) || drafts[0];
        if (!draft) return;

        currentEditingDraftId = draft.id;

        if (qaNewIssueForm) qaNewIssueForm.reset();

        const titleInput = document.getElementById('qaIssueTitle');
        const descInput = document.getElementById('qaIssueDesc');
        const typeInput = document.getElementById('qaIssueType');
        const priorityInput = document.getElementById('qaIssuePriority');
        const moduleInput = document.getElementById('qaIssueModule');
        const assigneeInput = document.getElementById('qaIssueAssignee');

        if (titleInput) titleInput.value = draft.title || '';
        if (descInput) descInput.value = draft.description || '';
        if (typeInput) typeInput.value = draft.type || 'Bug';
        if (priorityInput) priorityInput.value = draft.priority || 'Medium';
        if (moduleInput) moduleInput.value = draft.module || 'General';
        if (assigneeInput) assigneeInput.value = draft.assignee || '';

        qaNewIssueAttachments = Array.isArray(draft.attachments) ? [...draft.attachments] : [];
        renderNewIssueThumbnails();

        // Update modal header to draft mode
        setModalHeaderToDraftMode(draft);

        // Update environment telemetry preview pills
        const env = getClientEnvironment();
        const pBrowser = document.getElementById('envPillBrowser');
        const pOs = document.getElementById('envPillOs');
        const pRes = document.getElementById('envPillResolution');
        const pVp = document.getElementById('envPillViewport');
        if (pBrowser) pBrowser.textContent = env.browser || 'Chrome';
        if (pOs) pOs.textContent = env.os || 'Windows';
        if (pRes) pRes.textContent = env.screenRes || '1920x1080';
        if (pVp) pVp.textContent = env.viewport || '1920x960';

        if (qaNewIssueModal) qaNewIssueModal.classList.add('active');
    }

    function setModalHeaderToDraftMode(draft) {
        const badge = document.getElementById('qaNewIssueModalBadge');
        const storageTag = document.getElementById('qaNewIssueModalStorageTag');
        const title = document.getElementById('qaNewIssueModalTitle');
        const desc = document.getElementById('qaNewIssueModalDesc');

        if (badge) {
            badge.textContent = '📝 EDITING DRAFT (AUTO-SAVING)';
            badge.style.background = 'rgba(245, 158, 11, 0.16)';
            badge.style.color = '#B45309';
        }
        if (storageTag) {
            storageTag.textContent = '• Local Browser Staged';
        }
        if (title) {
            title.textContent = draft.title ? `Resume: ${draft.title}` : 'Resume Defect Draft';
        }
        if (desc) {
            desc.textContent = 'Editing saved draft. If you cancel or close, your latest modifications will be automatically preserved.';
        }
    }

    function resetModalHeaderToDefault() {
        const badge = document.getElementById('qaNewIssueModalBadge');
        const storageTag = document.getElementById('qaNewIssueModalStorageTag');
        const title = document.getElementById('qaNewIssueModalTitle');
        const desc = document.getElementById('qaNewIssueModalDesc');

        if (badge) {
            badge.textContent = '🐞 QA DEFECT TRACKER';
            badge.style.background = 'rgba(244, 63, 94, 0.12)';
            badge.style.color = 'var(--color-rose)';
        }
        if (storageTag) {
            storageTag.textContent = '• PostgreSQL Backed';
        }
        if (title) {
            title.textContent = 'Report QA Issue / Defect';
        }
        if (desc) {
            desc.textContent = 'Submit observations, UI adjustments, or bug reports with automated client telemetry.';
        }
    }

    function calculateDraftReadiness(draft) {
        let score = 0;

        if (draft.title && draft.title.trim().length > 3) {
            score += 30;
        }

        if (draft.description && draft.description.trim().length >= 15) {
            score += 40;
        } else if (draft.description && draft.description.trim().length > 0) {
            score += 20;
        }

        if (draft.module && draft.module !== 'General') {
            score += 15;
        } else {
            score += 10;
        }

        if (draft.attachments && draft.attachments.length > 0) {
            score += 15;
        } else if (draft.assignee) {
            score += 10;
        }

        score = Math.min(score, 100);

        let color = '#f43f5e';
        let label = `${score}% (Needs Details)`;
        if (score >= 80) {
            color = '#10b981';
            label = `${score}% Ready to Submit`;
        } else if (score >= 50) {
            color = '#f59e0b';
            label = `${score}% In Progress`;
        }

        return { score, color, label };
    }

    function renderQaDraftsView(filterText = '') {
        const tableBody = document.getElementById('qaDraftsTableBody');
        const emptyState = document.getElementById('qaDraftsEmptyState');
        const tableWrap = document.querySelector('#qaDraftsView .qa-table-wrapper');
        if (!tableBody) return;

        let drafts = getQaDrafts();

        if (filterText && filterText.trim()) {
            const q = filterText.trim().toLowerCase();
            drafts = drafts.filter(d => 
                (d.title && d.title.toLowerCase().includes(q)) ||
                (d.description && d.description.toLowerCase().includes(q)) ||
                (d.module && d.module.toLowerCase().includes(q)) ||
                (d.type && d.type.toLowerCase().includes(q))
            );
        }

        if (drafts.length === 0) {
            tableBody.innerHTML = '';
            if (tableWrap) tableWrap.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (tableWrap) tableWrap.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        tableBody.innerHTML = drafts.map((draft, idx) => {
            const draftNum = String(idx + 1).padStart(2, '0');
            const titleDisplay = draft.title ? escapeHtml(draft.title) : '<em style="color: var(--text-muted); font-weight: 500;">(Untitled Defect Draft)</em>';
            const descSnippet = draft.description ? escapeHtml(draft.description) : 'No reproduction steps provided yet...';
            const readiness = calculateDraftReadiness(draft);
            const priorityClass = (draft.priority || 'medium').toLowerCase();
            const dateStr = formatQaDate(draft.updatedAt || draft.createdAt || new Date().toISOString());

            const attCount = Array.isArray(draft.attachments) ? draft.attachments.length : 0;
            let evidenceHtml = `<span style="font-size: 11.5px; color: var(--text-muted);">None</span>`;
            if (attCount > 0) {
                const thumbs = draft.attachments.slice(0, 3).map(src => 
                    `<img src="${src}" class="qa-draft-thumb-mini" alt="thumbnail" onclick="openQaLightbox('${src}')">`
                ).join('');
                evidenceHtml = `
                    <div class="qa-draft-evidence-wrap">
                        ${thumbs}
                        ${attCount > 3 ? `<span style="font-size: 10.5px; font-weight: 700; color: var(--brand-teal);">+${attCount - 3}</span>` : ''}
                    </div>
                `;
            }

            return `
                <tr data-draft-id="${draft.id}">
                    <td style="text-align: center;">
                        <span class="qa-draft-ref-pill">#DRAFT-${draftNum}</span>
                        <div style="font-size: 10px; color: #b45309; font-weight: 600; margin-top: 3px;">⚡ Local Staged</div>
                    </td>
                    <td>
                        <div style="font-weight: 700; color: var(--brand-navy); font-size: 14px; line-height: 1.35; cursor: pointer;" class="qa-draft-title-click" data-id="${draft.id}">
                            ${titleDisplay}
                        </div>
                        <div class="qa-draft-snippet-box">
                            "${descSnippet}"
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                            <span class="badge badge-type-tag" style="font-size: 11px; padding: 2px 7px;">${escapeHtml(draft.type || 'Bug')}</span>
                            <span class="badge badge-priority-${priorityClass}" style="font-size: 11px; padding: 2px 7px;">${escapeHtml(draft.priority || 'Medium')}</span>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 700; font-size: 12.5px; color: var(--brand-navy); display: flex; align-items: center; gap: 4px;">
                            <span>📍</span> <span>${escapeHtml(draft.module || 'General')}</span>
                        </div>
                        <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 3px; display: flex; align-items: center; gap: 4px;">
                            <span>👤</span> <span>${escapeHtml(draft.assigneeName || 'Unassigned')}</span>
                        </div>
                    </td>
                    <td style="text-align: center;">
                        ${evidenceHtml}
                    </td>
                    <td>
                        <div class="qa-readiness-wrap">
                            <div class="qa-readiness-head">
                                <span class="qa-readiness-pct" style="color: ${readiness.color};">${readiness.score}%</span>
                                <span class="qa-readiness-label">${readiness.label}</span>
                            </div>
                            <div class="qa-readiness-bar">
                                <div class="qa-readiness-fill" style="width: ${readiness.score}%; background: ${readiness.color};"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="font-size: 12px; color: var(--text-secondary); white-space: nowrap;" title="${draft.updatedAt || draft.createdAt}">
                            ${dateStr}
                        </span>
                    </td>
                    <td style="text-align: right;">
                        <div style="display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end;">
                            <button type="button" class="btn-draft-resume" data-id="${draft.id}" title="Resume Editing Draft">
                                <span>✏️ Resume</span>
                            </button>
                            <button type="button" class="btn-draft-discard" data-id="${draft.id}" title="Discard this Draft">
                                <span>🗑️</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Wire row resume click
        tableBody.querySelectorAll('.qa-draft-title-click, .btn-draft-resume').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-id');
                resumeQaDraft(id);
            });
        });

        // Wire row discard click
        tableBody.querySelectorAll('.btn-draft-discard').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = el.getAttribute('data-id');
                if (confirm('Discard this draft report? All entered text and screenshots will be permanently deleted.')) {
                    deleteQaDraft(id);
                    showQaToast('Draft Discarded 🗑️', 'The draft was removed from your local storage.', 'info');
                }
            });
        });
    }

    function updateDraftBadges() {
        const drafts = getQaDrafts();
        const count = drafts.length;

        const badge = document.getElementById('qaDraftCountBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline-flex' : 'none';
        }

        const alertStrip = document.getElementById('qaDraftAlertStrip');
        if (alertStrip) {
            if (count > 0 && !draftAlertDismissed && qaCurrentView !== 'drafts') {
                alertStrip.style.display = 'flex';
                const msgEl = document.getElementById('qaDraftAlertMsg');
                const snipEl = document.getElementById('qaDraftAlertSnippet');
                if (msgEl) {
                    msgEl.textContent = `You have ${count} unsubmitted defect report draft${count > 1 ? 's' : ''}`;
                }
                if (snipEl) {
                    const latest = drafts[0];
                    const snip = latest.title || (latest.description ? latest.description.substring(0, 50) + '...' : 'Untitled defect draft');
                    snipEl.textContent = `"${snip}"`;
                }
            } else {
                alertStrip.style.display = 'none';
            }
        }
    }

    // New Issue Modal & Dropzone Logic
    const qaNewIssueModal = document.getElementById('qaNewIssueModal');
    const btnQaNewIssue = document.getElementById('btnQaNewIssue');
    const btnCloseQaNewIssueModal = document.getElementById('btnCloseQaNewIssueModal');
    const btnCancelQaNewIssue = document.getElementById('btnCancelQaNewIssue');
    const qaNewIssueForm = document.getElementById('qaNewIssueForm');
    const qaNewIssueDropzone = document.getElementById('qaNewIssueDropzone');
    const qaFileInput = document.getElementById('qaFileInput');
    const qaNewIssueThumbnails = document.getElementById('qaNewIssueThumbnails');

    function openNewIssueModal() {
        if (!qaNewIssueModal) return;
        currentEditingDraftId = null;
        qaNewIssueAttachments = [];
        renderNewIssueThumbnails();
        if (qaNewIssueForm) qaNewIssueForm.reset();
        resetModalHeaderToDefault();

        // Update environment preview pills
        const env = getClientEnvironment();
        const pBrowser = document.getElementById('envPillBrowser');
        const pOs = document.getElementById('envPillOs');
        const pRes = document.getElementById('envPillResolution');
        const pVp = document.getElementById('envPillViewport');
        if (pBrowser) pBrowser.textContent = env.browser || 'Chrome';
        if (pOs) pOs.textContent = env.os || 'Windows';
        if (pRes) pRes.textContent = env.screenRes || '1920x1080';
        if (pVp) pVp.textContent = env.viewport || '1920x960';

        qaNewIssueModal.classList.add('active');
    }

    if (btnQaNewIssue) btnQaNewIssue.addEventListener('click', openNewIssueModal);
    if (btnCloseQaNewIssueModal) btnCloseQaNewIssueModal.addEventListener('click', checkAndSaveDraftOnClose);
    if (btnCancelQaNewIssue) btnCancelQaNewIssue.addEventListener('click', checkAndSaveDraftOnClose);

    if (qaNewIssueModal) {
        qaNewIssueModal.addEventListener('click', (e) => {
            if (e.target === qaNewIssueModal) {
                checkAndSaveDraftOnClose();
            }
        });
    }

    if (qaNewIssueDropzone && qaFileInput) {
        qaNewIssueDropzone.addEventListener('click', () => qaFileInput.click());
        qaFileInput.addEventListener('change', (e) => {
            handleImageFiles(e.target.files, qaNewIssueAttachments, renderNewIssueThumbnails);
        });

        qaNewIssueDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            qaNewIssueDropzone.classList.add('dragover');
        });
        qaNewIssueDropzone.addEventListener('dragleave', () => qaNewIssueDropzone.classList.remove('dragover'));
        qaNewIssueDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            qaNewIssueDropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleImageFiles(e.dataTransfer.files, qaNewIssueAttachments, renderNewIssueThumbnails);
            }
        });
    }

    function handleImageFiles(files, targetArray, renderCallback) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                targetArray.push(event.target.result);
                renderCallback();
            };
            reader.readAsDataURL(file);
        });
    }

    function renderNewIssueThumbnails() {
        if (!qaNewIssueThumbnails) return;
        qaNewIssueThumbnails.innerHTML = qaNewIssueAttachments.map((src, index) => `
            <div class="qa-thumbnail-item">
                <img src="${src}" alt="attachment" onclick="openQaLightbox('${src}')">
                <button type="button" class="qa-thumbnail-remove" data-index="${index}">&times;</button>
            </div>
        `).join('');

        qaNewIssueThumbnails.querySelectorAll('.qa-thumbnail-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                qaNewIssueAttachments.splice(idx, 1);
                renderNewIssueThumbnails();
            });
        });
    }

    if (qaNewIssueForm) {
        qaNewIssueForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('qaIssueTitle').value.trim();
            const type = document.getElementById('qaIssueType').value;
            const priority = document.getElementById('qaIssuePriority').value;
            const module = document.getElementById('qaIssueModule').value;
            const description = document.getElementById('qaIssueDesc').value.trim();
            const assigneeRaw = document.getElementById('qaIssueAssignee').value;

            let assigneeId = null, assigneeName = null, assigneeEmail = null;
            if (assigneeRaw) {
                try {
                    const parsed = JSON.parse(assigneeRaw);
                    assigneeId = parsed.id;
                    assigneeName = parsed.name;
                    assigneeEmail = parsed.email;
                } catch (err) {}
            }

            const env = getClientEnvironment();

            const submitBtn = document.getElementById('btnSubmitQaNewIssue');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span>Saving...</span>`;
            }

            try {
                const res = await fetch('/api/qa/issues', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        type,
                        priority,
                        module,
                        description,
                        assigneeId,
                        assigneeName,
                        assigneeEmail,
                        envBrowser: env.browser,
                        envOs: env.os,
                        envResolution: env.screenRes,
                        envViewport: env.viewport,
                        envUrl: env.currentUrl,
                        attachments: qaNewIssueAttachments
                    })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    if (currentEditingDraftId) {
                        deleteQaDraft(currentEditingDraftId);
                        currentEditingDraftId = null;
                    }
                    showQaToast('Issue Created', `Reported #${data.issue.id}: ${title}`, priority === 'Critical' ? 'critical' : 'info');
                    qaNewIssueModal.classList.remove('active');
                    resetModalHeaderToDefault();
                    updateDraftBadges();
                    if (qaCurrentView === 'drafts') {
                        renderQaDraftsView(qaSearchInput ? qaSearchInput.value : '');
                    }
                    await Promise.all([loadQaStats(), loadQaIssues()]);
                } else {
                    alert(data.error || 'Failed to submit issue ticket');
                }
            } catch (err) {
                alert('Network error submitting issue ticket');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span>Submit Issue Ticket</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
                }
            }
        });
    }

    // Global Paste Listener (Ctrl+V) for New Issue and Comment
    window.addEventListener('paste', (e) => {
        const newIssueModalActive = qaNewIssueModal && qaNewIssueModal.classList.contains('active');
        const detailModalActive = qaDetailModal && qaDetailModal.classList.contains('active');
        if (!newIssueModalActive && !detailModalActive) return;

        const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64Url = event.target.result;
                    if (newIssueModalActive) {
                        qaNewIssueAttachments.push(base64Url);
                        renderNewIssueThumbnails();
                        showQaToast('Screenshot Pasted', 'Screenshot added from clipboard!', 'info');
                    } else if (detailModalActive) {
                        qaCommentAttachments.push(base64Url);
                        renderCommentThumbnails();
                        showQaToast('Screenshot Pasted', 'Screenshot attached to reply!', 'info');
                    }
                };
                reader.readAsDataURL(blob);
            }
        }
    });

    // ==========================================
    // Canvas Annotator Subsystem
    // ==========================================
    const qaAnnotatorModal = document.getElementById('qaAnnotatorModal');
    const btnOpenAnnotatorFromNew = document.getElementById('btnOpenAnnotatorFromNew');
    const btnCloseAnnotatorModal = document.getElementById('btnCloseAnnotatorModal');
    const btnCancelAnnotator = document.getElementById('btnCancelAnnotator');
    const btnSaveAnnotator = document.getElementById('btnSaveAnnotator');
    const canvas = document.getElementById('qaAnnotatorCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const annotatorImageLoader = document.getElementById('qaAnnotatorImageLoader');

    let annotatorTool = 'rect';
    let annotatorColor = '#ef4444';
    let annotatorSize = 4;
    let isDrawing = false;
    let startX = 0, startY = 0;
    let canvasHistory = [];
    let baseCanvasImage = null;

    function initCanvas() {
        if (!canvas || !ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveCanvasState();
    }

    function saveCanvasState() {
        if (!ctx) return;
        canvasHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (canvasHistory.length > 25) canvasHistory.shift();
    }

    function undoCanvasState() {
        if (!ctx || canvasHistory.length <= 1) return;
        canvasHistory.pop();
        const prev = canvasHistory[canvasHistory.length - 1];
        ctx.putImageData(prev, 0, 0);
    }

    function openCanvasAnnotator() {
        if (!qaAnnotatorModal) return;
        qaAnnotatorModal.classList.add('active');
        canvasHistory = [];
        initCanvas();
    }

    if (btnOpenAnnotatorFromNew) btnOpenAnnotatorFromNew.addEventListener('click', openCanvasAnnotator);
    if (btnCloseAnnotatorModal) btnCloseAnnotatorModal.addEventListener('click', () => qaAnnotatorModal.classList.remove('active'));
    if (btnCancelAnnotator) btnCancelAnnotator.addEventListener('click', () => qaAnnotatorModal.classList.remove('active'));

    // Annotator Tool and Style pickers
    document.querySelectorAll('.qa-tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.qa-tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            annotatorTool = btn.getAttribute('data-tool');
        });
    });

    document.querySelectorAll('.qa-color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.qa-color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            annotatorColor = swatch.getAttribute('data-color');
        });
    });

    document.querySelectorAll('.qa-stroke-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.qa-stroke-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            annotatorSize = parseInt(btn.getAttribute('data-size'), 10);
        });
    });

    const btnAnnotatorUndo = document.getElementById('btnAnnotatorUndo');
    const btnAnnotatorClear = document.getElementById('btnAnnotatorClear');
    if (btnAnnotatorUndo) btnAnnotatorUndo.addEventListener('click', undoCanvasState);
    if (btnAnnotatorClear) btnAnnotatorClear.addEventListener('click', initCanvas);

    if (annotatorImageLoader) {
        annotatorImageLoader.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    saveCanvasState();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (canvas && ctx) {
        canvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            const rect = canvas.getBoundingClientRect();
            startX = (e.clientX - rect.left) * (canvas.width / rect.width);
            startY = (e.clientY - rect.top) * (canvas.height / rect.height);

            if (annotatorTool === 'pen') {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;
            const rect = canvas.getBoundingClientRect();
            const currentX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const currentY = (e.clientY - rect.top) * (canvas.height / rect.height);

            if (annotatorTool === 'pen') {
                ctx.strokeStyle = annotatorColor;
                ctx.lineWidth = annotatorSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
            } else {
                // Restore last snapshot and draw preview
                const lastSnap = canvasHistory[canvasHistory.length - 1];
                if (lastSnap) ctx.putImageData(lastSnap, 0, 0);

                ctx.strokeStyle = annotatorColor;
                ctx.fillStyle = annotatorColor;
                ctx.lineWidth = annotatorSize;

                if (annotatorTool === 'rect') {
                    ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
                } else if (annotatorTool === 'circle') {
                    ctx.beginPath();
                    const radiusX = Math.abs(currentX - startX) / 2;
                    const radiusY = Math.abs(currentY - startY) / 2;
                    const centerX = Math.min(startX, currentX) + radiusX;
                    const centerY = Math.min(startY, currentY) + radiusY;
                    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                    ctx.stroke();
                } else if (annotatorTool === 'arrow') {
                    drawArrow(ctx, startX, startY, currentX, currentY, annotatorSize * 3);
                }
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (!isDrawing) return;
            isDrawing = false;
            if (annotatorTool === 'text') {
                const rect = canvas.getBoundingClientRect();
                const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
                const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
                const label = prompt('Enter annotation text label:');
                if (label && label.trim()) {
                    ctx.fillStyle = annotatorColor;
                    ctx.font = `bold ${annotatorSize * 4 + 10}px 'Plus Jakarta Sans', sans-serif`;
                    ctx.fillText(label.trim(), clickX, clickY);
                }
            }
            saveCanvasState();
        });

        canvas.addEventListener('mouseleave', () => {
            if (isDrawing) {
                isDrawing = false;
                saveCanvasState();
            }
        });
    }

    function drawArrow(context, fromx, fromy, tox, toy, headlen = 12) {
        const dx = tox - fromx;
        const dy = toy - fromy;
        const angle = Math.atan2(dy, dx);
        context.beginPath();
        context.moveTo(fromx, fromy);
        context.lineTo(tox, toy);
        context.stroke();

        context.beginPath();
        context.moveTo(tox, toy);
        context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
        context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
        context.closePath();
        context.fill();
    }

    if (btnSaveAnnotator && canvas) {
        btnSaveAnnotator.addEventListener('click', () => {
            const dataUrl = canvas.toDataURL('image/png');
            qaNewIssueAttachments.push(dataUrl);
            renderNewIssueThumbnails();
            qaAnnotatorModal.classList.remove('active');
            showQaToast('Annotation Saved', 'Canvas markup attached to ticket!', 'info');
        });
    }

    // ==========================================
    // Issue Details & Discussion Thread Modal
    // ==========================================
    const qaDetailModal = document.getElementById('qaDetailModal');
    const btnCloseQaDetailModal = document.getElementById('btnCloseQaDetailModal');
    const qaNewCommentForm = document.getElementById('qaNewCommentForm');
    const qaCommentFileInput = document.getElementById('qaCommentFileInput');
    const qaCommentThumbnails = document.getElementById('qaCommentThumbnails');
    const btnQaDeleteDetail = document.getElementById('btnQaDeleteDetail');

    if (btnCloseQaDetailModal) btnCloseQaDetailModal.addEventListener('click', () => qaDetailModal.classList.remove('active'));
    if (btnQaDeleteDetail) {
        btnQaDeleteDetail.addEventListener('click', () => {
            if (!activeDetailIssueId) return;
            const issue = qaIssues.find(i => String(i.id) === String(activeDetailIssueId));
            const title = issue ? issue.title : (document.getElementById('qaDetailTitle')?.textContent || '');
            deleteQaIssue(activeDetailIssueId, title);
        });
    }

    async function openQaDetailModal(issueId) {
        if (!qaDetailModal) return;
        activeDetailIssueId = issueId;
        qaCommentAttachments = [];
        renderCommentThumbnails();

        try {
            const res = await fetch(`/api/qa/issues/${issueId}`);
            if (!res.ok) {
                alert('Issue ticket not found');
                return;
            }
            const issue = await res.json();

            // Populate metadata
            document.getElementById('qaDetailId').textContent = `#QA-${String(issue.id).padStart(2, '0')}`;
            document.getElementById('qaDetailTitle').textContent = issue.title;

            const pBadge = document.getElementById('qaDetailPriorityBadge');
            pBadge.className = `badge badge-priority-${(issue.priority || 'medium').toLowerCase()}`;
            pBadge.textContent = issue.priority;

            const tBadge = document.getElementById('qaDetailTypeBadge');
            tBadge.textContent = issue.type;

            const mBadge = document.getElementById('qaDetailModuleBadge');
            mBadge.textContent = issue.module;

            document.getElementById('qaDetailReporter').textContent = `${issue.reporterName || 'Anonymous'} (${issue.reporterEmail || ''})`;
            document.getElementById('qaDetailDate').textContent = new Date(issue.createdAt).toLocaleString();
            document.getElementById('qaDetailAssignee').textContent = issue.assigneeName ? issue.assigneeName : 'Unassigned';

            // Stage Progression Buttons
            document.querySelectorAll('.qa-stage-btn').forEach(btn => {
                const s = btn.getAttribute('data-status');
                if (s === issue.status) {
                    btn.classList.add('active-stage');
                } else {
                    btn.classList.remove('active-stage');
                }
                btn.onclick = async () => {
                    await updateQaIssueStatus(issue.id, s);
                };
            });

            // Description
            document.getElementById('qaDetailDescription').textContent = issue.description;

            // Gallery
            const gallerySec = document.getElementById('qaDetailAttachmentsSection');
            const gallery = document.getElementById('qaDetailGallery');
            if (issue.attachments && Array.isArray(issue.attachments) && issue.attachments.length > 0) {
                gallerySec.style.display = 'block';
                gallery.innerHTML = issue.attachments.map(url => `
                    <div class="qa-gallery-thumb" onclick="openQaLightbox('${url}')">
                        <img src="${url}" alt="evidence">
                    </div>
                `).join('');
            } else {
                gallerySec.style.display = 'none';
            }

            // Environment Grid
            const envGrid = document.getElementById('qaDetailEnvGrid');
            envGrid.innerHTML = `
                <div class="qa-env-card"><label>Browser</label><span>${escapeHtml(issue.envBrowser || 'N/A')}</span></div>
                <div class="qa-env-card"><label>Operating System</label><span>${escapeHtml(issue.envOs || 'N/A')}</span></div>
                <div class="qa-env-card"><label>Screen Resolution</label><span>${escapeHtml(issue.envResolution || 'N/A')}</span></div>
                <div class="qa-env-card"><label>Viewport</label><span>${escapeHtml(issue.envViewport || 'N/A')}</span></div>
                <div class="qa-env-card" style="grid-column: 1 / -1;"><label>Capture URL</label><span>${escapeHtml(issue.envUrl || 'N/A')}</span></div>
            `;

            // Discussion comments
            renderCommentsThread(issue.comments || []);
            document.getElementById('qaDetailCommentCount').textContent = (issue.comments || []).length;

            qaDetailModal.classList.add('active');
        } catch (err) {
            console.error('Failed to load issue details:', err);
        }
    }

    function renderCommentsThread(comments) {
        const thread = document.getElementById('qaCommentsThread');
        if (!thread) return;

        if (comments.length === 0) {
            thread.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px;">
                    No activity yet. Leave the first reply or verification note below.
                </div>
            `;
            return;
        }

        thread.innerHTML = comments.map(c => {
            const hasAtt = c.attachments && Array.isArray(c.attachments) && c.attachments.length > 0;
            return `
                <div class="qa-comment-bubble">
                    <div class="qa-comment-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <strong style="color: var(--brand-navy); font-size: 13px;">${escapeHtml(c.authorName)}</strong>
                            <span class="badge" style="font-size: 10px; padding: 1px 6px;">${c.authorRole || 'Staff'}</span>
                        </div>
                        <span style="font-size: 11px; color: var(--text-muted);">${new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div class="qa-comment-body">${escapeHtml(c.comment)}</div>
                    ${hasAtt ? `
                        <div style="display: flex; gap: 8px; margin-top: 8px;">
                            ${c.attachments.map(src => `
                                <img src="${src}" style="width: 70px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 1px solid var(--border-light);" onclick="openQaLightbox('${src}')">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    if (qaCommentFileInput) {
        qaCommentFileInput.addEventListener('change', (e) => {
            handleImageFiles(e.target.files, qaCommentAttachments, renderCommentThumbnails);
        });
    }

    function renderCommentThumbnails() {
        if (!qaCommentThumbnails) return;
        qaCommentThumbnails.innerHTML = qaCommentAttachments.map((src, index) => `
            <div class="qa-thumbnail-item" style="width: 60px; height: 46px;">
                <img src="${src}" alt="attachment" onclick="openQaLightbox('${src}')">
                <button type="button" class="qa-thumbnail-remove" data-index="${index}">&times;</button>
            </div>
        `).join('');

        qaCommentThumbnails.querySelectorAll('.qa-thumbnail-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                qaCommentAttachments.splice(idx, 1);
                renderCommentThumbnails();
            });
        });
    }

    if (qaNewCommentForm) {
        qaNewCommentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activeDetailIssueId) return;

            const commentInput = document.getElementById('qaCommentInput');
            const comment = commentInput.value.trim();
            if (!comment) return;

            const submitBtn = document.getElementById('btnSubmitComment');
            if (submitBtn) submitBtn.disabled = true;

            try {
                const res = await fetch(`/api/qa/issues/${activeDetailIssueId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        comment,
                        attachments: qaCommentAttachments
                    })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    commentInput.value = '';
                    qaCommentAttachments = [];
                    renderCommentThumbnails();
                    await openQaDetailModal(activeDetailIssueId);
                    await loadQaIssues();
                } else {
                    alert(data.error || 'Failed to submit reply');
                }
            } catch (err) {
                alert('Network error submitting reply');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // Lightbox Functionality
    const qaLightboxModal = document.getElementById('qaLightboxModal');
    const qaLightboxImg = document.getElementById('qaLightboxImg');
    const btnCloseLightbox = document.getElementById('btnCloseLightbox');

    window.openQaLightbox = function(src) {
        if (qaLightboxModal && qaLightboxImg) {
            qaLightboxImg.src = src;
            qaLightboxModal.classList.add('active');
        }
    };

    if (btnCloseLightbox && qaLightboxModal) {
        btnCloseLightbox.addEventListener('click', () => qaLightboxModal.classList.remove('active'));
        qaLightboxModal.addEventListener('click', (e) => {
            if (e.target === qaLightboxModal) qaLightboxModal.classList.remove('active');
        });
    }

    // View Switching: List vs Kanban vs Drafts
    const btnQaViewList = document.getElementById('btnQaViewList');
    const btnQaViewKanban = document.getElementById('btnQaViewKanban');
    const btnQaViewDrafts = document.getElementById('btnQaViewDrafts');
    const qaListView = document.getElementById('qaListView');
    const qaKanbanView = document.getElementById('qaKanbanView');
    const qaDraftsView = document.getElementById('qaDraftsView');

    function switchQaView(viewName) {
        qaCurrentView = viewName;
        if (btnQaViewList) btnQaViewList.classList.toggle('active', viewName === 'list');
        if (btnQaViewKanban) btnQaViewKanban.classList.toggle('active', viewName === 'kanban');
        if (btnQaViewDrafts) btnQaViewDrafts.classList.toggle('active', viewName === 'drafts');

        if (qaListView) qaListView.style.display = viewName === 'list' ? 'block' : 'none';
        if (qaKanbanView) qaKanbanView.style.display = viewName === 'kanban' ? 'block' : 'none';
        if (qaDraftsView) qaDraftsView.style.display = viewName === 'drafts' ? 'block' : 'none';

        updateDraftBadges();

        if (viewName === 'kanban') {
            renderQaKanbanView();
        } else if (viewName === 'drafts') {
            renderQaDraftsView(qaSearchInput ? qaSearchInput.value : '');
        }
    }

    if (btnQaViewList) btnQaViewList.addEventListener('click', () => switchQaView('list'));
    if (btnQaViewKanban) btnQaViewKanban.addEventListener('click', () => switchQaView('kanban'));
    if (btnQaViewDrafts) btnQaViewDrafts.addEventListener('click', () => switchQaView('drafts'));

    // Draft Alert Strip & Action Bar Handlers
    const btnResumeLatestDraft = document.getElementById('btnResumeLatestDraft');
    const btnGoToDraftsView = document.getElementById('btnGoToDraftsView');
    const btnDismissDraftAlert = document.getElementById('btnDismissDraftAlert');

    if (btnResumeLatestDraft) {
        btnResumeLatestDraft.addEventListener('click', () => {
            const drafts = getQaDrafts();
            if (drafts.length > 0) resumeQaDraft(drafts[0].id);
        });
    }

    if (btnGoToDraftsView) {
        btnGoToDraftsView.addEventListener('click', () => switchQaView('drafts'));
    }

    if (btnDismissDraftAlert) {
        btnDismissDraftAlert.addEventListener('click', () => {
            draftAlertDismissed = true;
            const strip = document.getElementById('qaDraftAlertStrip');
            if (strip) strip.style.display = 'none';
        });
    }

    const btnRefreshDrafts = document.getElementById('btnRefreshDrafts');
    if (btnRefreshDrafts) {
        btnRefreshDrafts.addEventListener('click', () => {
            renderQaDraftsView(qaSearchInput ? qaSearchInput.value : '');
            showQaToast('Drafts Refreshed 🔄', 'Drafts list updated from local cache.', 'info');
        });
    }

    const btnDiscardAllDrafts = document.getElementById('btnDiscardAllDrafts');
    if (btnDiscardAllDrafts) {
        btnDiscardAllDrafts.addEventListener('click', clearAllQaDrafts);
    }

    const btnDraftNewBlank = document.getElementById('btnDraftNewBlank');
    if (btnDraftNewBlank) {
        btnDraftNewBlank.addEventListener('click', openNewIssueModal);
    }

    const btnDraftsEmptyCreate = document.getElementById('btnDraftsEmptyCreate');
    if (btnDraftsEmptyCreate) {
        btnDraftsEmptyCreate.addEventListener('click', openNewIssueModal);
    }

    // Escape key closes modal and auto-saves draft
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && qaNewIssueModal && qaNewIssueModal.classList.contains('active')) {
            checkAndSaveDraftOnClose();
        }
    });

    // Filter controls
    const qaSearchInput = document.getElementById('qaSearchInput');
    const qaClearSearchBtn = document.getElementById('qaClearSearchBtn');
    const qaFilterStatus = document.getElementById('qaFilterStatus');
    const qaFilterType = document.getElementById('qaFilterType');
    const qaFilterPriority = document.getElementById('qaFilterPriority');
    const qaFilterModule = document.getElementById('qaFilterModule');
    const btnQaResetFilters = document.getElementById('btnQaResetFilters');

    let qaSearchTimeout = null;
    if (qaSearchInput) {
        qaSearchInput.addEventListener('input', () => {
            clearTimeout(qaSearchTimeout);
            const val = qaSearchInput.value.trim();
            if (qaClearSearchBtn) qaClearSearchBtn.style.display = val ? 'inline-block' : 'none';
            qaSearchTimeout = setTimeout(() => {
                qaFilterState.q = val;
                if (qaCurrentView === 'drafts') {
                    renderQaDraftsView(val);
                } else {
                    loadQaIssues();
                }
            }, 300);
        });
    }

    if (qaClearSearchBtn && qaSearchInput) {
        qaClearSearchBtn.addEventListener('click', () => {
            qaSearchInput.value = '';
            qaClearSearchBtn.style.display = 'none';
            qaFilterState.q = '';
            if (qaCurrentView === 'drafts') {
                renderQaDraftsView('');
            } else {
                loadQaIssues();
            }
        });
    }

    [
        { el: qaFilterStatus, key: 'status' },
        { el: qaFilterType, key: 'type' },
        { el: qaFilterPriority, key: 'priority' },
        { el: qaFilterModule, key: 'module' }
    ].forEach(({ el, key }) => {
        if (el) {
            el.addEventListener('change', () => {
                qaFilterState[key] = el.value;
                loadQaIssues();
            });
        }
    });

    if (btnQaResetFilters) {
        btnQaResetFilters.addEventListener('click', () => {
            qaFilterState = { status: 'all', type: 'all', priority: 'all', module: 'all', q: '' };
            if (qaSearchInput) qaSearchInput.value = '';
            if (qaClearSearchBtn) qaClearSearchBtn.style.display = 'none';
            if (qaFilterStatus) qaFilterStatus.value = 'all';
            if (qaFilterType) qaFilterType.value = 'all';
            if (qaFilterPriority) qaFilterPriority.value = 'all';
            if (qaFilterModule) qaFilterModule.value = 'all';
            if (qaCurrentView === 'drafts') {
                renderQaDraftsView('');
            } else {
                loadQaIssues();
            }
        });
    }

    // Markdown & CSV Export Handlers
    const btnQaCopyMarkdown = document.getElementById('btnQaCopyMarkdown');
    const btnQaExportCsv = document.getElementById('btnQaExportCsv');

    if (btnQaCopyMarkdown) {
        btnQaCopyMarkdown.addEventListener('click', () => {
            if (!qaIssues || qaIssues.length === 0) {
                alert('No QA issues currently loaded to copy.');
                return;
            }

            const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            let md = `### 🐞 The Lab Indonesia QA & Bug Tracker - Standup Report (${dateStr})\n`;
            md += `**Total Tickets:** ${qaStats.total || qaIssues.length} | **Open:** ${qaStats.open || 0} | **In Progress:** ${qaStats.inProgress || 0} | **Ready for QA:** ${qaStats.readyForQa || 0} | **Critical:** ${qaStats.critical || 0}\n\n`;
            md += `| ID | Priority | Category | Title | Assignee | Status |\n`;
            md += `|---|---|---|---|---|---|\n`;

            qaIssues.forEach(i => {
                md += `| #QA-${String(i.id).padStart(2, '0')} | ${i.priority} | ${i.type || 'Bug'} | ${i.title.replace(/\|/g, '-')} | ${i.assigneeName || 'Unassigned'} | ${i.status} |\n`;
            });

            navigator.clipboard.writeText(md).then(() => {
                showQaToast('Standup Copied', 'Markdown table copied to clipboard! Paste into your team channel.', 'info');
            }).catch(() => {
                alert('Failed to copy Markdown to clipboard');
            });
        });
    }

    if (btnQaExportCsv) {
        btnQaExportCsv.addEventListener('click', () => {
            if (!qaIssues || qaIssues.length === 0) {
                alert('No QA issues currently available to export.');
                return;
            }

            const headers = ['ID', 'Title', 'Type', 'Priority', 'Status', 'Module', 'Reporter Name', 'Reporter Email', 'Assignee Name', 'Comments', 'Created At'];
            const rows = qaIssues.map(i => [
                `QA-${String(i.id).padStart(2, '0')}`,
                `"${(i.title || '').replace(/"/g, '""')}"`,
                `"${i.type || ''}"`,
                `"${i.priority || ''}"`,
                `"${i.status || ''}"`,
                `"${i.module || ''}"`,
                `"${(i.reporterName || '').replace(/"/g, '""')}"`,
                `"${(i.reporterEmail || '').replace(/"/g, '""')}"`,
                `"${(i.assigneeName || '').replace(/"/g, '""')}"`,
                i.commentCount || 0,
                `"${i.createdAt || ''}"`
            ]);

            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `thelab-qa-tracker-${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showQaToast('CSV Exported', 'Downloaded CSV issue log successfully.', 'info');
        });
    }

    // Real-Time Notification Poller
    async function pollQaNotifications() {
        try {
            const res = await fetch('/api/qa/notifications?since=600000');
            if (!res.ok) return;
            const data = await res.json();
            if (data.alerts && Array.isArray(data.alerts)) {
                data.alerts.forEach(alert => {
                    if (!qaAlertsSeen.has(alert.id)) {
                        qaAlertsSeen.add(alert.id);
                        showQaToast(
                            `🚨 ${alert.priority} Issue: #${alert.id}`,
                            `${alert.title} (${alert.module})`,
                            alert.priority.toLowerCase(),
                            alert.id
                        );
                    }
                });
            }
        } catch (e) {}
    }

    // Initialize
    loadInitialData();
    loadUsers();
    checkDbStatus();
    loadQaData();
    initTrainingArea();
    setInterval(checkDbStatus, 20000);
    setInterval(pollQaNotifications, 15000);

    // Deep link check for /new/qa-tracker or #tab-qa or #tab-training-area
    if (window.location.hash === '#tab-training-area') {
        const trainingNavBtn = document.querySelector('.nav-item[data-tab="training-area"]');
        if (trainingNavBtn) setTimeout(() => trainingNavBtn.click(), 150);
    } else if (window.location.pathname === '/new/qa-tracker' || window.location.pathname === '/qa-tracker' || window.location.hash === '#tab-qa') {
        const qaNavBtn = document.getElementById('navItemQa');
        if (qaNavBtn) {
            setTimeout(() => qaNavBtn.click(), 150);
        }
    }
});

// Global copy snippet utility for peer onboarding tutorial
window.copySnippet = function(button) {
    const codeBox = button.closest('.code-box');
    if (!codeBox) return;
    const codeEl = codeBox.querySelector('code');
    if (!codeEl) return;

    const textToCopy = codeEl.innerText.trim();
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied! ✓';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};

// ============================================================================
// TRAINING AREA CONTROLLER (KINDER TRACK EMPHASIS)
// ============================================================================
let trainingAreaInitialized = false;

function initTrainingArea() {
    // 1. Gamification State (EXP, Level, Coins)
    let coinBalance = parseInt(localStorage.getItem('thelab_training_coins') || '450', 10);
    let trainerExp = parseInt(localStorage.getItem('thelab_trainer_exp') || '320', 10);

    const coinDisplay = document.getElementById('trainingCoinDisplay');
    const trainerExpNum = document.getElementById('trainerExpNum');
    const trainerExpBar = document.getElementById('trainerExpBar');
    const trainerLevelNum = document.getElementById('trainerLevelNum');

    function updateGamificationUI() {
        if (coinDisplay) coinDisplay.textContent = coinBalance.toLocaleString();
        if (trainerExpNum) trainerExpNum.textContent = trainerExp;
        if (trainerExpBar) {
            const pct = Math.min(100, Math.round((trainerExp / 500) * 100));
            trainerExpBar.style.width = pct + '%';
        }
        if (trainerLevelNum) {
            trainerLevelNum.textContent = trainerExp >= 500 ? '2' : '1';
        }
        localStorage.setItem('thelab_training_coins', String(coinBalance));
        localStorage.setItem('thelab_trainer_exp', String(trainerExp));
    }

    function awardReward(exp, coins, reason) {
        trainerExp += exp;
        coinBalance += coins;
        updateGamificationUI();

        // Toast notice
        const toast = document.createElement('div');
        toast.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; background: #0E1B4D; color: #FFFFFF; padding: 12px 20px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid #45B7CD; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 8px; animation: bounce 0.5s ease;';
        toast.innerHTML = '<span>🎉</span><span style="color: #F6C551;">+' + coins + ' Coins & +' + exp + ' EXP!</span> <span style="color: #CBD5E1; font-size: 11px;">(' + reason + ')</span>';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    updateGamificationUI();

    if (trainingAreaInitialized) return;
    trainingAreaInitialized = true;

    // 2. Track Selection Controls: [Kinder] | [Junior] | [Coder]
    const trackCardKinder = document.getElementById('trackCardKinder');
    const trackCardJunior = document.getElementById('trackCardJunior');
    const trackCardCoder = document.getElementById('trackCardCoder');

    function setTrackActive(card, name) {
        [trackCardKinder, trackCardJunior, trackCardCoder].forEach(c => {
            if (c) {
                c.style.borderColor = 'rgba(14, 27, 77, 0.12)';
                c.style.opacity = '0.65';
                c.style.boxShadow = 'none';
            }
        });
        if (card) {
            card.style.borderColor = name === 'Kinder' ? '#F59E0B' : name === 'Junior' ? '#45B7CD' : '#8B5CF6';
            card.style.opacity = '1';
            card.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)';
        }
    }

    if (trackCardKinder) trackCardKinder.addEventListener('click', () => setTrackActive(trackCardKinder, 'Kinder'));
    if (trackCardJunior) trackCardJunior.addEventListener('click', () => {
        setTrackActive(trackCardJunior, 'Junior');
        alert('Junior Track (Ages 7–12) selected. The current view is optimized for the Kinder Track.');
    });
    if (trackCardCoder) trackCardCoder.addEventListener('click', () => {
        setTrackActive(trackCardCoder, 'Coder');
        alert('Coder Track (Ages 13+) selected. The current view is optimized for the Kinder Track.');
    });

    // 3. Sub-Navigation Tabs
    const subnavBtns = document.querySelectorAll('.training-subnav-btn');
    const subpanels = document.querySelectorAll('.training-subpanel');

    subnavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-training-tab');
            subnavBtns.forEach(b => b.classList.remove('active'));
            subpanels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPanel = document.getElementById('training-subpanel-' + targetTab);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });

    // 4. First Day Mission Controller (Kinder)
    const missionCardProgram = document.getElementById('missionCardProgram');
    const missionCardSpa = document.getElementById('missionCardSpa');
    const missionCardEc = document.getElementById('missionCardEc');

    const btnToggleMissionProgram = document.getElementById('btnToggleMissionProgram');
    const btnToggleMissionSpa = document.getElementById('btnToggleMissionSpa');
    const btnToggleMissionEc = document.getElementById('btnToggleMissionEc');

    const badgeSpaIcon = document.getElementById('badgeSpaIcon');
    const badgeEcIcon = document.getElementById('badgeEcIcon');
    const kinderOverallPercent = document.getElementById('kinderOverallPercent');
    const kinderOverallBar = document.getElementById('kinderOverallBar');
    const kinderMissionPill = document.getElementById('kinderMissionPill');

    let missionState = {
        program: true,
        spa: false,
        ec: false
    };

    function updateMissionUI() {
        const completedCount = Object.values(missionState).filter(Boolean).length;
        const pct = Math.round((completedCount / 3) * 100);

        if (kinderOverallPercent) kinderOverallPercent.textContent = pct + '% Completed';
        if (kinderOverallBar) kinderOverallBar.style.width = pct + '%';
        if (kinderMissionPill) kinderMissionPill.textContent = completedCount + '/3 Done';

        // Program Button
        if (btnToggleMissionProgram) {
            if (missionState.program) {
                btnToggleMissionProgram.textContent = '✓ Mission Completed (Click to Toggle)';
                btnToggleMissionProgram.style.background = '#ECFDF5';
                btnToggleMissionProgram.style.color = '#065F46';
                if (missionCardProgram) missionCardProgram.style.borderColor = '#10B981';
            } else {
                btnToggleMissionProgram.textContent = 'Mark Mission Completed ⚡';
                btnToggleMissionProgram.style.background = '#0E1B4D';
                btnToggleMissionProgram.style.color = '#FFFFFF';
                if (missionCardProgram) missionCardProgram.style.borderColor = 'rgba(14, 27, 77, 0.12)';
            }
        }

        // SPA Button & Badge
        if (btnToggleMissionSpa) {
            if (missionState.spa) {
                btnToggleMissionSpa.textContent = '✓ Mission Completed (Click to Toggle)';
                btnToggleMissionSpa.style.background = '#ECFDF5';
                btnToggleMissionSpa.style.color = '#065F46';
                if (missionCardSpa) missionCardSpa.style.borderColor = '#10B981';
                if (badgeSpaIcon) {
                    badgeSpaIcon.style.filter = 'none';
                    badgeSpaIcon.style.opacity = '1';
                    badgeSpaIcon.style.background = 'rgba(69, 183, 205, 0.3)';
                    badgeSpaIcon.style.borderColor = '#45B7CD';
                }
            } else {
                btnToggleMissionSpa.textContent = 'Mark Mission Completed ⚡';
                btnToggleMissionSpa.style.background = '#0E1B4D';
                btnToggleMissionSpa.style.color = '#FFFFFF';
                if (missionCardSpa) missionCardSpa.style.borderColor = 'rgba(14, 27, 77, 0.12)';
                if (badgeSpaIcon) {
                    badgeSpaIcon.style.filter = 'grayscale(1)';
                    badgeSpaIcon.style.opacity = '0.4';
                }
            }
        }

        // EC Button & Badge
        if (btnToggleMissionEc) {
            if (missionState.ec) {
                btnToggleMissionEc.textContent = '✓ Mission Completed (Click to Toggle)';
                btnToggleMissionEc.style.background = '#ECFDF5';
                btnToggleMissionEc.style.color = '#065F46';
                if (missionCardEc) missionCardEc.style.borderColor = '#10B981';
                if (badgeEcIcon) {
                    badgeEcIcon.style.filter = 'none';
                    badgeEcIcon.style.opacity = '1';
                    badgeEcIcon.style.background = 'rgba(139, 92, 246, 0.3)';
                    badgeEcIcon.style.borderColor = '#8B5CF6';
                }
            } else {
                btnToggleMissionEc.textContent = 'Mark Mission Completed ⚡';
                btnToggleMissionEc.style.background = '#0E1B4D';
                btnToggleMissionEc.style.color = '#FFFFFF';
                if (missionCardEc) missionCardEc.style.borderColor = 'rgba(14, 27, 77, 0.12)';
                if (badgeEcIcon) {
                    badgeEcIcon.style.filter = 'grayscale(1)';
                    badgeEcIcon.style.opacity = '0.4';
                }
            }
        }
        // Update combined progress
        if (typeof updateOnboardingUI === 'function') {
            updateOnboardingUI();
        }
    }

    // 4b. Day 1 Launchpad / First Day Onboarding (3 Core Pillars)
    const chkEmailCreation = document.getElementById('chkEmailCreation');
    const chkMasterSheet = document.getElementById('chkMasterSheet');
    const chkPortalLogin = document.getElementById('chkPortalLogin');
    const chkFolderCurriculum = document.getElementById('chkFolderCurriculum');
    const chkFolderSchedules = document.getElementById('chkFolderSchedules');
    const chkFolderPersonal = document.getElementById('chkFolderPersonal');
    const chkBuddySystem = document.getElementById('chkBuddySystem');
    const chkBranchAllies = document.getElementById('chkBranchAllies');

    const pillar1Badge = document.getElementById('pillar1Badge');
    const pillar1StatusLabel = document.getElementById('pillar1StatusLabel');
    const pillar2Badge = document.getElementById('pillar2Badge');
    const pillar2StatusLabel = document.getElementById('pillar2StatusLabel');
    const pillar3Badge = document.getElementById('pillar3Badge');
    const pillar3StatusLabel = document.getElementById('pillar3StatusLabel');
    const onboardingTaskCountBadge = document.getElementById('onboardingTaskCountBadge');

    let onboardingState = {
        email: true,
        sheet: true,
        portal: true,
        curriculum: true,
        schedules: false,
        personal: false,
        buddy: true,
        allies: false
    };

    try {
        const savedOnboarding = localStorage.getItem('thelab_day1_onboarding');
        if (savedOnboarding) {
            onboardingState = Object.assign(onboardingState, JSON.parse(savedOnboarding));
        }
    } catch (e) {}

    function updateOnboardingUI(awardExpNotice) {
        if (chkEmailCreation) chkEmailCreation.checked = Boolean(onboardingState.email);
        if (chkMasterSheet) chkMasterSheet.checked = Boolean(onboardingState.sheet);
        if (chkPortalLogin) chkPortalLogin.checked = Boolean(onboardingState.portal);
        if (chkFolderCurriculum) chkFolderCurriculum.checked = Boolean(onboardingState.curriculum);
        if (chkFolderSchedules) chkFolderSchedules.checked = Boolean(onboardingState.schedules);
        if (chkFolderPersonal) chkFolderPersonal.checked = Boolean(onboardingState.personal);
        if (chkBuddySystem) chkBuddySystem.checked = Boolean(onboardingState.buddy);
        if (chkBranchAllies) chkBranchAllies.checked = Boolean(onboardingState.allies);

        // Pillar 1 status
        const p1Done = onboardingState.email && onboardingState.sheet && onboardingState.portal;
        if (pillar1Badge) {
            pillar1Badge.textContent = p1Done ? 'Account & Portal Ready ✓' : 'In Progress';
            pillar1Badge.style.background = p1Done ? '#ECFDF5' : '#FEF3C7';
            pillar1Badge.style.color = p1Done ? '#065F46' : '#92400E';
        }
        if (pillar1StatusLabel) {
            pillar1StatusLabel.textContent = p1Done ? 'Account & Portal Ready ✓' : 'Setup Incomplete';
            pillar1StatusLabel.style.color = p1Done ? '#059669' : '#D97706';
        }

        // Pillar 2 status
        const p2Done = onboardingState.curriculum && onboardingState.schedules && onboardingState.personal;
        const p2Count = [onboardingState.curriculum, onboardingState.schedules, onboardingState.personal].filter(Boolean).length;
        if (pillar2Badge) {
            pillar2Badge.textContent = p2Done ? 'Drive Setup Complete ✓' : 'Access Checking (' + p2Count + '/3)';
            pillar2Badge.style.background = p2Done ? '#ECFDF5' : '#EDF9FB';
            pillar2Badge.style.color = p2Done ? '#065F46' : '#35A3B8';
        }
        if (pillar2StatusLabel) {
            pillar2StatusLabel.textContent = p2Done ? 'Drive Storage Setup Complete' : 'Drive Storage Setup Incomplete (' + p2Count + '/3)';
            pillar2StatusLabel.style.color = p2Done ? '#059669' : '#D97706';
        }

        // Pillar 3 status
        const p3Done = onboardingState.buddy && onboardingState.allies;
        if (pillar3Badge) {
            pillar3Badge.textContent = p3Done ? 'Team & Culture Ready ✓' : 'Team Connection';
            pillar3Badge.style.background = p3Done ? '#ECFDF5' : '#EDE9FE';
            pillar3Badge.style.color = p3Done ? '#065F46' : '#6D28D9';
        }
        if (pillar3StatusLabel) {
            pillar3StatusLabel.textContent = p3Done ? 'Wingman & Culture Complete ✓' : 'Wingman & Culture Active';
            pillar3StatusLabel.style.color = p3Done ? '#059669' : '#6D28D9';
        }

        // Overall Day 1 Onboarding progress computation (8 tasks)
        const totalItemsDone = Object.values(onboardingState).filter(Boolean).length;
        const totalItemsCount = 8;
        const pct = Math.round((totalItemsDone / totalItemsCount) * 100);

        if (onboardingTaskCountBadge) {
            onboardingTaskCountBadge.textContent = totalItemsDone + ' / ' + totalItemsCount + ' Tasks';
        }
        if (kinderOverallPercent) {
            kinderOverallPercent.textContent = pct + '% Completed';
        }
        if (kinderOverallBar) {
            kinderOverallBar.style.width = pct + '%';
        }
        if (kinderMissionPill) {
            kinderMissionPill.textContent = totalItemsDone + '/8 Done';
        }

        // Branch Allies (SPA & EC) badges illumination from Pillar 3
        if (badgeSpaIcon) {
            badgeSpaIcon.style.filter = onboardingState.allies ? 'none' : 'grayscale(1)';
            badgeSpaIcon.style.opacity = onboardingState.allies ? '1' : '0.4';
            badgeSpaIcon.style.background = onboardingState.allies ? 'rgba(69, 183, 205, 0.3)' : 'rgba(255, 255, 255, 0.05)';
            badgeSpaIcon.style.borderColor = onboardingState.allies ? '#45B7CD' : 'rgba(255, 255, 255, 0.2)';
        }
        if (badgeEcIcon) {
            badgeEcIcon.style.filter = onboardingState.allies ? 'none' : 'grayscale(1)';
            badgeEcIcon.style.opacity = onboardingState.allies ? '1' : '0.4';
            badgeEcIcon.style.background = onboardingState.allies ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)';
            badgeEcIcon.style.borderColor = onboardingState.allies ? '#8B5CF6' : 'rgba(255, 255, 255, 0.2)';
        }

        try {
            localStorage.setItem('thelab_day1_onboarding', JSON.stringify(onboardingState));
        } catch (e) {}

        if (awardExpNotice) {
            awardReward(20, 15, awardExpNotice);
        }
    }

    // Attach checkbox event listeners
    const onboardingCheckboxes = [
        { el: chkEmailCreation, key: 'email', name: 'Work Email Setup' },
        { el: chkMasterSheet, key: 'sheet', name: 'Master Sheet Registration' },
        { el: chkPortalLogin, key: 'portal', name: 'Instructor Portal Login' },
        { el: chkFolderCurriculum, key: 'curriculum', name: 'Curriculum Library Access' },
        { el: chkFolderSchedules, key: 'schedules', name: 'Class Schedules Folder' },
        { el: chkFolderPersonal, key: 'personal', name: 'Personal Training Folder' },
        { el: chkBuddySystem, key: 'buddy', name: 'Buddy Wingman Connected' },
        { el: chkBranchAllies, key: 'allies', name: 'Branch Allies Briefing' }
    ];

    onboardingCheckboxes.forEach(item => {
        if (item.el) {
            item.el.addEventListener('change', (e) => {
                onboardingState[item.key] = e.target.checked;
                updateOnboardingUI(e.target.checked ? item.name + ' Verified' : null);
            });
        }
    });

    if (btnToggleMissionProgram) {
        btnToggleMissionProgram.addEventListener('click', () => {
            missionState.program = !missionState.program;
            if (missionState.program) awardReward(60, 35, 'Detail Program Completed');
            updateMissionUI();
            updateOnboardingUI();
        });
    }

    if (btnToggleMissionSpa) {
        btnToggleMissionSpa.addEventListener('click', () => {
            missionState.spa = !missionState.spa;
            if (missionState.spa) awardReward(50, 25, 'Who is SPA Completed');
            updateMissionUI();
            updateOnboardingUI();
        });
    }

    if (btnToggleMissionEc) {
        btnToggleMissionEc.addEventListener('click', () => {
            missionState.ec = !missionState.ec;
            if (missionState.ec) awardReward(50, 25, 'Who is EC Completed');
            updateMissionUI();
            updateOnboardingUI();
        });
    }

    updateOnboardingUI();

    // Role Modals Trigger
    const roleModal = document.getElementById('trainingRoleModal');
    const btnOpenSpaDetails = document.getElementById('btnOpenSpaDetails');
    const btnOpenEcDetails = document.getElementById('btnOpenEcDetails');
    const btnRoleTabSpa = document.getElementById('btnRoleTabSpa');
    const btnRoleTabEc = document.getElementById('btnRoleTabEc');
    const roleContentSpa = document.getElementById('roleContentSpa');
    const roleContentEc = document.getElementById('roleContentEc');

    if (btnOpenSpaDetails && roleModal) {
        btnOpenSpaDetails.addEventListener('click', () => {
            roleModal.classList.add('active');
            if (btnRoleTabSpa) btnRoleTabSpa.click();
        });
    }
    if (btnOpenEcDetails && roleModal) {
        btnOpenEcDetails.addEventListener('click', () => {
            roleModal.classList.add('active');
            if (btnRoleTabEc) btnRoleTabEc.click();
        });
    }

    // 5. Priority Training Path Controller
    const btnToggleInstructorReady = document.getElementById('btnToggleInstructorReady');
    const delegationCalloutBox = document.getElementById('delegationCalloutBox');
    let instructorReady = false;

    if (btnToggleInstructorReady && delegationCalloutBox) {
        btnToggleInstructorReady.addEventListener('click', () => {
            instructorReady = !instructorReady;
            if (instructorReady) {
                btnToggleInstructorReady.textContent = 'Simulate instructor_ready: TRUE';
                btnToggleInstructorReady.style.background = '#ECFDF5';
                btnToggleInstructorReady.style.color = '#065F46';
                btnToggleInstructorReady.style.borderColor = '#A7F3D0';
                delegationCalloutBox.style.background = '#ECFDF5';
                delegationCalloutBox.style.borderLeftColor = '#10B981';
                delegationCalloutBox.innerHTML = `
                    <div style="display: flex; gap: 16px; align-items: center;">
                        <span style="font-size: 26px;">🛡️</span>
                        <div>
                            <div style="font-size: 13.5px; font-weight: 900; color: #065F46;">FULL SOLO CERTIFICATION ACTIVE</div>
                            <div style="font-size: 12px; color: #047857; margin-top: 2px;">Instructor has passed all assessments and is fully authorized for independent Kinder delivery.</div>
                        </div>
                    </div>
                `;
            } else {
                btnToggleInstructorReady.textContent = 'Simulate instructor_ready: FALSE';
                btnToggleInstructorReady.style.background = '#FEE2E2';
                btnToggleInstructorReady.style.color = '#991B1B';
                btnToggleInstructorReady.style.borderColor = '#FCA5A5';
                delegationCalloutBox.style.background = 'linear-gradient(90deg, #FFFBEB, #FEF3C7)';
                delegationCalloutBox.style.borderLeftColor = '#F59E0B';
                delegationCalloutBox.innerHTML = `
                    <div style="display: flex; gap: 16px; align-items: flex-start;">
                        <span style="font-size: 30px;">⚠️</span>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <h3 style="font-size: 14px; font-weight: 900; color: #92400E; margin: 0; text-transform: uppercase;">
                                    Branch Manager Delegation Note (Supervised Training Protocol)
                                </h3>
                                <span class="badge" style="background: #F59E0B; color: #FFFFFF; font-weight: 900; font-size: 10px; padding: 2px 8px;">OVERSIGHT MANDATORY</span>
                            </div>
                            <p style="font-size: 12.5px; color: #78350F; line-height: 1.5; margin: 4px 0 10px 0;">
                                Assigned early to Kinder classes under supervised training protocol with <strong>Sarah Wijaya (Branch Manager, Menteng Branch)</strong>.
                            </p>
                            <div style="display: flex; gap: 16px; font-size: 11.5px; font-weight: 800; color: #B45309;">
                                <span>✓ Authorized by Sarah Wijaya</span>
                                <span>•</span>
                                <span>Delegation Ref: BM-MNT-2026-088</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
    }

    // Kinder Roadmap Jump-To Syllabus & 10 Lessons Controller
    const selectKinderTerm = document.getElementById('selectKinderTerm');
    const kinderRoadmapTermHeading = document.getElementById('kinderRoadmapTermHeading');
    const kinderRoadmapTermBadge = document.getElementById('kinderRoadmapTermBadge');
    const kinderRoadmapTermDesc = document.getElementById('kinderRoadmapTermDesc');
    const kinderRoadmapLessonList = document.getElementById('kinderRoadmapLessonList');
    const kinderTermQuickBtns = document.querySelectorAll('.btn-kinder-term-pill');
    const inputFilterKinderLessons = document.getElementById('inputFilterKinderLessons');

    // 4-Term Progress Overview Grid & Locked Banner Elements
    const kinderTermsProgressGrid = document.getElementById('kinderTermsProgressGrid');
    const lockedTermCalloutBanner = document.getElementById('lockedTermCalloutBanner');
    const lockedTermCalloutTitle = document.getElementById('lockedTermCalloutTitle');
    const lockedTermCalloutDesc = document.getElementById('lockedTermCalloutDesc');
    const btnCalloutMasterUnlock = document.getElementById('btnCalloutMasterUnlock');

    // Kinder Lesson Details Modal elements
    const kinderLessonDetailsModal = document.getElementById('kinderLessonDetailsModal');
    const modalLessonIcon = document.getElementById('modalLessonIcon');
    const modalLessonCodeBadge = document.getElementById('modalLessonCodeBadge');
    const modalLessonTermBadge = document.getElementById('modalLessonTermBadge');
    const modalLessonTopic = document.getElementById('modalLessonTopic');
    const modalLessonKit = document.getElementById('modalLessonKit');
    const btnCloseLessonModal = document.getElementById('btnCloseLessonModal');
    const btnDismissLessonModal = document.getElementById('btnDismissLessonModal');

    // Build Matrix Elements
    const matrixBuildsCount = document.getElementById('matrixBuildsCount');
    const matrixBuildsTotal = document.getElementById('matrixBuildsTotal');
    const matrixBuildsBar = document.getElementById('matrixBuildsBar');
    const matrixVideosCount = document.getElementById('matrixVideosCount');
    const matrixVideosTotal = document.getElementById('matrixVideosTotal');
    const matrixVideosBar = document.getElementById('matrixVideosBar');
    const btnCopyTaskSubmissionSheet = document.getElementById('btnCopyTaskSubmissionSheet');
    const matrixCopySheetToast = document.getElementById('matrixCopySheetToast');
    const btnKinderMasterUnlock = document.getElementById('btnKinderMasterUnlock');

    const kinderTermSyllabus = {
        'term-1': {
            name: 'Term 1',
            desc: 'Foundations of Robotics & Electrical Exploration (Lessons K1.01 – K1.10)',
            lessons: [
                {
                    code: 'K1.01',
                    topic: 'Introduction to Robots and Coding',
                    kit: 'Spike Tank',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-1',
                    engineeringFocus: 'Motorized tank chassis, differential steering geometry, hub connection, and directional motor blocks.',
                    lessonPlan: {
                        whatToDo: 'Assemble Spike Tank base, attach two medium motors, and connect to smart hub via Bluetooth.',
                        concept: 'A robot is an obedient machine with a brain (Hub), muscles (Motors), and senses (Sensors).',
                        activityGame: 'Red Light, Green Light robot mimicry game with auditory stop cues.',
                        challenge: 'Add protective front bumper bricks to shield the smart hub from wall impacts.'
                    }
                },
                {
                    code: 'K1.02',
                    topic: 'Electric Circuits and Electrical Conductivity',
                    kit: '<Electric circuit using Snap Circuits>',
                    type: 'circuits',
                    icon: '⚡',
                    term: 'term-1',
                    engineeringFocus: 'Closed circuit loop, battery power flow, conductive vs insulative materials.',
                    lessonPlan: {
                        whatToDo: 'Snap blue battery block to slide switch and lamp; test open vs closed loop.',
                        concept: 'Electricity flows like water in a pipe; if there is a gap, the lamp stays asleep.',
                        activityGame: 'Human Circuit circle game — hold hands to complete the imaginary circuit.',
                        challenge: 'Insert motor fan spinner into the closed loop and observe rotation.'
                    }
                },
                {
                    code: 'K1.03',
                    topic: 'Numbers to 10, Left and Right, Identification and uses of sensors, & Events and Sequence',
                    kit: '<Using Codey Rocky>',
                    type: 'codey',
                    icon: '🐱',
                    term: 'term-1',
                    engineeringFocus: 'Directional navigation, wheel orientation, and sensor event triggers.',
                    lessonPlan: {
                        whatToDo: 'Drive Codey Rocky across the 1-10 number mat using directional arrow buttons.',
                        concept: 'Left and right are relative to the robot\'s nose, not the student\'s eyes.',
                        activityGame: 'Robot Simon Says — Turn 90° right on chime, flash LED eyes on left.',
                        challenge: 'Trigger a playful roar sound when obstacle sensor detects an object within 10cm.'
                    }
                },
                {
                    code: 'K1.04',
                    topic: 'Pattern Recognition through Grouping & Sequence with Time and Speed',
                    kit: 'Spike Kinder Tricycle',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-1',
                    engineeringFocus: 'Steering linkage, tricycle stability geometry, and variable motor speed durations.',
                    lessonPlan: {
                        whatToDo: 'Build 3-wheeled tricycle frame; adjust front fork angle and program motor duration.',
                        concept: 'Speed = how fast; Time = how long. Fast speed for short time reaches the same spot as slow for long time.',
                        activityGame: 'Turtle vs Cheetah movement race with clapping rhythm.',
                        challenge: 'Create an alternating color pattern track (Red-Blue-Red-Blue) for the tricycle.'
                    }
                },
                {
                    code: 'K1.05',
                    topic: 'Math Operators with Codey Rocky & Events and Sequence with Loudness',
                    kit: '<Using Codey Rocky>',
                    type: 'codey',
                    icon: '🐱',
                    term: 'term-1',
                    engineeringFocus: 'Acoustic loudness sensor threshold, sound triggers, and basic addition/subtraction.',
                    lessonPlan: {
                        whatToDo: 'Calibrate Codey Rocky\'s mic sensor to respond to child claps.',
                        concept: 'The robot listens to sound volume; louder claps equal bigger numbers.',
                        activityGame: 'Volume Whisper & Shout Game — whispering makes Codey crawl, shouting makes Codey stop.',
                        challenge: 'Add 2 claps + 3 claps and display 5 dots on Codey\'s LED matrix face.'
                    }
                },
                {
                    code: 'K1.06',
                    topic: 'Motor Manipulation with Moments',
                    kit: 'Spike Egg Spinner, Spike Fishing Rod',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-1',
                    engineeringFocus: 'Rotational momentum, centrifugal force, spool winding, and gear leverage.',
                    lessonPlan: {
                        whatToDo: 'Construct high-speed egg spinner followed by manual reel fishing rod mechanism.',
                        concept: 'Turning a big gear slowly turns a small gear very fast (spinning momentum).',
                        activityGame: 'Spinning Top challenge — whose egg model spins longest without tumbling.',
                        challenge: 'Add a ratchet lock to the fishing rod to stop the line from unwinding.'
                    }
                },
                {
                    code: 'K1.07',
                    topic: 'Motor Manipulation with Angles and Power and Sequencing',
                    kit: '<Using Codey Rocky>',
                    type: 'codey',
                    icon: '🐱',
                    term: 'term-1',
                    engineeringFocus: 'Precise rotation angles (45°, 90°, 180°), motor power limits, and turn sequencing.',
                    lessonPlan: {
                        whatToDo: 'Program Codey Rocky to trace an equilateral triangle and square on paper.',
                        concept: 'An angle is how sharp we turn our robot before moving forward again.',
                        activityGame: 'Floor Maze Navigation — turning through taped cardboard walls without bumping.',
                        challenge: 'Program a victory spin of exactly 360 degrees when reaching the finish star.'
                    }
                },
                {
                    code: 'K1.08',
                    topic: 'Positive and Negative Numbers, & Motor Manipulation with Numbers',
                    kit: 'Spike Crocodile',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-1',
                    engineeringFocus: 'Bidirectional motor rotation (positive/clockwise, negative/counter-clockwise), gear teeth engagement.',
                    lessonPlan: {
                        whatToDo: 'Build crocodile jaw with reciprocal gear lever; program open (+) and snap shut (-).',
                        concept: 'Positive numbers move forward/open; negative numbers reverse/close.',
                        activityGame: 'Feeding the Crocodile — count fish blocks into the jaw before snap shut.',
                        challenge: 'Add a warning growl sound 2 seconds before the jaws snap shut.'
                    }
                },
                {
                    code: 'K1.09',
                    topic: 'Additions to 10, & Motor Manipulation with Numbers',
                    kit: 'Spike Terminator',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-1',
                    engineeringFocus: 'Stepper motor increments, numerical target matching, and physical counter pointer.',
                    lessonPlan: {
                        whatToDo: 'Build Terminator pointer mechanism that rotates dial to match sum of two dice.',
                        concept: 'Adding numbers together advances the pointer forward by the combined count.',
                        activityGame: 'Dice roll math battle — roll two tactile dice and program pointer to the sum.',
                        challenge: 'Program buzzer to beep the exact number of times equal to the answer.'
                    }
                },
                {
                    code: 'K1.10',
                    topic: 'Term 1 Project',
                    kit: '<Choose one robot from Term 1 along with requirements>',
                    type: 'project',
                    icon: '🏆',
                    term: 'term-1',
                    engineeringFocus: 'Capstone integration, independent build troubleshooting, and student project presentation.',
                    lessonPlan: {
                        whatToDo: 'Select 1 favorite robot from Term 1; rebuild, customize, and demonstrate to peers.',
                        concept: 'An engineer combines what they learned to invent their own improved machine.',
                        activityGame: '5-Minute Parent Showcase rehearsal — explaining how the robot moves and thinks.',
                        challenge: 'Introduce 1 custom mechanical or code modification not shown in the base guide.'
                    }
                }
            ]
        },
        'term-2': {
            name: 'Term 2',
            desc: 'Kinematics, Fractions, Mechanisms & Balance (Lessons K2.01 – K2.10)',
            lessons: [
                {
                    code: 'K2.01',
                    topic: 'Animation and Axis',
                    kit: 'Spike Andy Roid',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-2',
                    engineeringFocus: 'Dual-axis movement (X and Y), humanoid arm linkages, and screen animation sync.',
                    lessonPlan: {
                        whatToDo: 'Build Andy Roid with articulated waving arms; sync arm motor with smiling LED face.',
                        concept: 'An axis is a line that our robot parts spin around or slide along.',
                        activityGame: 'Mirror Game — students mimic Andy Roid\'s arm positions in time.',
                        challenge: 'Program a dual-arm cheer celebration when light button is pressed.'
                    }
                },
                {
                    code: 'K2.02',
                    topic: 'Concept of Fractions, & Events and Random',
                    kit: 'Spike Wheel of Fortune',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-2',
                    engineeringFocus: 'Circular division (halves, quarters), random number generators, and friction stoppers.',
                    lessonPlan: {
                        whatToDo: 'Build segmented wheel with pointer needle; program random motor spin speed.',
                        concept: 'A whole wheel cut into 4 equal slices gives each player 1 out of 4 chances.',
                        activityGame: 'Classroom Reward Spinner — spin the wheel for sticker rewards and funny dances.',
                        challenge: 'Color-code 4 equal quadrants and predict landing probability with tallies.'
                    }
                },
                {
                    code: 'K2.03',
                    topic: 'Sequence - Movements',
                    kit: 'Spike Mig Bot',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-2',
                    engineeringFocus: 'Walking gait geometry, center of gravity shift, and eccentric cam drives.',
                    lessonPlan: {
                        whatToDo: 'Assemble Mig Bot bipedal walker; calibrate leg offset to prevent falling over.',
                        concept: 'Walking requires shifting weight from left to right before moving the feet.',
                        activityGame: 'Giant Robot Steps — walk with wide stance mimicking Mig Bot\'s gait.',
                        challenge: 'Attach rubber friction boots to the feet to walk up a slight incline.'
                    }
                },
                {
                    code: 'K2.04',
                    topic: 'Subtraction Within 10, & Motors with positive and negative numbers',
                    kit: 'Spike Penguin',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-2',
                    engineeringFocus: 'Waddle locomotion, subtraction countdown sequence, and reverse motor drive.',
                    lessonPlan: {
                        whatToDo: 'Build waddling penguin model; program steps forward and backward subtraction.',
                        concept: 'Subtraction means taking steps backward or counting down to zero.',
                        activityGame: 'Melting Iceberg Game — penguin steps back 2 ice blocks each round.',
                        challenge: 'Program a shivering sound effect when countdown reaches 0.'
                    }
                },
                {
                    code: 'K2.05',
                    topic: 'Additions and Subtraction within 10, & Symmetry and Mechanism of a Balancing Beam',
                    kit: '<Play with Monkey Business Game>',
                    type: 'game',
                    icon: '🐒',
                    term: 'term-2',
                    engineeringFocus: 'Mechanical equilibrium, lever arm distance (torque), and bilateral symmetry.',
                    lessonPlan: {
                        whatToDo: 'Hang weighted monkey counters on numbered beam pegs until perfectly level.',
                        concept: '2 monkeys far from the center balance 4 monkeys close to the center!',
                        activityGame: 'Teeter-Totter balancing game with math word problems.',
                        challenge: 'Find 3 different combination pairs that balance a 10-peg load.'
                    }
                },
                {
                    code: 'K2.06',
                    topic: 'Concept of Sound, & Sequence with Sound and Motor blocks',
                    kit: 'Spike Gun',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-2',
                    engineeringFocus: 'Gear release triggers, kinetic energy launch, and synchronized sound effects.',
                    lessonPlan: {
                        whatToDo: 'Build safe foam dart launcher mechanism with motor trigger latch.',
                        concept: 'Sounds have pitch (high/low) and rhythm; motors can fire on specific musical beats.',
                        activityGame: 'Sound Orchestra — match drum beat sounds to launcher trigger actions.',
                        challenge: 'Play a 3-note ascending fanfare before triggering the release pin.'
                    }
                },
                {
                    code: 'K2.07',
                    topic: 'Map Reading, & Sequence – Movements and Turns',
                    kit: '<Using Robot Mouse>',
                    type: 'mouse',
                    icon: '🐭',
                    term: 'term-2',
                    engineeringFocus: 'Grid coordinate mapping, spatial reasoning, and sequence memory buffer.',
                    lessonPlan: {
                        whatToDo: 'Lay maze tile path with cheese target; code sequence into mouse keypad.',
                        concept: 'We plan the whole journey in our head before pressing the green GO button.',
                        activityGame: 'Human Mouse Maze — blindfolded student guided by partner\'s verbal code commands.',
                        challenge: 'Navigate around 3 mud obstacles using the fewest total commands.'
                    }
                },
                {
                    code: 'K2.08',
                    topic: 'Introduction to Gears',
                    kit: 'Spike Gear System',
                    type: 'spike',
                    icon: '⚙️',
                    term: 'term-2',
                    engineeringFocus: 'Spur gears, driver vs follower gears, gear ratio speed/torque trade-off.',
                    lessonPlan: {
                        whatToDo: 'Assemble 8-tooth, 24-tooth, and 40-tooth gear train; count revolutions.',
                        concept: 'Meshing teeth: one turns clockwise, the neighbor turns counter-clockwise!',
                        activityGame: 'Hand-Crank Power test — feel the difference in effort between high and low gears.',
                        challenge: 'Build a gear train that makes a fan turn 5 times faster than your motor.'
                    }
                },
                {
                    code: 'K2.09',
                    topic: 'Remote Controlled Devices and Drone',
                    kit: '<Using drones>',
                    type: 'drone',
                    icon: '🛸',
                    term: 'term-2',
                    engineeringFocus: 'Aerodynamic lift, pitch/roll/yaw control, and remote controller pairing.',
                    lessonPlan: {
                        whatToDo: 'Pair controller to micro-drone; practice gentle takeoff, hover, and landing.',
                        concept: 'Propellers push air downward so the drone can float up like a hummingbird.',
                        activityGame: 'Safe Landing Pad — take off from base and land gently inside a hula hoop.',
                        challenge: 'Perform a controlled 360-degree hover turn without losing altitude.'
                    }
                },
                {
                    code: 'K2.10',
                    topic: 'Term 2 Presentation',
                    kit: '<Choose one robot from Term 2 along with requirements>',
                    type: 'project',
                    icon: '🏆',
                    term: 'term-2',
                    engineeringFocus: 'Public speaking, mechanism explanation, and parent consultation demonstration.',
                    lessonPlan: {
                        whatToDo: 'Select 1 Term 2 build; prepare demonstration and explain gear/motion principles.',
                        concept: 'Great inventors know how to explain their inventions so anyone can understand!',
                        activityGame: 'Mock Parent Showcase — demo robot movements with confidence and joy.',
                        challenge: 'Answer 2 live questions about what gear or code block was used.'
                    }
                }
            ]
        },
        'term-3': {
            name: 'Term 3',
            desc: 'Sensory Logic, Coordinates & Structural Mechanics (Lessons K3.01 – K3.10)',
            lessons: [
                {
                    code: 'K3.01',
                    topic: 'Measuring Force with Touch Sensor & If-Then Logic Statement with Touch Sensor',
                    kit: 'Spike Windmill',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-3',
                    engineeringFocus: 'Push-button contact sensor, force detection threshold, and conditional If-Then logic.',
                    lessonPlan: {
                        whatToDo: 'Build windmill blades with touch sensor base; turn blades when sensor pressed.',
                        concept: 'IF button is pressed, THEN spin the blades; ELSE stop the motor.',
                        activityGame: 'Wind Storm simulation — pressing sensor softly spins slow, pressing hard spins fast.',
                        challenge: 'Count how many times the blade rotates before touch sensor is released.'
                    }
                },
                {
                    code: 'K3.02',
                    topic: 'Sequence Programming with Spike Software',
                    kit: 'Spike Racing Car',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-3',
                    engineeringFocus: 'Drag-and-drop icon blocks, motor duration in seconds vs rotations, acceleration.',
                    lessonPlan: {
                        whatToDo: 'Build aerodynamic racer with differential back wheels; program speed ramp-up.',
                        concept: 'Code blocks execute in order from top to bottom like words in a bedtime story.',
                        activityGame: 'Drag Race Shootout — whose car travels closest to the 2-meter finish tape.',
                        challenge: 'Program an automatic reverse return after crossing the finish line.'
                    }
                },
                {
                    code: 'K3.03',
                    topic: 'Coding with X- and Y in programming world',
                    kit: '<Puzzle activity>',
                    type: 'puzzle',
                    icon: '🧩',
                    term: 'term-3',
                    engineeringFocus: '2D Cartesian plane, column/row grid references, and directional vector shifts.',
                    lessonPlan: {
                        whatToDo: 'Solve tactile tile puzzle by mapping X (horizontal) and Y (vertical) moves.',
                        concept: 'X is side-to-side (walk); Y is up-and-down (jump). Together they find any treasure.',
                        activityGame: 'Pirate Treasure Grid — call out coordinates (X:3, Y:2) to find hidden coins.',
                        challenge: 'Find the shortest Manhattan-distance path avoiding monster tiles.'
                    }
                },
                {
                    code: 'K3.04',
                    topic: 'Exploration of Touch Sensor with Spike',
                    kit: 'Spike One Arm Robot',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-3',
                    engineeringFocus: 'Single-arm lever arm, counterweights, and tactile bumper safety shutoff.',
                    lessonPlan: {
                        whatToDo: 'Build industrial robotic arm; lift block payload when touch sensor is triggered.',
                        concept: 'The touch sensor works like our fingertip nerves feeling when we touch something.',
                        activityGame: 'Factory Assembly Line — pick up widget, rotate 90°, drop into sorting bin.',
                        challenge: 'Program emergency stop if touch sensor is bumped while moving.'
                    }
                },
                {
                    code: 'K3.05',
                    topic: 'Gearing and Sequence',
                    kit: 'Spike Door',
                    type: 'spike',
                    icon: '⚙️',
                    term: 'term-3',
                    engineeringFocus: 'Worm gear locking mechanism, rack and pinion linear sliding, security sequencing.',
                    lessonPlan: {
                        whatToDo: 'Build motorized vault door; program opening sequence with passcode taps.',
                        concept: 'A worm gear cannot be pushed open by hand; only the motor screw can turn it.',
                        activityGame: 'Secret Agent Vault — tap the correct 3-beat rhythm on touch sensor to open door.',
                        challenge: 'Automatically close and lock the door after 5 seconds of passage.'
                    }
                },
                {
                    code: 'K3.06',
                    topic: 'Sequencing with Spike Programming using Time',
                    kit: 'Spike Jet',
                    type: 'spike',
                    icon: '✈️',
                    term: 'term-3',
                    engineeringFocus: 'Timed state machines, LED beacon flashing sequences, and pitch angle tilt.',
                    lessonPlan: {
                        whatToDo: 'Assemble supersonic jet with twin wing turbines; program countdown & takeoff.',
                        concept: 'Computers count seconds precisely to keep airplanes flying on schedule.',
                        activityGame: 'Airport Runway Departure — taxi for 3 seconds, full thrust for 4 seconds, cruise.',
                        challenge: 'Sync flashing wingtip LED lights to blink every 0.5 seconds during flight.'
                    }
                },
                {
                    code: 'K3.07',
                    topic: 'Mechanism of a Robot Hand',
                    kit: 'Spike Grabber [Kinder Term 3]',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-3',
                    engineeringFocus: 'Four-bar linkage, scissor mechanism, gripping claws, and mechanical advantage.',
                    lessonPlan: {
                        whatToDo: 'Build extendable scissor grabber; pick up foam blocks of different sizes.',
                        concept: 'Mechanical links transfer push at our hand into a pinch at the claw tip.',
                        activityGame: 'Clean Up Ocean Trash challenge — use robot hand to scoop plastic bottles from bin.',
                        challenge: 'Add soft rubber pads to claw tips to grip fragile plastic cups without crushing.'
                    }
                },
                {
                    code: 'K3.08',
                    topic: 'Infrared sensor',
                    kit: '<Using Codey Rocky>',
                    type: 'codey',
                    icon: '🐱',
                    term: 'term-3',
                    engineeringFocus: 'Infrared emitter & receiver, black line detection, and ambient light reflection.',
                    lessonPlan: {
                        whatToDo: 'Calibrate IR sensor on bottom of Codey; follow thick black line loop on white mat.',
                        concept: 'Dark colors absorb invisible infrared light; white colors bounce it back like a mirror.',
                        activityGame: 'Train on Track — Codey Rocky follows looping track while passengers climb aboard.',
                        challenge: 'Stop automatically when an obstacle is placed directly on the track.'
                    }
                },
                {
                    code: 'K3.09',
                    topic: 'Ultrasonic Sensor with Spike, & Math Operators and Length',
                    kit: 'Spike Robot Cat',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-3',
                    engineeringFocus: 'Ultrasonic echolocation (sound bounce), distance measurement in cm, pet behavior states.',
                    lessonPlan: {
                        whatToDo: 'Build cat with ultrasonic sensor eyes; program purring when hand is petted within 15cm.',
                        concept: 'The sensor sends out sound we cannot hear; it times the echo to know how far things are.',
                        activityGame: 'Prowling Cat Game — creep closer to the mouse; stop when within 10 centimeters.',
                        challenge: 'Hiss and back up if hand approaches closer than 5 centimeters!'
                    }
                },
                {
                    code: 'K3.10',
                    topic: 'Term 3 Presentation',
                    kit: '<Choose one robot from Term 3 along with requirements>',
                    type: 'project',
                    icon: '🏆',
                    term: 'term-3',
                    engineeringFocus: 'Sensor-driven robotics demonstration, peer review, and parent progress showcase.',
                    lessonPlan: {
                        whatToDo: 'Select 1 Term 3 robot utilizing touch or ultrasonic sensors; showcase live.',
                        concept: 'Showing how sensors give robots senses like seeing and feeling!',
                        activityGame: 'Live Sensor Demonstration — explain the If-Then code block to visiting parents.',
                        challenge: 'Demonstrate recovery behavior when an unexpected obstacle is encountered.'
                    }
                }
            ]
        },
        'term-4': {
            name: 'Term 4',
            desc: 'Sensors, 3D Fabrication, AR/VR & Advanced Showcases (Lessons K4.01 – K4.10)',
            lessons: [
                {
                    code: 'K4.01',
                    topic: 'Sequencing with Spike Programming Using Speed and Colour Sensor',
                    kit: 'Spike Mouse',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-4',
                    engineeringFocus: 'Color recognition (Red, Green, Yellow), condition-based speed switching, line following.',
                    lessonPlan: {
                        whatToDo: 'Build Spike Mouse with color sensor facing floor; speed up on green, stop on red.',
                        concept: 'Colors are like traffic lights for robots: Green means fast, Yellow slow, Red stop.',
                        activityGame: 'Traffic Light Maze — follow color tape intersections across classroom floor.',
                        challenge: 'Squeak three times and spin when finding yellow cheese block.'
                    }
                },
                {
                    code: 'K4.02',
                    topic: 'X, Y and Z Axis & 3D Printing',
                    kit: '<Using the 3D printing machine>',
                    type: 'maker',
                    icon: '🖨️',
                    term: 'term-4',
                    engineeringFocus: '3D spatial axes (X: width, Y: length, Z: height), layer-by-layer additive manufacturing.',
                    lessonPlan: {
                        whatToDo: 'Load eco-PLA filament; watch 3D printer slice and fabricate custom robot charm.',
                        concept: 'Building with 2D drawings is flat like paper; adding the Z-axis gives height and thickness!',
                        activityGame: 'Clay Layer Building — mimic 3D printer by extruding clay coils into a bowl shape.',
                        challenge: 'Design a custom Lego-compatible name badge in kid-friendly 3D modeling app.'
                    }
                },
                {
                    code: 'K4.03',
                    topic: 'Touch Sensor with Spike & Aerodynamics',
                    kit: 'Spike Bird',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-4',
                    engineeringFocus: 'Wing flapping mechanism, crank-rocker linkage, and touch-activated flight.',
                    lessonPlan: {
                        whatToDo: 'Build robotic bird with flapping wings; flap fast when touch sensor is clicked.',
                        concept: 'Curved wings guide air faster over the top to create aerodynamic lift.',
                        activityGame: 'Bird Migration Race — flap across classroom perching on designated tree branches.',
                        challenge: 'Program wing flap frequency to decrease gradually as bird lands.'
                    }
                },
                {
                    code: 'K4.04',
                    topic: 'Introduction to Augmented Reality & Story-Telling',
                    kit: '<Do-It-Yourself Sunglasses>',
                    type: 'maker',
                    icon: '🕶️',
                    term: 'term-4',
                    engineeringFocus: 'Optical overlays, digital AR targets, storytelling narrative, and physical-digital merge.',
                    lessonPlan: {
                        whatToDo: 'Assemble safe DIY cardboard sunglasses with colored optical filters and AR target cards.',
                        concept: 'Augmented Reality puts magical computer pictures right on top of real world toys!',
                        activityGame: 'Dinosaur Safari — look through glasses at classroom walls to spot digital dinosaurs.',
                        challenge: 'Tell a 1-minute story about your robot saving the digital creature.'
                    }
                },
                {
                    code: 'K4.05',
                    topic: 'Colour Sensor',
                    kit: 'Dancing Robot',
                    type: 'spike',
                    icon: '🤖',
                    term: 'term-4',
                    engineeringFocus: 'RGB color detection, dance choreography loops, and musical beat matching.',
                    lessonPlan: {
                        whatToDo: 'Build dual-motor dancing robot; show color flashcards to trigger dance moves.',
                        concept: 'Different colors trigger different dance routines: Blue = waltz, Pink = hip-hop.',
                        activityGame: 'Robot Dance Party — kids freeze dance alongside their customized robot partner.',
                        challenge: 'Program a disco light show on the hub LED matrix while dancing.'
                    }
                },
                {
                    code: 'K4.06',
                    topic: 'Concept of Light',
                    kit: 'Spike Light Intensity Car',
                    type: 'spike',
                    icon: '💡',
                    term: 'term-4',
                    engineeringFocus: 'Ambient light intensity levels, lux measurement, automatic headlights.',
                    lessonPlan: {
                        whatToDo: 'Build explorer rover with light sensor; drive fast in dark and slow in daylight.',
                        concept: 'Light is energy; our sensor measures brightness from 0 (midnight) to 100 (sunny noon).',
                        activityGame: 'Flashlight Guide — guide the rover across dark room using flashlight beam.',
                        challenge: 'Turn on LED headlights automatically when driving underneath table shadow.'
                    }
                },
                {
                    code: 'K4.07',
                    topic: 'Touch Sensor and Loop with Codey Rocky & AND operator and If-Then Condition',
                    kit: '<Use Codey Rocky>',
                    type: 'codey',
                    icon: '🐱',
                    term: 'term-4',
                    engineeringFocus: 'Repeat loops, boolean logic (AND operator requiring 2 simultaneous inputs), touch pins.',
                    lessonPlan: {
                        whatToDo: 'Wire fruit touch pads; program Codey to move ONLY when both touch pads pressed.',
                        concept: 'AND means BOTH friends must agree before the robot starts dancing.',
                        activityGame: 'Two-Player Cooperative steering — Player A holds left wire, Player B holds right.',
                        challenge: 'Loop the victory dance 5 times before resting in sleep mode.'
                    }
                },
                {
                    code: 'K4.08',
                    topic: 'Colour and Touch Sensor with Spike',
                    kit: 'Spike Camera [Kinder Term 4]',
                    type: 'spike',
                    icon: '📷',
                    term: 'term-4',
                    engineeringFocus: 'Shutter release mechanism, photo flash simulation, dual-sensor composite logic.',
                    lessonPlan: {
                        whatToDo: 'Build retro camera replica; touch sensor acts as shutter button, color sensor detects subject.',
                        concept: 'Cameras capture light and color the moment our finger presses the shutter trigger.',
                        activityGame: 'Portrait Studio — kids take turns posing while partner presses camera shutter.',
                        challenge: 'Play camera shutter click sound and flash white hub LEDs on every photo.'
                    }
                },
                {
                    code: 'K4.09',
                    topic: 'Introduction to VR',
                    kit: '<Do-It-Yourself Virtual Reality Glasses>',
                    type: 'maker',
                    icon: '🥽',
                    term: 'term-4',
                    engineeringFocus: 'Stereoscopic 3D vision, head tracking gyroscope, immersive simulation concepts.',
                    lessonPlan: {
                        whatToDo: 'Assemble DIY VR headset with biconvex lenses; view 360° space station exploration.',
                        concept: 'Two lenses showing slightly different views trick our brain into seeing real 3D depth!',
                        activityGame: 'Spacewalk Exploration — turn your head 360 degrees to spot planets and satellites.',
                        challenge: 'Describe 3 mechanical details of the space rover observed in the VR simulator.'
                    }
                },
                {
                    code: 'K4.10',
                    topic: 'Term 4 Presentation',
                    kit: '<Choose one robot from Term 4 along with requirements>',
                    type: 'project',
                    icon: '🏆',
                    term: 'term-4',
                    engineeringFocus: 'Graduation showcase, comprehensive portfolio defense, and Kinder solo certification.',
                    lessonPlan: {
                        whatToDo: 'Select your best Term 4 build; demonstrate full autonomous code and mechanism.',
                        concept: 'You are now an official Junior Roboticist and Creator!',
                        activityGame: 'Grand Kinder Robotics Showcase — present project to branch manager and parents.',
                        challenge: 'Receive official Kinder Solo Certification Certificate and graduation medal.'
                    }
                }
            ]
        }
    };

    // State Persistence
    let kinderBuilds = {};
    try {
        const savedB = localStorage.getItem('thelab_kinder_builds');
        kinderBuilds = savedB ? JSON.parse(savedB) : { 'K1.01': true, 'K1.02': true, 'K1.03': true, 'K1.04': true, 'K1.05': true };
    } catch (e) {
        kinderBuilds = { 'K1.01': true, 'K1.02': true, 'K1.03': true, 'K1.04': true, 'K1.05': true };
    }

    let kinderVideos = {};
    try {
        const savedV = localStorage.getItem('thelab_kinder_videos');
        kinderVideos = savedV ? JSON.parse(savedV) : {
            'K1.01': 'https://loom.com/share/demo-spike-tank-k101',
            'K1.03': 'https://drive.google.com/file/d/thelab-codey-demo/view',
            'K1.04': 'https://loom.com/share/tricycle-stability-demo'
        };
    } catch (e) {
        kinderVideos = {
            'K1.01': 'https://loom.com/share/demo-spike-tank-k101',
            'K1.03': 'https://drive.google.com/file/d/thelab-codey-demo/view',
            'K1.04': 'https://loom.com/share/tricycle-stability-demo'
        };
    }

    let masterUnlockOverride = false;
    let expandedLessonId = 'K1.01';
    let editingVideoLessonId = null;
    let currentTermKey = 'term-1';
    let currentSearchQuery = '';

    function getKinderKitBadgeStyle(type) {
        switch (type) {
            case 'spike':
                return 'background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF;';
            case 'codey':
                return 'background: #ECFEFF; border: 1px solid #A5F3FC; color: #0E7490;';
            case 'circuits':
                return 'background: #FEF3C7; border: 1px solid #FDE68A; color: #92400E;';
            case 'maker':
                return 'background: #F5F3FF; border: 1px solid #DDD6FE; color: #6D28D9;';
            case 'project':
                return 'background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46;';
            case 'game':
                return 'background: #FFF7ED; border: 1px solid #FED7AA; color: #C2410C;';
            case 'mouse':
                return 'background: #FDF2F8; border: 1px solid #FBCFE8; color: #9D174D;';
            case 'drone':
                return 'background: #EEF2FF; border: 1px solid #C7D2FE; color: #3730A3;';
            case 'puzzle':
                return 'background: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D;';
            default:
                return 'background: #F1F5F9; border: 1px solid #CBD5E1; color: #334155;';
        }
    }

    function safeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function updateMatrixCounters() {
        const allLessons = Object.values(kinderTermSyllabus).flatMap(t => t.lessons);
        const scopedLessons = currentTermKey === 'all'
            ? allLessons
            : (kinderTermSyllabus[currentTermKey] ? kinderTermSyllabus[currentTermKey].lessons : allLessons);

        const doneCount = scopedLessons.filter(l => !!kinderBuilds[l.code]).length;
        const videoCount = scopedLessons.filter(l => kinderVideos[l.code] && kinderVideos[l.code].trim().length > 0).length;
        const totalCount = scopedLessons.length;

        if (matrixBuildsCount) matrixBuildsCount.textContent = doneCount;
        if (matrixBuildsTotal) matrixBuildsTotal.textContent = totalCount;
        if (matrixBuildsBar) {
            const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
            matrixBuildsBar.style.width = pct + '%';
        }

        if (matrixVideosCount) matrixVideosCount.textContent = videoCount;
        if (matrixVideosTotal) matrixVideosTotal.textContent = totalCount;
        if (matrixVideosBar) {
            const pct = totalCount > 0 ? Math.round((videoCount / totalCount) * 100) : 0;
            matrixVideosBar.style.width = pct + '%';
        }
    }

    function copyTaskSubmissionSheet() {
        const allLessons = Object.values(kinderTermSyllabus).flatMap(t => t.lessons);
        const doneCount = allLessons.filter(l => !!kinderBuilds[l.code]).length;
        const videoCount = allLessons.filter(l => kinderVideos[l.code] && kinderVideos[l.code].trim().length > 0).length;

        let md = `# THE LAB INDONESIA — KINDER PRACTICAL BUILD & VIDEO SUBMISSION SHEET\n`;
        md += `Generated: ${new Date().toLocaleDateString('en-GB')} | Scope: 40 Lessons Kinder Curriculum\n`;
        md += `Summary: ${doneCount}/40 Builds Completed | ${videoCount}/40 Video Proofs Recorded\n\n`;
        md += `| Code | Term | Topic | Hardware / Kit | Build Status | Video Evidence URL |\n`;
        md += `|---|---|---|---|---|---|\n`;

        allLessons.forEach(l => {
            const isDone = !!kinderBuilds[l.code];
            const vUrl = kinderVideos[l.code] || 'Pending Submission';
            const termName = l.term === 'term-1' ? 'Term 1' : l.term === 'term-2' ? 'Term 2' : l.term === 'term-3' ? 'Term 3' : 'Term 4';
            md += `| ${l.code} | ${termName} | ${l.topic} | ${l.kit} | ${isDone ? '[x] Completed' : '[ ] Pending'} | ${vUrl} |\n`;
        });

        const notify = () => {
            if (matrixCopySheetToast) {
                matrixCopySheetToast.style.display = 'flex';
                setTimeout(() => {
                    matrixCopySheetToast.style.display = 'none';
                }, 3500);
            }
            awardReward(10, 5, 'Submission Sheet Exported');
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(md).then(notify).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = md;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                notify();
            });
        } else {
            const ta = document.createElement('textarea');
            ta.value = md;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            notify();
        }
    }

    if (btnCopyTaskSubmissionSheet) {
        btnCopyTaskSubmissionSheet.addEventListener('click', copyTaskSubmissionSheet);
    }

    if (btnKinderMasterUnlock) {
        btnKinderMasterUnlock.addEventListener('click', () => {
            masterUnlockOverride = !masterUnlockOverride;
            btnKinderMasterUnlock.innerHTML = masterUnlockOverride ? '🔓 All Unlocked' : '🔒 Progressive Locks';
            btnKinderMasterUnlock.style.background = masterUnlockOverride ? '#ECFDF5' : '#F8FAFC';
            btnKinderMasterUnlock.style.borderColor = masterUnlockOverride ? '#A7F3D0' : '#CBD5E1';
            btnKinderMasterUnlock.style.color = masterUnlockOverride ? '#065F46' : 'var(--brand-navy)';
            renderKinderRoadmap(currentTermKey, currentSearchQuery);
        });
    }

    function getTermsProgressData() {
        const t1Lessons = kinderTermSyllabus['term-1'] ? kinderTermSyllabus['term-1'].lessons : [];
        const t2Lessons = kinderTermSyllabus['term-2'] ? kinderTermSyllabus['term-2'].lessons : [];
        const t3Lessons = kinderTermSyllabus['term-3'] ? kinderTermSyllabus['term-3'].lessons : [];
        const t4Lessons = kinderTermSyllabus['term-4'] ? kinderTermSyllabus['term-4'].lessons : [];

        const t1Builds = t1Lessons.filter(l => !!kinderBuilds[l.code]).length;
        const t2Builds = t2Lessons.filter(l => !!kinderBuilds[l.code]).length;
        const t3Builds = t3Lessons.filter(l => !!kinderBuilds[l.code]).length;
        const t4Builds = t4Lessons.filter(l => !!kinderBuilds[l.code]).length;

        const t1Videos = t1Lessons.filter(l => kinderVideos[l.code] && kinderVideos[l.code].trim().length > 0).length;
        const t2Videos = t2Lessons.filter(l => kinderVideos[l.code] && kinderVideos[l.code].trim().length > 0).length;
        const t3Videos = t3Lessons.filter(l => kinderVideos[l.code] && kinderVideos[l.code].trim().length > 0).length;
        const t4Videos = t4Lessons.filter(l => kinderVideos[l.code] && kinderVideos[l.code].trim().length > 0).length;

        const t1Unlocked = true;
        const t2Unlocked = masterUnlockOverride || t1Builds >= 10;
        const t3Unlocked = masterUnlockOverride || (t2Unlocked && t2Builds >= 10);
        const t4Unlocked = masterUnlockOverride || (t3Unlocked && t3Builds >= 10);

        return {
            'term-1': {
                key: 'term-1',
                name: 'Term 1',
                subtitle: 'Foundations & Circuits',
                buildsDone: t1Builds,
                totalBuilds: 10,
                videosDone: t1Videos,
                percent: Math.round((t1Builds / 10) * 100),
                isUnlocked: t1Unlocked,
                isCompleted: t1Builds >= 10,
                lockMsg: ''
            },
            'term-2': {
                key: 'term-2',
                name: 'Term 2',
                subtitle: 'Kinematics & Balance',
                buildsDone: t2Builds,
                totalBuilds: 10,
                videosDone: t2Videos,
                percent: Math.round((t2Builds / 10) * 100),
                isUnlocked: t2Unlocked,
                isCompleted: t2Builds >= 10,
                lockMsg: 'Complete all 10 practical builds in Term 1 to unlock Term 2.'
            },
            'term-3': {
                key: 'term-3',
                name: 'Term 3',
                subtitle: 'Sensors & Coordinates',
                buildsDone: t3Builds,
                totalBuilds: 10,
                videosDone: t3Videos,
                percent: Math.round((t3Builds / 10) * 100),
                isUnlocked: t3Unlocked,
                isCompleted: t3Builds >= 10,
                lockMsg: 'Complete all 10 practical builds in Term 2 to unlock Term 3.'
            },
            'term-4': {
                key: 'term-4',
                name: 'Term 4',
                subtitle: 'Sensors & 3D Maker',
                buildsDone: t4Builds,
                totalBuilds: 10,
                videosDone: t4Videos,
                percent: Math.round((t4Builds / 10) * 100),
                isUnlocked: t4Unlocked,
                isCompleted: t4Builds >= 10,
                lockMsg: 'Complete all 10 practical builds in Term 3 to unlock Term 4.'
            }
        };
    }

    function renderTermsProgressCards() {
        if (!kinderTermsProgressGrid) return;
        const termsData = getTermsProgressData();
        const termKeys = ['term-1', 'term-2', 'term-3', 'term-4'];

        kinderTermsProgressGrid.innerHTML = termKeys.map(tKey => {
            const prog = termsData[tKey];
            const isSelected = currentTermKey === tKey;
            const cardBg = isSelected
                ? '#FFFFFF'
                : (!prog.isUnlocked ? 'rgba(248, 250, 252, 0.85)' : '#FFFFFF');
            const borderColor = isSelected
                ? 'var(--brand-teal)'
                : (!prog.isUnlocked ? '#E2E8F0' : 'rgba(14, 27, 77, 0.12)');
            const shadow = isSelected ? '0 0 0 2px rgba(69, 183, 205, 0.25), var(--shadow-card)' : 'var(--shadow-card)';
            const opacity = !prog.isUnlocked && !isSelected ? '0.82' : '1';

            let badgeHtml = '';
            if (!prog.isUnlocked) {
                badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 900; background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A;">🔒 LOCKED</span>`;
            } else if (prog.isCompleted) {
                badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 900; background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0;">✓ 10/10 DONE</span>`;
            } else {
                badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 900; background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD;">${prog.buildsDone}/10 BUILDS</span>`;
            }

            const barColor = prog.isCompleted ? '#10B981' : (prog.isUnlocked ? 'var(--brand-teal)' : '#CBD5E1');

            return `
                <div class="kinder-term-progress-card" data-term="${tKey}" style="background: ${cardBg}; border: 1.5px solid ${borderColor}; border-radius: var(--radius-md); padding: 14px 16px; box-shadow: ${shadow}; cursor: pointer; opacity: ${opacity}; transition: all 0.2s ease;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
                        <div>
                            <div style="font-size: 12.5px; font-weight: 900; color: var(--brand-navy);">${prog.name}</div>
                            <div style="font-size: 10.5px; font-weight: 600; color: var(--text-muted);">${prog.subtitle}</div>
                        </div>
                        <div>
                            ${badgeHtml}
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div style="width: 100%; height: 6px; background: #F1F5F9; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                        <div style="width: ${prog.percent}%; height: 100%; background: ${barColor}; border-radius: 4px; transition: width 0.3s ease;"></div>
                    </div>

                    <!-- Footer Stats -->
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 800; color: #64748B;">
                        <span>🛠️ ${prog.buildsDone} / 10 Builds</span>
                        <span>🎬 ${prog.videosDone} / 10 Videos</span>
                    </div>

                    ${!prog.isUnlocked ? `
                        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #F1F5F9; font-size: 10px; font-weight: 700; color: #B45309; line-height: 1.35;">
                            🔒 ${prog.lockMsg}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Wire click handler on cards
        kinderTermsProgressGrid.querySelectorAll('.kinder-term-progress-card').forEach(card => {
            card.addEventListener('click', () => {
                const termKey = card.getAttribute('data-term');
                if (selectKinderTerm && termKey !== 'all') {
                    selectKinderTerm.value = termKey;
                }
                const q = inputFilterKinderLessons ? inputFilterKinderLessons.value : '';
                renderKinderRoadmap(termKey, q);
            });
        });
    }

    function isLessonUnlocked(lesson, idx, list) {
        if (masterUnlockOverride) return true;
        const termsData = getTermsProgressData();
        const termProg = termsData[lesson.term];
        if (termProg && !termProg.isUnlocked) {
            return false;
        }
        if (idx === 0) return true;
        const prev = list[idx - 1];
        if (prev.term !== lesson.term) return true;
        return !!kinderBuilds[prev.code];
    }

    function renderKinderRoadmap(termKey, filterQuery = '') {
        currentTermKey = termKey;
        currentSearchQuery = filterQuery;

        const allLessons = Object.values(kinderTermSyllabus).flatMap(t => t.lessons);
        let termData;
        if (termKey === 'all') {
            termData = {
                name: 'All Terms',
                desc: 'Complete 40-Lesson Kinder Curriculum (Terms 1–4)',
                lessons: allLessons
            };
        } else {
            termData = kinderTermSyllabus[termKey] || kinderTermSyllabus['term-1'];
        }

        if (kinderRoadmapTermHeading) {
            kinderRoadmapTermHeading.textContent = `${termData.name} Syllabus & Roadmap`;
        }
        if (kinderRoadmapTermDesc) {
            kinderRoadmapTermDesc.textContent = termData.desc;
        }

        const termsData = getTermsProgressData();
        const totalBuildsDone = allLessons.filter(l => !!kinderBuilds[l.code]).length;

        // Render 4-term progress cards overview
        renderTermsProgressCards();

        // Update Locked Term Callout Banner
        if (lockedTermCalloutBanner) {
            if (termKey !== 'all' && termsData[termKey] && !termsData[termKey].isUnlocked) {
                lockedTermCalloutBanner.style.display = 'block';
                if (lockedTermCalloutTitle) {
                    lockedTermCalloutTitle.textContent = `${termsData[termKey].name} is Locked`;
                }
                if (lockedTermCalloutDesc) {
                    lockedTermCalloutDesc.textContent = `${termsData[termKey].lockMsg} Complete all builds in the preceding term to unlock.`;
                }
            } else {
                lockedTermCalloutBanner.style.display = 'none';
            }
        }

        // Update pills
        kinderTermQuickBtns.forEach(btn => {
            const bTerm = btn.getAttribute('data-term');
            const isMatch = bTerm === termKey;
            btn.style.background = isMatch ? 'var(--brand-teal)' : '#FFF';
            btn.style.color = isMatch ? '#FFF' : 'var(--brand-navy)';
            btn.style.borderColor = isMatch ? 'var(--brand-teal)' : '#CBD5E1';

            if (bTerm === 'all') {
                btn.innerHTML = `All (${totalBuildsDone}/40)`;
            } else if (termsData[bTerm]) {
                const p = termsData[bTerm];
                const lockPrefix = !p.isUnlocked ? '🔒 ' : '';
                btn.innerHTML = `${lockPrefix}${p.name} (${p.buildsDone}/10)`;
            }
        });

        // Sync dropdown if not 'all'
        if (selectKinderTerm && termKey !== 'all' && selectKinderTerm.value !== termKey) {
            selectKinderTerm.value = termKey;
        }

        updateMatrixCounters();

        if (!kinderRoadmapLessonList) return;

        const q = filterQuery.trim().toLowerCase();
        const filtered = termData.lessons.filter(l => 
            !q || 
            l.code.toLowerCase().includes(q) || 
            l.topic.toLowerCase().includes(q) || 
            l.kit.toLowerCase().includes(q) ||
            l.engineeringFocus.toLowerCase().includes(q) ||
            l.lessonPlan.concept.toLowerCase().includes(q)
        );

        if (kinderRoadmapTermBadge) {
            kinderRoadmapTermBadge.textContent = `${filtered.length} LESSONS ACTIVE`;
        }

        if (filtered.length === 0) {
            kinderRoadmapLessonList.innerHTML = `
                <div style="padding: 28px; text-align: center; color: var(--text-muted); background: #F8FAFC; border-radius: var(--radius-md); border: 1px dashed #CBD5E1;">
                    <div style="font-size: 24px; margin-bottom: 6px;">🔍</div>
                    <div style="font-size: 13px; font-weight: 700;">No lessons found matching "${safeHtml(filterQuery)}" in ${termData.name}.</div>
                </div>
            `;
            return;
        }

        kinderRoadmapLessonList.innerHTML = filtered.map((lesson, idx) => {
            const isDone = !!kinderBuilds[lesson.code];
            const videoUrl = kinderVideos[lesson.code];
            const hasVideo = !!(videoUrl && videoUrl.trim().length > 0);
            const isLocked = !isLessonUnlocked(lesson, idx, filtered);
            const isExpanded = expandedLessonId === lesson.code;
            const isEditingVideo = editingVideoLessonId === lesson.code;

            return `
                <div class="kinder-lesson-card-wrapper" data-code="${lesson.code}" style="background: ${isDone ? '#F0FDF4' : isLocked ? '#F8FAFC' : '#FFFFFF'}; border: 1px solid ${isDone ? '#BBF7D0' : isLocked ? '#E2E8F0' : 'rgba(14, 27, 77, 0.12)'}; border-radius: var(--radius-md); overflow: hidden; transition: all 0.2s ease; opacity: ${isLocked ? '0.75' : '1'};">
                    <!-- Main Row Summary -->
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; gap: 12px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 240px;">
                            <!-- Build Checkbox -->
                            <button type="button" class="btn-toggle-kinder-build" data-code="${lesson.code}" ${isLocked ? 'disabled' : ''} style="width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: ${isLocked ? 'not-allowed' : 'pointer'}; border: 2px solid ${isDone ? '#10B981' : isLocked ? '#CBD5E1' : '#94A3B8'}; background: ${isDone ? '#10B981' : isLocked ? '#F1F5F9' : '#FFF'}; color: #FFF; font-weight: 900; font-size: 13px; flex-shrink: 0; transition: all 0.2s;" title="${isLocked ? 'Complete previous lesson to unlock' : isDone ? 'Mark build as incomplete' : 'Mark build as completed (+20 EXP, +15 Coins)'}">
                                ${isLocked ? '<span style="font-size: 10px;">🔒</span>' : isDone ? '✓' : ''}
                            </button>

                            <!-- Code Badge -->
                            <span style="display: inline-flex; align-items: center; justify-content: center; min-width: 58px; padding: 5px 8px; border-radius: 6px; background: ${isDone ? '#065F46' : 'var(--brand-navy)'}; color: #FFFFFF; font-weight: 900; font-size: 12px; letter-spacing: 0.5px; flex-shrink: 0;">
                                ${lesson.code}
                            </span>

                            <!-- Lesson Topic Title -->
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 13.5px; font-weight: 800; color: var(--brand-navy); line-height: 1.35;">
                                    ${safeHtml(lesson.topic)}
                                </div>
                            </div>
                        </div>

                        <!-- Right Actions & Badges -->
                        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap;">
                            <!-- Kit Badge -->
                            <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 800; ${getKinderKitBadgeStyle(lesson.type)}">
                                <span>${lesson.icon}</span>
                                <span>${safeHtml(lesson.kit)}</span>
                            </span>

                            <!-- Video Proof Status -->
                            ${hasVideo ? `
                                <a href="${safeHtml(videoUrl)}" target="_blank" rel="noreferrer" class="badge-kinder-video-proof" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 11px; font-weight: 900; text-decoration: none;" title="Open video demonstration link">
                                    <span>🎬</span>
                                    <span>Video Proof ✓</span>
                                </a>
                            ` : `
                                <span class="badge-kinder-no-video" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; background: #F1F5F9; color: #64748B; font-size: 10.5px; font-weight: 700;">
                                    <span>⚪</span>
                                    <span>No Video</span>
                                </span>
                            `}

                            <!-- Accordion Toggle Button -->
                            <button type="button" class="btn btn-toggle-kinder-accordion" data-code="${lesson.code}" style="padding: 5px 12px; border-radius: 6px; background: ${isExpanded ? 'var(--brand-navy)' : '#FFFFFF'}; border: 1px solid ${isExpanded ? 'var(--brand-navy)' : '#CBD5E1'}; color: ${isExpanded ? '#FFFFFF' : 'var(--brand-navy)'}; font-size: 11.5px; font-weight: 800; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 4px;">
                                <span>Details</span>
                                <span style="font-size: 9px;">${isExpanded ? '▲' : '▼'}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Expandable Accordion Drawer -->
                    ${isExpanded ? `
                        <div class="kinder-accordion-drawer" style="border-top: 1px solid #E2E8F0; background: #F8FAFC; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px;">
                            <!-- 1. Engineering Focus & Objectives -->
                            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 14px 16px;">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                                    <span style="font-size: 14px;">⚙️</span>
                                    <h4 style="font-size: 11.5px; font-weight: 900; color: var(--brand-navy); margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                                        Engineering Focus &amp; Objectives
                                    </h4>
                                </div>
                                <p style="font-size: 12.5px; color: #334155; line-height: 1.5; margin: 0; padding-left: 20px;">
                                    ${safeHtml(lesson.engineeringFocus)}
                                </p>
                            </div>

                            <!-- 2. Lesson Plan 4 Checklist Items (2x2 Grid) -->
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
                                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 12px 14px;">
                                    <div style="font-size: 11px; font-weight: 900; color: var(--brand-navy); display: flex; align-items: center; gap: 6px; margin-bottom: 4px; text-transform: uppercase;">
                                        <span>📋</span>
                                        <span>What to do</span>
                                    </div>
                                    <p style="font-size: 12px; color: #475569; line-height: 1.45; margin: 0;">
                                        ${safeHtml(lesson.lessonPlan.whatToDo)}
                                    </p>
                                </div>

                                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 12px 14px;">
                                    <div style="font-size: 11px; font-weight: 900; color: #0E7490; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; text-transform: uppercase;">
                                        <span>💡</span>
                                        <span>Concept (ELI4)</span>
                                    </div>
                                    <p style="font-size: 12px; color: #475569; line-height: 1.45; margin: 0;">
                                        ${safeHtml(lesson.lessonPlan.concept)}
                                    </p>
                                </div>

                                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 12px 14px;">
                                    <div style="font-size: 11px; font-weight: 900; color: #C2410C; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; text-transform: uppercase;">
                                        <span>🎮</span>
                                        <span>Activity / Games</span>
                                    </div>
                                    <p style="font-size: 12px; color: #475569; line-height: 1.45; margin: 0;">
                                        ${safeHtml(lesson.lessonPlan.activityGame)}
                                    </p>
                                </div>

                                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 12px 14px;">
                                    <div style="font-size: 11px; font-weight: 900; color: #6D28D9; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; text-transform: uppercase;">
                                        <span>⚡</span>
                                        <span>Building Challenge</span>
                                    </div>
                                    <p style="font-size: 12px; color: #475569; line-height: 1.45; margin: 0;">
                                        ${safeHtml(lesson.lessonPlan.challenge)}
                                    </p>
                                </div>
                            </div>

                            <!-- 3. Video Evidence Submission Component -->
                            <div style="background: #FFFFFF; border: 2px dashed #CBD5E1; border-radius: var(--radius-md); padding: 16px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="font-size: 20px;">🎬</span>
                                        <div>
                                            <h4 style="font-size: 12px; font-weight: 900; color: var(--brand-navy); margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                                                Video Evidence Submission
                                            </h4>
                                            <p style="font-size: 11.5px; color: var(--text-secondary); margin: 2px 0 0 0;">
                                                Provide a 30–60 second video demonstration link of the physical build operating.
                                            </p>
                                        </div>
                                    </div>

                                    ${!isEditingVideo ? `
                                        <button type="button" class="btn btn-action-edit-video" data-code="${lesson.code}" style="padding: 6px 12px; border-radius: var(--radius-sm); background: var(--brand-navy); color: #FFFFFF; font-size: 11.5px; font-weight: 800; border: none; cursor: pointer;">
                                            <span>${hasVideo ? '✏️ Edit Video Link' : '➕ Add Video Link'}</span>
                                        </button>
                                    ` : ''}
                                </div>

                                ${isEditingVideo ? `
                                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E2E8F0; display: flex; gap: 8px; flex-wrap: wrap;">
                                        <input type="url" class="input-kinder-video-url" data-code="${lesson.code}" value="${safeHtml(videoUrl || '')}" placeholder="Paste Google Drive / Loom video link (e.g. https://loom.com/share/...)" style="flex: 1; min-width: 260px; padding: 8px 12px; font-size: 12px; border-radius: var(--radius-sm); border: 1px solid #CBD5E1; outline: none; font-weight: 600; color: var(--brand-navy);">
                                        <button type="button" class="btn btn-save-video-link" data-code="${lesson.code}" style="padding: 8px 14px; border-radius: var(--radius-sm); background: #10B981; color: #FFFFFF; font-size: 12px; font-weight: 900; border: none; cursor: pointer;">
                                            Save
                                        </button>
                                        <button type="button" class="btn btn-cancel-video-link" data-code="${lesson.code}" style="padding: 8px 12px; border-radius: var(--radius-sm); background: #E2E8F0; color: #475569; font-size: 12px; font-weight: 800; border: none; cursor: pointer;">
                                            Cancel
                                        </button>
                                    </div>
                                ` : hasVideo ? `
                                    <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: var(--radius-sm); padding: 8px 12px;">
                                        <div style="font-size: 12px; color: #065F46; font-weight: 800; display: flex; align-items: center; gap: 6px; min-width: 0;">
                                            <span>Recorded Link:</span>
                                            <a href="${safeHtml(videoUrl)}" target="_blank" rel="noreferrer" style="color: var(--brand-navy); text-decoration: underline; word-break: break-all;">
                                                ${safeHtml(videoUrl)}
                                            </a>
                                        </div>
                                        <button type="button" class="btn-delete-kinder-video" data-code="${lesson.code}" style="background: none; border: none; color: #DC2626; font-size: 11.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;" title="Remove video link">
                                            <span>🗑️</span>
                                            <span>Remove</span>
                                        </button>
                                    </div>
                                ` : `
                                    <div style="margin-top: 6px; font-size: 12px; color: var(--text-muted); font-style: italic;">
                                        No video proof link recorded yet. Click "Add Video Link" to submit Google Drive or Loom URL (+30 EXP, +25 Coins).
                                    </div>
                                `}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Wire event listeners
        // 1. Checkbox Toggle
        kinderRoadmapLessonList.querySelectorAll('.btn-toggle-kinder-build').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.getAttribute('data-code');
                const wasDone = !!kinderBuilds[code];
                kinderBuilds[code] = !wasDone;
                if (!wasDone) {
                    awardReward(20, 15, `${code} Practical Build Done`);

                    // Check if completing this build finishes the term
                    const termPrefix = code.slice(0, 2);
                    const termMap = { 'K1': 'term-1', 'K2': 'term-2', 'K3': 'term-3', 'K4': 'term-4' };
                    const tKey = termMap[termPrefix];
                    if (tKey && kinderTermSyllabus[tKey]) {
                        const tLessons = kinderTermSyllabus[tKey].lessons;
                        const otherDone = tLessons.filter(l => l.code !== code && kinderBuilds[l.code]).length;
                        if (otherDone === tLessons.length - 1) {
                            awardReward(50, 40, `🎉 ${kinderTermSyllabus[tKey].name} 100% Completed! Next Term Unlocked!`);
                        }
                    }
                }
                localStorage.setItem('thelab_kinder_builds', JSON.stringify(kinderBuilds));
                renderKinderRoadmap(currentTermKey, currentSearchQuery);
            });
        });

        // 2. Accordion Toggle
        kinderRoadmapLessonList.querySelectorAll('.btn-toggle-kinder-accordion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.getAttribute('data-code');
                expandedLessonId = expandedLessonId === code ? null : code;
                editingVideoLessonId = null;
                renderKinderRoadmap(currentTermKey, currentSearchQuery);
            });
        });

        // 3. Edit / Add Video Button
        kinderRoadmapLessonList.querySelectorAll('.btn-action-edit-video').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.getAttribute('data-code');
                editingVideoLessonId = code;
                renderKinderRoadmap(currentTermKey, currentSearchQuery);
                const input = kinderRoadmapLessonList.querySelector(`.input-kinder-video-url[data-code="${code}"]`);
                if (input) input.focus();
            });
        });

        // 4. Cancel Video Button
        kinderRoadmapLessonList.querySelectorAll('.btn-cancel-video-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                editingVideoLessonId = null;
                renderKinderRoadmap(currentTermKey, currentSearchQuery);
            });
        });

        // 5. Save Video Button
        kinderRoadmapLessonList.querySelectorAll('.btn-save-video-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.getAttribute('data-code');
                const input = kinderRoadmapLessonList.querySelector(`.input-kinder-video-url[data-code="${code}"]`);
                const url = input ? input.value.trim() : '';
                if (url) {
                    kinderVideos[code] = url;
                    awardReward(30, 25, `${code} Video Proof Saved`);
                } else {
                    delete kinderVideos[code];
                }
                localStorage.setItem('thelab_kinder_videos', JSON.stringify(kinderVideos));
                editingVideoLessonId = null;
                renderKinderRoadmap(currentTermKey, currentSearchQuery);
            });
        });

        // 6. Delete Video Button
        kinderRoadmapLessonList.querySelectorAll('.btn-delete-kinder-video').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.getAttribute('data-code');
                delete kinderVideos[code];
                localStorage.setItem('thelab_kinder_videos', JSON.stringify(kinderVideos));
                renderKinderRoadmap(currentTermKey, currentSearchQuery);
            });
        });
    }

    function openLessonDetailsModal(lesson, termName) {
        if (!kinderLessonDetailsModal) return;
        if (modalLessonIcon) modalLessonIcon.textContent = lesson.icon;
        if (modalLessonCodeBadge) modalLessonCodeBadge.textContent = lesson.code;
        if (modalLessonTermBadge) modalLessonTermBadge.textContent = termName;
        if (modalLessonTopic) modalLessonTopic.textContent = lesson.topic;
        if (modalLessonKit) modalLessonKit.innerHTML = `${lesson.icon} <span>${safeHtml(lesson.kit)}</span>`;
        kinderLessonDetailsModal.classList.add('active');
    }

    const closeLessonModal = () => {
        if (kinderLessonDetailsModal) kinderLessonDetailsModal.classList.remove('active');
    };
    if (btnCloseLessonModal) btnCloseLessonModal.addEventListener('click', closeLessonModal);
    if (btnDismissLessonModal) btnDismissLessonModal.addEventListener('click', closeLessonModal);
    if (kinderLessonDetailsModal) {
        kinderLessonDetailsModal.addEventListener('click', (e) => {
            if (e.target === kinderLessonDetailsModal) closeLessonModal();
        });
    }

    if (btnCalloutMasterUnlock) {
        btnCalloutMasterUnlock.addEventListener('click', () => {
            masterUnlockOverride = true;
            if (btnKinderMasterUnlock) {
                btnKinderMasterUnlock.innerHTML = '🔓 All Unlocked';
                btnKinderMasterUnlock.style.background = '#ECFDF5';
                btnKinderMasterUnlock.style.borderColor = '#A7F3D0';
                btnKinderMasterUnlock.style.color = '#065F46';
            }
            renderKinderRoadmap(currentTermKey, currentSearchQuery);
        });
    }

    if (selectKinderTerm) {
        selectKinderTerm.addEventListener('change', (e) => {
            const termKey = e.target.value;
            const q = inputFilterKinderLessons ? inputFilterKinderLessons.value : '';
            renderKinderRoadmap(termKey, q);
        });
    }

    kinderTermQuickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const termKey = btn.getAttribute('data-term');
            if (selectKinderTerm && termKey !== 'all') selectKinderTerm.value = termKey;
            const q = inputFilterKinderLessons ? inputFilterKinderLessons.value : '';
            renderKinderRoadmap(termKey, q);
        });
    });

    if (inputFilterKinderLessons) {
        inputFilterKinderLessons.addEventListener('input', (e) => {
            const currentTerm = selectKinderTerm ? selectKinderTerm.value : 'term-1';
            renderKinderRoadmap(currentTerm, e.target.value);
        });
    }

    // Initial render
    renderKinderRoadmap(selectKinderTerm ? selectKinderTerm.value : 'term-1');

    // Masterclass Video Modals
    const videoModal = document.getElementById('trainingVideoModal');
    const btnPlayMasterclass = document.getElementById('btnPlayMasterclass');
    const btnLaunchMasterclassModal = document.getElementById('btnLaunchMasterclassModal');
    const btnLaunchTutorialVideo = document.getElementById('btnLaunchTutorialVideo');

    const openVideoModal = () => {
        if (videoModal) videoModal.classList.add('active');
    };

    if (btnPlayMasterclass) btnPlayMasterclass.addEventListener('click', openVideoModal);
    if (btnLaunchMasterclassModal) btnLaunchMasterclassModal.addEventListener('click', openVideoModal);
    if (btnLaunchTutorialVideo) btnLaunchTutorialVideo.addEventListener('click', openVideoModal);

    // 6. Interactive Training Curriculum Controller (Kinder)
    let completedSteps = [1]; // Step 1 is done by default

    const stepHeaders = document.querySelectorAll('.accordion-step-header');
    stepHeaders.forEach(hdr => {
        hdr.addEventListener('click', () => {
            const stepNum = hdr.getAttribute('data-step');
            const content = document.getElementById('stepContent' + stepNum);
            if (content) {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
            }
        });
    });

    const stepToggleBtns = document.querySelectorAll('.btn-step-toggle');
    const kinderLessonProgressBadge = document.getElementById('kinderLessonProgressBadge');
    const lessonBox2 = document.getElementById('lessonBox2');
    const lessonUnlockBanner = document.getElementById('lessonUnlockBanner');
    const lesson2Label = document.getElementById('lesson2Label');
    const lesson2LockIcon = document.getElementById('lesson2LockIcon');
    const lesson2Title = document.getElementById('lesson2Title');
    const lesson2Sub = document.getElementById('lesson2Sub');

    function checkCurriculumProgression() {
        const count = completedSteps.length;
        if (kinderLessonProgressBadge) {
            kinderLessonProgressBadge.textContent = count + ' / 5 Steps Done';
        }

        // Strict Unlock Gate: 3 or more steps required for Lesson 2
        if (count >= 3) {
            if (lessonBox2) {
                lessonBox2.style.opacity = '1';
                lessonBox2.style.cursor = 'pointer';
                lessonBox2.style.borderColor = '#10B981';
                lessonBox2.style.background = '#ECFDF5';
            }
            if (lesson2LockIcon) lesson2LockIcon.textContent = '🔓 UNLOCKED';
            if (lesson2Label) lesson2Label.style.color = '#047857';
            if (lesson2Title) lesson2Title.style.color = '#065F46';
            if (lesson2Sub) lesson2Sub.textContent = 'Pulleys, gears & speed switches';
            if (lessonUnlockBanner) lessonUnlockBanner.style.display = 'block';
        } else {
            if (lessonBox2) {
                lessonBox2.style.opacity = '0.65';
                lessonBox2.style.cursor = 'not-allowed';
                lessonBox2.style.borderColor = '#E2E8F0';
                lessonBox2.style.background = '#F8FAFC';
            }
            if (lesson2LockIcon) lesson2LockIcon.textContent = '🔒 LOCKED';
            if (lesson2Label) lesson2Label.style.color = '#64748B';
            if (lesson2Title) lesson2Title.style.color = '#64748B';
            if (lesson2Sub) lesson2Sub.textContent = 'Requires 3 steps of Lesson 1';
            if (lessonUnlockBanner) lessonUnlockBanner.style.display = 'none';
        }
    }

    stepToggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const stepNum = parseInt(btn.getAttribute('data-step'), 10);
            const badge = document.getElementById('stepBadge' + stepNum);

            if (completedSteps.includes(stepNum)) {
                completedSteps = completedSteps.filter(s => s !== stepNum);
                if (badge) {
                    badge.textContent = 'Pending';
                    badge.style.background = '#F1F5F9';
                    badge.style.color = '#64748B';
                }
            } else {
                completedSteps.push(stepNum);
                if (badge) {
                    badge.textContent = '✓ Done';
                    badge.style.background = '#ECFDF5';
                    badge.style.color = '#065F46';
                }
                awardReward(20, 15, 'Step ' + stepNum + ' Completed');
            }

            checkCurriculumProgression();
        });
    });

    if (lessonBox2) {
        lessonBox2.addEventListener('click', () => {
            if (completedSteps.length < 3) {
                alert('🔒 Lesson 2 is Locked! Complete at least 3 steps of Lesson 1 to unlock.');
            } else {
                alert('🔓 Lesson 2: Motor Wonder Train is unlocked! Welcome to intermediate Kinder robotics.');
            }
        });
    }

    // Photo Dropzone UI
    const dropzoneFileInput = document.getElementById('dropzoneFileInput');
    const photoGalleryContainer = document.getElementById('photoGalleryContainer');

    if (dropzoneFileInput && photoGalleryContainer) {
        dropzoneFileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files[0]) {
                const reader = new FileReader();
                reader.onload = (uploadEvt) => {
                    const img = document.createElement('img');
                    img.src = uploadEvt.target.result;
                    img.style.cssText = 'width: 70px; height: 70px; object-fit: cover; border-radius: 8px; border: 2px solid #45B7CD;';
                    photoGalleryContainer.prepend(img);
                    awardReward(20, 15, 'Robot Build Photo Uploaded');
                };
                reader.readAsDataURL(files[0]);
            }
        });
    }

    // 7. Drag & Drop / Click-to-Match Question Game
    let selectedToken = null;
    const matchTokens = document.querySelectorAll('.match-token');
    const matchSlots = document.querySelectorAll('.match-slot');
    const btnResetMatchGame = document.getElementById('btnResetMatchGame');

    matchTokens.forEach(tok => {
        tok.addEventListener('click', () => {
            const id = tok.getAttribute('data-token-id');
            if (tok.style.opacity === '0.35') return; // already matched

            matchTokens.forEach(t => {
                t.style.borderColor = '#E2E8F0';
                t.style.background = '#FFFFFF';
                const ind = t.querySelector('.match-select-indicator');
                if (ind) ind.textContent = 'Select';
            });

            if (selectedToken === id) {
                selectedToken = null;
            } else {
                selectedToken = id;
                tok.style.borderColor = '#F59E0B';
                tok.style.background = '#FFFBEB';
                const ind = tok.querySelector('.match-select-indicator');
                if (ind) ind.textContent = 'Selected';
            }
        });
    });

    matchSlots.forEach(slot => {
        slot.addEventListener('click', () => {
            if (!selectedToken) {
                alert('Please select a coding block on the left first!');
                return;
            }

            const expected = slot.getAttribute('data-expected');
            const statusLabel = slot.querySelector('.slot-status-label');

            if (expected === selectedToken) {
                // Correct Match!
                slot.style.background = '#ECFDF5';
                slot.style.border = '2px solid #10B981';
                if (statusLabel) {
                    const matchedTokenEl = document.querySelector('[data-token-id="' + selectedToken + '"]');
                    const tokenTitle = matchedTokenEl ? matchedTokenEl.querySelector('div div:first-child').textContent : 'Matched Block';
                    statusLabel.innerHTML = '✓ ' + tokenTitle;
                    statusLabel.style.color = '#065F46';
                    statusLabel.style.fontWeight = '900';
                }

                const matchedEl = document.querySelector('[data-token-id="' + selectedToken + '"]');
                if (matchedEl) {
                    matchedEl.style.opacity = '0.35';
                    matchedEl.style.borderColor = '#CBD5E1';
                    const ind = matchedEl.querySelector('.match-select-indicator');
                    if (ind) ind.textContent = 'Matched ✓';
                }

                awardReward(15, 10, 'Block Correctly Matched');
                selectedToken = null;
            } else {
                alert('Oops! That block has a different function. Try another block!');
            }
        });
    });

    if (btnResetMatchGame) {
        btnResetMatchGame.addEventListener('click', () => {
            selectedToken = null;
            matchTokens.forEach(tok => {
                tok.style.opacity = '1';
                tok.style.borderColor = '#E2E8F0';
                tok.style.background = '#FFFFFF';
                const ind = tok.querySelector('.match-select-indicator');
                if (ind) ind.textContent = 'Select';
            });
            matchSlots.forEach(slot => {
                slot.style.background = '#F8FAFC';
                slot.style.border = '2px dashed #CBD5E1';
                const statusLabel = slot.querySelector('.slot-status-label');
                if (statusLabel) {
                    statusLabel.textContent = 'Empty Slot';
                    statusLabel.style.color = '#64748B';
                    statusLabel.style.fontWeight = '700';
                }
            });
        });
    }
}
