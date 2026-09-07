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
                        <span class="badge" style="${badgeStyle}">${roleEmoji} ${user.role}</span>
                    </td>
                    <td style="color: var(--text-muted); font-size: 12.5px;">${dateStr}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-subtle btn-sm edit-role-btn" data-id="${user.id}" data-name="${user.name}" data-role="${user.role}" style="padding: 4px 10px; font-size: 11.5px;">
                                Role
                            </button>
                            <button class="btn btn-sm delete-user-btn" data-id="${user.id}" data-name="${user.name}" style="padding: 4px 10px; font-size: 11.5px; background: var(--color-rose-light); color: var(--color-rose); border: 1px solid rgba(244, 63, 94, 0.2);">
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

    // Initialize
    loadInitialData();
    loadUsers();
    checkDbStatus();
    setInterval(checkDbStatus, 20000);
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

