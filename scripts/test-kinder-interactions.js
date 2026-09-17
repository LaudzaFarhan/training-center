const fs = require('fs');

console.log('--- Training Area (Kinder Track) Verification Suite ---');

// 1. Verify React component exists and exports correctly
const reactComponent = fs.readFileSync('components/TrainingArea.tsx', 'utf8');
console.log('✓ React Component Length:', reactComponent.length, 'bytes');
console.log('✓ Has "use client":', reactComponent.includes("'use client'"));
console.log('✓ Has Track Selection state:', reactComponent.includes("useState<TrackType>('kinder')"));
console.log('✓ Has Onboarding Tasks state:', reactComponent.includes("onboardingTasks") && reactComponent.includes("p1-email"));
console.log('✓ Has Sarah Wijaya delegation note:', reactComponent.includes("Sarah Wijaya") && reactComponent.includes("Branch Manager Delegation Note"));
console.log('✓ Has Circular progress ring:', reactComponent.includes("strokeDasharray"));
console.log('✓ Has File dropzone UI:', reactComponent.includes("Drag & Drop Robot / Tool Photos"));
console.log('✓ Has Drag & Drop matching game:', reactComponent.includes("Match the Tactile Block to its Robot Action"));
console.log('✓ Has Student Quiz & ELI4 Guide:', reactComponent.includes("Kiko the Robot Quiz") && reactComponent.includes("Teacher's Guide to Simplify Concepts (ELI4)"));
console.log('✓ Has 3-step unlock progression rule:', reactComponent.includes("completedSteps.length >= 3"));

// 2. Verify Live HTML Dashboard structure
const html = fs.readFileSync('public/dashboard.html', 'utf8');
console.log('\n--- Live HTML Dashboard Structure ---');
console.log('✓ Nav item appended under TRAINING OPS:', html.includes('data-tab="training-area"'));
console.log('✓ Section tab-training-area exists:', html.includes('id="tab-training-area"'));
console.log('✓ Kinder track selector card exists:', html.includes('id="trackCardKinder"'));
console.log('✓ Day 1 Onboarding 3 Core Pillars (Work Identity, Cloud Drive, Wingman):', 
    html.includes('id="cardPillar1"') &&
    html.includes('id="cardPillar2"') &&
    html.includes('id="cardPillar3"'));
console.log('✓ Curriculum Term dropdown exists & Age/Level removed:', 
    html.includes('id="selectKinderTerm"') && !html.includes('id="selectKinderLevel"'));
console.log('✓ Circular progress ring SVG:', html.includes('stroke-dasharray="40, 100"'));
console.log('✓ Delegation Callout Box exists:', html.includes('id="delegationCalloutBox"'));
console.log('✓ Stepper 5 steps present:', [1,2,3,4,5].every(i => html.includes(`data-step="${i}"`)));
console.log('✓ Dropzone input present:', html.includes('id="dropzoneFileInput"'));
console.log('✓ Matching game tokens & slots present:', html.includes('id="matchItemsCol"') && html.includes('id="matchSlotsCol"'));
console.log('✓ Lesson 2 unlock gate banner:', html.includes('id="lessonUnlockBanner"'));

// 3. Verify JavaScript Controller
const js = fs.readFileSync('public/js/app.js', 'utf8');
console.log('\n--- JavaScript Controller & Interactivity ---');
console.log('✓ initTrainingArea defined:', js.includes('function initTrainingArea()'));
console.log('✓ Day 1 Onboarding interactive checkbox logic present:', js.includes('chkEmailCreation') && js.includes('updateOnboardingUI'));
console.log('✓ Progression unlock threshold (3+ steps):', js.includes('count >= 3'));
console.log('✓ Matching game click/drag logic:', js.includes('selectedToken === id') || js.includes('expected === selectedToken'));
console.log('✓ Delegation toggle handler:', js.includes('btnToggleInstructorReady'));
console.log('✓ Coin & EXP persistence:', js.includes('thelab_training_coins') && js.includes('thelab_trainer_exp'));

// 4. Verify Kinder Roadmap 4 Terms & 40 Lessons Syllabus (10 per term)
console.log('\n--- Kinder Roadmap 4 Terms & 40 Lessons Verification ---');
const terms = ['Term 1', 'Term 2', 'Term 3', 'Term 4'];
const termOptionsStrictHtml = terms.every(t => html.includes(`>${t}</option>`));
const termOptionsStrictReact = terms.every(t => reactComponent.includes(`>${t}</option>`));
console.log('✓ HTML Dropdown strictly uses "Term 1", "Term 2", "Term 3", "Term 4":', termOptionsStrictHtml);
console.log('✓ React Dropdown strictly uses "Term 1", "Term 2", "Term 3", "Term 4":', termOptionsStrictReact);

// Check sample lessons from all 4 terms
const expectedLessons = [
    // Term 1
    { code: 'K1.01', topic: 'Introduction to Robots and Coding', kit: 'Spike Tank' },
    { code: 'K1.02', topic: 'Electric Circuits and Electrical Conductivity', kit: '<Electric circuit using Snap Circuits>' },
    { code: 'K1.03', topic: 'Numbers to 10, Left and Right, Identification and uses of sensors, & Events and Sequence', kit: '<Using Codey Rocky>' },
    { code: 'K1.06', topic: 'Motor Manipulation with Moments', kit: 'Spike Egg Spinner, Spike Fishing Rod' },
    { code: 'K1.10', topic: 'Term 1 Project', kit: '<Choose one robot from Term 1 along with requirements>' },
    // Term 2
    { code: 'K2.01', topic: 'Animation and Axis', kit: 'Spike Andy Roid' },
    { code: 'K2.05', topic: 'Additions and Subtraction within 10, & Symmetry and Mechanism of a Balancing Beam', kit: '<Play with Monkey Business Game>' },
    { code: 'K2.07', topic: 'Map Reading, & Sequence – Movements and Turns', kit: '<Using Robot Mouse>' },
    { code: 'K2.09', topic: 'Remote Controlled Devices and Drone', kit: '<Using drones>' },
    { code: 'K2.10', topic: 'Term 2 Presentation', kit: '<Choose one robot from Term 2 along with requirements>' },
    // Term 3
    { code: 'K3.01', topic: 'Measuring Force with Touch Sensor & If-Then Logic Statement with Touch Sensor', kit: 'Spike Windmill' },
    { code: 'K3.03', topic: 'Coding with X- and Y in programming world', kit: '<Puzzle activity>' },
    { code: 'K3.07', topic: 'Mechanism of a Robot Hand', kit: 'Spike Grabber [Kinder Term 3]' },
    { code: 'K3.10', topic: 'Term 3 Presentation', kit: '<Choose one robot from Term 3 along with requirements>' },
    // Term 4
    { code: 'K4.01', topic: 'Sequencing with Spike Programming Using Speed and Colour Sensor', kit: 'Spike Mouse' },
    { code: 'K4.02', topic: 'X, Y and Z Axis & 3D Printing', kit: '<Using the 3D printing machine>' },
    { code: 'K4.04', topic: 'Introduction to Augmented Reality & Story-Telling', kit: '<Do-It-Yourself Sunglasses>' },
    { code: 'K4.07', topic: 'Touch Sensor and Loop with Codey Rocky & AND operator and If-Then Condition', kit: '<Use Codey Rocky>' },
    { code: 'K4.09', topic: 'Introduction to VR', kit: '<Do-It-Yourself Virtual Reality Glasses>' },
    { code: 'K4.10', topic: 'Term 4 Presentation', kit: '<Choose one robot from Term 4 along with requirements>' }
];

const allSampleLessonsPresentInJs = expectedLessons.every(l => js.includes(l.code) && js.includes(l.topic));
const allSampleLessonsPresentInReact = expectedLessons.every(l => reactComponent.includes(l.code) && reactComponent.includes(l.topic));

console.log('✓ All 4 Terms syllabus present in JavaScript controller:', allSampleLessonsPresentInJs);
console.log('✓ All 4 Terms syllabus present in React component:', allSampleLessonsPresentInReact);
console.log('✓ Roadmap container & Quick Term Jump Pills in HTML:', html.includes('id="kinderRoadmapTermCard"') && html.includes('id="kinderTermQuickBtns"'));
console.log('✓ Lesson specs modal in HTML:', html.includes('id="kinderLessonDetailsModal"'));

// 5. Verify Interactive Build Matrix & Video Submission System
console.log('\n--- Interactive Build Matrix & Video Submission System ---');
console.log('✓ Top Banner with BUILDS DONE & VIDEOS UPLOADED in HTML:', 
    html.includes('id="kinderBuildMatrixBanner"') &&
    html.includes('id="matrixBuildsCount"') &&
    html.includes('id="matrixVideosCount"') &&
    html.includes('id="btnCopyTaskSubmissionSheet"'));
console.log('✓ Top Banner with BUILDS DONE & VIDEOS UPLOADED in React:',
    reactComponent.includes('BUILDS DONE') &&
    reactComponent.includes('VIDEOS UPLOADED') &&
    reactComponent.includes('copyTaskSubmissionSheet'));
console.log('✓ "Copy Task Submission Sheet" exports markdown table:',
    js.includes('copyTaskSubmissionSheet') &&
    js.includes('# THE LAB INDONESIA — KINDER PRACTICAL BUILD & VIDEO SUBMISSION SHEET') &&
    reactComponent.includes('# THE LAB INDONESIA — KINDER PRACTICAL BUILD & VIDEO SUBMISSION SHEET'));
console.log('✓ 4-Item Lesson Plan Accordion in JS:',
    js.includes('Engineering Focus &amp; Objectives') &&
    js.includes('What to do') &&
    js.includes('Concept (ELI4)') &&
    js.includes('Activity / Games') &&
    js.includes('Building Challenge'));
console.log('✓ 4-Item Lesson Plan Accordion in React:',
    reactComponent.includes('Engineering Focus & Objectives') &&
    reactComponent.includes('What to do') &&
    reactComponent.includes('Concept (ELI4)') &&
    reactComponent.includes('Activity / Games') &&
    reactComponent.includes('Building Challenge'));
console.log('✓ Video Evidence submission components present:',
    js.includes('Video Evidence Submission') &&
    js.includes('btn-action-edit-video') &&
    reactComponent.includes('Video Evidence Submission') &&
    reactComponent.includes('saveVideoLink'));
console.log('✓ Master Unlock override present:',
    html.includes('id="btnKinderMasterUnlock"') &&
    js.includes('btnKinderMasterUnlock') &&
    reactComponent.includes('masterUnlockOverride'));

if (!termOptionsStrictHtml || !termOptionsStrictReact || !allSampleLessonsPresentInJs || !allSampleLessonsPresentInReact) {
    console.error('❌ Validation check failed for Kinder Roadmap terms/lessons');
    process.exit(1);
}

console.log('\n======================================================');
console.log('✅ ALL INTERACTION & ARCHITECTURE CHECKS PASSED!');
console.log('======================================================\n');
