import { Notice, Plugin } from "obsidian";
import { FusionGoalsSettingsTab } from "./components";
import { FusionViewSwitcher, VIEW_TYPE_FUSION_SWITCHER } from "./components/views/fusion-view-switcher";
import { Indexer } from "./core/indexer";
import { SettingsStore } from "./core/settings-store";

/**
 * Fusion Goals Plugin
 *
 * Visualizes a hierarchical goal system with three levels:
 * - Goals (top level)
 * - Projects (linked to goals via "goal" property)
 * - Tasks (linked to projects via "project" property)
 */
export default class FusionGoalsPlugin extends Plugin {
	settingsStore!: SettingsStore;
	indexer!: Indexer;

	async onload() {
		console.log("🎯 Loading Fusion Goals plugin...");

		this.settingsStore = new SettingsStore(this);
		await this.settingsStore.loadSettings();

		this.addSettingTab(new FusionGoalsSettingsTab(this.app, this));

		// Main command to show the hierarchical graph
		this.addCommand({
			id: "show-goals-graph",
			name: "Show Goals Hierarchy Graph",
			callback: () => this.toggleRelationshipGraphView(),
		});

		this.addCommand({
			id: "toggle-view-mode",
			name: "Toggle View Mode (Graph/Bases)",
			callback: () => this.executeViewSwitcherMethod("toggleView"),
		});

		// Graph manipulation commands
		this.addCommand({
			id: "enlarge-graph",
			name: "Enlarge Graph",
			callback: () => this.executeViewSwitcherMethod("toggleEnlargement"),
		});

		this.addCommand({
			id: "toggle-graph-search",
			name: "Toggle Graph Search",
			callback: () => this.executeViewSwitcherMethod("toggleSearch"),
		});

		this.addCommand({
			id: "toggle-graph-filter",
			name: "Toggle Graph Filter (Expression Input)",
			callback: () => this.executeViewSwitcherMethod("toggleFilter"),
		});

		this.addCommand({
			id: "toggle-graph-filter-preset",
			name: "Toggle Graph Filter (Preset Selector)",
			callback: () => this.executeViewSwitcherMethod("toggleFilterPreset"),
		});

		// Zoom preview commands
		this.addCommand({
			id: "toggle-focus-content",
			name: "Toggle Focus Content (Zoom Preview)",
			callback: () =>
				this.executeViewSwitcherMethod("toggleHideContent", "Open the Goals Graph to toggle content visibility"),
		});

		this.addCommand({
			id: "toggle-focus-frontmatter",
			name: "Toggle Focus Frontmatter (Zoom Preview)",
			callback: () =>
				this.executeViewSwitcherMethod(
					"toggleHideFrontmatter",
					"Open the Goals Graph to toggle frontmatter visibility"
				),
		});

		this.initializePlugin();
	}

	private async initializePlugin() {
		// Wait for Obsidian's workspace layout to be ready
		await new Promise<void>((resolve) => this.app.workspace.onLayoutReady(resolve));

		// Wait for metadata cache to be fully initialized
		// @ts-expect-error - initialized property exists at runtime but not in type definitions
		if (!this.app.metadataCache.initialized) {
			await new Promise<void>((resolve) => {
				// @ts-expect-error - initialized event exists at runtime but not in type definitions
				this.app.metadataCache.once("initialized", resolve);
			});
		}

		// Initialize indexer to scan goals, projects, and tasks directories
		this.indexer = new Indexer(this.app, this.settingsStore.settings$);
		await this.indexer.start();

		this.registerView(VIEW_TYPE_FUSION_SWITCHER, (leaf) => new FusionViewSwitcher(leaf, this.indexer, this));

		console.log("✅ Fusion Goals plugin loaded successfully");
	}

	async onunload() {
		console.log("👋 Unloading Fusion Goals plugin...");
		this.indexer?.stop();
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_FUSION_SWITCHER);
	}

	private async toggleRelationshipGraphView(): Promise<void> {
		const { workspace } = this.app;

		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_FUSION_SWITCHER);

		if (existingLeaves.length > 0) {
			// View exists, reveal/focus it
			const firstLeaf = existingLeaves[0];
			workspace.revealLeaf(firstLeaf);
		} else {
			// View doesn't exist, create it in the left sidebar
			const leaf = workspace.getLeftLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_FUSION_SWITCHER, active: true });
				workspace.revealLeaf(leaf);
			}
		}
	}

	private executeViewSwitcherMethod(methodName: string, noticeMessage?: string): void {
		const { workspace } = this.app;
		const existingLeaves = workspace.getLeavesOfType(VIEW_TYPE_FUSION_SWITCHER);

		if (existingLeaves.length > 0) {
			const viewSwitcher = existingLeaves[0].view;
			if (viewSwitcher instanceof FusionViewSwitcher) {
				const method = viewSwitcher[methodName as keyof FusionViewSwitcher];
				if (typeof method === "function") {
					(method as () => void).call(viewSwitcher);
				}
				return;
			}
		}

		if (noticeMessage) {
			new Notice(noticeMessage);
		}
	}
}
