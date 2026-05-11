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

function buildGoalsBasesMarkdown(settingsStore: FusionGoalsSettingsStore, spec: TabSpec): string {
	const settings = settingsStore.currentSettings;

	const def = BaseBuilder.create()
		.addView({
			type: "table",
			name: "Goals",
			filter: Filter.and(Filter.inFolder(settings.goalsDirectory)),
			order: [
				OrderRef.fileName,
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

const GOALS_TAB_SPECS: TabSpec[] = [
	{ id: "goals-by-name", label: "By Name", sortProperty: "file.name", sortDirection: "ASC" },
	{ id: "goals-by-status", label: "By Status", sortProperty: "note.status", sortDirection: "ASC" },
	{ id: "goals-by-priority", label: "By Priority", sortProperty: "note.priority", sortDirection: "ASC" },
	{ id: "goals-by-end-date", label: "By Deadline", sortProperty: "note.end-date", sortDirection: "ASC" },
];

export function createGoalsTabDefinitions(
	plugin: Plugin,
	settingsStore: FusionGoalsSettingsStore,
	components: Component[]
): TabEntry[] {
	return GOALS_TAB_SPECS.map((spec) => {
		const render = async (el: HTMLElement) => {
			const component = new Component();
			component.load();
			components.push(component);

			const markdown = buildGoalsBasesMarkdown(settingsStore, spec);
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
