const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('=== NAVIGATING TO PAGE ===');
    await page.goto('https://gruppenplatz.healthycloud.de/HC_GP_Public_Pages', { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(3000);
    
    // Handle dialogs
    page.on('dialog', async dialog => {
      console.log('Dialog:', dialog.type(), dialog.message());
      await dialog.dismiss();
    });
    
    // Handle cookie consent
    try {
      const acceptBtn = page.locator('button:has-text("Accept All"), button:has-text("Akzeptieren")');
      if (await acceptBtn.isVisible({ timeout: 5000 })) {
        await acceptBtn.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('No consent dialog');
    }
    
    // Click search button
    const searchBtn = page.locator('button:has-text("Suche starten")').first();
    await searchBtn.click();
    await page.waitForTimeout(3000);
    
    console.log('\n=== PAGE ELEMENTS ANALYSIS ===');
    
    // Get all buttons
    const buttons = await page.$$('button');
    console.log(`\n📋 BUTTONS (${buttons.length}):`);
    for (let i = 0; i < Math.min(buttons.length, 20); i++) {
      const text = await buttons[i].textContent();
      const classes = await buttons[i].getAttribute('class') || '';
      const id = await buttons[i].getAttribute('id') || '';
      if (text.trim()) {
        console.log(`  ${i+1}. "${text.trim()}" (id: ${id}, class: ${classes})`);
      }
    }
    
    // Get all inputs
    const inputs = await page.$$('input');
    console.log(`\n📝 INPUTS (${inputs.length}):`);
    for (let i = 0; i < Math.min(inputs.length, 15); i++) {
      const type = await inputs[i].getAttribute('type') || '';
      const placeholder = await inputs[i].getAttribute('placeholder') || '';
      const id = await inputs[i].getAttribute('id') || '';
      const name = await inputs[i].getAttribute('name') || '';
      console.log(`  ${i+1}. Type: ${type}, Placeholder: "${placeholder}", ID: ${id}, Name: ${name}`);
    }
    
    // Get all select elements
    const selects = await page.$$('select');
    console.log(`\n📊 SELECTS (${selects.length}):`);
    for (let i = 0; i < selects.length; i++) {
      const id = await selects[i].getAttribute('id') || '';
      const name = await selects[i].getAttribute('name') || '';
      console.log(`  ${i+1}. ID: ${id}, Name: ${name}`);
    }
    
    // Get all links
    const links = await page.$$('a');
    console.log(`\n🔗 LINKS (${links.length}):`);
    for (let i = 0; i < Math.min(links.length, 10); i++) {
      const text = await links[i].textContent();
      const href = await links[i].getAttribute('href') || '';
      if (text.trim()) {
        console.log(`  ${i+1}. "${text.trim()}" -> ${href}`);
      }
    }
    
    // Get map-related elements
    console.log('\n🗺️  MAP ELEMENTS:');
    const mapContainer = await page.$('.leaflet-container');
    if (mapContainer) {
      console.log('  ✓ Leaflet map container found');
      
      // Look for zoom controls
      const zoomIn = await page.$('.leaflet-control-zoom-in');
      const zoomOut = await page.$('.leaflet-control-zoom-out');
      console.log(`  Zoom controls: In=${!!zoomIn}, Out=${!!zoomOut}`);
      
      // Look for markers
      const markers = await page.$$('.leaflet-marker-icon');
      console.log(`  Map markers: ${markers.length}`);
      
      // Look for marker panes
      const markerPane = await page.$('.leaflet-marker-pane');
      if (markerPane) {
        console.log('  ✓ Marker pane found');
      }
    } else {
      console.log('  ✗ No Leaflet map container found');
    }
    
    // Get filter elements
    console.log('\n🔍 FILTER ELEMENTS:');
    const filterToggle = await page.$('#b4-b1-FiltersContainer div.text-primary');
    if (filterToggle) {
      console.log('  ✓ Filter toggle found');
      
      // Click to open filters
      await filterToggle.click();
      await page.waitForTimeout(2000);
      
      // Get dropdowns
      const dropdowns = await page.$$('.dropdown-container input');
      console.log(`  Dropdown inputs: ${dropdowns.length}`);
      
      for (let i = 0; i < Math.min(dropdowns.length, 10); i++) {
        const placeholder = await dropdowns[i].getAttribute('placeholder') || '';
        const id = await dropdowns[i].getAttribute('id') || '';
        console.log(`    ${i+1}. "${placeholder}" (id: ${id})`);
      }
      
      // Look for active filters area
      const activeFilters = await page.$('.selected-filter-area');
      if (activeFilters) {
        console.log('  ✓ Active filters area found');
      }
    } else {
      console.log('  ✗ Filter toggle not found');
    }
    
    // Get result elements
    console.log('\n📊 RESULT ELEMENTS:');
    const resultText = await page.$('span.text-neutral-8:has-text("Ergebnisse")');
    if (resultText) {
      const text = await resultText.textContent();
      console.log(`  ✓ Result count: "${text}"`);
    }
    
    const listItems = await page.$$('div.list-item-mobile.map-list-item');
    console.log(`  List items: ${listItems.length}`);
    
    // Get any data attributes that might be useful
    console.log('\n🏷️  DATA ATTRIBUTES:');
    const dataElements = await page.$$('[data-block]');
    console.log(`  Data-block elements: ${dataElements.length}`);
    
    for (let i = 0; i < Math.min(dataElements.length, 5); i++) {
      const dataBlock = await dataElements[i].getAttribute('data-block') || '';
      const id = await dataElements[i].getAttribute('id') || '';
      console.log(`    ${i+1}. data-block="${dataBlock}" id="${id}"`);
    }
    
    // Get any role attributes
    const roleElements = await page.$$('[role]');
    console.log(`  Role elements: ${roleElements.length}`);
    
    // Get any aria attributes
    const ariaElements = await page.$$('[aria-label], [aria-expanded]');
    console.log(`  Aria elements: ${ariaElements.length}`);
    
    console.log('\n=== PAGE READY FOR TESTING ===');
    console.log('Keep browser open for 30 seconds to inspect manually...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
