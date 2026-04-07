# Playwright Map/Search Automation Suite

This workspace contains a Playwright automation suite for the HealthyCloud Gruppenplatz public search page.

## Install

```bash
npm install
```

## Run Tests

### Run all tests
```bash
npm test
```

### Run tests for a specific file
```bash
npx playwright test tests/search-and-map.spec.js --project=chromium
npx playwright test tests/filters.spec.js --project=chromium
```

### Run a specific test by name
```bash
npx playwright test -g "Search with valid location name" --project=chromium
```

### Run tests in headless mode
```bash
npx playwright test --project=chromium
```

### Run tests with visible browser
Currently configured to run with `headless: false` for debugging. To run headless, update `playwright.config.js`.

## View Test Report

```bash
npx playwright show-report
```


## Features

- **Screenshots**: All test failure screenshots are saved to `/screenshots` folder
- **Video Recording**: Test videos are retained on failure in `test-results/`
- **Location & Cookie Handling**: Tests automatically handle browser permission dialogs and cookie consent popups
- **BaseURL**: Tests run against `https://gruppenplatz.healthycloud.de/HC_GP_Public_Pages`

