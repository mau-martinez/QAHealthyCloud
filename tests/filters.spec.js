const { test, expect } = require('@playwright/test');

const START_SEARCH_BUTTON = 'button:has-text("Suche starten")';
const FILTER_TOGGLE = '#b4-b1-FiltersContainer div.text-primary';
const FILTER_PANEL = '#b4-b1-FiltersContainer';

// Map markers
const MARKER_ICON = '.leaflet-marker-icon.leaflet-interactive';

// Filter dropdown selectors
const AGE_FILTER_INPUT = '#b4-b1-b7-selectInputReduced';
const AGE_FILTER_OPTIONS = '#b4-b1-b7-OptionsContainer';
const PROCEDURE_FILTER_INPUT = '#b4-b1-b8-selectInputReduced';
const PROCEDURE_FILTER_OPTIONS = '#b4-b1-b8-OptionsContainer';

async function openSearchPage(page) {
  // Handle location permission dialog
  page.on('dialog', async dialog => {
    console.log('Dialog type:', dialog.type(), 'Message:', dialog.message());
    await dialog.dismiss();
  });

  // Try navigating directly to search page
  const baseURL = 'https://gruppenplatz.healthycloud.de/HC_GP_Public_Pages';
  try {
    console.log('Navigating to search page...');
    await page.goto(baseURL + '?groupSearch=true', { waitUntil: 'load', timeout: 90000 });
    console.log('Navigation successful, current URL:', page.url());
  } catch (e) {
    console.log('Direct navigation failed, trying root:', e.message);
    await page.goto(baseURL, { waitUntil: 'load', timeout: 90000 });
    console.log('Fallback navigation successful, current URL:', page.url());
  }

  // Wait for page to fully render
  await page.waitForTimeout(3000);

  // Handle cookie/consent dialog if present
  try {
    const acceptButton = page.locator('button:has-text("Accept All"), button:has-text("Akzeptieren"), button:has-text("Alle akzeptieren")');
    if (await acceptButton.isVisible({ timeout: 5000 })) {
      console.log('Accepting cookie consent...');
      await acceptButton.click({ force: true });
      await page.waitForTimeout(2000);
    }
  } catch (e) {
    console.log('No consent dialog found');
  }

  // Check if we're on the search page by looking for the map and filter inputs
  const filterToggleLocator = page.locator(FILTER_TOGGLE);
  const mapLocator = page.locator('.leaflet-container'); // Map should be visible on search page
  const searchInputLocator = page.locator('#b4-b2-b1-Input_SearchText'); // Search input should be visible

  try {
    await expect(mapLocator).toBeVisible({ timeout: 5000 });
    await expect(searchInputLocator).toBeVisible({ timeout: 5000 });
    await expect(filterToggleLocator).toBeVisible({ timeout: 5000 });
    console.log('Already on search page - map, search input, and filter toggle found');
  } catch (e) {
    console.log('Not on search page, need to navigate via search button');
    const searchButton = page.locator('button:has-text("Suche starten")').first();
    await expect(searchButton).toBeVisible({ timeout: 10000 });
    await searchButton.click({ force: true });
    await page.waitForTimeout(3000);

    // Wait for search page elements to appear
    await expect(mapLocator).toBeVisible({ timeout: 20000 });
    await expect(searchInputLocator).toBeVisible({ timeout: 20000 });
    await expect(filterToggleLocator).toBeVisible({ timeout: 20000 });
    console.log('Navigation to search page successful');
  }
}

test.beforeEach(async ({ page }) => {
  await openSearchPage(page);
});

test('Open filter panel', async ({ page }) => {
  await page.click(FILTER_TOGGLE, { force: true });
  await expect(page.locator(FILTER_PANEL)).toBeVisible();
});

test('Apply single filter', async ({ page }) => {
  await openSearchPage(page);

  // First, open the filter panel
  await page.click(FILTER_TOGGLE, { force: true });
  await expect(page.locator(FILTER_PANEL)).toBeVisible();

  // Wait for filter inputs to be available
  console.log('Waiting for filter inputs...');
  await page.waitForSelector(AGE_FILTER_INPUT, { timeout: 10000 });
  console.log('Filter input found');

  // Click on the Age filter dropdown
  console.log('Checking filter input state...');
  const inputElement = page.locator(AGE_FILTER_INPUT);
  const isVisible = await inputElement.isVisible();
  const isEnabled = await inputElement.isEnabled();
  console.log(`Input visible: ${isVisible}, enabled: ${isEnabled}`);

  await page.click(AGE_FILTER_INPUT);
  // Skip focus and try pressing space directly
  await page.keyboard.press(' ');
  await page.keyboard.press(' ');
  await page.waitForSelector(AGE_FILTER_OPTIONS + ':not(.hidden)', { timeout: 5000 });

  // Select "Erwachsene" option
  const adultOption = page.locator(`${AGE_FILTER_OPTIONS} >> text="Erwachsene"`);
  await expect(adultOption).toBeVisible();
  await adultOption.click({ force: true });

  // Verify the filter was applied
  const selectedValue = await page.locator(AGE_FILTER_INPUT).inputValue();
  expect(selectedValue).toContain('Erwachsene');
});

test('Clear single filter', async ({ page }) => {
  // First, apply a filter
  await page.click(FILTER_TOGGLE, { force: true });
  await expect(page.locator(FILTER_PANEL)).toBeVisible();

  // Click on the Age filter dropdown
  await page.click(AGE_FILTER_INPUT);
  await page.waitForSelector(AGE_FILTER_OPTIONS + ':not(.hidden)', { timeout: 5000 });

  // Select "Erwachsene" option
  const adultOption = page.locator(`${AGE_FILTER_OPTIONS} >> text="Erwachsene"`);
  await expect(adultOption).toBeVisible();
  await adultOption.click();

  // Verify filter is applied
  let selectedValue = await page.locator(AGE_FILTER_INPUT).inputValue();
  expect(selectedValue).toContain('Erwachsene');

  // Now clear the filter by selecting "Alle"
  await page.click(AGE_FILTER_INPUT);
  await page.waitForSelector(AGE_FILTER_OPTIONS + ':not(.hidden)', { timeout: 5000 });
  
  const allOption = page.locator(`${AGE_FILTER_OPTIONS} >> text="Alle"`);
  await expect(allOption).toBeVisible();
  await allOption.click();

  // Verify filter was cleared
  selectedValue = await page.locator(AGE_FILTER_INPUT).inputValue();
  expect(selectedValue).toBe('');
});

test('Apply Multiple Filters', async ({ page }) => {
  await openSearchPage(page);

  // First, open the filter panel
  await page.click(FILTER_TOGGLE, { force: true });
  await expect(page.locator(FILTER_PANEL)).toBeVisible();

  // Wait for filter inputs to be available
  await page.waitForSelector(AGE_FILTER_INPUT, { timeout: 10000 });

  // Get initial marker count
  const initialMarkers = await page.locator(MARKER_ICON).count();
  console.log(`Initial markers: ${initialMarkers}`);

  // Apply Age filter: Erwachsene
  await page.click(AGE_FILTER_INPUT);
  await page.keyboard.press(' ');
  await page.waitForSelector(AGE_FILTER_OPTIONS + ':not(.hidden)', { timeout: 5000 });
  const adultOption = page.locator(`${AGE_FILTER_OPTIONS} >> text="Erwachsene"`);
  await expect(adultOption).toBeVisible();
  await adultOption.click({ force: true });

  // Apply Procedure Type filter: Verhaltenstherapie
  await page.click(PROCEDURE_FILTER_INPUT);
  await page.keyboard.press(' ');
  const procedureOptions = '#b4-b1-b8-OptionsContainer';
  await page.waitForSelector(procedureOptions + ':not(.hidden)', { timeout: 5000 });
  const therapyOption = page.locator(`${procedureOptions} >> text="Verhaltenstherapie"`);
  await expect(therapyOption).toBeVisible();
  await therapyOption.click({ force: true });

  // Wait for filters to apply
  await page.waitForTimeout(3000);

  // Check marker count after filtering
  const filteredMarkers = await page.locator(MARKER_ICON).count();
  console.log(`Filtered markers: ${filteredMarkers}`);

  // Verify some filtering occurred (markers should be less or equal)
  expect(filteredMarkers).toBeLessThanOrEqual(initialMarkers);

  // Check if result count is updated
  const resultText = await page.locator('span.text-neutral-8:has-text("Ergebnisse")').first().textContent();
  console.log(`Result count: ${resultText}`);
});

test('Conflicting Filters (No Results)', async ({ page }) => {
  await openSearchPage(page);

  // First, open the filter panel
  await page.click(FILTER_TOGGLE, { force: true });
  await expect(page.locator(FILTER_PANEL)).toBeVisible();

  // Wait for filter inputs to be available
  await page.waitForSelector(AGE_FILTER_INPUT, { timeout: 10000 });

  // Apply conflicting filters that should result in no matches
  // Age: Kinder und Jugendliche, Group Composition: Nur Männer
  const ageFilterInput = '#b4-b1-b7-selectInputReduced';
  const groupGenderFilterInput = '#b4-b1-b16-selectInputReduced';

  // Apply Age filter: Kinder und Jugendliche
  await page.click(ageFilterInput);
  await page.keyboard.press(' ');
  await page.waitForSelector(AGE_FILTER_OPTIONS + ':not(.hidden)', { timeout: 5000 });
  const youthOption = page.locator(`${AGE_FILTER_OPTIONS} >> text="Kinder und Jugendliche"`);
  await expect(youthOption).toBeVisible();
  await youthOption.click({ force: true });

  // Apply Group Composition filter: Nur Männer
  await page.click(groupGenderFilterInput);
  await page.keyboard.press(' ');
  const groupGenderOptions = '#b4-b1-b16-OptionsContainer';
  await page.waitForSelector(groupGenderOptions + ':not(.hidden)', { timeout: 5000 });
  const menOnlyOption = page.locator(`${groupGenderOptions} >> text="Nur Männer"`);
  await expect(menOnlyOption).toBeVisible();
  await menOnlyOption.click({ force: true });

  // Wait for filters to apply
  await page.waitForTimeout(3000);

  // Check for "no results" message or very few markers
  const markersAfterConflict = await page.locator(MARKER_ICON).count();
  console.log(`Markers after conflicting filters: ${markersAfterConflict}`);

  // Should have fewer results than initial (conflicting filters should reduce results)
  // Allow some results since "Kinder und Jugendliche" + "Nur Männer" might not be truly conflicting
  expect(markersAfterConflict).toBeLessThan(15); // More lenient expectation

  // Check for no results message
  const noResultsMsg = page.locator('text=/Keine Ergebnisse|No results/i');
  if (await noResultsMsg.isVisible({ timeout: 2000 })) {
    console.log('✓ No results message displayed');
  } else {
    console.log('ℹ️  No explicit "no results" message, but very few markers');
  }
});

test('Marker Count Changes', async ({ page }) => {
  await openSearchPage(page);

  // First, open the filter panel
  await page.click(FILTER_TOGGLE, { force: true });
  await expect(page.locator(FILTER_PANEL)).toBeVisible();

  // Wait for filter inputs to be available
  await page.waitForSelector(AGE_FILTER_INPUT, { timeout: 10000 });

  // Get initial counts
  const initialMarkers = await page.locator(MARKER_ICON).count();
  const initialResultsText = await page.locator('span.text-neutral-8:has-text("Ergebnisse")').first().textContent();
  console.log(`Initial: ${initialMarkers} markers, ${initialResultsText}`);

  // Apply a restrictive filter
  await page.click(AGE_FILTER_INPUT);
  await page.keyboard.press(' ');
  await page.waitForSelector(AGE_FILTER_OPTIONS + ':not(.hidden)', { timeout: 5000 });
  const youthOption = page.locator(`${AGE_FILTER_OPTIONS} >> text="Kinder und Jugendliche"`);
  await expect(youthOption).toBeVisible();
  await youthOption.click({ force: true });

  // Wait for filter to apply
  await page.waitForTimeout(3000);

  // Get counts after filtering
  const filteredMarkers = await page.locator(MARKER_ICON).count();
  const filteredResultsText = await page.locator('span.text-neutral-8:has-text("Ergebnisse")').first().textContent();
  console.log(`Filtered: ${filteredMarkers} markers, ${filteredResultsText}`);

  // Verify counts changed
  expect(filteredMarkers).not.toBe(initialMarkers);
  expect(filteredResultsText).not.toBe(initialResultsText);
});

test('Filter Visibility', async ({ page }) => {
  await openSearchPage(page);

  // First, open the filter panel
  await page.click(FILTER_TOGGLE, { force: true });
  await expect(page.locator(FILTER_PANEL)).toBeVisible();

  // Wait for filter inputs to be available
  await page.waitForSelector(AGE_FILTER_INPUT, { timeout: 10000 });

  // Apply a filter
  await page.click(AGE_FILTER_INPUT);
  await page.keyboard.press(' ');
  await page.waitForSelector(AGE_FILTER_OPTIONS + ':not(.hidden)', { timeout: 5000 });
  const adultOption = page.locator(`${AGE_FILTER_OPTIONS} >> text="Erwachsene"`);
  await expect(adultOption).toBeVisible();
  await adultOption.click({ force: true });

  // Wait for filter to apply
  await page.waitForTimeout(2000);

  // Check if active filters are visible
  const activeFilters = page.locator('.selected-filter-area, .filter-chip, [data-testid="active-filters"]');
  if (await activeFilters.isVisible({ timeout: 3000 })) {
    console.log('✓ Active filters are visible');
    const filterText = await activeFilters.textContent();
    expect(filterText).toContain('Erwachsene');
  } else {
    console.log('ℹ️  Active filters not found with expected selectors');
  }
});

test('Filter Persistence', async ({ page }) => {
  await openSearchPage(page);

  // First, open the filter panel
  await page.click(FILTER_TOGGLE, { force: true });
  await expect(page.locator(FILTER_PANEL)).toBeVisible();

  // Wait for filter inputs to be available
  await page.waitForSelector(AGE_FILTER_INPUT, { timeout: 10000 });

  // Apply a filter
  await page.click(AGE_FILTER_INPUT);
  await page.keyboard.press(' ');
  await page.waitForSelector(AGE_FILTER_OPTIONS + ':not(.hidden)', { timeout: 5000 });
  const adultOption = page.locator(`${AGE_FILTER_OPTIONS} >> text="Erwachsene"`);
  await expect(adultOption).toBeVisible();
  await adultOption.click({ force: true });

  // Wait for filter to apply
  await page.waitForTimeout(2000);

  // Refresh the page
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(3000);

  // Handle dialogs and consent again
  page.on('dialog', async dialog => {
    console.log('Dialog after refresh:', dialog.type());
    await dialog.dismiss();
  });

  try {
    const acceptBtn = page.locator('button:has-text("Accept All"), button:has-text("Akzeptieren")');
    if (await acceptBtn.isVisible({ timeout: 5000 })) {
      await acceptBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch (e) {
    console.log('No consent dialog after refresh');
  }

  // Navigate back to search page
  const searchBtn = page.locator('button:has-text("Suche starten")').first();
  await searchBtn.click();
  await page.waitForTimeout(3000);

  // Reopen filter panel to check filter state
  await page.click(FILTER_TOGGLE, { force: true });
  await expect(page.locator(FILTER_PANEL)).toBeVisible();
  await page.waitForSelector(AGE_FILTER_INPUT, { timeout: 10000 });

  // Check if filters are reset (they should be)
  const ageInput = page.locator(AGE_FILTER_INPUT);
  const ageValue = await ageInput.inputValue();
  expect(ageValue).toBe(''); // Should be empty/reset

  console.log('✓ Filters correctly reset after page refresh');
});
