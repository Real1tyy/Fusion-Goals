import type { TFile } from "obsidian";
import { BaseHandler, type BaseHandlerConfig } from "./base-handler";

/**
 * Handler for goals-specific base code blocks
 * Shows projects associated with the goal
 */
export class GoalsBaseHandler extends BaseHandler {
	canHandle(file: TFile): boolean {
		return file.path.startsWith("Goals/") && file.name !== "Goals.md";
	}

	protected getConfig(): BaseHandlerConfig {
		const settings = this.plugin.settingsStore.settings$.value;
		return {
			folder: "Projects",
			properties: settings.basesGoalsProperties,
		};
	}

	generateBasesMarkdown(_file: TFile): string {
		const config = this.getConfig();
		const orderArray = this.generateOrderArray(config.properties);
		const viewContent = this.generateViewConfig(this.selectedView, orderArray);

		return `\`\`\`base
filters:
  and:
    - Goal.contains(this.file.asLink())
    - file.inFolder("Projects")
formulas:
${this.generateCommonFormulas()}
views:
${viewContent}
\`\`\``;
	}
}
