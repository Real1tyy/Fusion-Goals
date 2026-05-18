---
sidebar_position: 99
---

# Troubleshooting

Use this checklist to diagnose common issues. If your problem isn't listed here, please [open a GitHub issue](https://github.com/Real1tyy/Fusion-Goals/issues).

## Installation

<details>
<summary>Plugin won't enable</summary>

- **Check Obsidian version**: Must be 1.6.0 or higher (Help > About)
- **Verify installation files** exist in `<vault>/.obsidian/plugins/fusion-goals/`: `main.js`, `manifest.json`, `styles.css`
- **Check console for errors**: Press `Ctrl/Cmd+Shift+I` and look for error messages
- **Try reinstalling**: Disable the plugin, delete the plugin folder, and reinstall from Community Plugins

</details>

<details>
<summary>Commands not appearing in command palette</summary>

- Confirm the plugin is enabled in Settings > Community Plugins
- Some commands (like "Create Child Node") require an active markdown file in an indexed directory
- Try reloading the plugin (Settings > Community Plugins > Reload) or restarting Obsidian

</details>

<details>
<summary>Ribbon icon not showing</summary>

- Check that "Show ribbon icon" is enabled in Settings > Fusion Goals > User Interface
- A restart of Obsidian is required after changing this setting
- If too many plugins are installed, icons may be hidden -- use the command palette as an alternative

</details>

---

## Graph Not Showing

<details>
<summary>Graph is empty or only shows the source node</summary>

- **Check directory scanning**: Settings > Fusion Goals > Directory scanning -- ensure the current file's folder is included, or use `["*"]` to scan all directories
- **Check relationships exist**: Files must have `Parent`, `Child`, or `Related` properties in frontmatter
- **Check view mode**: Hierarchical mode requires parent-child relationships; Related mode requires related relationships -- try switching modes
- **Clear filters**: Active filters may be hiding all nodes
- **Run full rescan**: Settings > Fusion Goals > Indexing > "Rescan Everything"

</details>

<details>
<summary>Graph showing unexpected or missing nodes</summary>

- Check the current view mode (Hierarchical, Related, All Related, Start from Current) and switch to the appropriate one
- Toggle "Include All Related" in Hierarchical mode to add or remove related nodes
- Toggle "Start from Current" to switch between full hierarchy and current-file subtree
- Clear any active filters that may be hiding nodes
- Open files and verify frontmatter relationships, or use tooltips to check properties

</details>

<details>
<summary>Nodes overlapping or layout looks broken</summary>

- Switch view mode and back to refresh the layout
- Increase animation duration to 800ms if set too low (allows layout to settle)
- Use filters or "Start from Current" to reduce node count
- If persistent, [open an issue](https://github.com/Real1tyy/Fusion-Goals/issues) with a screenshot and approximate node count

</details>

---

## Relationship Sync Issues

<details>
<summary>Relationships not syncing between files</summary>

- **Check property names**: Settings > Fusion Goals > Direct relationship properties -- verify they match your frontmatter exactly (case-sensitive)
- **Check wiki link format**: Relationships must use `[[note name]]` format, not plain text or markdown links
- **Check directory scanning**: Both files must be in indexed directories
- **Ensure file is saved**: Close and reopen the file if needed
- **Run full rescan**: Settings > Indexing > "Rescan Everything"
- **Check console**: `Ctrl/Cmd+Shift+I` for sync errors

</details>

<details>
<summary>Orphaned relationships pointing to non-existent files</summary>

- Verify the target file wasn't deleted or renamed
- Check for typos in wiki link file names (case-sensitive)
- Run a full rescan to automatically clean up orphaned relationships
- Or manually remove the broken link from the file's frontmatter

</details>

<details>
<summary>Circular relationships (A is parent of B, B is parent of A)</summary>

The plugin should prevent this automatically. If it occurs:
1. Manually break one of the relationships in frontmatter
2. Run a full rescan
3. Report as a bug if the automatic prevention didn't work

</details>

<details>
<summary>Too many auto-linked siblings cluttering the graph</summary>

- Disable "Auto-link siblings" in Settings > Direct relationship properties
- Or keep it enabled but use filtering to reduce visible nodes

</details>

---

## Metric Tracking Issues

<details>
<summary>Metrics not displaying or aggregating correctly</summary>

- Verify the metric property exists in your file's frontmatter
- Check that the property name matches exactly (case-sensitive)
- Ensure metric values are numeric, not text strings
- Run a full rescan if metrics seem out of sync

</details>

---

## Color Rules & Filtering

<details>
<summary>Color rule not applying to nodes</summary>

- **Check expression syntax**: Must be valid JavaScript with quoted strings (e.g., `status === 'active'`, not `status === active`)
- **Check property exists**: Use tooltips to verify the property name and value on the node
- **Check rule is enabled**: The checkbox in Settings > Node colors must be checked
- **Check rule order**: First matching rule wins -- earlier rules may be matching instead. Reorder with the arrow buttons.
- **Check console**: `Ctrl/Cmd+Shift+I` -- invalid expressions are logged as errors

</details>

<details>
<summary>Filter not working or hiding all nodes</summary>

- Verify expression syntax (same rules as color expressions)
- Property names are case-sensitive and must match frontmatter exactly
- Press `Ctrl/Cmd+Enter` or click outside the input to apply the filter
- The source node always remains visible (by design)
- If all nodes disappear, the filter may be too restrictive or the property doesn't exist on any nodes -- try broadening the expression or adding an existence check: `typeof property !== 'undefined' && property === 'value'`

</details>

---

## Zoom Mode Issues

<details>
<summary>Clicking a node doesn't enter Zoom Mode</summary>

- Click the node shape itself, not the label text
- The file must exist (not a deleted or orphaned node)
- Try a different node to rule out a node-specific issue
- Close and reopen the graph view

</details>

<details>
<summary>Preview panel is blank or not showing</summary>

- Check that Zoom Preview Height is at least 120px in settings
- Check the eye icons in the preview header -- both frontmatter and content sections may be hidden
- Empty files produce an empty preview -- add content to see it
- Try toggling both visibility icons and reloading the graph

</details>

---

## Performance Issues

<details>
<summary>Plugin slow on startup</summary>

- Initial indexing can take time for large vaults (progress is logged to the console)
- Limit directory scanning to only the folders you need
- Disable other resource-intensive plugins temporarily to isolate the issue

</details>

<details>
<summary>Obsidian becomes sluggish or crashes</summary>

- Reduce visible node count with aggressive filtering
- Lower recursion depth settings
- Set animation duration to 0ms
- Restart Obsidian periodically to clear accumulated memory
- Consider splitting very large vaults

</details>

---

## Console Errors

<details>
<summary>How to check the developer console</summary>

1. Press `Ctrl/Cmd+Shift+I` to open the developer tools
2. Click the "Console" tab
3. Look for errors (red) or warnings (yellow) from Fusion Goals
4. Right-click an error and copy it to include in bug reports

</details>

<details>
<summary>Common error messages</summary>

- **"File not found"**: Orphaned relationship -- the target file was deleted or renamed. Run a full rescan to clean up.
- **"Invalid expression"**: A color rule or filter expression has a JavaScript syntax error. Check the expression in settings.
- **"Circular relationship detected"**: The system prevented a circular parent-child link. Choose a different parent or child.
- **"Property not found"**: The expected property doesn't exist in the file's frontmatter. Check spelling and add the property if needed.

</details>

---

## Still Having Issues?

1. Check the [FAQ](faq) for common questions
2. [Search existing issues](https://github.com/Real1tyy/Fusion-Goals/issues)
3. [Open a new issue](https://github.com/Real1tyy/Fusion-Goals/issues/new) with your Obsidian version, plugin version, steps to reproduce, expected vs actual behavior, console errors, and screenshots
