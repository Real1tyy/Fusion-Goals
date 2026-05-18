---
sidebar_position: 98
---

# FAQ

## Getting Started

<details>
<summary>What is Fusion Goals?</summary>

Fusion Goals is an Obsidian plugin that automatically manages bidirectional property relationships (parent-child, related) and provides an interactive relationship graph to visualize and navigate your knowledge network. It helps you build goal hierarchies, track metrics, and explore connections across your vault.

</details>

<details>
<summary>Is it free?</summary>

Yes! Fusion Goals is completely free and open source under the AGPL-3.0 license. All features are available at no cost.

</details>

<details>
<summary>Does it work on mobile?</summary>

Fusion Goals is currently focused on desktop use. Mobile support is not guaranteed but may work with limitations. If you run into anything, please open a [GitHub issue](https://github.com/Real1tyy/Fusion-Goals/issues).

</details>

<details>
<summary>How do I get started after installing?</summary>

See the [Quick Start guide](/quickstart) for detailed instructions on configuring your directories, setting up relationships, and opening the graph view.

</details>

<details>
<summary>What's the difference between this and Obsidian's built-in graph?</summary>

Obsidian's graph shows backlinks between notes. Fusion Goals shows **frontmatter-based relationships** with automatic bidirectional sync, multiple view modes (hierarchical, related, all related), color rules, filtering, zoom previews, and metric tracking.

</details>

---

## Goals & Metrics

<details>
<summary>How do I create a goal hierarchy?</summary>

Set parent-child relationships in your note frontmatter. When you set a child in one file, the parent is automatically updated in the other. You can also use the "Create Child Node" or "Create Parent Node" commands from the command palette for instant node creation with bidirectional links.

</details>

<details>
<summary>Can I have multiple parents for a single goal?</summary>

By default, a file can have one parent. The plugin is designed for tree hierarchies (single parent). You can manually add multiple parents, but the graph will treat the first as primary.

</details>

<details>
<summary>How does metric tracking work?</summary>

Metric tracking lets you monitor quantitative data associated with your goals. Configure metric properties in your frontmatter, and Fusion Goals will display and aggregate them across your hierarchy. See [Metric Tracking](features/metric-tracking) for details.

</details>

<details>
<summary>How does bidirectional sync work?</summary>

When you set a relationship in one direction (e.g., add a child to a goal), Fusion Goals automatically updates the reverse relationship in the other file. This keeps your entire vault consistent without manual maintenance. See [Bidirectional Sync](features/bidirectional-sync) for details.

</details>

<details>
<summary>How do I break a relationship between goals?</summary>

You have two options:
1. Delete the relationship from one file's frontmatter -- the plugin automatically removes it from the other file
2. Right-click an edge in the graph and select "Remove Relationship"

</details>

<details>
<summary>Why use frontmatter relationships instead of backlinks?</summary>

Frontmatter relationships give you explicit structure (clear parent-child hierarchies), bidirectional sync (set once, updates both sides), typed relationships (distinguish parent, child, and related), and queryability (filter and search based on relationship properties).

</details>

---

## Graph Features

<details>
<summary>What view modes are available?</summary>

Fusion Goals provides four view modes:
- **Hierarchical** -- Parent-child tree structures
- **Related** -- Direct related connections
- **All Related** -- Entire constellations of related notes
- **Start from Current** -- Focus on the currently active file

See [Graph Views](features/graph-views) for details.

</details>

<details>
<summary>How do color rules work?</summary>

Color rules are evaluated top-to-bottom. The first JavaScript expression that evaluates to true sets the node color. For example, `Status === 'Active'` could map to green, while `type === 'project'` maps to blue. See [Color Rules](features/color-rules) for details.

</details>

<details>
<summary>How does filtering work?</summary>

You can filter graph nodes using JavaScript expressions based on frontmatter properties. Fusion Goals supports named filter presets for quick access, multi-expression AND logic, and persistent filters across sessions. See [Filtering](features/filtering) for details.

</details>

<details>
<summary>Can I customize the graph layout?</summary>

Layout is automatic, but you can manually drag nodes, switch between view modes for different layouts, use filtering to focus on subsets, and configure the animation duration. Node positions are not saved between sessions.

</details>

<details>
<summary>What is Zoom Mode?</summary>

Zoom Mode lets you click any node in the graph to see a detailed inline preview of the note's frontmatter and content, without leaving the graph view. You can toggle visibility of each section independently. See [Zoom Mode](features/zoom-mode) for details.

</details>

<details>
<summary>Can I save filter presets?</summary>

Yes! Use [Filter Presets](features/filtering#filter-presets) to save commonly-used filters with names for quick access from a dropdown selector.

</details>

---

## Performance

<details>
<summary>The graph is slow with many notes. How can I improve it?</summary>

1. Reduce recursion depth in settings (All Related Max Depth and Hierarchy Traversal Depth)
2. Limit directory scanning to only the folders you need
3. Disable animations by setting animation duration to 0ms
4. Use filtering to show only relevant nodes
5. Use "Start from Current" mode to focus on subtrees
6. Disable tooltips if you don't need them

See [Configuration](configuration#performance-tips) for more details.

</details>

<details>
<summary>How many notes can the plugin handle?</summary>

- **Small vaults** (under 500 notes): Excellent performance
- **Medium vaults** (500-2000 notes): Good performance with optimizations
- **Large vaults** (2000+ notes): May require performance tuning (reduce recursion depth, limit directory scanning, use filtering)

</details>

<details>
<summary>Does the plugin index my entire vault on startup?</summary>

Only files in your configured directories are indexed. Use specific directories instead of the wildcard (`*`) to limit scope and improve startup time.

</details>

---

## Support

<details>
<summary>How do I report a bug?</summary>

1. Check [GitHub Issues](https://github.com/Real1tyy/Fusion-Goals/issues) for existing reports
2. If no duplicate exists, open a new issue with steps to reproduce, expected vs actual behavior, Obsidian and plugin versions, and any console errors

</details>

<details>
<summary>How do I request a feature?</summary>

1. Check [GitHub Discussions](https://github.com/Real1tyy/Fusion-Goals/discussions) for existing requests
2. Open a new discussion describing your feature, use case, and benefit

</details>

<details>
<summary>How can I support the project?</summary>

- Star the repo on [GitHub](https://github.com/Real1tyy/Fusion-Goals)
- Subscribe to the [YouTube channel](https://www.youtube.com/@real1tyy)
- Share the plugin with others
- [Donate](https://matejvavroproductivity.com/support/) to support continued development
- Report bugs and improve documentation

</details>
