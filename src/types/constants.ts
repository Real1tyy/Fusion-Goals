import type { FusionGoalsSettings } from "./settings";

export const PLUGIN_ID = "fusion-goals";

export const SETTINGS_VERSION = 1;

export const SETTINGS_DEFAULTS = {
	// Hierarchical directories
	DEFAULT_GOALS_DIRECTORY: "Goals",
	DEFAULT_PROJECTS_DIRECTORY: "Projects",
	DEFAULT_TASKS_DIRECTORY: "Tasks",

	// Property names for linking
	DEFAULT_GOAL_PROP: "goal",
	DEFAULT_PROJECT_PROP: "project",

	// Legacy properties (for backward compatibility)
	DEFAULT_PARENT_PROP: "Parent",
	DEFAULT_CHILDREN_PROP: "Child",
	DEFAULT_RELATED_PROP: "Related",
	DEFAULT_DIRECTORIES: ["*"],
	DEFAULT_AUTO_LINK_SIBLINGS: false,
	DEFAULT_ZETTEL_ID_PROP: "_ZettelID",

	DEFAULT_HIDE_EMPTY_PROPERTIES: true,
	DEFAULT_HIDE_UNDERSCORE_PROPERTIES: true,

	DEFAULT_GRAPH_ENLARGED_WIDTH_PERCENT: 75,
	DEFAULT_GRAPH_ZOOM_PREVIEW_HEIGHT: 280,
	DEFAULT_GRAPH_ZOOM_PREVIEW_FRONTMATTER_HEIGHT: 90,
	DEFAULT_DISPLAY_NODE_PROPERTIES: [],
	DEFAULT_GRAPH_ANIMATION_DURATION: 800,
	DEFAULT_SHOW_GRAPH_TOOLTIPS: true,
	DEFAULT_GRAPH_TOOLTIP_WIDTH: 255,
	DEFAULT_ALL_RELATED_MAX_DEPTH: 10,
	DEFAULT_HIERARCHY_MAX_DEPTH: 10,

	// Zoom preview defaults
	DEFAULT_ZOOM_HIDE_FRONTMATTER: false,
	DEFAULT_ZOOM_HIDE_CONTENT: false,

	// Graph UI defaults
	DEFAULT_SHOW_SEARCH_BAR: true,
	DEFAULT_SHOW_FILTER_BAR: true,

	// Node color defaults
	DEFAULT_NODE_COLOR: "#e9f2ff",

	// Node creation defaults
	DEFAULT_EXCLUDED_PROPERTIES: ["goal", "project", "Parent", "Child", "Related", "_ZettelID"],
} as const;

export const SCAN_CONCURRENCY = 10;

// Legacy relationship types (kept for backward compatibility)
export type RelationshipType = "parent" | "children" | "related";

export interface RelationshipConfig {
	type: RelationshipType;
	getProp: (settings: FusionGoalsSettings) => string;
	getReverseProp: (settings: FusionGoalsSettings) => string;
}

export const RELATIONSHIP_CONFIGS: RelationshipConfig[] = [
	{
		type: "parent",
		getProp: (s) => s.parentProp,
		getReverseProp: (s) => s.childrenProp,
	},
	{
		type: "children",
		getProp: (s) => s.childrenProp,
		getReverseProp: (s) => s.parentProp,
	},
	{
		type: "related",
		getProp: (s) => s.relatedProp,
		getReverseProp: (s) => s.relatedProp,
	},
];

// New hierarchical structure (will replace legacy relationships)
export type HierarchyLevel = "goal" | "project" | "task";

export interface HierarchyConfig {
	level: HierarchyLevel;
	directory: (settings: FusionGoalsSettings) => string;
	parentProp?: (settings: FusionGoalsSettings) => string;
	parentLevel?: HierarchyLevel;
}

export const HIERARCHY_CONFIGS: HierarchyConfig[] = [
	{
		level: "goal",
		directory: (s) => s.goalsDirectory,
	},
	{
		level: "project",
		directory: (s) => s.projectsDirectory,
		parentProp: (s) => s.goalProp,
		parentLevel: "goal",
	},
	{
		level: "task",
		directory: (s) => s.tasksDirectory,
		parentProp: (s) => s.projectProp,
		parentLevel: "project",
	},
];
