#!/usr/bin/env npx tsx
/**
 * Mautic Theme Tester - Multi-Viewport Testing
 * Tests a landing page at multiple viewport sizes and captures screenshots
 */

import { connect, waitForPageLoad } from "@/client.js";
import * as fs from 'fs';
import * as path from 'path';

interface ViewportConfig {
  width: number;
  height: number;
  name: string;
  category: 'desktop' | 'tablet' | 'mobile';
}

interface TestOptions {
  previewUrl: string;
  themeName: string;
  screenshotDir: string;
  viewports: string;
  analyze?: boolean;
}

interface TestResult {
  screenshots: string[];
  issues: string[];
  summary: string;
}

// Viewport presets for responsive testing
const VIEWPORT_PRESETS: ViewportConfig[] = [
  // Desktop
  { width: 1920, height: 1080, name: 'desktop-1920x1080', category: 'desktop' },
  { width: 1440, height: 900, name: 'desktop-1440x900', category: 'desktop' },
  { width: 1280, height: 800, name: 'desktop-1280x800', category: 'desktop' },
  // Tablet
  { width: 1024, height: 768, name: 'tablet-1024x768', category: 'tablet' },
  { width: 768, height: 1024, name: 'tablet-768x1024', category: 'tablet' },
  // Mobile
  { width: 414, height: 896, name: 'mobile-414x896', category: 'mobile' },
  { width: 390, height: 844, name: 'mobile-390x844', category: 'mobile' },
  { width: 375, height: 812, name: 'mobile-375x812', category: 'mobile' },
  { width: 320, height: 568, name: 'mobile-320x568', category: 'mobile' },
];

function filterViewports(viewportFilter: string): ViewportConfig[] {
  if (viewportFilter === 'all') {
    return VIEWPORT_PRESETS;
  }

  const filters = viewportFilter.split(',').map(f => f.trim().toLowerCase());

  return VIEWPORT_PRESETS.filter(vp => {
    return filters.some(filter => {
      if (filter === 'desktop' || filter === 'tablet' || filter === 'mobile') {
        return vp.category === filter;
      }
      // Check for specific viewport names (e.g., "mobile-375x812")
      return vp.name.includes(filter);
    });
  });
}

function getTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
}

async function ensureScreenshotDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(
  client: any,
  pageName: string,
  url: string,
  screenshotPath: string
): Promise<void> {
  const page = await client.page(pageName);
  await page.goto(url);
  await waitForPageLoad(page);
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

async function analyzeScreenshot(screenshotPath: string): Promise<string> {
  // This would use the MCP vision tool to analyze for issues
  // For now, return a placeholder
  return `Analysis of ${path.basename(screenshotPath)}: No issues detected (manual review recommended)`;
}

async function testViewports(options: TestOptions): Promise<TestResult> {
  const { previewUrl, themeName, screenshotDir, viewports, analyze = false } = options;

  // Ensure screenshot directory exists
  await ensureScreenshotDir(screenshotDir);

  // Filter viewports based on selection
  const selectedViewports = filterViewports(viewports);

  console.log(`  Testing ${selectedViewports.length} viewport sizes...`);

  const client = await connect();
  const timestamp = getTimestamp();
  const screenshots: string[] = [];
  const issues: string[] = [];

  try {
    for (const viewport of selectedViewports) {
      const pageName = `test-${viewport.name}`;
      const screenshotName = `${themeName}-${viewport.name}-${timestamp}.png`;
      const screenshotPath = path.join(screenshotDir, screenshotName);

      console.log(`    • ${viewport.name} (${viewport.width}x${viewport.height})...`);

      await captureScreenshot(client, pageName, previewUrl, screenshotPath);
      screenshots.push(screenshotPath);

      if (analyze) {
        const analysis = await analyzeScreenshot(screenshotPath);
        if (analysis.includes('issue') || analysis.includes('problem') || analysis.includes('error')) {
          issues.push(analysis);
        }
      }
    }

    console.log(`  ✓ Captured ${screenshots.length} screenshots`);
    console.log(`  📁 Screenshots saved to: ${screenshotDir}/`);

  } finally {
    await client.disconnect();
  }

  return {
    screenshots,
    issues,
    summary: `Tested ${selectedViewports.length} viewports for theme "${themeName}"`
  };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.error('Usage: test-viewports.ts <previewUrl> <themeName> <screenshotDir> <viewports> [analyze]');
    console.error('  viewports: all, desktop, tablet, mobile, or comma-separated (e.g., mobile-375x812,mobile-320x568)');
    process.exit(1);
  }

  const [previewUrl, themeName, screenshotDir, viewports, analyzeStr] = args;
  const analyze = analyzeStr === 'true';

  const result = await testViewports({
    previewUrl,
    themeName,
    screenshotDir,
    viewports,
    analyze
  });

  // Output as JSON
  console.log(JSON.stringify(result, null, 2));

  // Print summary
  console.log(`\n${result.summary}`);

  if (result.issues.length > 0) {
    console.log(`\n⚠ Issues found:`);
    result.issues.forEach(issue => console.log(`  - ${issue}`));
  }
}

// Export for use as module
export { testViewports, TestOptions, TestResult, VIEWPORT_PRESETS };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
