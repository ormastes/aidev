#!/usr/bin/env node

const { chromium } = require("playwright");

async function testRealNavigation() {
    console.log('🎭 PLAYWRIGHT: Testing REAL navigation\n');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        // Go to main page
        console.log('1️⃣ STARTING AT MAIN PAGE');
        await page.goto('http://localhost:3456');
        await page.waitForTimeout(1000);
        
        // Check what's on the page
        const pageTitle = await page.title();
        console.log(`   📄 Page title: ${pageTitle}`);
        
        // Look for any links to mate dealer
        const links = await page.locator('a').all();
        console.log(`   🔗 Found ${links.length} links`);
        
        // Find and click mate dealer related link
        let foundMateDealer = false;
        for (const link of links) {
            const href = await link.getAttribute('href');
            const text = await link.textContent();
            
            if (href && (href.includes('mate') || href.includes('dealer') || href.includes('pages'))) {
                console.log(`   🖱️  Clicking link: ${text || href}`);
                await link.click();
                foundMateDealer = true;
                await page.waitForTimeout(1500);
                break;
            }
        }
        
        if (!foundMateDealer) {
            // Try direct navigation to pages
            console.log('   ⚠️  No mate dealer link found, trying pages directly');
            await page.goto('http://localhost:3456/pages/mate-dealer-app-gui-design-studio.html');
            await page.waitForTimeout(1000);
        }
        
        // Now look for the comment section
        console.log('\n2️⃣ LOOKING FOR COMMENT SECTION');
        
        // Try different selectors
        const selectors = [
            '#screenRequestsComment',  // GUI Design Studio
            '#commentText',           // Profile pages
            "textarea",               // Any textarea
            'input[type="text"]'      // Text inputs
        ];
        
        for (const selector of selectors) {
            const element = await page.locator(selector).first();
            if (await element.count() > 0) {
                console.log(`   🔄 Found element: ${selector}`);
                
                const comment = `REAL TEST: Found this by selector ${selector} at ${new Date().toISOString()}`;
                await element.fill(comment);
                console.log(`   ✍️  Typed: "${comment}"`);
                
                // Try to trigger any validation
                await element.press('Space');
                await element.press("Backspace");
                await page.waitForTimeout(500);
                
                // Look for submit button nearby
                const submitBtns = await page.locator('button').all();
                for (const btn of submitBtns) {
                    const btnText = await btn.textContent();
                    if (btnText && (btnText.includes('Submit') || btnText.includes('Save'))) {
                        try {
                            await btn.click();
                            console.log(`   📤 Clicked button: ${btnText}`);
                        } catch (e) {
                            console.log(`   ⚠️  Could not click: ${btnText}`);
                        }
                    }
                }
                
                break;
            }
        }
        
        // Try navigating to another page
        console.log('\n3️⃣ NAVIGATING TO ANOTHER PAGE');
        
        const pageLinks = await page.locator('a[href*=".html"]').all();
        console.log(`   🔗 Found ${pageLinks.length} page links`);
        
        if (pageLinks.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(5, pageLinks.length));
            const link = pageLinks[randomIndex];
            const href = await link.getAttribute('href');
            console.log(`   🖱️  Clicking random link: ${href}`);
            await link.click();
            await page.waitForTimeout(1000);
            
            // Check for comments on this new page
            const newPageComment = await page.locator('textarea, #commentText').first();
            if (await newPageComment.count() > 0) {
                await newPageComment.fill('NAVIGATED HERE: By clicking links only');
                console.log('   ✍️  Added comment on new page');
            }
        }
        
        // Final summary
        console.log('\n📊 TEST In Progress');
        const finalUrl = page.url();
        console.log(`   📍 Final URL: ${finalUrl}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await page.screenshot({ path: '/tmp/playwright-nav-error.png' });
    } finally {
        await browser.close();
    }
}

testRealNavigation().catch(console.error);