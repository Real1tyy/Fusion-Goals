import { showSchemaModal } from "@real1ty-obsidian-plugins";
import type { App } from "obsidian";

import { cls } from "../../constants";
import type { GoalsManager } from "../../core/goals-manager";
import type { GoalFrontmatter, GoalRow } from "../../types/frontmatter";
import { GoalFrontmatterShape } from "../../types/frontmatter";
import type { FusionGoalsSettingsStore } from "../../types/settings";

export function showGoalModal(
	app: App,
	goalsManager: GoalsManager,
	settingsStore: FusionGoalsSettingsStore,
	existing?: GoalRow
): void {
	const settings = settingsStore.currentSettings;

	showSchemaModal<GoalFrontmatter>({
		app,
		cls: cls("goal-modal"),
		title: existing ? "Edit Goal" : "Create Goal",
		shape: GoalFrontmatterShape,
		nameField: { placeholder: "Goal name" },
		...(existing ? { existing: { id: existing.id, data: existing.data } } : {}),
		fieldOverrides: {
			archived: { hidden: true },
			status: {
				options: Object.fromEntries(settings.basesStatusValues.map((s) => [s, s])),
			},
		},
		upsert: {
			create: (name, values) => goalsManager.createGoal(name, values),
			update: (name, values) => goalsManager.updateGoal(name, values),
			entityName: "Goal",
		},
	});
}
