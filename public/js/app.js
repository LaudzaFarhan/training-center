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
    async function checkAuth() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.status === 401) {
                window.location.href = '/login?redirect=/dashboard';
                return;
            }
            const data = await res.json();
            if (data.user) {
                const nameEl = document.getElementById('userName');
                const roleEl = document.getElementById('userRole');
                const initialsEl = document.getElementById('userInitials');
                if (nameEl) nameEl.textContent = data.user.name;
                if (roleEl) roleEl.textContent = data.user.role || 'Instructor';
                if (initialsEl) {
                    const initials = data.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    initialsEl.textContent = initials;
                }
            }
        } catch (e) {
            console.warn('Auth check notice:', e);
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
                    <button class="btn btn-subtle btn-sm edit-score-btn" data-id="${student.id}" style="padding: 4px 10px; font-size: 12px;">
                        Evaluate
                    </button>
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
    }

    if (searchTrainee) {
        searchTrainee.addEventListener('input', renderTrainees);
    }

    // Mark all present button
    const btnMarkAllPresent = document.getElementById('btnMarkAllPresent');
    if (btnMarkAllPresent) {
        btnMarkAllPresent.addEventListener('click', () => {
            trainees.forEach(t => {
                if (!selectedCohortId || t.cohortId === selectedCohortId) {
                    t.attendance = Math.min(100, t.attendance + 2);
                }
            });
            renderTrainees();
            alert('Attendance updated successfully for current cohort session!');
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
        btnSaveScore.addEventListener('click', () => {
            const id = modalStudentId.value;
            const score = parseInt(inputScore.value, 10);
            const labStatus = selectLabStatus.value;

            const student = trainees.find(t => t.id === id);
            if (student) {
                student.score = isNaN(score) ? student.score : score;
                student.labStatus = labStatus;
                renderTrainees();
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
    // 5. User & Role Management Controller
    const usersTableBody = document.getElementById('usersTableBody');
    const btnOpenAddUser = document.getElementById('btnOpenAddUser');
    const addUserModal = document.getElementById('addUserModal');
    const btnCloseAddUserModal = document.getElementById('btnCloseAddUserModal');
    const btnCancelAddUser = document.getElementById('btnCancelAddUser');
    const addUserForm = document.getElementById('addUserForm');

    const editRoleModal = document.getElementById('editRoleModal');
    const btnCloseEditRoleModal = document.getElementById('btnCloseEditRoleModal');
    const btnCancelEditRole = document.getElementById('btnCancelEditRole');
    const editRoleForm = document.getElementById('editRoleForm');
    const editRoleUserId = document.getElementById('editRoleUserId');
    const editRoleUserName = document.getElementById('editRoleUserName');
    const editRoleSelect = document.getElementById('editRoleSelect');

    let currentUsers = [];

    async function loadUsers() {
        if (!usersTableBody) return;
        try {
            const res = await fetch('/api/users');
            if (!res.ok) return;
            currentUsers = await res.json();
            renderUsers();
        } catch (e) {
            console.warn('Could not load users:', e);
        }
    }

    function renderUsers() {
        if (!usersTableBody) return;
        if (!currentUsers || currentUsers.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No team users registered yet.</td></tr>`;
            return;
        }

        usersTableBody.innerHTML = currentUsers.map(user => {
            const initials = (user.name || 'User').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '2026';
            
            let badgeStyle = 'background: var(--brand-teal-light); color: var(--brand-teal-hover); border: 1px solid rgba(69, 183, 205, 0.3);';
            if (user.role.includes('Admin')) {
                badgeStyle = 'background: var(--brand-yellow-light); color: #8C5E00; border: 1px solid rgba(246, 197, 81, 0.5);';
            } else if (user.role.includes('Assistant')) {
                badgeStyle = 'background: var(--color-emerald-light); color: var(--color-emerald); border: 1px solid rgba(16, 185, 129, 0.3);';
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
                        <span class="badge" style="${badgeStyle}">${user.role}</span>
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

    if (btnOpenAddUser) {
        btnOpenAddUser.addEventListener('click', () => {
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

            try {
                const res = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    alert(`Team member "${name}" created successfully as ${role}!`);
                    addUserForm.reset();
                    addUserModal.classList.remove('active');
                    loadUsers();
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

    // Initialize
    loadInitialData();
    loadUsers();
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

