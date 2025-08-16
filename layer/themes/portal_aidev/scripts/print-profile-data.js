#!/usr/bin/env node

const { http } = require('../../infra_external-log-lib/src');

function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ data: JSON.parse(body), status: res.statusCode });
                } catch (e) {
                    resolve({ data: body, status: res.statusCode });
                }
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function printProfileDetailViewData() {
    console.log('🔍 PROFILE-DETAIL-VIEW DATABASE DATA');
    console.log('=' .repeat(80));
    
    try {
        // Method 1: Get from GUI requirements API
        console.log('\n📊 METHOD 1: GUI Requirements API');
        console.log('-'.repeat(80));
        
        const guiResponse = await makeRequest({
            hostname: "localhost",
            port: 3456,
            path: '/api/gui-requirements?appId=mate-dealer',
            method: 'GET'
        });
        
        if (guiResponse.data.success) {
            const content = guiResponse.data.content;
            const lines = content.split('\n');
            let inProfileSection = false;
            let profileContent = [];
            
            for (const line of lines) {
                if (line.includes('## profile-detail-view.html')) {
                    inProfileSection = true;
                } else if (line.startsWith('##') && inProfileSection) {
                    break;
                }
                
                if (inProfileSection) {
                    profileContent.push(line);
                }
            }
            
            if (profileContent.length > 0) {
                console.log(profileContent.join('\n'));
                
                // Count comments
                const commentLines = profileContent.filter(line => line.match(/^\d+\./));
                console.log(`\n📈 Total comments: ${commentLines.length}`);
            }
        }
        
        // Method 2: Try to get raw database export (if available)
        console.log('\n\n📊 METHOD 2: Raw Database Export');
        console.log('-'.repeat(80));
        
        try {
            const dbExport = await makeRequest({
                hostname: "localhost",
                port: 3456,
                path: '/api/debug/database/export',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, {});
            
            if (dbExport.data && dbExport.data.success !== false) {
                const comments = dbExport.data.data?.comments || {};
                
                // Look for all profile-detail-view variants
                const variants = [
                    'profile-detail-view',
                    'profile_detail_view', 
                    'profile-detail-view.html',
                    'profile_detail-view.html'
                ];
                
                console.log('Looking for profile-detail-view comments in database...\n');
                
                for (const variant of variants) {
                    if (comments[variant]) {
                        console.log(`\n🔑 Key: "${variant}"`);
                        console.log(`📝 Comments: ${Object.keys(comments[variant]).length}`);
                        
                        // Show first few comments
                        const commentList = Object.values(comments[variant]);
                        commentList.slice(0, 3).forEach((comment, idx) => {
                            console.log(`\n  Comment ${idx + 1}:`);
                            console.log(`  - User: ${comment.userId}`);
                            console.log(`  - Time: ${comment.timestamp}`);
                            console.log(`  - Text: ${comment.comment}`);
                        });
                        
                        if (commentList.length > 3) {
                            console.log(`\n  ... and ${commentList.length - 3} more comments`);
                        }
                    }
                }
            } else {
                console.log('❌ Database export endpoint not available or returned error');
            }
        } catch (error) {
            console.log('❌ Could not access database export:', error.message);
        }
        
        // Method 3: Get comment statistics
        console.log('\n\n📊 METHOD 3: Comment Statistics');
        console.log('-'.repeat(80));
        
        try {
            const statsResponse = await makeRequest({
                hostname: "localhost",
                port: 3456,
                path: '/api/stats',
                method: 'GET'
            });
            
            if (statsResponse.data) {
                console.log('Server Statistics:');
                console.log(JSON.stringify(statsResponse.data, null, 2));
            }
        } catch (error) {
            console.log('❌ Could not get statistics:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    console.log('\n' + '='.repeat(80));
}

// Run the script
printProfileDetailViewData().catch(console.error);