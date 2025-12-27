export const PLUGIN_ID = "fusion-goals";

export const SETTINGS_VERSION = 1;

export const SETTINGS_DEFAULTS = {
	// Hierarchical directories
	DEFAULT_GOALS_DIRECTORY: "Goals",
	DEFAULT_TASKS_DIRECTORY: "Tasks",

	// Property names for hierarchical linking
	DEFAULT_TASK_GOAL_PROP: "Goal",

	// Template settings
	DEFAULT_TASK_TEMPLATE_PATH: "",

	DEFAULT_HIDE_EMPTY_PROPERTIES: true,
	DEFAULT_HIDE_UNDERSCORE_PROPERTIES: true,

	DEFAULT_GRAPH_ENLARGED_WIDTH_PERCENT: 75,
	DEFAULT_GRAPH_ZOOM_PREVIEW_HEIGHT: 280,
	DEFAULT_GRAPH_ZOOM_PREVIEW_FRONTMATTER_HEIGHT: 90,
	DEFAULT_DISPLAY_NODE_PROPERTIES: [],
	DEFAULT_GRAPH_ANIMATION_DURATION: 800,
	DEFAULT_SHOW_GRAPH_TOOLTIPS: true,
	DEFAULT_GRAPH_TOOLTIP_WIDTH: 255,
	DEFAULT_GRAPH_TOOLTIP_SHOW_DATES: true,
	DEFAULT_ALL_RELATED_MAX_DEPTH: 10,
	DEFAULT_HIERARCHY_MAX_DEPTH: 10,

	// Zoom preview defaults
	DEFAULT_ZOOM_HIDE_FRONTMATTER: false,
	DEFAULT_ZOOM_HIDE_CONTENT: false,

	// Graph UI defaults
	DEFAULT_SHOW_SEARCH_BAR: true,
	DEFAULT_SHOW_FILTER_BAR: true,
	DEFAULT_SHOW_VIEW_SWITCHER_HEADER: true,

	// Node appearance defaults
	DEFAULT_NODE_COLOR: "#e9f2ff",
	DEFAULT_DIFFERENTIATE_NODES_BY_TYPE: true,

	// Node creation defaults
	DEFAULT_EXCLUDED_PROPERTIES: ["goal", "tasks"],

	// Shared date property names (used by both bases view and graph display)
	DEFAULT_START_DATE_PROPERTY: "Start Date",
	DEFAULT_END_DATE_PROPERTY: "End Date",

	DEFAULT_BASES_GOALS_PROPERTIES: ["Status", "Priority"],
	DEFAULT_BASES_TASKS_PROPERTIES: ["Goal", "Status", "Priority"],

	// Bases archived filtering defaults
	DEFAULT_EXCLUDE_ARCHIVED: false,
	DEFAULT_ARCHIVED_PROP: "Archived",

	// Bases custom sorting defaults
	DEFAULT_BASES_CUSTOM_FORMULAS: "",
	DEFAULT_BASES_CUSTOM_SORT: "",

	// Bases status configuration defaults
	DEFAULT_BASES_STATUS_PROPERTY: "Status",
	DEFAULT_BASES_STATUS_VALUES: ["In progress", "Inbox", "Planned", "Next Up", "Done", "Icebox"],

	// Bases date formula defaults
	DEFAULT_BASES_DAYS_REMAINING_ENABLED: true,
	DEFAULT_BASES_DAYS_SINCE_START_ENABLED: false,

	// Graph date display defaults
	DEFAULT_GRAPH_SHOW_DAYS_REMAINING: false,
	DEFAULT_GRAPH_SHOW_DAYS_SINCE: false,

	// Deadline overview modal defaults
	DEFAULT_SHOW_STARTUP_OVERVIEW: true,
	DEFAULT_DEADLINE_FILTER_EXPRESSIONS: [],

	// Frontmatter inheritance defaults
	DEFAULT_ENABLE_FRONTMATTER_INHERITANCE: true,
	DEFAULT_INHERITANCE_EXCLUDED_PROPERTIES: ["Goal"],
} as const;

export const SCAN_CONCURRENCY = 10;

export type FileType = "goal" | "task";

export const FILE_TYPE_CONFIG = {
	goal: {
		singular: "goal",
		plural: "goals",
		tabLabel: "Goals",
		icon: "🎯",
		tabMode: "goals" as const,
	},
	task: {
		singular: "task",
		plural: "tasks",
		tabLabel: "Tasks",
		icon: "✓",
		tabMode: "tasks" as const,
	},
} as const;

export type TabMode = (typeof FILE_TYPE_CONFIG)[FileType]["tabMode"];
