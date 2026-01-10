#!/usr/bin/env npx tsx
/**
 * Mautic Theme Tester - Cleanup
 * Deletes the test page and disconnects dev-browser
 */

import { connect, waitForPageLoad } from "@/client.js";
import * as fs from 'fs';

interface CleanupOptions {
  mauticUrl: string;
  pageId?: string;
  skipCleanup?: boolean;
}

async function cleanup(options: CleanupOptions): Promise<{ deleted: boolean; pageId?: string }> {
  const { mauticUrl, pageId, skipCleanup = false } = options;

  if (skipCleanup) {
    console.log(`  ⏭ Skipping cleanup (test page preserved)`);
    if (pageId) {
      console.log(`  📝 Test page ID: ${pageId}`);
    }
    return { deleted: false, pageId };
  }

  // Try to read page ID from temp file if not provided
  let targetPageId = pageId;
  if (!targetPageId) {
    try {
      targetPageId = fs.readFileSync('/tmp/mautic-test-page-id.txt', 'utf-8').trim();
    } catch (error) {
      console.log(`  ⚠ No page ID found, nothing to cleanup`);
      return { deleted: false };
    }
  }

  const client = await connect();

  try {
    console.log(`  Deleting test page (ID: ${targetPageId})...`);

    const page = await client.page("mautic-cleanup");

    // Navigate to landing pages list
    await page.goto(`${mauticUrl}/s/pages`);
    await waitForPageLoad(page);

    // Find the row for our page ID and click its Options button
    // We need to find the row that contains the page ID
    const pageContent = await page.content();
    const pageIdPattern = new RegExp(`\\b${targetPageId}\\b`);

    if (!pageIdPattern.test(pageContent)) {
      console.log(`  ⚠ Page ID ${targetPageId} not found in list (may already be deleted)`);
      return { deleted: false, pageId: targetPageId };
    }

    // Click the Options button for the page with our ID
    // The Options button is in the same row as the page ID
    // We'll use ARIA snapshot to find it
    const snapshot = await client.getAISnapshot("mautic-cleanup");

    // Look for a reference that includes our page ID in the row
    const snapshotLines = snapshot.split('\n');
    let optionsRef: string | null = null;

    for (const line of snapshotLines) {
      if (line.includes(`"${targetPageId}"`) || line.includes(`ID: ${targetPageId}`)) {
        // Find the nearest Options button reference
        const match = line.match(/\[ref=(e\d+)\]/);
        if (match) {
          // Look for the options button in the same row
          // We need to search backwards for the Options button
          const rowIndex = snapshotLines.indexOf(line);
          for (let i = rowIndex; i >= Math.max(0, rowIndex - 10); i--) {
            if (snapshotLines[i].includes('button "Options"')) {
              const refMatch = snapshotLines[i].match(/\[ref=(e\d+)\]/);
              if (refMatch) {
                optionsRef = refMatch[1];
                break;
              }
            }
          }
        }
        if (optionsRef) break;
      }
    }

    if (!optionsRef) {
      throw new Error(`Could not find Options button for page ${targetPageId}`);
    }

    const optionsButton = await client.selectSnapshotRef("mautic-cleanup", optionsRef);
    await optionsButton.click();
    await page.waitForTimeout(500);

    // Click Delete in the dropdown
    const deleteSnapshot = await client.getAISnapshot("mautic-cleanup");
    const deleteRef = deleteSnapshot.match(/link \[ref=(e\d+)\][^]*Delete/)?.[1];

    if (!deleteRef) {
      throw new Error(`Could not find Delete option in dropdown`);
    }

    const deleteLink = await client.selectSnapshotRef("mautic-cleanup", deleteRef);
    await deleteLink.click();
    await page.waitForTimeout(500);

    // Confirm deletion
    const confirmSnapshot = await client.getAISnapshot("mautic-cleanup");
    const confirmRef = confirmSnapshot.match(/button "Delete" \[ref=(e\d+)\]/)?.[1];

    if (!confirmRef) {
      throw new Error(`Could not find confirm Delete button`);
    }

    const confirmButton = await client.selectSnapshotRef("mautic-cleanup", confirmRef);
    await confirmButton.click();
    await waitForPageLoad(page);

    // Clean up temp file
    try {
      fs.unlinkSync('/tmp/mautic-test-page-id.txt');
    } catch (error) {
      // Ignore if file doesn't exist
    }

    console.log(`  ✓ Test page deleted`);
    return { deleted: true, pageId: targetPageId };

  } catch (error) {
    console.error(`  ✗ Error during cleanup: ${error.message}`);
    return { deleted: false, pageId: targetPageId };
  } finally {
    await client.disconnect();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: cleanup.ts <mauticUrl> [pageId] [skipCleanup]');
    console.error('  skipCleanup: Set to "true" to preserve the test page');
    process.exit(1);
  }

  const [mauticUrl, pageId, skipCleanupStr] = args;
  const skipCleanup = skipCleanupStr === 'true';

  const result = await cleanup({
    mauticUrl,
    pageId,
    skipCleanup
  });

  console.log(JSON.stringify(result, null, 2));
}

// Export for use as module
export { cleanup, CleanupOptions };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
