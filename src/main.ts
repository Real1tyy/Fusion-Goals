import {
	buildUtmUrl,
	generateUniqueFilePath,
	SettingsStore,
	TemplaterService,
	VaultTable,
	type ViewActivator,
	waitForCacheReady,
} from "@real1ty-obsidian-plugins";
import { showWhatsNewReactModal, type WhatsNewModalConfig } from "@real1ty-obsidian-plugins-react";
import { MarkdownView, Notice, Plugin, type TFile, type WorkspaceLeaf } from "obsidian";

import CHANGELOG_CONTENT from "../../docs-site/docs/changelog.md";
import { DeadlineOverviewModal } from "./components/deadline-overview-modal";
import { MetricBlockRenderer } from "./components/metric-block-renderer";
import { showGoalModal } from "./components/modals/goal-modal";
import { showTaskModal } from "./components/modals/task-modal";
import { FusionGoalsSettingsTab } from "./components/settings/settings-tab";
import { registerFusionGoalsView } from "./components/views/fusion-goals-view";
import { GoalsManager } from "./core/goals-manager";
import { InheritanceManager } from "./core/inheritance-manager";
import { metricRepository } from "./core/metric-repository";
import { FUSION_GOALS_VIEW_TYPE } from "./types/constants";
import type { GoalFrontmatter, TaskFrontmatter } from "./types/frontmatter";
import { createGoalSchema, createTaskSchema } from "./types/frontmatter";
import { METRIC_CODE_FENCE } from "./types/metric";
import { FusionGoalsSettingsSchema, type FusionGoalsSettingsStore } from "./types/settings";
import { getInheritableProperties } from "./utils/inheritance";

export default class FusionGoalsPlugin extends Plugin {
	settingsStore!: FusionGoalsSettingsStore;
	goalsTable!: VaultTable<GoalFrontmatter>;
	tasksTable!: VaultTable<TaskFrontmatter>;
	goalsManager!: GoalsManager;
	private inheritanceManager!: InheritanceManager;
	private activateFusionGoals!: ViewActivator;
	private ribbonIconEl: HTMLElement | null = null;

	override async onload() {
		this.settingsStore = new SettingsStore(this, FusionGoalsSettingsSchema);
		await this.settingsStore.loadSettings();

		this.addSettingTab(new FusionGoalsSettingsTab(this.app, this));

		this.addCommand({
			id: "open-fusion-goals",
			name: "Open Fusion Goals",
			callback: () => {
				void this.activateFusionGoals?.();
			},
		});

		this.addCommand({
			id: "show-startup-overview",
			name: "Show Deadlines Overview",
			callback: () => this.showStartupOverview(),
		});

		this.addCommand({
			id: "create-goal",
			name: "Create Goal",
			callback: () => {
				if (this.goalsManager) {
					showGoalModal(this.app, this.goalsManager, this.settingsStore);
				}
			},
		});

		this.addCommand({
			id: "create-task",
			name: "Create Task",
			callback: () => {
				if (this.goalsManager) {
					showTaskModal(this.app, this.goalsManager, this.settingsStore);
				}
			},
		});

		this.addCommand({
			id: "create-task-from-goal",
			name: "Create Task from Goal",
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) return false;

				const fileType = this.goalsManager?.getFileType(activeFile.path);
				if (fileType !== "goal") return false;

				if (!checking) {
					void this.createTaskFromGoal(activeFile);
				}
				return true;
			},
		});

		void this.initializePlugin();
	}

	private async initializePlugin() {
		await waitForCacheReady(this.app);

		const settings = this.settingsStore.currentSettings;
		const goalSchema = createGoalSchema(settings);
		const taskSchema = createTaskSchema(settings);

		this.goalsTable = new VaultTable({
			app: this.app,
			directory: settings.goalsDirectory,
			schema: goalSchema,
		});

		this.tasksTable = new VaultTable({
			app: this.app,
			directory: settings.tasksDirectory,
			schema: taskSchema,
		});

		this.goalsManager = new GoalsManager(this.goalsTable, this.tasksTable, () => this.settingsStore.currentSettings);

		this.inheritanceManager = new InheritanceManager(
			this.app,
			this.goalsTable,
			this.tasksTable,
			this.goalsManager,
			() => this.settingsStore.currentSettings
		);

		this.activateFusionGoals = registerFusionGoalsView(this, this.settingsStore, this.goalsManager);
		this.updateRibbonIcon();

		this.registerMarkdownCodeBlockProcessor(METRIC_CODE_FENCE, (source, el, ctx) => {
			if (el.hasClass("fusion-metric-initialized")) return;
			el.empty();
			el.addClass("fusion-metric-initialized");
			const renderer = new MetricBlockRenderer(el, this.app, source, ctx);
			ctx.addChild(renderer);
		});

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (file && file.path.startsWith(this.settingsStore.currentSettings.goalsDirectory)) {
					void metricRepository.ensureBlock(this.app, file);
				}
			})
		);

		await this.goalsTable.start();
		await this.tasksTable.start();
		this.inheritanceManager.start();

		await this.checkForUpdates();
	}

	private showStartupOverview(): void {
		const deadlineModal = new DeadlineOverviewModal(this.app, this.goalsManager, this.settingsStore);
		deadlineModal.open();
	}

	override onunload(): void {
		this.inheritanceManager?.stop();
		this.tasksTable?.destroy();
		this.goalsTable?.destroy();
		this.app.workspace.detachLeavesOfType(FUSION_GOALS_VIEW_TYPE);
	}

	updateRibbonIcon(): void {
		if (this.ribbonIconEl) {
			this.ribbonIconEl.remove();
			this.ribbonIconEl = null;
		}

		if (this.settingsStore.currentSettings.showRibbonIcon) {
			this.ribbonIconEl = this.addRibbonIcon("target", "Fusion Goals", () => {
				void this.activateFusionGoals?.();
			});
		}
	}

	private async createTaskFromGoal(goalFile: TFile): Promise<void> {
		try {
			const settings = this.settingsStore.settings$.value;
			const tasksDir = settings.tasksDirectory;

			if (!tasksDir) {
				new Notice("Tasks directory not configured");
				return;
			}

			const goalCache = this.app.metadataCache.getFileCache(goalFile);
			const goalFrontmatter = goalCache?.frontmatter;

			if (!goalFrontmatter) {
				new Notice("Goal file has no frontmatter");
				return;
			}

			const inheritedProps = getInheritableProperties(goalFrontmatter, settings);

			const goalName = goalFile.basename;
			const fileName = `${goalName} - `;

			const goalPath = goalFile.path.replace(/\.md$/, "");
			const goalLink = `[[${goalPath}|${goalName}]]`;

			const frontmatter: Record<string, unknown> = {
				[settings.taskGoalProp]: [goalLink],
				...inheritedProps,
			};

			const templaterService = new TemplaterService(this.app);
			const useTemplater = !!(settings.taskTemplatePath && settings.taskTemplatePath.trim() !== "");

			const newFile = await templaterService.createFileAtomic({
				title: fileName,
				targetDirectory: tasksDir,
				filename: generateUniqueFilePath(this.app, tasksDir, fileName).split("/").pop()?.replace(".md", "") || fileName,
				frontmatter,
				templatePath: settings.taskTemplatePath,
				useTemplater,
			});

			const leaf = this.app.workspace.getLeaf("tab");
			await leaf.openFile(newFile);

			await this.focusInlineTitleAtEnd(leaf);

			new Notice(`Created task: ${newFile.basename}`);
		} catch (error) {
			console.error("Error creating task from goal:", error);
			new Notice(`Error creating task: ${error}`);
		}
	}

	private async focusInlineTitleAtEnd(leaf: WorkspaceLeaf): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 30));

		const view = leaf.view;
		if (!(view instanceof MarkdownView)) return;

		const inlineTitle = view.containerEl.querySelector(".inline-title") as HTMLElement;
		if (!inlineTitle || inlineTitle.contentEditable !== "true") return;

		inlineTitle.focus();

		const range = document.createRange();
		const selection = window.getSelection();

		if (selection) {
			range.selectNodeContents(inlineTitle);
			range.collapse(false);
			selection.removeAllRanges();
			selection.addRange(range);
		}
	}

	private async checkForUpdates(): Promise<void> {
		const currentVersion = this.manifest.version;
		const lastSeenVersion = this.settingsStore.currentSettings.version;

		if (lastSeenVersion !== currentVersion) {
			const config: WhatsNewModalConfig = {
				cssPrefix: "fusion-goals",
				pluginName: "Fusion Goals",
				changelogContent: CHANGELOG_CONTENT,
				links: {
					github: buildUtmUrl(
						"https://github.com/Real1tyy/Fusion-Goals",
						"fusion-goals",
						"plugin",
						"whats_new",
						"github"
					),
					support: buildUtmUrl(
						"https://matejvavroproductivity.com/support/",
						"fusion-goals",
						"plugin",
						"whats_new",
						"support"
					),
					changelog: buildUtmUrl(
						"https://real1tyy.github.io/Fusion-Goals/changelog",
						"fusion-goals",
						"plugin",
						"whats_new",
						"changelog"
					),
					documentation: buildUtmUrl(
						"https://real1tyy.github.io/Fusion-Goals/",
						"fusion-goals",
						"plugin",
						"whats_new",
						"documentation"
					),
				},
			};

			showWhatsNewReactModal(this.app, this, config, lastSeenVersion, currentVersion);
			await this.settingsStore.updateSettings((settings) => ({
				...settings,
				version: currentVersion,
			}));
		}
	}
}
