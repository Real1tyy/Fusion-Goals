import { z } from "zod";
import { SETTINGS_DEFAULTS, SETTINGS_VERSION } from "./constants";

export type Frontmatter = Record<string, unknown>;

export const ColorRuleSchema = z.object({
	id: z.string(),
	expression: z.string(),
	color: z.string(),
	enabled: z.boolean(),
});

export type ColorRule = z.infer<typeof ColorRuleSchema>;

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

export type PathExcludedProperties = z.infer<typeof PathExcludedPropertiesSchema>;

export const FusionGoalsSettingsSchema = z.object({
	version: z.number().int().positive().optional().default(SETTINGS_VERSION),

	// Hierarchical directory structure (required - must be defined)
	goalsDirectory: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_GOALS_DIRECTORY),
	tasksDirectory: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_TASKS_DIRECTORY),

	// Property names for hierarchical linking
	taskGoalProp: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_TASK_GOAL_PROP),

	// Template settings
	taskTemplatePath: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_TASK_TEMPLATE_PATH),

	// UI settings
	showRibbonIcon: z.boolean().optional().default(true),
	showStartupOverview: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_SHOW_STARTUP_OVERVIEW),

	// Preview settings
	hideEmptyProperties: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_HIDE_EMPTY_PROPERTIES),
	hideUnderscoreProperties: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_HIDE_UNDERSCORE_PROPERTIES),

	// Graph settings
	graphEnlargedWidthPercent: z
		.number()
		.min(50)
		.max(100)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ENLARGED_WIDTH_PERCENT),
	graphZoomPreviewHeight: z
		.number()
		.min(120)
		.max(700)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ZOOM_PREVIEW_HEIGHT),
	graphZoomPreviewFrontmatterHeight: z
		.number()
		.min(50)
		.max(300)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ZOOM_PREVIEW_FRONTMATTER_HEIGHT),
	graphAnimationDuration: z
		.number()
		.min(0)
		.max(2000)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_ANIMATION_DURATION),
	allRelatedMaxDepth: z
		.number()
		.int()
		.min(1)
		.max(20)
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_ALL_RELATED_MAX_DEPTH),
	hierarchyMaxDepth: z.number().int().min(1).max(50).optional().default(SETTINGS_DEFAULTS.DEFAULT_HIERARCHY_MAX_DEPTH),

	// Zoom preview behavior
	zoomHideFrontmatterByDefault: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_ZOOM_HIDE_FRONTMATTER),
	zoomHideContentByDefault: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_ZOOM_HIDE_CONTENT),

	// Tooltip settings
	showGraphTooltips: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_SHOW_GRAPH_TOOLTIPS),
	graphTooltipWidth: z.number().min(150).max(500).optional().default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_TOOLTIP_WIDTH),
	graphTooltipShowDates: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_TOOLTIP_SHOW_DATES),

	// Graph UI settings
	showSearchBar: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_SHOW_SEARCH_BAR),
	showFilterBar: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_SHOW_FILTER_BAR),
	showViewSwitcherHeader: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_SHOW_VIEW_SWITCHER_HEADER),

	// Graph filtering settings
	filterExpressions: z.array(z.string()).optional().default([]),
	filterPresets: z.array(FilterPresetSchema).optional().default([]),
	preFillFilterPreset: z.string().optional().default(""),
	displayNodeProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_DISPLAY_NODE_PROPERTIES]),

	// Shared date property names (used by both bases view and graph display)
	startDateProperty: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_START_DATE_PROPERTY),
	endDateProperty: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_END_DATE_PROPERTY),

	// Node appearance settings
	defaultNodeColor: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_NODE_COLOR),
	differentiateNodesByType: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_DIFFERENTIATE_NODES_BY_TYPE),
	colorRules: z.array(ColorRuleSchema).optional().default([]),

	// Excluded properties for node creation
	defaultExcludedProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_EXCLUDED_PROPERTIES]),
	pathExcludedProperties: z.array(PathExcludedPropertiesSchema).optional().default([]),

	// Bases view column configuration
	basesGoalsProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_BASES_GOALS_PROPERTIES]),
	basesTasksProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_BASES_TASKS_PROPERTIES]),

	// Archived filtering for bases view
	excludeArchived: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_EXCLUDE_ARCHIVED),
	archivedProp: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_ARCHIVED_PROP),

	// Custom sorting for bases view
	basesCustomFormulas: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_BASES_CUSTOM_FORMULAS),
	basesCustomSort: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_BASES_CUSTOM_SORT),

	// Status property configuration for bases view
	basesStatusProperty: z.string().optional().default(SETTINGS_DEFAULTS.DEFAULT_BASES_STATUS_PROPERTY),
	basesStatusValues: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_BASES_STATUS_VALUES]),

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

	// Date formula configuration for bases view
	basesDaysRemainingEnabled: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_BASES_DAYS_REMAINING_ENABLED),
	basesDaysSinceStartEnabled: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_BASES_DAYS_SINCE_START_ENABLED),

	// Graph date display configuration
	graphShowDaysRemaining: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_SHOW_DAYS_REMAINING),
	graphShowDaysSince: z.boolean().optional().default(SETTINGS_DEFAULTS.DEFAULT_GRAPH_SHOW_DAYS_SINCE),

	// Frontmatter inheritance settings
	enableFrontmatterInheritance: z
		.boolean()
		.optional()
		.default(SETTINGS_DEFAULTS.DEFAULT_ENABLE_FRONTMATTER_INHERITANCE),
	inheritanceExcludedProperties: z
		.array(z.string())
		.optional()
		.default([...SETTINGS_DEFAULTS.DEFAULT_INHERITANCE_EXCLUDED_PROPERTIES]),
});

export type FusionGoalsSettings = z.infer<typeof FusionGoalsSettingsSchema>;

export interface BasesAdditionalView {
	id: string;
	name: string;
	filter: string;
}
