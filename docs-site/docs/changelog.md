---
sidebar_position: 101
---

# Changelog

All notable changes to Fusion Goals will be documented here.

## 1.1.0

:::tip Check out Prisma Calendar
The ultimate calendar plugin for Obsidian — now with AI chat (Claude & GPT), CalDAV sync, scriptable API, and more. [Learn more →](https://matejvavroproductivity.com/tools/prisma-calendar/)
:::

- **Customizable Header Actions**: The view header now shows Create Goal and Create Task action buttons. Right-click the gear icon to rename, reorder, hide, or change icons and colors for each action. State persists across sessions. [Learn more](features/header-actions)
- **Editable Tabs**: Right-click any tab to rename, reorder, or hide it. Click the gear icon on the tab bar to manage all tabs. Tab state persists across sessions. [Learn more](features/dashboard#editable-tabs)
- **Dashboard View**: New tabbed interface with a dashboard tab featuring interactive pie charts for status, priority, deadline, and progress distributions. Charts are swappable via a cell picker and layout state persists across sessions. [Learn more](features/dashboard)
- **Tabbed Navigation**: The main view now uses a multi-tab layout — Dashboard, Goals (sorted by name/status/priority/deadline), Tasks (sorted by name/goal/status/priority/deadline), and Graph. [Learn more](features/dashboard#tabs)
- **CRUD Modals**: Create and edit goals and tasks directly from modal dialogs with dropdowns for status and priority, date pickers, and progress input. [Learn more](features/crud-modals)
- **Priority & Progress Fields**: Goals and tasks now support `Priority` (Critical/High/Medium/Low) and `Progress` (0-100%) frontmatter properties with configurable property names. [Learn more](features/priority-progress)

## [1.0.0] - 2026-02-26

- **Multi-Row Layout Fix**: Fixed a bug where multi-row layout would initially position nodes correctly across multiple rows, then collapse them into a single row at the end of the animation. [Learn more](features/node-layout#multi-row-layout)
- **Metric Entry Descriptions**: Add an optional description to any metric entry — annotate entries with notes via the custom add input, inline edit, and see descriptions in the dashboard table and timeline tooltips. [Learn more](features/metric-tracking#custom-value-entry)
- **Templater Fix for Task Creation**: Templater templates now apply correctly when creating tasks from a goal via the "Create Task from Goal" command.
- **Metric Tracking**: Track metrics in goal files with a `fusion-goals` code fence — quick increment, custom value entry, and a timestamped dashboard table. [Learn more](features/metric-tracking)
- **Metric Statistics**: Dashboard now shows total, count, and velocity (7d/30d/365d) at a glance. [Learn more](features/metric-tracking#statistics)
- **Custom DateTime on Add**: The "Add Custom" input now includes a datetime picker so you can backdate or schedule entries. [Learn more](features/metric-tracking#custom-value-entry)
- **Inline Edit**: Edit any metric entry's value and date directly in the table. [Learn more](features/metric-tracking#inline-editing)
- **Inline Delete**: Remove entries with a single click from the dashboard table. [Learn more](features/metric-tracking#deleting-entries)
- **One-Entry-Per-Line JSON**: Metric data is now formatted with one entry per line for easier manual editing in source mode. [Learn more](features/metric-tracking#data-format)
- **Timeline View**: Visualize metric entries on an interactive timeline — zoom, pan, and see your progress over time. [Learn more](features/metric-tracking#timeline-view)

## Contributing

See [Contributing Guide](contributing) for how to suggest features, report bugs, or contribute code.

## Support

- **Issues**: [GitHub Issues](https://github.com/Real1tyy/Fusion-Goals/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Real1tyy/Fusion-Goals/discussions)
- **Support**: [Support My Work](https://matejvavroproductivity.com/support/)
