---
sidebar_position: 13
---

# Title Property

Fusion Goals can automatically assign a **Task Title** property to task files, stripping the parent goal name prefix for cleaner display names in the Graph and Bases views.

## How It Works

When enabled, tasks that follow a naming convention like `"Goal Name - Task Name"` will automatically receive a Task Title property containing just `"Task Name"` as a wiki link.

### Example

Given a task file named `My Goal - Design Homepage.md` linked to a goal named `My Goal`:

**Before** (no title property):
```yaml
# Tasks/My Goal - Design Homepage.md
---
Goal:
  - "[[Goals/My Goal|My Goal]]"
---
```

**After** (title property enabled):
```yaml
# Tasks/My Goal - Design Homepage.md
---
Goal:
  - "[[Goals/My Goal|My Goal]]"
Task Title: "[[Tasks/My Goal - Design Homepage|Design Homepage]]"
---
```

The Task Title property is a wiki link that:
- Points to the task file itself
- Displays the clean name with the goal prefix stripped

### Supported Separator Patterns

The prefix stripping handles multiple common naming patterns:

| Task Name | Goal Name | Resulting Title |
|-----------|-----------|-----------------|
| `My Goal - Task Name` | `My Goal` | `Task Name` |
| `My Goal – Task Name` | `My Goal` | `Task Name` (en-dash) |
| `My Goal — Task Name` | `My Goal` | `Task Name` (em-dash) |
| `My Goal Task Name` | `My Goal` | `Task Name` (space) |

If the task name doesn't start with the goal name, the full task name is used as-is.

## Where Title Is Used

### Graph View

When the title property is enabled, the graph displays the clean title instead of the full file name for task nodes. This makes the graph much more readable when tasks follow the goal prefix naming convention.

**Without title property**: Nodes show `"My Goal - Design Homepage"`, `"My Goal - Build API"`
**With title property**: Nodes show `"Design Homepage"`, `"Build API"`

### Bases View

When the title property is enabled, the Bases view replaces the `file.name` column with the **Task Title** column. This displays the clean title as a clickable wiki link, providing quick access to the task while showing the shortened name.

## Configuration

### Enable Title Property

**Setting**: `titlePropertyEnabled`
**Default**: `false` (disabled)

Toggle to enable or disable automatic title property assignment for task files. When first enabled, use the **Rescan Everything** button to apply titles to all existing tasks.

### Title Property Name

**Setting**: `titleProp`
**Default**: `Task Title`

The frontmatter property name used to store the computed title. You can customize this if "Task Title" conflicts with existing properties in your vault.

### Title Column Size

**Setting**: `titleColumnSize`
**Default**: `200px`
**Range**: 50px - 800px

Width in pixels for the title column in the Bases table view. Configurable in Settings > Fusion Goals > Bases View.

## Setting Up

1. Open Settings > Fusion Goals > Hierarchy
2. Enable **"Enable title property"**
3. (Optional) Change the property name if needed
4. (Optional) Adjust the title column width in Settings > Fusion Goals > Bases View
5. Click **"Rescan Everything"** to apply titles to all existing tasks

After the initial setup, the title property will be automatically maintained as you create, rename, or modify tasks.
