import type { App } from "obsidian";
import { TFile } from "obsidian";
import type { Frontmatter, FusionGoalsSettings } from "../types/settings";

export interface InheritanceUpdate {
	filePath: string;
	properties: Record<string, unknown>;
}

/**
 * Normalizes a wiki link to always include an alias if it contains a path.
 * [[Tags/ADA]] becomes [[Tags/ADA|ADA]]
 * [[Tags/Cold Approach|Cold Approach]] stays as is
 * [[SimpleTag]] stays as is (no path, no alias needed)
 */
function normalizeWikiLink(link: string): string {
	const wikiLinkMatch = link.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
	if (!wikiLinkMatch) {
		return link;
	}

	const path = wikiLinkMatch[1];
	const existingAlias = wikiLinkMatch[2];

	// If already has alias, keep it
	if (existingAlias) {
		return link;
	}

	// Only add alias if the link contains a path (has a /)
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		// No path separator, keep as is
		return link;
	}

	const alias = path.substring(lastSlashIndex + 1);
	return `[[${path}|${alias}]]`;
}

/**
 * Normalizes a value by ensuring all wiki links have aliases.
 * Handles strings and arrays of strings.
 */
function normalizeValue(value: unknown): unknown {
	if (typeof value === "string") {
		return normalizeWikiLink(value);
	}

	if (Array.isArray(value)) {
		return value.map((item) => (typeof item === "string" ? normalizeWikiLink(item) : item));
	}

	return value;
}

/**
 * Extract inheritable properties from frontmatter.
 * Filters out relationship properties and user-configured exclusions.
 * Normalizes wiki links to always include aliases.
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

	const filtered = Object.fromEntries(
		Object.entries(frontmatter).filter(
			([key, value]) => !excludedProps.has(key) && value !== undefined && value !== null
		)
	);

	return Object.fromEntries(Object.entries(filtered).map(([key, value]) => [key, normalizeValue(value)]));
}

/**
 * Merge two values, handling arrays specially by creating a union with deduplication.
 * For non-array values, the new value replaces the existing one.
 * Normalizes wiki links in both existing and new values.
 */
function mergeValues(existing: unknown, newValue: unknown): unknown {
	if (Array.isArray(existing) && Array.isArray(newValue)) {
		// Normalize both arrays before merging
		const normalizedExisting = existing.map((item) => (typeof item === "string" ? normalizeWikiLink(item) : item));
		const normalizedNew = newValue.map((item) => (typeof item === "string" ? normalizeWikiLink(item) : item));
		return [...new Set([...normalizedExisting, ...normalizedNew])];
	}
	return normalizeValue(newValue);
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
