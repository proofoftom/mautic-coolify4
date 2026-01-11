# Mautic Patches

This directory contains patches to fix bugs in the upstream Mautic Docker image.

## GrapesJS Builder Head Content Duplication Fix

**Issue:** When using the "Edit Code" feature in the GrapesJS Builder and clicking save, the contents of the `<head>` tag were being duplicated into the top of the `<body>`.

**Root Cause:** GrapesJS's `setComponents()` method is designed for body content only. When given a full HTML document (with DOCTYPE, head, and body), it incorrectly parses head elements as body components.

**Fix:** Modified `codeEditor.js` and `storage.service.js` to:
1. Parse the HTML document before calling `setComponents()`
2. Extract only the body innerHTML to pass to GrapesJS
3. Preserve and update head changes in the original template textarea

**Files patched:**
- `plugins/GrapesJsBuilderBundle/Assets/library/js/dist/builder.js`
- `plugins/GrapesJsBuilderBundle/Assets/library/js/dist/builder.css`

**To rebuild from source:**
```bash
cd /path/to/mautic/plugins/GrapesJsBuilderBundle
npm install
npm run rebuild
```

**Source changes (for upstream PR):**
- `Assets/library/js/codeMode/codeEditor.js` - Extract body content before setComponents()
- `Assets/library/js/storage.service.js` - Same fix for storage restore functionality
