import { type App, Component, MarkdownRenderer, type TFile } from "obsidian";
import type { Subscription } from "rxjs";
import type FusionGoalsPlugin from "../../main";
import { type BaseHandler, GoalsBaseHandler, ProjectsBaseHandler, type ViewType } from "./bases";
import { RegisteredEventsComponent } from "./component";

export const VIEW_TYPE_BASES = "fusion-bases-view";

export interface BasesViewState {
	projectsView: ViewType;
	goalsView: ViewType;
	goalsTopLevel: string;
}

/**
 * Bases view component that uses Obsidian's Bases API to render
 * Children, Parent, and Related files using native base code blocks
 */
export class BasesView extends RegisteredEventsComponent {
	private app: App;
	private contentEl: HTMLElement;
	private component: Component;
	private plugin: FusionGoalsPlugin;
	private settingsSubscription: Subscription | null = null;
	private topLevelSelectorEl: HTMLElement | null = null;
	private viewSelectorEl: HTMLElement | null = null;
	private handlers: BaseHandler[];
	private currentHandler: BaseHandler | null = null;

	constructor(app: App, containerEl: HTMLElement, plugin: FusionGoalsPlugin) {
		super();
		this.app = app;
		this.contentEl = containerEl;
		this.plugin = plugin;
		this.component = new Component();
		this.component.load();

		this.handlers = [new ProjectsBaseHandler(app, plugin), new GoalsBaseHandler(app, plugin)];

		this.settingsSubscription = this.plugin.settingsStore.settings$.subscribe(async (settings) => {
			this.validateAllHandlers(settings);
			await this.render();
		});
	}

	private validateAllHandlers(settings: typeof this.plugin.settingsStore.settings$.value): void {
		for (const handler of this.handlers) {
			const currentView = handler.getSelectedView();
			if (currentView === "archived" && !settings.excludeArchived) {
				handler.setSelectedView("full");
			}
		}
	}

	async render(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("fusion-bases-view");

		// Get the active file
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			this.renderEmptyState("No active file. Open a note to see its bases view.");
			return;
		}

		this.currentHandler = this.handlers.find((handler) => handler.canHandle(activeFile)) ?? null;

		if (!this.currentHandler) {
			this.renderEmptyBase(activeFile);
			return;
		}

		this.validateSelectedView();
		this.createTopLevelSelector();
		this.createViewSelector();

		const basesMarkdown = this.currentHandler.generateBasesMarkdown(activeFile);

		// Create container for the rendered markdown
		const markdownContainer = this.contentEl.createDiv({
			cls: "fusion-bases-markdown-container",
		});

		// Render using Obsidian's MarkdownRenderer
		await MarkdownRenderer.render(this.app, basesMarkdown, markdownContainer, activeFile.path, this.component);
	}

	private validateSelectedView(): void {
		if (!this.currentHandler) return;

		const currentView = this.currentHandler.getSelectedView();
		const viewOptions = this.currentHandler.getViewOptions();
		const isViewStillValid = viewOptions.some((opt) => opt.type === currentView);

		if (!isViewStillValid) {
			this.currentHandler.setSelectedView("full");
		}
	}

	private createTopLevelSelector(): void {
		if (!this.currentHandler) return;

		const topLevelOptions = this.currentHandler.getTopLevelOptions();

		// Only show top-level selector if there are multiple options
		if (topLevelOptions.length <= 1) return;

		this.topLevelSelectorEl = this.contentEl.createDiv({
			cls: "fusion-bases-top-level-selector",
		});

		const selectEl = this.topLevelSelectorEl.createEl("select", {
			cls: "fusion-bases-select",
		});

		for (const option of topLevelOptions) {
			selectEl.createEl("option", {
				value: option.id,
				text: option.label,
			});
		}

		const currentTopLevel = this.currentHandler.getSelectedTopLevelView();
		if (currentTopLevel) {
			selectEl.value = currentTopLevel;
		}

		selectEl.addEventListener("change", async () => {
			if (this.currentHandler) {
				this.currentHandler.setSelectedTopLevelView(selectEl.value);
				await this.render();
			}
		});
	}

	private createViewSelector(): void {
		if (!this.currentHandler) return;

		this.viewSelectorEl = this.contentEl.createDiv({
			cls: "fusion-bases-view-selector",
		});

		const selectEl = this.viewSelectorEl.createEl("select", {
			cls: "fusion-bases-select",
		});

		const viewOptions = this.currentHandler.getViewOptions();
		const currentView = this.currentHandler.getSelectedView();

		for (const { type, label } of viewOptions) {
			selectEl.createEl("option", {
				value: type,
				text: label,
			});
		}

		selectEl.value = currentView;

		selectEl.addEventListener("change", async () => {
			if (this.currentHandler) {
				this.currentHandler.setSelectedView(selectEl.value as any);
				await this.render();
			}
		});
	}

	private renderEmptyBase(file: TFile): void {
		const isTaskFile = file.path.startsWith("Tasks/") && file.name !== "Tasks.md";

		if (isTaskFile) {
			this.renderEmptyState("This view only works with Projects and Goals. Tasks don't have a bases view.");
		} else {
			this.renderEmptyState("Bases are not configured for this directory.");
		}
	}

	private renderEmptyState(message: string): void {
		this.contentEl.createDiv({
			text: message,
			cls: "fusion-bases-empty-state",
		});
	}

	async updateActiveFile(): Promise<void> {
		await this.render();
	}

	getState(): BasesViewState {
		const projectsHandler = this.handlers.find((h) => h instanceof ProjectsBaseHandler);
		const goalsHandler = this.handlers.find((h) => h instanceof GoalsBaseHandler);

		return {
			projectsView: projectsHandler?.getSelectedView() ?? "full",
			goalsView: goalsHandler?.getSelectedView() ?? "full",
			goalsTopLevel: goalsHandler?.getSelectedTopLevelView() ?? "projects",
		};
	}

	restoreState(state: BasesViewState): void {
		const projectsHandler = this.handlers.find((h) => h instanceof ProjectsBaseHandler);
		const goalsHandler = this.handlers.find((h) => h instanceof GoalsBaseHandler);

		if (projectsHandler && state.projectsView) {
			projectsHandler.setSelectedView(state.projectsView);
		}

		if (goalsHandler) {
			if (state.goalsView) {
				goalsHandler.setSelectedView(state.goalsView);
			}
			if (state.goalsTopLevel) {
				goalsHandler.setSelectedTopLevelView(state.goalsTopLevel);
			}
		}
	}

	destroy(): void {
		if (this.settingsSubscription) {
			this.settingsSubscription.unsubscribe();
			this.settingsSubscription = null;
		}

		if (this.component) {
			this.component.unload();
		}

		this.currentHandler = null;
		this.topLevelSelectorEl = null;
		this.viewSelectorEl = null;
		this.contentEl.empty();
		this.cleanupEvents();
	}
}
