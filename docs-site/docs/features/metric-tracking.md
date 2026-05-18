---
sidebar_position: 14
---

# Metric Tracking

Track progress on your goals with a built-in counter system. Each goal file gets a `fusion-goals` code fence that stores timestamped metric entries and renders an interactive dashboard with statistics, inline editing, and more.

## How It Works

When you open a goal file (any file inside your configured Goals directory), a `fusion-goals` code fence is automatically inserted after the frontmatter. This code fence stores your metric entries as JSON and renders a statistics header, action buttons, and a history table.

## Statistics

At the top of the dashboard, a statistics row shows key metrics at a glance:

- **Total** — sum of all recorded values
- **Count** — number of entries
- **7d / 30d / 365d** — sum of values recorded in the past 7 days, 30 days, and 365 days

Statistics update automatically whenever entries are added, edited, or deleted.

## Quick Increment

Click the **Quick +1** button to instantly record a new entry with a value of 1 and the current timestamp. This is useful for simple counting — habits completed, reps done, items checked off.

## Custom Value Entry

Click **Add Custom** to reveal an input row with a value field, a datetime picker, and an optional description field. The datetime defaults to the current time but can be adjusted before adding. Use the description field to annotate entries with notes (e.g. "Morning run", "Personal best"). Press **Enter** or click **Add** to record the entry. Press **Escape** to cancel.

## Dashboard Table

Below the buttons, a table displays all recorded entries sorted newest-first. Each row shows the date/time, the value recorded, a description snippet (if any), and action buttons. Long descriptions are truncated — click the **View** button to read the full text in a modal.

## Inline Editing

Click the **Edit** button on any row to switch it into edit mode. The date, value, and description cells become editable inputs. Press **Enter** or click the checkmark to save changes, or press **Escape** to cancel.

## Deleting Entries

Click the **✕** button on any row to delete that entry. The entry is removed immediately — if you accidentally delete an entry, you can recover it from the JSON in source mode.

## Timeline View

Click the **Timeline** button (visible when you have at least one entry) to open a full-screen modal with an interactive timeline visualization. Each metric entry is plotted as a point on the timeline, labeled with its value. Hover over a point to see the full date, value, and description (if set).

The timeline supports zooming and panning — scroll to zoom in/out, and drag to navigate. A red line marks the current time.

## Data Format

Entries are stored as JSON inside the code fence, with one entry per line for easy manual editing:

```
[
  {"timestamp":"2026-02-25T14:30:00.000Z","value":1},
  {"timestamp":"2026-02-25T15:00:00.000Z","value":5,"description":"Morning session"}
]
```

Each entry has a `timestamp` and `value`. The `description` field is optional — it is only included when you provide one. You can edit the JSON directly in source mode if needed. Invalid JSON is safely ignored and treated as an empty list.
