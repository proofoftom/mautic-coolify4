#!/usr/bin/env npx tsx
/**
 * Mautic Theme Tester - Main Runner
 * Orchestrates the complete testing workflow
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Load .env file from project root
function loadEnvFile(): void {
  const projectDir = path.resolve(__dirname, '../../../..');
  const envPath = path.join(projectDir, '.env');

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key] = value;
        }
      }
    });
  }
}

interface TestConfig {
  themeName: string;
  pageTitle?: string;
  viewports?: string;
  skipCleanup?: boolean;
  screenshotDir?: string;
  analyze?: boolean;
  mauticUrl?: string;
}

interface TestResult {
  success: boolean;
  pageId?: string;
  previewUrl?: string;
  screenshots: string[];
  issues: string[];
  summary: string;
}

// Paths
const SCRIPTS_DIR = __dirname;
const DEV_BROWSER_DIR = path.join(os.homedir(), '.claude/plugins/cache/dev-browser-marketplace/dev-browser/*/skills/dev-browser');

// Find the actual dev-browser directory (handles versioned paths)
function getDevBrowserDir(): string {
  const baseDir = path.join(os.homedir(), '.claude/plugins/cache/dev-browser-marketplace/dev-browser');

  // Find the versioned directory
  if (!fs.existsSync(baseDir)) {
    throw new Error('dev-browser not found. Please install the dev-browser skill.');
  }

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const versionDir = entries.find(e => e.isDirectory());

  if (!versionDir) {
    throw new Error('dev-browser version directory not found.');
  }

  return path.join(baseDir, versionDir.name, 'skills/dev-browser');
}

async function runScript(scriptName: string, args: string[]): string {
  let command: string;
  let cwd: string;

  // Use bash for .sh files
  if (scriptName.endsWith('.sh')) {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    command = `bash "${scriptPath}" ${args.join(' ')}`;
    cwd = SCRIPTS_DIR;
  } else {
    // TypeScript files need to run from dev-browser directory for @/ imports
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    const devBrowserDir = getDevBrowserDir();
    command = `npx tsx "${scriptPath}" ${args.join(' ')}`;
    cwd = devBrowserDir;
  }

  const output = execSync(command, {
    encoding: 'utf-8',
    cwd
  });
  return output;
}

async function testTheme(config: TestConfig): Promise<TestResult> {
  // Load .env file at the start
  loadEnvFile();

  console.log(`🧪 Testing Mautic theme: ${config.themeName}`);
  console.log('');

  const {
    themeName,
    pageTitle = `Test Page ${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
    viewports = 'all',
    skipCleanup = false,
    screenshotDir = 'mautic-test-screenshots',
    analyze = false,
    mauticUrl = 'http://localhost:8080'
  } = config;

  const screenshots: string[] = [];
  const issues: string[] = [];
  let pageId: string | undefined;
  let previewUrl: string | undefined;

  try {
    // Phase 1: Environment Setup
    console.log('Phase 1: Environment Setup');
    console.log('─'.repeat(50));
    await runScript('setup.sh', []);
    console.log('');

    // Load credentials from environment
    const username = process.env.MAUTIC_ADMIN_USERNAME || 'admin';
    const password = process.env.MAUTIC_ADMIN_PASSWORD || '';

    if (!password) {
      throw new Error('MAUTIC_ADMIN_PASSWORD not set. Please set it in .env file.');
    }

    // Phase 2: Create Test Page
    console.log('Phase 2: Create Test Page');
    console.log('─'.repeat(50));

    const createOutput = await runScript('create-page.ts', [
      mauticUrl,
      username,
      password,
      themeName,
      pageTitle
    ]);

    // Extract JSON from output (logs are mixed with JSON)
    const jsonMatch = createOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in create-page output');
    }
    const createResult = JSON.parse(jsonMatch[0]);
    pageId = createResult.pageId;
    previewUrl = createResult.previewUrl;

    console.log('');

    // Phase 3: Multi-Viewport Testing
    console.log('Phase 3: Multi-Viewport Testing');
    console.log('─'.repeat(50));

    const testOutput = await runScript('test-viewports.ts', [
      previewUrl!,
      themeName,
      screenshotDir,
      viewports,
      analyze.toString()
    ]);

    // Extract JSON from output (logs are mixed with JSON)
    const testJsonMatch = testOutput.match(/\{[\s\S]*\}/);
    if (!testJsonMatch) {
      throw new Error('No JSON found in test-viewports output');
    }
    const testResult = JSON.parse(testJsonMatch[0]);
    screenshots.push(...testResult.screenshots);
    issues.push(...testResult.issues);

    console.log('');

    // Phase 4: Cleanup
    console.log('Phase 4: Cleanup');
    console.log('─'.repeat(50));

    await runScript('cleanup.ts', [
      mauticUrl,
      pageId!,
      skipCleanup.toString()
    ]);

    console.log('');

    // Summary
    console.log('✓ Testing Complete!');
    console.log('');
    console.log('Summary:');
    console.log(`  Theme: ${themeName}`);
    console.log(`  Page ID: ${pageId}`);
    console.log(`  Screenshots: ${screenshots.length} captured`);
    console.log(`  Directory: ${screenshotDir}/`);

    if (issues.length > 0) {
      console.log('');
      console.log('⚠ Issues Found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

    if (skipCleanup) {
      console.log('');
      console.log('📝 Test page preserved (skip_cleanup=true)');
      console.log(`   Edit URL: ${mauticUrl}/s/pages/edit/${pageId}`);
    }

    return {
      success: true,
      pageId,
      previewUrl,
      screenshots,
      issues,
      summary: `Successfully tested theme "${themeName}" at ${screenshots.length} viewport sizes`
    };

  } catch (error) {
    console.error('');
    console.error(`✗ Testing failed: ${error.message}`);

    // Attempt cleanup even on failure
    if (pageId && !skipCleanup) {
      console.log('  Attempting cleanup...');
      try {
        await runScript('cleanup.ts', [mauticUrl, pageId, 'false']);
      } catch (cleanupError) {
        console.error(`  Cleanup also failed: ${cleanupError.message}`);
      }
    }

    return {
      success: false,
      screenshots,
      issues,
      summary: `Testing failed: ${error.message}`
    };
  }
}

// Parse command line arguments
function parseArgs(args: string[]): TestConfig {
  const config: TestConfig = {
    themeName: ''
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--theme':
      case '-t':
        config.themeName = args[++i];
        break;
      case '--title':
        config.pageTitle = args[++i];
        break;
      case '--viewports':
      case '-v':
        config.viewports = args[++i];
        break;
      case '--skip-cleanup':
      case '-s':
        config.skipCleanup = true;
        break;
      case '--screenshot-dir':
      case '-d':
        config.screenshotDir = args[++i];
        break;
      case '--analyze':
      case '-a':
        config.analyze = true;
        break;
      case '--mautic-url':
      case '-u':
        config.mauticUrl = args[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        if (!config.themeName) {
          config.themeName = arg;
        }
    }
  }

  return config;
}

function printHelp() {
  console.log(`
Mautic Theme Tester
===================

Usage: mautic-theme-tester [options] <theme_name>

Options:
  -t, --theme <name>        Theme to test (required)
  --title <title>           Custom page title (default: "Test Page [timestamp]")
  -v, --viewports <spec>    Viewports to test: all, desktop, tablet, mobile (default: all)
  -s, --skip-cleanup        Keep test page after debugging
  -d, --screenshot-dir <dir> Directory for screenshots (default: mautic-test-screenshots)
  -a, --analyze             Use AI to analyze screenshots for issues
  -u, --mautic-url <url>    Mautic instance URL (default: http://localhost:8080)
  -h, --help                Show this help message

Examples:
  mautic-theme-tester auto-contractor
  mautic-theme-tester -t blank -v mobile
  mautic-theme-tester -t auto-contractor -s -a
  `);
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const config = parseArgs(args);

  if (!config.themeName) {
    console.error('Error: Theme name is required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  const result = await testTheme(config);
  process.exit(result.success ? 0 : 1);
}

// Export for use as module
export { testTheme, TestConfig, TestResult };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
