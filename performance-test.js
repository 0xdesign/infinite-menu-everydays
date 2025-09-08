const puppeteer = require('puppeteer');

async function measurePerformance() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable performance metrics
  await page.evaluateOnNewDocument(() => {
    window.performanceMetrics = {
      atlasLoadStart: 0,
      atlasLoadEnd: 0,
      itemsUpdated: [],
      consoleMessages: []
    };
    
    // Override console.log to capture messages
    const originalLog = console.log;
    console.log = function(...args) {
      window.performanceMetrics.consoleMessages.push(args.join(' '));
      originalLog.apply(console, args);
    };
  });
  
  console.log('=== PERFORMANCE TEST RESULTS ===\n');
  
  // Test 1: Initial Load (Cold)
  console.log('TEST 1: Initial Page Load (ALL items - 706)');
  console.log('----------------------------------------');
  
  const startTime = Date.now();
  await page.goto('http://localhost:3005', { waitUntil: 'networkidle0' });
  const initialLoadTime = Date.now() - startTime;
  
  // Get performance metrics
  const metrics = await page.metrics();
  const performanceTiming = await page.evaluate(() => {
    const timing = performance.timing;
    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart,
      atlasMessages: window.performanceMetrics.consoleMessages.filter(msg => msg.includes('ATLAS'))
    };
  });
  
  console.log(`Page Load Time: ${initialLoadTime}ms`);
  console.log(`DOM Content Loaded: ${performanceTiming.domContentLoaded}ms`);
  console.log(`Load Complete: ${performanceTiming.loadComplete}ms`);
  
  // Check resource timing for atlases
  const resourceTimings = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const atlasResources = resources.filter(r => 
      r.name.includes('atlas-') && (r.name.endsWith('.jpg') || r.name.endsWith('.json'))
    );
    
    return atlasResources.map(r => ({
      name: r.name.split('/').pop(),
      duration: r.duration,
      size: r.transferSize || r.encodedBodySize,
      cached: r.transferSize === 0
    }));
  });
  
  console.log('\nAtlas Resources:');
  let totalAtlasTime = 0;
  let totalAtlasSize = 0;
  
  resourceTimings.forEach(resource => {
    console.log(`  ${resource.name}: ${resource.duration.toFixed(0)}ms (${(resource.size/1024/1024).toFixed(2)}MB) ${resource.cached ? '[CACHED]' : ''}`);
    totalAtlasTime = Math.max(totalAtlasTime, resource.duration);
    totalAtlasSize += resource.size;
  });
  
  console.log(`\nTotal Atlas Load Time: ${totalAtlasTime.toFixed(0)}ms`);
  console.log(`Total Data Downloaded: ${(totalAtlasSize/1024/1024).toFixed(2)}MB`);
  
  // Test 2: Filter Performance
  console.log('\n\nTEST 2: Filter to AGENTS (53 items)');
  console.log('----------------------------------------');
  
  // Click AGENTS filter
  const filterStartTime = Date.now();
  await page.click('button:has-text("agents")');
  await page.waitForTimeout(500); // Wait for animation
  const filterTime = Date.now() - filterStartTime;
  
  console.log(`Filter Time: ${filterTime}ms`);
  
  // Check console messages for updates
  const filterMessages = await page.evaluate(() => {
    return window.performanceMetrics.consoleMessages.filter(msg => 
      msg.includes('ATLAS_TEST: Updating items')
    );
  });
  
  if (filterMessages.length > 0) {
    console.log('Filter Messages:', filterMessages[filterMessages.length - 1]);
  }
  
  // Test 3: Cached Load
  console.log('\n\nTEST 3: Reload (Cached)');
  console.log('----------------------------------------');
  
  const reloadStart = Date.now();
  await page.reload({ waitUntil: 'networkidle0' });
  const reloadTime = Date.now() - reloadStart;
  
  const cachedResources = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const atlasResources = resources.filter(r => 
      r.name.includes('atlas-') && (r.name.endsWith('.jpg') || r.name.endsWith('.json'))
    );
    
    return atlasResources.map(r => ({
      name: r.name.split('/').pop(),
      duration: r.duration,
      cached: r.transferSize === 0 || r.duration < 10
    }));
  });
  
  console.log(`Reload Time: ${reloadTime}ms`);
  console.log('Cached Atlas Resources:');
  cachedResources.forEach(resource => {
    console.log(`  ${resource.name}: ${resource.duration.toFixed(0)}ms ${resource.cached ? '[CACHED]' : '[NETWORK]'}`);
  });
  
  await browser.close();
  
  console.log('\n=== SUMMARY ===');
  console.log(`First Load: ${initialLoadTime}ms (${(totalAtlasSize/1024/1024).toFixed(2)}MB)`);
  console.log(`Filter Time: ${filterTime}ms (0MB - client-side only)`);
  console.log(`Cached Load: ${reloadTime}ms`);
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  measurePerformance().catch(console.error);
} catch(e) {
  console.log('Installing puppeteer...');
  require('child_process').execSync('npm install puppeteer', { stdio: 'inherit' });
  console.log('Please run the script again.');
}