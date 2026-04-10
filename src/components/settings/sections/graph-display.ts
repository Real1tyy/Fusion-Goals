import type { SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { Setting } from "obsidian";
import { FusionGoalsSettingsSchema } from "src/types/settings";

import type { SettingsSection } from "../types";

const S = FusionGoalsSettingsSchema.shape;

export class GraphDisplaySettingsSection implements SettingsSection {
	id = "graph-display";
	label = "Graph Display";

	constructor(private ui: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>) {}

	render(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Graph Display").setHeading();

		this.ui.addSchemaField(containerEl, { showSearchBar: S.showSearchBar }, { label: "Show search bar by default" });

		this.ui.addSchemaField(containerEl, { showFilterBar: S.showFilterBar }, { label: "Show filter bar by default" });

		this.ui.addSchemaField(
			containerEl,
			{ graphEnlargedWidthPercent: S.graphEnlargedWidthPercent },
			{ label: "Graph enlarged width" }
		);

		this.ui.addSchemaField(
			containerEl,
			{ graphZoomPreviewHeight: S.graphZoomPreviewHeight },
			{ label: "Zoom preview height", step: 10 }
		);

		this.ui.addSchemaField(
			containerEl,
			{ graphZoomPreviewFrontmatterHeight: S.graphZoomPreviewFrontmatterHeight },
			{ label: "Zoom preview frontmatter height", step: 5 }
		);

		this.ui.addSchemaField(containerEl, { graphAnimationDuration: S.graphAnimationDuration }, { step: 50 });

		this.ui.addSchemaField(
			containerEl,
			{ allRelatedMaxDepth: S.allRelatedMaxDepth },
			{ label: "All Related recursion depth" }
		);

		this.ui.addSchemaField(
			containerEl,
			{ hierarchyMaxDepth: S.hierarchyMaxDepth },
			{ label: "Hierarchy traversal depth" }
		);

		this.ui.addSchemaField(
			containerEl,
			{ displayNodeProperties: S.displayNodeProperties },
			{ label: "Display properties in nodes", placeholder: "e.g., status, priority" }
		);

		new Setting(containerEl).setName("Layout").setHeading();

		this.ui.addSchemaField(
			containerEl,
			{ useMultiRowLayout: S.useMultiRowLayout },
			{ label: "Use multi-row layout for large families" }
		);

		this.ui.addSchemaField(containerEl, { maxChildrenPerRow: S.maxChildrenPerRow });

		new Setting(containerEl).setName("Date Display").setHeading();

		this.ui.addSchemaField(
			containerEl,
			{ graphShowDaysSince: S.graphShowDaysSince },
			{ label: "Show days since start" }
		);

		this.ui.addSchemaField(
			containerEl,
			{ graphShowDaysRemaining: S.graphShowDaysRemaining },
			{ label: "Show days remaining" }
		);

		new Setting(containerEl).setName("Tooltips").setHeading();

		this.ui.addSchemaField(containerEl, { differentiateNodesByType: S.differentiateNodesByType });

		this.ui.addSchemaField(containerEl, { showGraphTooltips: S.showGraphTooltips }, { label: "Show node tooltips" });

		this.ui.addSchemaField(
			containerEl,
			{ graphTooltipWidth: S.graphTooltipWidth },
			{ label: "Tooltip width", step: 5 }
		);

		this.ui.addSchemaField(
			containerEl,
			{ graphTooltipShowDates: S.graphTooltipShowDates },
			{ label: "Show dates in tooltips" }
		);
	}
}
