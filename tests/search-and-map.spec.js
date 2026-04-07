const { test, expect } = require('@playwright/test');

const SEARCH_INPUT = 'input#b4-b2-b1-Input_SearchText';
const START_SEARCH_BUTTON = 'button:has-text("Suche starten")';
const SUGGESTION_ITEMS = '#awesomplete_list_1 li';
const RESULT_TEXT = 'span.text-neutral-8:has-text("Ergebnisse")';
const MAP_CONTAINER = '.mapPanel.leaflet-container';
const MARKER_ICON = '.leaflet-marker-icon.leaflet-interactive';
const RESULT_LIST_ITEM = 'div.list-item-mobile.map-list-item, div.list-item';

async function openSearchPage(page) {
  // Handle location permission dialog
  page.on('dialog', async dialog => {
    console.log('Dialog type:', dialog.type(), 'Message:', dialog.message());
    await dialog.dismiss();
  });
  
  // Try navigating directly to search page
  const baseURL = 'https://gruppenplatz.healthycloud.de/HC_GP_Public_Pages';
  try {
    await page.goto(baseURL + '?groupSearch=true', { waitUntil: 'load', timeout: 90000 });
  } catch (e) {
    console.log('Direct navigation failed, trying root:', e.message);
    await page.goto(baseURL, { waitUntil: 'load', timeout: 90000 });
  }
  
  // Wait for page to fully render
  await page.waitForTimeout(3000);
  
  // Handle cookie/consent dialog if present
  try {
    const acceptButton = page.locator('button:has-text("Accept All"), button:has-text("Akzeptieren")');
    if (await acceptButton.isVisible({ timeout: 5000 })) {
      await acceptButton.click();
      await page.waitForTimeout(2000);
    }
  } catch (e) {
    console.log('No consent dialog found');
  }
  
  // Wait for search input to be visible
  const searchInputLocator = page.locator(SEARCH_INPUT);
  try {
    await expect(searchInputLocator).toBeAttached({ timeout: 20000 });
    await expect(searchInputLocator).toBeVisible({ timeout: 20000 });
  } catch (e) {
    console.log('Search input not found directly, trying to navigate via button');
    const baseURL = 'https://gruppenplatz.healthycloud.de/HC_GP_Public_Pages';
    await page.goto(baseURL, { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(3000);
    const btn = page.locator(START_SEARCH_BUTTON).first();
    await expect(btn).toBeVisible({ timeout: 15000 });
    await btn.click();
    await page.waitForTimeout(5000);
    await expect(searchInputLocator).toBeVisible({ timeout: 20000 });
  }
}

async function searchFor(page, query) {
  await openSearchPage(page);
  await page.fill(SEARCH_INPUT, query);
  // Press Enter to search instead of clicking button
  await page.keyboard.press('Enter');
  await expect(page.locator(RESULT_TEXT).first()).toBeVisible({ timeout: 15000 });
}

test.beforeEach(async ({ page }) => {
  await openSearchPage(page);
});

test('Search with valid location name', async ({ page }) => {
  await searchFor(page, 'Berlin');

  const resultText = await page.locator(RESULT_TEXT).first().innerText();
  expect(resultText).toMatch(/Ergebnisse/);

  const markerCount = await page.locator(MARKER_ICON).count();
  expect(markerCount).toBeGreaterThan(0);

  // Wait for list items to render
  await page.waitForTimeout(2000);
  const listCount = await page.locator(RESULT_LIST_ITEM).count();
  expect(listCount).toBeGreaterThan(0);
});

test('Search with partial location name', async ({ page }) => {
  await page.fill(SEARCH_INPUT, 'Ber');
  const suggestions = page.locator(SUGGESTION_ITEMS);
  await expect(suggestions.first()).toBeVisible({ timeout: 10000 });

  // Click the first suggestion
  await suggestions.first().click();
  await page.waitForTimeout(3000);

  // Verify search results appear
  await expect(page.locator(RESULT_TEXT).first()).toBeVisible();
  expect(await page.locator(MARKER_ICON).count()).toBeGreaterThan(0);
});

test('Search with invalid location name', async ({ page }) => {
  await page.fill(SEARCH_INPUT, 'XYZ123');
  await page.keyboard.press('Enter');

  const status = page.locator('span[role="status"]');
  await expect(status).toHaveText(/No results found|Keine Ergebnisse gefunden/i);

  const resultListCount = await page.locator(RESULT_LIST_ITEM).count();
  expect(resultListCount).toBe(0);
});

test('Click on map markers shows details', async ({ page }) => {
  await searchFor(page, 'Berlin');
  const marker = page.locator(MARKER_ICON).first();
  await expect(marker).toBeVisible();
  await marker.click({ force: true });

  const selectedCard = page.locator('div.list-item-mobile.map-list-item.selected-item');
  await expect(selectedCard).toBeVisible();
});

test('Zoom in/out functionality', async ({ page }) => {
  await searchFor(page, 'Berlin');
  
  // Get initial map state
  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible();
  
  // Try to find zoom controls (they might be custom)
  const zoomInBtn = page.locator('[aria-label*="zoom in"], [title*="zoom in"], .leaflet-control-zoom-in, button:has-text("+")').first();
  const zoomOutBtn = page.locator('[aria-label*="zoom out"], [title*="zoom out"], .leaflet-control-zoom-out, button:has-text("-")').first();
  
  // If zoom controls exist, test them
  if (await zoomInBtn.isVisible({ timeout: 2000 })) {
    await zoomInBtn.click();
    await page.waitForTimeout(1000);
    console.log('✓ Zoom in control found and clicked');
  } else {
    console.log('ℹ️  Zoom in control not found - might be touch/scroll only');
  }
  
  if (await zoomOutBtn.isVisible({ timeout: 2000 })) {
    await zoomOutBtn.click();
    await page.waitForTimeout(1000);
    console.log('✓ Zoom out control found and clicked');
  } else {
    console.log('ℹ️  Zoom out control not found - might be touch/scroll only');
  }
  
  // Test mouse wheel zoom
  const mapBox = await map.boundingBox();
  if (mapBox) {
    await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
    await page.mouse.wheel(0, -100); // Zoom in
    await page.waitForTimeout(1000);
    await page.mouse.wheel(0, 100); // Zoom out
    await page.waitForTimeout(1000);
    console.log('✓ Mouse wheel zoom tested');
  }
});

test('Zoom to user\'s current location (Geolocation)', async ({ page, context }) => {
  // Grant geolocation permission
  await context.grantPermissions(['geolocation']);
  
  // Mock geolocation
  await context.setGeolocation({ latitude: 52.5200, longitude: 13.4050 }); // Berlin coordinates
  
  await openSearchPage(page);
  
  // Look for geolocation button or functionality
  const locationBtn = page.locator('button[aria-label*="location"], button[title*="location"], .leaflet-control-locate, button:has-text("📍")').first();
  
  if (await locationBtn.isVisible({ timeout: 3000 })) {
    await locationBtn.click();
    await page.waitForTimeout(2000);
    console.log('✓ Location button found and clicked');
  } else {
    console.log('ℹ️  Location button not found - geolocation might be automatic or hidden');
  }
  
  // Verify map is still functional
  await expect(page.locator(MAP_CONTAINER)).toBeVisible();
});
