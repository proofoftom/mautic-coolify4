#!/usr/bin/env npx tsx
/**
 * Mautic Theme Tester - Create Test Page
 * Logs into Mautic and creates a landing page with the specified theme
 */

import { connect, waitForPageLoad } from "@/client.js";

interface CreatePageOptions {
  mauticUrl: string;
  username: string;
  password: string;
  themeName: string;
  pageTitle: string;
}

interface PageResult {
  pageId: string;
  previewUrl: string;
  editUrl: string;
  title: string;
}

async function createTestPage(options: CreatePageOptions): Promise<PageResult> {
  const { mauticUrl, username, password, themeName, pageTitle } = options;
  const client = await connect();

  try {
    console.log(`  Connecting to Mautic at ${mauticUrl}...`);

    // Create login page
    const page = await client.page("mautic-login");

    // Navigate to login or dashboard
    await page.goto(`${mauticUrl}/s/login`);
    await waitForPageLoad(page);

    // Check if already logged in by checking the current URL
    // If redirected to dashboard or already has a session, we're logged in
    const loginUrl = page.url();

    // If not on login page anymore (redirected to dashboard), we're already logged in
    if (!loginUrl.includes('/s/login')) {
      console.log(`  ✓ Already logged in (session active)`);
    } else {
      // Try to find the username input - if it exists, we need to login
      const hasUsernameInput = await page.locator('input[name="username"]').count() > 0;

      if (!hasUsernameInput) {
        console.log(`  ✓ Already logged in (session active)`);
      } else {
        // Fill in credentials and submit
        console.log(`  Logging in...`);
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await waitForPageLoad(page);
        console.log(`  ✓ Logged in as ${username}`);
      }
    }

    // Navigate to Landing Pages
    console.log(`  Navigating to Landing Pages...`);

    // Navigate directly to landing pages page
    await page.goto(`${mauticUrl}/s/pages`);
    await waitForPageLoad(page);

    console.log(`  ✓ Creating new landing page...`);

    // Navigate directly to new page URL
    await page.goto(`${mauticUrl}/s/pages/new`);
    await waitForPageLoad(page);

    // Wait for page load
    await page.waitForTimeout(1000);

    // Get snapshot to see the page structure
    const snapshot = await client.getAISnapshot("mautic-login");
    console.log(`  ✓ Page loaded, selecting theme "${themeName}"...`);

    // Find the theme card and click its Select button
    // The themes are displayed as cards with "Select" links
    const themeSnapshot = await client.getAISnapshot("mautic-login");

    // Look for the theme heading in the snapshot
    const themeLines = themeSnapshot.split('\n');
    let selectRef: string | null = null;

    for (const line of themeLines) {
      // Look for the theme name heading
      if (line.includes(`heading "${themeName}"`) || line.toLowerCase().includes(`"${themeName.toLowerCase()}"`)) {
        // Find the next "Select" link reference
        const lineIndex = themeSnapshot.split('\n').indexOf(line);
        for (let i = lineIndex; i < Math.min(lineIndex + 5, themeLines.length); i++) {
          const nextLine = themeLines[i];
          if (nextLine.includes('link "Select"') || nextLine.includes('link "Select"')) {
            const refMatch = nextLine.match(/\[ref=(e\d+)\]/);
            if (refMatch) {
              selectRef = refMatch[1];
              break;
            }
          }
        }
      }
      if (selectRef) break;
    }

    if (!selectRef) {
      // Fallback: try to find by clicking the theme text directly
      console.log(`  Trying alternative approach...`);
      // Find all links with "Select" text
      const selectLinks = await page.locator('a:has-text("Select")').all();
      for (const link of selectLinks) {
        const text = await link.textContent();
        if (text && text.toLowerCase().includes(themeName.toLowerCase())) {
          await link.click();
          await page.waitForTimeout(500);
          break;
        }
      }
    } else {
      const selectButton = await client.selectSnapshotRef("mautic-login", selectRef);
      await selectButton.click();
      await page.waitForTimeout(500);
    }

    console.log(`  ✓ Theme selected`);

    // Fill in the page title
    await page.fill('input[name="page[title]"]', pageTitle);

    // Click Save button
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Wait for redirect to the edit/view page
    await waitForPageLoad(page);

    // Extract page ID from URL
    const currentUrl = page.url();
    const pageIdMatch = currentUrl.match(/\/(?:edit|view)\/(\d+)/);

    if (!pageIdMatch) {
      throw new Error(`Could not extract page ID from URL: ${currentUrl}`);
    }

    const pageId = pageIdMatch[1];
    const previewUrl = `${mauticUrl}/page/preview/${pageId}`;
    const editUrl = `${mauticUrl}/s/pages/edit/${pageId}`;

    console.log(`  ✓ Created page "${pageTitle}" (ID: ${pageId})`);
    console.log(`  ✓ Preview URL: ${previewUrl}`);

    // Store page ID for cleanup
    await fs.promises.writeFile('/tmp/mautic-test-page-id.txt', pageId);

    return {
      pageId,
      previewUrl,
      editUrl,
      title: pageTitle
    };

  } catch (error) {
    console.error(`  ✗ Error creating page: ${error.message}`);
    throw error;
  } finally {
    await client.disconnect();
  }
}

function extractAvailableThemes(html: string): string {
  // Try to extract theme names from the page content
  const themeMatches = html.match(/([A-Z][a-zA-Z\s]+).*?Select/g) || [];
  return themeMatches.map(m => m.replace(/.*?Select/, '').trim()).slice(0, 5).join(', ');
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 5) {
    console.error('Usage: create-page.ts <mauticUrl> <username> <password> <themeName> <pageTitle>');
    process.exit(1);
  }

  const [mauticUrl, username, password, themeName, pageTitle] = args;

  const result = await createTestPage({
    mauticUrl,
    username,
    password,
    themeName,
    pageTitle
  });

  // Output as JSON for easy parsing
  console.log(JSON.stringify(result, null, 2));
}

// Export for use as module
export { createTestPage, CreatePageOptions, PageResult };

// Run if called directly
import * as fs from 'fs';
if (require.main === module) {
  main().catch(console.error);
}
