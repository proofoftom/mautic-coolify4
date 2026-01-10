# Mautic Theme Tester

Automate testing and debugging of Mautic landing pages with custom themes using dev-browser. Use this skill when developing or debugging Mautic themes, creating test landing pages, or validating responsive designs across multiple viewports.

## Location

This is a project-specific skill located in the repository at:

```
scripts/mautic-theme-tester/
```

## Execution

When this skill is invoked, execute from the project root:

```bash
cd /Users/proofoftom/Code/mautic-coolify42 && npx tsx scripts/mautic-theme-tester/run.ts --theme "{theme_name}" {additional_args}
```

Where `{theme_name}` is the required theme name and `{additional_args}` can include:

- `--viewports all|desktop|tablet|mobile` (default: all)
- `--skip-cleanup` to preserve test page
- `--analyze` to use AI analysis on screenshots
- `--screenshot-dir <path>` for custom screenshot directory
- `--title "<custom title>"` for page title

## Usage

```
User: "Test the auto-contractor theme"
User: "Test the blank theme with mobile viewports only"
User: "Create a test page with auto-contractor theme but don't delete it"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `theme_name` | string | Yes | - | Name of the theme to test (e.g., "auto-contractor", "blank") |
| `page_title` | string | No | "Test Page [timestamp]" | Custom title for the test page |
| `viewports` | string | No | "all" | Viewports to test: "all", "desktop", "tablet", "mobile", or comma-separated |
| `skip_cleanup` | boolean | No | false | Keep the test page after debugging |
| `screenshot_dir` | string | No | "mautic-test-screenshots" | Directory for screenshots |
| `analyze` | boolean | No | false | Use AI to analyze screenshots for issues |
| `mautic_url` | string | No | From .env or http://localhost:8080 | Mautic instance URL |

## How It Works

### Phase 1: Environment Setup
1. Verifies Docker Compose environment is running
2. Loads admin credentials from `.env` file
3. Starts dev-browser server if needed

### Phase 2: Create Test Page
1. Logs into Mautic using dev-browser
2. Navigates to Components > Landing Pages > New
3. Selects the specified theme
4. Creates page with test title
5. Extracts page ID and preview URL

### Phase 3: Multi-Viewport Testing
Tests the landing page at responsive breakpoints:
- **Desktop**: 1920x1080, 1440x900, 1280x800
- **Tablet**: 1024x768, 768x1024
- **Mobile**: 414x896, 390x844, 375x812, 320x568

Captures screenshots for each viewport size.

### Phase 4: Cleanup
- Deletes the test page (unless `skip_cleanup=true`)
- Disconnects dev-browser
- Generates summary report

## Important: Template Baking

**Mautic "bakes" HTML into pages when created.** Template changes only affect NEW pages.

This means:
- After modifying theme HTML/CSS, you must create a NEW test page
- Simply refreshing an existing page won't show template changes
- This skill automates the "delete old, create new" workflow

## Available Themes

Themes are located in `themes/` directory. Current themes:
- `auto-contractor` - Professional landing page for contractors
- `blank` - Blank theme for custom development

## Example Output

```
✓ Environment ready: Docker running, dev-browser connected
✓ Logged into Mautic as admin
✓ Created test page "Test Page 2025-01-10-14-30" (ID: 5)
✓ Theme: auto-contractor
✓ Testing 9 viewport sizes...

Screenshots saved to: mautic-test-screenshots/
  - auto-contractor-desktop-1920x1080-20250110-143022.png
  - auto-contractor-desktop-1440x900-20250110-143025.png
  - auto-contractor-desktop-1280x800-20250110-143027.png
  - auto-contractor-tablet-1024x768-20250110-143029.png
  - auto-contractor-tablet-768x1024-20250110-143032.png
  - auto-contractor-mobile-414x896-20250110-143034.png
  - auto-contractor-mobile-390x844-20250110-143036.png
  - auto-contractor-mobile-375x812-20250110-143038.png
  - auto-contractor-mobile-320x568-20250110-143040.png

✓ Test page deleted
✓ Cleanup complete
```

## Error Handling

The skill handles common errors:
- Docker not running → Provides command to start it
- Mautic not accessible → Checks container health
- Theme not found → Lists available themes
- Login failed → Verifies credentials
- Page creation failed → Reports specific error

## Files

- **SKILL.md** - This file
- **scripts/setup.sh** - Environment setup
- **scripts/create-page.sh** - Create test landing page
- **scripts/test-viewports.sh** - Multi-viewport testing
- **scripts/cleanup.sh** - Delete test page
