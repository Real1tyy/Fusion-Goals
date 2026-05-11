import { BaseBuilder, BaseRenderer, Filter, OrderRef } from "@real1ty-obsidian-plugins";
import { MountImperative, type TabEntry } from "@real1ty-obsidian-plugins-react";
import { Component, MarkdownRenderer, type Plugin } from "obsidian";
import { createElement } from "react";

import type { FusionGoalsSettingsStore } from "../../types/settings";

interface TabSpec {
	id: string;
	label: string;
	sortProperty: string;
	sortDirection: "ASC" | "DESC";
}

function buildTasksBasesMarkdown(settingsStore: FusionGoalsSettingsStore, spec: TabSpec): string {
	const settings = settingsStore.currentSettings;

	const def = BaseBuilder.create()
		.addView({
			type: "table",
			name: "Tasks",
			filter: Filter.and(Filter.inFolder(settings.tasksDirectory)),
			order: [
				OrderRef.fileName,
				OrderRef.note(settings.taskGoalProp),
				OrderRef.note(settings.basesStatusProperty),
				OrderRef.note(settings.priorityProp),
				OrderRef.note(settings.startDateProperty),
				OrderRef.note(settings.endDateProperty),
				OrderRef.note(settings.progressProp),
			],
			sort: [{ property: spec.sortProperty, direction: spec.sortDirection }],
			limit: 50,
		})
		.build();

	return BaseRenderer.renderCodeBlock(def);
}

const TASKS_TAB_SPECS: TabSpec[] = [
	{ id: "tasks-by-name", label: "By Name", sortProperty: "file.name", sortDirection: "ASC" },
	{ id: "tasks-by-goal", label: "By Goal", sortProperty: "note.goal", sortDirection: "ASC" },
	{ id: "tasks-by-status", label: "By Status", sortProperty: "note.status", sortDirection: "ASC" },
	{ id: "tasks-by-priority", label: "By Priority", sortProperty: "note.priority", sortDirection: "ASC" },
	{ id: "tasks-by-end-date", label: "By Deadline", sortProperty: "note.end-date", sortDirection: "ASC" },
];

export function createTasksTabDefinitions(
	plugin: Plugin,
	settingsStore: FusionGoalsSettingsStore,
	components: Component[]
): TabEntry[] {
	return TASKS_TAB_SPECS.map((spec) => {
		const render = async (el: HTMLElement) => {
			const component = new Component();
			component.load();
			components.push(component);

			const markdown = buildTasksBasesMarkdown(settingsStore, spec);
			await MarkdownRenderer.render(plugin.app, markdown, el.createDiv(), "", component);
		};
		const cleanup = () => {
			const idx = components.findIndex((c) => c);
			if (idx >= 0) {
				components[idx].unload();
				components.splice(idx, 1);
			}
		};
		return {
			id: spec.id,
			label: spec.label,
			content: createElement(MountImperative, { render, cleanup }),
		};
	});
}
