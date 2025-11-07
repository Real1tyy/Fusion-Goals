import type { App } from "obsidian";
import { TFile } from "obsidian";
import type { Frontmatter, FusionGoalsSettings } from "../types/settings";

export interface InheritanceUpdate {
	filePath: string;
	properties: Record<string, unknown>;
}

/**
 * Extract inheritable properties from frontmatter.
 * Filters out relationship properties and user-configured exclusions.
 */
export function getInheritableProperties(
	frontmatter: Frontmatter,
	settings: FusionGoalsSettings
): Record<string, unknown> {
	if (!settings.enableFrontmatterInheritance) {
		return {};
	}

	const { inheritanceExcludedProperties, projectGoalProp, taskGoalProp, taskProjectProp } = settings;

	const excludedProps = new Set([...inheritanceExcludedProperties, projectGoalProp, taskGoalProp, taskProjectProp]);

	return Object.fromEntries(
		Object.entries(frontmatter).filter(
			([key, value]) => !excludedProps.has(key) && value !== undefined && value !== null
		)
	);
}

function mergeValues(existing: unknown, newValue: unknown): unknown {
	if (Array.isArray(existing) && Array.isArray(newValue)) {
		return [...new Set([...existing, ...newValue])];
	}
	return newValue;
}

/**
 * Merge multiple property objects into one.
 * Arrays are merged using union (with deduplication via Set).
 * For non-array values, last value wins.
 */
export function mergeProperties(propsList: Record<string, unknown>[]): Record<string, unknown> {
	const merged: Record<string, unknown> = {};

	for (const props of propsList) {
		for (const [key, value] of Object.entries(props)) {
			merged[key] = key in merged ? mergeValues(merged[key], value) : value;
		}
	}

	return merged;
}

/**
 * Apply inheritance updates to child files.
 * Updates frontmatter for each file with inherited properties.
 * Arrays are merged (union with automatic deduplication via Set).
 */
export async function applyInheritanceUpdates(app: App, updates: InheritanceUpdate[]): Promise<void> {
	for (const update of updates) {
		const file = app.vault.getAbstractFileByPath(update.filePath);
		if (!(file instanceof TFile)) {
			continue;
		}

		try {
			await app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
				for (const [key, value] of Object.entries(update.properties)) {
					fm[key] = key in fm ? mergeValues(fm[key], value) : value;
				}
			});
		} catch (error) {
			console.error(`Failed to update frontmatter for ${update.filePath}:`, error);
		}
	}
}
