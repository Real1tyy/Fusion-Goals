import type { VaultTable, VaultTableEvent } from "@real1ty-obsidian-plugins";
import { TFile, type App } from "obsidian";
import type { Subscription } from "rxjs";

import type { GoalFrontmatter, TaskFrontmatter } from "../types/frontmatter";
import type { Frontmatter, FusionGoalsSettings } from "../types/settings";
import {
	applyInheritanceRemovals,
	applyInheritanceUpdates,
	detectPropertyRemovals,
	getInheritableProperties,
	type InheritanceRemoval,
	type InheritanceUpdate,
} from "../utils/inheritance";
import { buildTitleLink, extractWikiLinksFromValue } from "../utils/string-utils";
import type { GoalsManager } from "./goals-manager";

export class InheritanceManager {
	private goalsSub: Subscription | null = null;
	private tasksSub: Subscription | null = null;

	constructor(
		private app: App,
		private goalsTable: VaultTable<GoalFrontmatter>,
		private tasksTable: VaultTable<TaskFrontmatter>,
		private goalsManager: GoalsManager,
		private settingsGetter: () => FusionGoalsSettings
	) {}

	start(): void {
		this.goalsSub = this.goalsTable.events$.subscribe((event) => {
			void this.handleGoalEvent(event);
		});

		this.tasksSub = this.tasksTable.events$.subscribe((event) => {
			void this.handleTaskEvent(event);
		});
	}

	stop(): void {
		this.goalsSub?.unsubscribe();
		this.goalsSub = null;
		this.tasksSub?.unsubscribe();
		this.tasksSub = null;
	}

	async propagateAll(): Promise<void> {
		const settings = this.settingsGetter();
		if (!settings.enableFrontmatterInheritance) return;

		for (const goal of this.goalsManager.getAllGoals()) {
			const frontmatter = this.getRawFrontmatter(goal.filePath);
			if (!frontmatter) continue;

			await this.propagateGoalInheritance(goal.filePath, frontmatter);
		}

		await this.updateAllTitleProperties();
	}

	private async handleGoalEvent(event: VaultTableEvent<GoalFrontmatter>): Promise<void> {
		if (event.type !== "row-updated" && event.type !== "row-created") return;

		const settings = this.settingsGetter();
		if (!settings.enableFrontmatterInheritance) return;

		const newFrontmatter = this.getRawFrontmatter(event.filePath);
		if (!newFrontmatter) return;

		const oldFrontmatter = event.type === "row-updated" ? this.getRawFrontmatterFromRow(event.oldRow) : undefined;

		await this.propagateGoalInheritance(event.filePath, newFrontmatter, oldFrontmatter);
	}

	private async handleTaskEvent(event: VaultTableEvent<TaskFrontmatter>): Promise<void> {
		if (event.type !== "row-updated" && event.type !== "row-created") return;

		const file = this.app.vault.getAbstractFileByPath(event.filePath);
		if (!(file instanceof TFile)) return;

		const row = event.type === "row-created" ? event.row : event.newRow;
		await this.updateTitleProperty(file, row.data as Record<string, unknown>);
	}

	private async propagateGoalInheritance(
		goalPath: string,
		newFrontmatter: Frontmatter,
		oldFrontmatter?: Frontmatter
	): Promise<void> {
		const settings = this.settingsGetter();
		const inheritableProps = getInheritableProperties(newFrontmatter, settings);
		const propertyRemovals = oldFrontmatter ? detectPropertyRemovals(oldFrontmatter, newFrontmatter, settings) : {};

		const childTasks = this.goalsManager.getTasksForGoal(goalPath);
		const taskPaths = childTasks.map((t) => t.filePath);

		const updates: InheritanceUpdate[] = taskPaths.map((filePath) => ({
			filePath,
			properties: inheritableProps,
		}));

		const removals: InheritanceRemoval[] =
			Object.keys(propertyRemovals).length > 0 ? taskPaths.map((filePath) => ({ filePath, propertyRemovals })) : [];

		await applyInheritanceRemovals(this.app, removals);
		await applyInheritanceUpdates(this.app, updates);
	}

	private async updateTitleProperty(file: TFile, data: Record<string, unknown>): Promise<void> {
		const settings = this.settingsGetter();
		if (!settings.titlePropertyEnabled) return;

		const { taskGoalProp, titleProp } = settings;
		const parentWikiLinks = extractWikiLinksFromValue(data[taskGoalProp]);
		const titleLink = buildTitleLink(file.path, parentWikiLinks);

		const currentTitle = data[titleProp];
		if (currentTitle === titleLink) return;

		await this.app.fileManager.processFrontMatter(file, (fm) => {
			fm[titleProp] = titleLink;
		});
	}

	private async updateAllTitleProperties(): Promise<void> {
		const settings = this.settingsGetter();
		if (!settings.titlePropertyEnabled) return;

		for (const task of this.goalsManager.getAllTasks()) {
			const file = this.app.vault.getAbstractFileByPath(task.filePath);
			if (!(file instanceof TFile)) continue;
			await this.updateTitleProperty(file, task.data as Record<string, unknown>);
		}
	}

	private getRawFrontmatter(filePath: string): Frontmatter | null {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return null;
		return this.app.metadataCache.getFileCache(file)?.frontmatter ?? null;
	}

	private getRawFrontmatterFromRow(row: { data: GoalFrontmatter }): Frontmatter | undefined {
		return row.data as unknown as Frontmatter;
	}
}
