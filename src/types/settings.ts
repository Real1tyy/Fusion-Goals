import type { SettingsStore } from "@real1ty-obsidian-plugins";
import { GridLayoutStateSchema, PageHeaderStateSchema } from "@real1ty-obsidian-plugins";
import { TabbedContainerStateSchema } from "@real1ty-obsidian-plugins-react";
import { z } from "zod";

import { SETTINGS_DEFAULTS } from "./constants";

export type Frontmatter = Record<string, unknown>;

export const ColorRuleSchema = z.object({
	id: z.string(),
	expression: z.string(),
	color: z.string(),
	enabled: z.boolean(),
});

export const FilterPresetSchema = z.object({
	name: z.string(),
	expression: z.string(),
});

export type FilterPreset = z.infer<typeof FilterPresetSchema>;

export const PathExcludedPropertiesSchema = z.object({
	id: z.string(),
	path: z.string(),
	excludedProperties: z.array(z.string()),
	enabled: z.boolean(),
});

export const FusionGoalsSettingsSchema = z.object({
	version: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_VERSION),

	goalsDirectory: z
		.string()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GOALS_DIRECTORY)
		.describe("Directory where goal files are stored (required)"),
	tasksDirectory: z
		.string()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_TASKS_DIRECTORY)
		.describe("Directory where task files are stored (required)"),

	taskGoalProp: z
		.string()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_TASK_GOAL_PROP)
		.describe("Property name in tasks that links to their goal"),

	priorityProp: z
		.string()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_PRIORITY_PROP)
		.describe("Property name for priority level"),
	progressProp: z
		.string()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_PROGRESS_PROP)
		.describe("Property name for progress percentage (0-100)"),

	// Dashboard layout state
	dashboardLayout: GridLayoutStateSchema.optional(),

	// Tab & header persistence
	activeTab: TabbedContainerStateSchema.optional().catch(undefined),
	pageHeaderState: PageHeaderStateSchema.optional().catch(undefined),

	taskTemplatePath: z
		.string()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_TASK_TEMPLATE_PATH)
		.describe("Path to template file for new tasks (e.g., Templates/Task.md). Requires Templater plugin."),

	showRibbonIcon: z
		.boolean()
		.optional()
		.default(true)
		.describe("Display the relationship graph icon in the left ribbon. Restart Obsidian after changing this setting."),
	showStartupOverview: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_SHOW_STARTUP_OVERVIEW)
		.describe(
			"Display the Goals & Projects deadlines overview modal when the plugin loads. You can always open it manually with the 'Show Deadlines Overview' command."
		),

	hideEmptyProperties: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_HIDE_EMPTY_PROPERTIES)
		.describe("Hide properties with empty, null, or undefined values in tooltips and previews"),
	hideUnderscoreProperties: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_HIDE_UNDERSCORE_PROPERTIES)
		.describe("Hide properties that start with an underscore (_) in tooltips and previews"),

	graphEnlargedWidthPercent: z
		.number()
		.min(50)
		.max(100)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ENLARGED_WIDTH_PERCENT)
		.describe("Percentage of window width when graph is enlarged"),
	graphZoomPreviewHeight: z
		.number()
		.min(120)
		.max(700)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ZOOM_PREVIEW_HEIGHT)
		.describe("Maximum height in pixels for the zoom preview panel"),
	graphZoomPreviewFrontmatterHeight: z
		.number()
		.min(50)
		.max(300)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ZOOM_PREVIEW_FRONTMATTER_HEIGHT)
		.describe("Maximum height in pixels for the frontmatter section in zoom preview"),
	graphAnimationDuration: z
		.number()
		.min(0)
		.max(2000)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ANIMATION_DURATION)
		.describe("Duration of graph layout animations in milliseconds. Set to 0 for instant layout."),
	allRelatedMaxDepth: z
		.number()
		.int()
		.min(1)
		.max(20)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_ALL_RELATED_MAX_DEPTH)
		.describe(
			"Maximum number of constellation levels to traverse when 'All Related' is enabled (1-20). Higher values show more distant relationships but may impact performance."
		),
	hierarchyMaxDepth: z
		.number()
		.int()
		.min(1)
		.max(50)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_HIERARCHY_MAX_DEPTH)
		.describe(
			"Maximum number of levels to traverse in hierarchy mode (1-50). Controls how deep the parent-child tree will be displayed."
		),

	zoomHideFrontmatterByDefault: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_ZOOM_HIDE_FRONTMATTER)
		.describe("When entering zoom preview, frontmatter starts hidden by default"),
	zoomHideContentByDefault: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_ZOOM_HIDE_CONTENT)
		.describe("When entering zoom preview, file content starts hidden by default"),

	showGraphTooltips: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_SHOW_GRAPH_TOOLTIPS)
		.describe("Display property tooltips when hovering over nodes in the graph. Can also be toggled with a hotkey."),
	graphTooltipWidth: z
		.number()
		.min(150)
		.max(500)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_TOOLTIP_WIDTH)
		.describe("Maximum width of node tooltips in pixels (150-500px)"),
	graphTooltipShowDates: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_TOOLTIP_SHOW_DATES)
		.describe(
			"Display days since start and days remaining in node tooltips. Uses the same date settings as graph display."
		),

	showSearchBar: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_SHOW_SEARCH_BAR)
		.describe("Display the search bar in the graph view when it loads. You can still toggle it with the command."),
	showFilterBar: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_SHOW_FILTER_BAR)
		.describe(
			"Display the filter bar (preset selector and expression input) in the graph view when it loads. You can still toggle it with commands."
		),
	showViewSwitcherHeader: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_SHOW_VIEW_SWITCHER_HEADER)
		.describe("Display the header with toggle button in the Fusion Goals view. Changes apply immediately."),

	filterExpressions: z
		.array(z.string())
		.optional()
		.default([])
		.describe(
			"One per line. Changes apply on blur or Ctrl/Cmd+Enter. Only nodes matching all expressions are shown in the graph."
		),
	filterPresets: z.array(FilterPresetSchema).optional().default([]),
	preFillFilterPreset: z.string().optional().default(""),
	displayNodeProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_DISPLAY_NODE_PROPERTIES])
		.describe("Comma-separated list of property names to display inside graph nodes (e.g., status, priority, type)"),

	startDateProperty: z
		.string()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_START_DATE_PROPERTY)
		.describe(
			"Frontmatter property name containing the start date. Used by both bases view formulas and graph date display."
		),
	endDateProperty: z
		.string()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_END_DATE_PROPERTY)
		.describe(
			"Frontmatter property name containing the end date. Used by both bases view formulas and graph date display."
		),

	defaultNodeColor: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_NODE_COLOR),
	differentiateNodesByType: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_DIFFERENTIATE_NODES_BY_TYPE)
		.describe(
			"Apply different visual styles to distinguish goals (hexagons), and tasks (circles with double borders). When disabled, all nodes use the same circular shape."
		),
	colorRules: z.array(ColorRuleSchema).optional().default([]),

	// Excluded properties for node creation
	defaultExcludedProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_EXCLUDED_PROPERTIES]),
	pathExcludedProperties: z.array(PathExcludedPropertiesSchema).optional().default([]),

	basesGoalsProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_BASES_GOALS_PROPERTIES])
		.describe(
			"Comma-separated list of frontmatter properties to show as columns when viewing Goals files (e.g., Status, Priority)"
		),
	basesTasksProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_BASES_TASKS_PROPERTIES])
		.describe(
			"Comma-separated list of frontmatter properties to show as columns when viewing Tasks files (e.g., Goal, Status, Priority)"
		),

	excludeArchived: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_EXCLUDE_ARCHIVED)
		.describe(
			"When enabled, shows the archived view option and filters non-archived items in other views. When disabled, shows all items without archived filtering."
		),
	archivedProp: z
		.string()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_ARCHIVED_PROP)
		.describe("Name of the frontmatter property used to mark files as archived (e.g., 'Archived', '_Archived')."),

	// Custom sorting for bases view
	basesCustomFormulas: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_BASES_CUSTOM_FORMULAS),
	basesCustomSort: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_BASES_CUSTOM_SORT),

	basesStatusProperty: z
		.string()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_BASES_STATUS_PROPERTY)
		.describe("Name of the frontmatter property used for status filtering (e.g., 'Status', 'State', 'Progress')"),
	basesStatusValues: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_BASES_STATUS_VALUES])
		.describe("Comma-separated list of status values. A view will be created for each value."),

	// Additional custom views for bases view (rendered first, before status views)
	basesAdditionalViews: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				filter: z.string(),
			})
		)
		.optional()
		.default([]),

	basesDaysRemainingEnabled: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_BASES_DAYS_REMAINING_ENABLED)
		.describe(
			"When enabled, adds a 'Days Remaining' column showing relative time until the end date (e.g., 'in 5 days', '2 days ago')."
		),
	basesDaysSinceStartEnabled: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_BASES_DAYS_SINCE_START_ENABLED)
		.describe(
			"When enabled, adds a 'Days Since Start' column showing relative time from the start date (e.g., '5 days ago', 'in 2 days')."
		),

	graphShowDaysRemaining: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_SHOW_DAYS_REMAINING)
		.describe(
			"Display days remaining until end date on the right side of graph nodes (e.g., 'in 10 days', 'today'). Uses the End Date property from Property Display settings."
		),
	graphShowDaysSince: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_SHOW_DAYS_SINCE)
		.describe(
			"Display days since start date on the left side of graph nodes (e.g., '5 days ago', 'today'). Uses the Start Date property from Property Display settings."
		),

	enableFrontmatterInheritance: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_ENABLE_FRONTMATTER_INHERITANCE)
		.describe("When enabled, changes to goal frontmatter will automatically propagate to linked tasks"),
	inheritanceExcludedProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_INHERITANCE_EXCLUDED_PROPERTIES])
		.describe(
			"Property names to exclude from inheritance (e.g., 'tasks', 'CustomField'). Relationship properties are always excluded."
		),

	useMultiRowLayout: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_USE_MULTI_ROW_LAYOUT)
		.describe(
			"When a parent has many children, distribute them across staggered rows instead of a single wide row. Reduces horizontal spread for large hierarchies."
		),
	maxChildrenPerRow: z
		.number()
		.int()
		.min(3)
		.max(30)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_MAX_CHILDREN_PER_ROW)
		.describe(
			"Maximum number of child nodes per row when multi-row layout is enabled (3-30). Lower values create more compact, taller layouts."
		),

	titlePropertyEnabled: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_TITLE_PROPERTY_ENABLED)
		.describe(
			"When enabled, tasks will automatically receive a Task Title property with the goal name prefix stripped"
		),
	titleProp: z
		.string()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_TITLE_PROP)
		.describe("Property name for the auto-assigned title"),
	titleColumnSize: z
		.number()
		.min(50)
		.max(800)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_TITLE_COLUMN_SIZE)
		.describe(
			"Width in pixels for the title column in the Bases table view. Only applies when the title property is enabled in Hierarchy settings."
		),
});

export type FusionGoalsSettings = z.infer<typeof FusionGoalsSettingsSchema>;

export type FusionGoalsSettingsStore = SettingsStore<typeof FusionGoalsSettingsSchema>;

export interface BasesAdditionalView {
	id: string;
	name: string;
	filter: string;
}
