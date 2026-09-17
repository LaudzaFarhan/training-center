const http = require('http');

const req = http.request('http://localhost:3050/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, (res) => {
    const cookie = res.headers['set-cookie'];
    console.log('Login Status:', res.statusCode);

    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
        if (!cookie) {
            console.error('No cookie returned');
            process.exit(1);
        }

        const dashReq = http.request('http://localhost:3050/dashboard', {
            headers: { 'Cookie': cookie[0] }
        }, (dashRes) => {
            let data = '';
            dashRes.on('data', c => data += c);
            dashRes.on('end', () => {
                console.log('\n--- Dashboard Kinder Track Verification ---');
                console.log('Dashboard HTTP Status:', dashRes.statusCode);
                console.log('✓ Training Area in Nav:', data.includes('data-tab="training-area"'));
                console.log('✓ tab-training-area Section:', data.includes('id="tab-training-area"'));
                console.log('✓ Track Selection [Kinder | Junior | Coder]:', 
                    data.includes('id="trackCardKinder"') && 
                    data.includes('id="trackCardJunior"') && 
                    data.includes('id="trackCardCoder"'));
                console.log('✓ Day 1 Launchpad Banner & Title:', data.includes('Day 1 Launchpad') && data.includes('Welcome to The Lab Family! 🚀'));
                console.log('✓ Pillar 1: Work Identity & Account Setup:', data.includes('Work Identity &amp; Account Setup') || data.includes('Work Identity & Account Setup'));
                console.log('✓ Pillar 2: Knowledge Hub & Cloud Drive Setup:', data.includes('Knowledge Hub &amp; Cloud Drive Setup') || data.includes('Knowledge Hub & Cloud Drive Setup'));
                console.log('✓ Pillar 3: Wingman, Team & Culture:', data.includes('Wingman, Team &amp; Culture') || data.includes('Wingman, Team & Culture'));
                console.log('✓ Priority Path & Sarah Wijaya Delegation:', 
                    data.includes('Branch Manager Delegation Note') && 
                    data.includes('Sarah Wijaya'));
                console.log('✓ Circular Progress Ring (2/5 Sessions):', data.includes('2/5') && data.includes('Sessions'));
                console.log('✓ Masterclass Video ("The Lab Way"):', data.includes('How to Teach The Lab Way (Kinder Edition)'));
                console.log('✓ Interactive Curriculum Stepper (Animal Robot):', data.includes('Animal Robot Adventure'));
                console.log('✓ Dropzone UI for Robot/Tools Photos:', data.includes('dropzoneFileInput'));
                console.log('✓ Drag & Drop Block Matching Game:', data.includes('Match the Tactile Block to its Robot Action'));
                console.log('✓ Student Quiz Mockup (Kiko the Robot):', data.includes('Kiko the Robot Quiz'));
                console.log('✓ Teacher\'s Guide to Simplify Concepts (ELI4):', data.includes('Teacher\'s Guide to Simplify Concepts (ELI4)'));
                console.log('✓ Lesson 2 Strict Unlock Progression Gate:', data.includes('id="lessonBox2"'));
                console.log('✓ Kinder Jump Selector strictly Term 1-4:', 
                    data.includes('>Term 1</option>') && 
                    data.includes('>Term 2</option>') && 
                    data.includes('>Term 3</option>') && 
                    data.includes('>Term 4</option>'));
                console.log('✓ Kinder Roadmap Term Card & Lesson List:', 
                    data.includes('id="kinderRoadmapTermCard"') && 
                    data.includes('id="kinderRoadmapLessonList"'));
                console.log('✓ Kinder Build Matrix Banner & Counters:',
                    data.includes('id="kinderBuildMatrixBanner"') &&
                    data.includes('id="matrixBuildsCount"') &&
                    data.includes('id="matrixVideosCount"'));
                console.log('✓ Copy Task Submission Sheet & Master Unlock Buttons:',
                    data.includes('id="btnCopyTaskSubmissionSheet"') &&
                    data.includes('id="btnKinderMasterUnlock"'));
                console.log('-------------------------------------------\n');
                process.exit(0);
            });
        });
        dashReq.end();
    });
});

req.write(JSON.stringify({ email: 'shafira.thelab@gmail.com', password: 'trainer12345' }));
req.end();
