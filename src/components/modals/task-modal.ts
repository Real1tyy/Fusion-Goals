import { showSchemaModal } from "@real1ty-obsidian-plugins";
import type { App } from "obsidian";

import type { GoalsManager } from "../../core/goals-manager";
import type { TaskFrontmatter, TaskRow } from "../../types/frontmatter";
import { TaskFrontmatterShape } from "../../types/frontmatter";
import type { FusionGoalsSettingsStore } from "../../types/settings";

function buildGoalOptions(goalsManager: GoalsManager): Record<string, string> {
	const options: Record<string, string> = {};
	for (const goal of goalsManager.getAllGoals()) {
		const goalPath = goal.filePath.replace(/\.md$/, "");
		options[`[[${goalPath}|${goal.id}]]`] = goal.id;
	}
	return options;
}

function unwrapGoal(goal: string | string[] | undefined): string {
	if (Array.isArray(goal)) return goal[0] ?? "";
	return (goal as string) ?? "";
}

export function showTaskModal(
	app: App,
	goalsManager: GoalsManager,
	settingsStore: FusionGoalsSettingsStore,
	existing?: TaskRow
): void {
	const settings = settingsStore.currentSettings;

	showSchemaModal<TaskFrontmatter>({
		app,
		cls: "fusion-goals-task-modal",
		title: existing ? "Edit Task" : "Create Task",
		shape: TaskFrontmatterShape,
		nameField: { placeholder: "Task name" },
		...(existing
			? { existing: { id: existing.id, data: { ...existing.data, goal: unwrapGoal(existing.data.goal) } } }
			: {}),
		fieldOverrides: {
			goal: { options: buildGoalOptions(goalsManager) },
			title: { hidden: true },
			archived: { hidden: true },
			status: {
				options: Object.fromEntries(settings.basesStatusValues.map((s) => [s, s])),
			},
		},
		upsert: {
			create: (name, values) =>
				goalsManager.createTask(name, { ...values, goal: values.goal ? [String(values.goal)] : undefined }),
			update: (name, values) =>
				goalsManager.updateTask(name, { ...values, goal: values.goal ? [String(values.goal)] : undefined }),
			entityName: "Task",
		},
	});
}
