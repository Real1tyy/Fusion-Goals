import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { Setting } from "obsidian";
import type { FusionGoalsSettingsSchema } from "src/types/settings";
import type { SettingsSection } from "../types";

export class GraphDisplaySettingsSection implements SettingsSection {
	id = "graph-display";
	label = "Graph Display";

	constructor(private uiBuilder: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Graph Display").setHeading();

		this.uiBuilder.addToggle(containerEl, {
			key: "showSearchBar",
			name: "Show search bar by default",
			desc: "Display the search bar in the graph view when it loads. You can still toggle it with the command.",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "showFilterBar",
			name: "Show filter bar by default",
			desc: "Display the filter bar (preset selector and expression input) in the graph view when it loads. You can still toggle it with commands.",
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphEnlargedWidthPercent",
			name: "Graph enlarged width",
			desc: "Percentage of window width when graph is enlarged",
			min: 50,
			max: 100,
			step: 1,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphZoomPreviewHeight",
			name: "Zoom preview height",
			desc: "Maximum height in pixels for the zoom preview panel",
			min: 120,
			max: 700,
			step: 10,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphZoomPreviewFrontmatterHeight",
			name: "Zoom preview frontmatter height",
			desc: "Maximum height in pixels for the frontmatter section in zoom preview",
			min: 50,
			max: 300,
			step: 5,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphAnimationDuration",
			name: "Graph animation duration",
			desc: "Duration of graph layout animations in milliseconds. Set to 0 for instant layout.",
			min: 0,
			max: 2000,
			step: 50,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "allRelatedMaxDepth",
			name: "All Related recursion depth",
			desc: "Maximum number of constellation levels to traverse when 'All Related' is enabled (1-20). Higher values show more distant relationships but may impact performance.",
			min: 1,
			max: 20,
			step: 1,
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "hierarchyMaxDepth",
			name: "Hierarchy traversal depth",
			desc: "Maximum number of levels to traverse in hierarchy mode (1-50). Controls how deep the parent-child tree will be displayed.",
			min: 1,
			max: 50,
			step: 1,
		});

		this.uiBuilder.addTextArray(containerEl, {
			key: "displayNodeProperties",
			name: "Display properties in nodes",
			desc: "Comma-separated list of property names to display inside graph nodes (e.g., status, priority, type)",
			placeholder: "e.g., status, priority",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "differentiateNodesByType",
			name: "Differentiate nodes by type",
			desc: "Apply different visual styles to distinguish goals (hexagons), projects (rounded squares), and tasks (circles with double borders). When disabled, all nodes use the same circular shape.",
		});

		this.uiBuilder.addToggle(containerEl, {
			key: "showGraphTooltips",
			name: "Show node tooltips",
			desc: "Display property tooltips when hovering over nodes in the graph. Can also be toggled with a hotkey.",
		});

		this.uiBuilder.addSlider(containerEl, {
			key: "graphTooltipWidth",
			name: "Tooltip width",
			desc: "Maximum width of node tooltips in pixels (150-500px)",
			min: 150,
			max: 500,
			step: 5,
		});
	}
}
