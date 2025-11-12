import { SettingsUIBuilder } from "@real1ty-obsidian-plugins/utils";
import { type App, PluginSettingTab } from "obsidian";
import type FusionGoalsPlugin from "src/main";
import type { FusionGoalsSettingsSchema } from "../../types/settings";
import { BasesViewSettingsSection } from "./sections/bases-view";
import { GraphDisplaySettingsSection } from "./sections/graph-display";
import { HierarchySection } from "./sections/hierarchy";
import { PropertyDisplaySettingsSection } from "./sections/property-display";
import { RulesSection } from "./sections/rules";
import { UserInterfaceSettingsSection } from "./sections/user-interface";
import type { SettingsSection } from "./types";

const SPONSOR_URL = "https://github.com/sponsors/Real1tyy";

export class FusionGoalsSettingsTab extends PluginSettingTab {
	plugin: FusionGoalsPlugin;
	private readonly uiBuilder: SettingsUIBuilder<typeof FusionGoalsSettingsSchema>;
	private readonly sections: SettingsSection[];
	private selectedSectionId: string;
	private sectionContainer: HTMLElement | null = null;

	constructor(app: App, plugin: FusionGoalsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.uiBuilder = new SettingsUIBuilder(this.plugin.settingsStore);
		this.sections = this.createSections();
		this.selectedSectionId = this.sections[0]?.id ?? "user-interface";
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h1", { text: "Fusion Goals Settings" });

		if (this.sections.length > 0) {
			const navContainer = containerEl.createDiv("fusion-settings-nav");

			this.sections.forEach((section) => {
				const button = navContainer.createEl("button", {
					text: section.label,
					cls: "fusion-settings-nav-button",
				});

				if (this.selectedSectionId === section.id) {
					button.addClass("fusion-settings-nav-button-active");
				}

				button.addEventListener("click", () => {
					this.selectedSectionId = section.id;
					this.display();
				});
			});
		}

		this.sectionContainer = containerEl.createDiv({ cls: "fusion-settings-section-container" });

		this.renderSelectedSection();

		const footer = containerEl.createDiv({ cls: "setting-item settings-footer" });
		footer.createEl("a", {
			text: "Support Fusion Goals Development",
			href: SPONSOR_URL,
			cls: "settings-support-link",
			attr: { target: "_blank", rel: "noopener" },
		});
	}

	private renderSelectedSection(): void {
		if (!this.sectionContainer) {
			return;
		}

		this.sectionContainer.empty();

		const section = this.sections.find((candidate) => candidate.id === this.selectedSectionId) ?? this.sections[0];

		section?.render(this.sectionContainer);
	}

	private createSections(): SettingsSection[] {
		return [
			new UserInterfaceSettingsSection(this.uiBuilder),
			new HierarchySection(this.plugin, this.uiBuilder),
			new GraphDisplaySettingsSection(this.uiBuilder),
			new PropertyDisplaySettingsSection(this.uiBuilder),
			new BasesViewSettingsSection(this.plugin, this.uiBuilder),
			new RulesSection(this.plugin, this.uiBuilder),
		];
	}
}
