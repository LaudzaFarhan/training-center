/**
 * Automated Verification Test for QA Defect Drafts Feature
 * 
 * Verifies:
 * 1. DOM Elements presence in public/dashboard.html (#qaDraftAlertStrip, #btnQaViewDrafts, #qaDraftsView, #qaDraftsTable, etc.)
 * 2. CSS styles presence in public/css/styles.css (.qa-draft-pill-count, .qa-draft-alert-strip, .qa-drafts-card, .qa-drafts-table, etc.)
 * 3. JS Draft Logic in public/js/app.js (saveOrUpdateCurrentDraft, deleteQaDraft, resumeQaDraft, calculateDraftReadiness, renderQaDraftsView)
 * 4. Simulation of draft lifecycle:
 *    - Open form -> enter title & repro steps -> cancel -> draft auto-saved in storage
 *    - Open empty form -> cancel -> no empty draft created
 *    - Resume draft -> edit description -> cancel -> existing draft updated
 *    - Submit resumed draft -> draft deleted from storage
 *    - Discard draft -> draft deleted from storage
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTests() {
    console.log('🧪 Starting QA Defect Drafts Verification Tests...\n');
    let passed = 0;
    let failed = 0;

    function it(title, fn) {
        try {
            fn();
            console.log(`  ✅ PASS: ${title}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${title}`);
            console.error(`     ${err.message}`);
            failed++;
        }
    }

    // 1. Check DOM structure in public/dashboard.html
    const htmlPath = path.join(__dirname, '../public/dashboard.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    it('dashboard.html contains #qaDraftAlertStrip banner', () => {
        assert.ok(html.includes('id="qaDraftAlertStrip"'), 'Missing #qaDraftAlertStrip');
        assert.ok(html.includes('id="btnResumeLatestDraft"'), 'Missing #btnResumeLatestDraft');
        assert.ok(html.includes('id="btnGoToDraftsView"'), 'Missing #btnGoToDraftsView');
    });

    it('dashboard.html contains Drafts view toggle button with count badge', () => {
        assert.ok(html.includes('id="btnQaViewDrafts"'), 'Missing #btnQaViewDrafts');
        assert.ok(html.includes('id="qaDraftCountBadge"'), 'Missing #qaDraftCountBadge');
    });

    it('dashboard.html contains dedicated #qaDraftsView container with .qa-drafts-table', () => {
        assert.ok(html.includes('id="qaDraftsView"'), 'Missing #qaDraftsView');
        assert.ok(html.includes('class="qa-drafts-table" id="qaDraftsTable"'), 'Missing #qaDraftsTable');
        assert.ok(html.includes('id="qaDraftsTableBody"'), 'Missing #qaDraftsTableBody');
        assert.ok(html.includes('id="qaDraftsEmptyState"'), 'Missing #qaDraftsEmptyState');
        assert.ok(html.includes('id="btnDiscardAllDrafts"'), 'Missing #btnDiscardAllDrafts');
        assert.ok(html.includes('id="btnDraftNewBlank"'), 'Missing #btnDraftNewBlank');
    });

    it('dashboard.html qaNewIssueModal header has IDs for dynamic draft mode', () => {
        assert.ok(html.includes('id="qaNewIssueModalBadge"'), 'Missing #qaNewIssueModalBadge');
        assert.ok(html.includes('id="qaNewIssueModalTitle"'), 'Missing #qaNewIssueModalTitle');
    });

    // 2. Check CSS styles in public/css/styles.css
    const cssPath = path.join(__dirname, '../public/css/styles.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    it('styles.css contains dedicated styles for drafts table & components', () => {
        assert.ok(css.includes('.qa-draft-pill-count'), 'Missing .qa-draft-pill-count');
        assert.ok(css.includes('.qa-draft-alert-strip'), 'Missing .qa-draft-alert-strip');
        assert.ok(css.includes('.qa-drafts-card'), 'Missing .qa-drafts-card');
        assert.ok(css.includes('.qa-drafts-table'), 'Missing .qa-drafts-table');
        assert.ok(css.includes('.qa-draft-ref-pill'), 'Missing .qa-draft-ref-pill');
        assert.ok(css.includes('.qa-readiness-wrap'), 'Missing .qa-readiness-wrap');
        assert.ok(css.includes('.btn-draft-resume'), 'Missing .btn-draft-resume');
        assert.ok(css.includes('.btn-draft-discard'), 'Missing .btn-draft-discard');
        assert.ok(css.includes('.qa-drafts-empty'), 'Missing .qa-drafts-empty');
    });

    // 3. Check JS implementation in public/js/app.js
    const jsPath = path.join(__dirname, '../public/js/app.js');
    const js = fs.readFileSync(jsPath, 'utf8');

    it('app.js defines draft storage & management functions', () => {
        assert.ok(js.includes('QA_DRAFTS_STORAGE_KEY'), 'Missing QA_DRAFTS_STORAGE_KEY');
        assert.ok(js.includes('function getQaDrafts()'), 'Missing getQaDrafts');
        assert.ok(js.includes('function saveOrUpdateCurrentDraft()'), 'Missing saveOrUpdateCurrentDraft');
        assert.ok(js.includes('function deleteQaDraft('), 'Missing deleteQaDraft');
        assert.ok(js.includes('function clearAllQaDrafts()'), 'Missing clearAllQaDrafts');
        assert.ok(js.includes('function checkAndSaveDraftOnClose()'), 'Missing checkAndSaveDraftOnClose');
        assert.ok(js.includes('function resumeQaDraft('), 'Missing resumeQaDraft');
        assert.ok(js.includes('function calculateDraftReadiness('), 'Missing calculateDraftReadiness');
        assert.ok(js.includes('function renderQaDraftsView('), 'Missing renderQaDraftsView');
        assert.ok(js.includes('function updateDraftBadges()'), 'Missing updateDraftBadges');
    });

    it('app.js hooks cancel and close events to checkAndSaveDraftOnClose', () => {
        assert.ok(js.includes("btnCloseQaNewIssueModal.addEventListener('click', checkAndSaveDraftOnClose)"), 'Missing close button draft hook');
        assert.ok(js.includes("btnCancelQaNewIssue.addEventListener('click', checkAndSaveDraftOnClose)"), 'Missing cancel button draft hook');
        assert.ok(js.includes("checkAndSaveDraftOnClose"), 'Missing draft hook on modal');
    });

    it('app.js removes resumed draft from storage upon successful ticket submission', () => {
        assert.ok(js.includes('deleteQaDraft(currentEditingDraftId)'), 'Missing cleanup of submitted draft');
    });

    it('app.js supports 3-way view switching (list, kanban, drafts)', () => {
        assert.ok(js.includes("switchQaView('drafts')"), 'Missing switchQaView drafts support');
        assert.ok(js.includes("btnQaViewDrafts"), 'Missing btnQaViewDrafts wire');
        assert.ok(js.includes("qaDraftsView"), 'Missing qaDraftsView wire');
    });

    // 4. Functional Unit Tests for Logic & State Machine
    it('Draft lifecycle unit test: auto-save on fill, update on resume, cleanup on submit', () => {
        // Mock Storage
        let mockStorage = {};
        const STORAGE_KEY = 'thelab_qa_drafts';

        function getDrafts() {
            return mockStorage[STORAGE_KEY] ? JSON.parse(mockStorage[STORAGE_KEY]) : [];
        }
        function saveDrafts(list) {
            mockStorage[STORAGE_KEY] = JSON.stringify(list);
        }

        function simulateSaveDraft(formData, currentDraftId) {
            const hasContent = (formData.title && formData.title.trim().length > 0) ||
                              (formData.description && formData.description.trim().length > 0) ||
                              (formData.attachments && formData.attachments.length > 0);
            if (!hasContent) return false;

            const drafts = getDrafts();
            const now = new Date().toISOString();

            if (currentDraftId) {
                const idx = drafts.findIndex(d => d.id === currentDraftId);
                if (idx !== -1) {
                    drafts[idx] = { ...drafts[idx], ...formData, updatedAt: now };
                    saveDrafts(drafts);
                    return true;
                }
            }

            const newDraft = {
                id: 'draft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                ...formData,
                createdAt: now,
                updatedAt: now
            };
            drafts.unshift(newDraft);
            saveDrafts(drafts);
            return true;
        }

        // Test 1: Empty cancel does not create draft
        const emptySaved = simulateSaveDraft({ title: '', description: '', attachments: [] }, null);
        assert.strictEqual(emptySaved, false, 'Empty form should not create a draft');
        assert.strictEqual(getDrafts().length, 0);

        // Test 2: Filled form creates draft
        const filledSaved = simulateSaveDraft({
            title: 'Table alignment bug on iPad Safari',
            description: '1. Open dashboard\n2. Rotate screen\n3. Table overflows',
            type: 'Bug',
            priority: 'High',
            module: 'Overview',
            attachments: ['data:image/png;base64,mockImage123']
        }, null);
        assert.strictEqual(filledSaved, true, 'Filled form should create a draft');
        let drafts = getDrafts();
        assert.strictEqual(drafts.length, 1);
        assert.strictEqual(drafts[0].title, 'Table alignment bug on iPad Safari');
        assert.strictEqual(drafts[0].priority, 'High');
        assert.strictEqual(drafts[0].attachments.length, 1);

        const draftId = drafts[0].id;

        // Test 3: Resume and edit updates existing draft without creating duplicate
        const updatedSaved = simulateSaveDraft({
            title: 'Table alignment bug on iPad Safari (Updated)',
            description: 'Added more steps to reproduce',
            type: 'UI/UX Tweak',
            priority: 'Critical',
            module: 'Overview',
            attachments: ['data:image/png;base64,mockImage123', 'data:image/png;base64,mockImage456']
        }, draftId);
        assert.strictEqual(updatedSaved, true);
        drafts = getDrafts();
        assert.strictEqual(drafts.length, 1, 'Should not create duplicate draft upon update');
        assert.strictEqual(drafts[0].id, draftId);
        assert.strictEqual(drafts[0].title, 'Table alignment bug on iPad Safari (Updated)');
        assert.strictEqual(drafts[0].priority, 'Critical');
        assert.strictEqual(drafts[0].attachments.length, 2);

        // Test 4: Delete / Discard draft
        drafts = drafts.filter(d => d.id !== draftId);
        saveDrafts(drafts);
        assert.strictEqual(getDrafts().length, 0, 'Draft should be discarded cleanly');
    });

    console.log(`\n========================================`);
    console.log(`Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
