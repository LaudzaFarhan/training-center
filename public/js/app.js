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

    // Logout Handler
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
                    <td>
                        <span class="qa-id-pill">#QA-${String(issue.id).padStart(2, '0')}</span>
                    </td>
                    <td>
                        <span class="badge ${priorityClass}">${issue.priority}</span>
                    </td>
                    <td>
                        <div style="font-weight: 700; color: var(--brand-navy); font-size: 13.5px; cursor: pointer;" class="qa-title-click" data-id="${issue.id}">
                            ${escapeHtml(issue.title)}
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
                            <span class="badge-type-tag">${issue.type || 'Bug'}</span>
                            <span style="font-size: 11px; color: var(--text-muted);">Module: <strong>${issue.module || 'General'}</strong></span>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 600; font-size: 12.5px; color: var(--brand-navy);">${escapeHtml(issue.reporterName || 'Anonymous')}</div>
                        <small style="font-size: 11px; color: var(--text-muted);">${escapeHtml(issue.reporterEmail || '')}</small>
                    </td>
                    <td>
                        <div style="font-weight: 600; font-size: 12.5px; color: ${issue.assigneeName ? 'var(--brand-navy)' : 'var(--text-muted)'};">
                            ${issue.assigneeName ? '👤 ' + escapeHtml(issue.assigneeName) : '<em>Unassigned</em>'}
                        </div>
                    </td>
                    <td style="text-align: center;">
                        ${thumbHtml}
                    </td>
                    <td style="text-align: center;">
                        <span style="font-size: 12px; font-weight: 700; color: var(--brand-navy);">💬 ${issue.commentCount || 0}</span>
                    </td>
                    <td>
                        <select class="qa-select-sm qa-inline-status" data-id="${issue.id}" style="font-size: 11.5px; padding: 3px 6px;">
                            <option value="Open" ${issue.status === 'Open' ? 'selected' : ''}>Open</option>
                            <option value="In Progress" ${issue.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Ready for QA" ${issue.status === 'Ready for QA' ? 'selected' : ''}>Ready for QA</option>
                            <option value="Resolved" ${issue.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                            <option value="Closed" ${issue.status === 'Closed' ? 'selected' : ''}>Closed</option>
                            <option value="Deferred" ${issue.status === 'Deferred' ? 'selected' : ''}>Deferred</option>
                        </select>
                    </td>
                    <td style="text-align: right;">
                        <button class="btn btn-sm btn-subtle qa-btn-details" data-id="${issue.id}" style="padding: 4px 8px; font-size: 11.5px;">
                            Details &rarr;
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.qa-title-click, .qa-btn-details').forEach(btn => {
            btn.addEventListener('click', () => openQaDetailModal(btn.getAttribute('data-id')));
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
                                <span class="badge badge-priority-${priorityClass}">${issue.priority}</span>
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
        qaNewIssueAttachments = [];
        renderNewIssueThumbnails();
        if (qaNewIssueForm) qaNewIssueForm.reset();

        // Update environment preview pills
        const env = getClientEnvironment();
        const pBrowser = document.getElementById('envPillBrowser');
        const pOs = document.getElementById('envPillOs');
        const pRes = document.getElementById('envPillResolution');
        const pVp = document.getElementById('envPillViewport');
        if (pBrowser) pBrowser.textContent = `Browser: ${env.browser}`;
        if (pOs) pOs.textContent = `OS: ${env.os}`;
        if (pRes) pRes.textContent = `Screen: ${env.screenRes}`;
        if (pVp) pVp.textContent = `Viewport: ${env.viewport}`;

        qaNewIssueModal.classList.add('active');
    }

    if (btnQaNewIssue) btnQaNewIssue.addEventListener('click', openNewIssueModal);
    if (btnCloseQaNewIssueModal) btnCloseQaNewIssueModal.addEventListener('click', () => qaNewIssueModal.classList.remove('active'));
    if (btnCancelQaNewIssue) btnCancelQaNewIssue.addEventListener('click', () => qaNewIssueModal.classList.remove('active'));

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
                    showQaToast('Issue Created', `Reported #${data.issue.id}: ${title}`, priority === 'Critical' ? 'critical' : 'info');
                    qaNewIssueModal.classList.remove('active');
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

    if (btnCloseQaDetailModal) btnCloseQaDetailModal.addEventListener('click', () => qaDetailModal.classList.remove('active'));

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

    // View Switching: List vs Kanban
    const btnQaViewList = document.getElementById('btnQaViewList');
    const btnQaViewKanban = document.getElementById('btnQaViewKanban');
    const qaListView = document.getElementById('qaListView');
    const qaKanbanView = document.getElementById('qaKanbanView');

    if (btnQaViewList && btnQaViewKanban) {
        btnQaViewList.addEventListener('click', () => {
            btnQaViewList.classList.add('active');
            btnQaViewKanban.classList.remove('active');
            if (qaListView) qaListView.style.display = 'block';
            if (qaKanbanView) qaKanbanView.style.display = 'none';
            qaCurrentView = 'list';
        });

        btnQaViewKanban.addEventListener('click', () => {
            btnQaViewKanban.classList.add('active');
            btnQaViewList.classList.remove('active');
            if (qaListView) qaListView.style.display = 'none';
            if (qaKanbanView) qaKanbanView.style.display = 'block';
            qaCurrentView = 'kanban';
            renderQaKanbanView();
        });
    }

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
                loadQaIssues();
            }, 300);
        });
    }

    if (qaClearSearchBtn && qaSearchInput) {
        qaClearSearchBtn.addEventListener('click', () => {
            qaSearchInput.value = '';
            qaClearSearchBtn.style.display = 'none';
            qaFilterState.q = '';
            loadQaIssues();
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
            loadQaIssues();
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
    setInterval(checkDbStatus, 20000);
    setInterval(pollQaNotifications, 15000);

    // Deep link check for /new/qa-tracker or #tab-qa
    if (window.location.pathname === '/new/qa-tracker' || window.location.pathname === '/qa-tracker' || window.location.hash === '#tab-qa') {
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

