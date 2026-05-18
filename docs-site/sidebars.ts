import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
	tutorialSidebar: [
		{
			type: "doc",
			id: "intro",
			label: "Fusion Goals",
		},
		"installation",
		"quickstart",
		{
			type: "category",
			label: "Features",
			collapsible: true,
			items: [
				"features/overview",
				"features/dashboard",
				"features/header-actions",
				"features/crud-modals",
				"features/priority-progress",
				"features/bidirectional-sync",
				"features/graph-views",
				"features/node-layout",
				"features/color-rules",
				"features/filtering",
				"features/zoom-mode",
				"features/tooltips",
				"features/search",
				"features/context-menus",
				"features/node-creation",
				"features/excluded-properties",
				"features/title-property",
				"features/metric-tracking",
			],
		},
		"configuration",
		"faq",
		"troubleshooting",
		"contributing",
		"support",
		"changelog",
	],
};

export default sidebars;
