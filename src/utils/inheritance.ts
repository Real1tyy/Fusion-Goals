import type { App } from "obsidian";
import { TFile } from "obsidian";
import type { Frontmatter, FusionGoalsSettings } from "../types/settings";

export interface InheritanceUpdate {
	filePath: string;
	properties: Record<string, unknown>;
}

export interface InheritanceRemoval {
	filePath: string;
	propertyRemovals: Record<string, unknown[]>; // key -> values to remove
}

/**
 * Normalizes a wiki link to always include an alias if it contains a path.
 * [[Tags/ADA]] becomes [[Tags/ADA|ADA]]
 * [[Tags/Cold Approach|Cold Approach]] stays as is
 * [[SimpleTag]] stays as is (no path, no alias needed)
 *
 * Handles both raw wiki links and quoted wiki links (from YAML serialization)
 */
function normalizeWikiLink(link: string): string {
	if (typeof link !== "string") {
		return link;
	}

	// Match wiki link pattern (may or may not be wrapped in quotes)
	const wikiLinkMatch = link.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
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

	// Replace the wiki link in the original string (preserves any surrounding quotes)
	return link.replace(/\[\[([^\]|]+)\]\]/, `[[${path}|${alias}]]`);
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

	const { inheritanceExcludedProperties, taskGoalProp } = settings;

	const excludedProps = new Set([...inheritanceExcludedProperties, taskGoalProp]);

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
 * Detect what values were removed from inheritable properties.
 * Compares old and new frontmatter to find removed array values.
 */
export function detectPropertyRemovals(
	oldFrontmatter: Frontmatter | undefined,
	newFrontmatter: Frontmatter,
	settings: FusionGoalsSettings
): Record<string, unknown[]> {
	if (!oldFrontmatter) {
		return {};
	}

	const oldProps = getInheritableProperties(oldFrontmatter, settings);
	const newProps = getInheritableProperties(newFrontmatter, settings);
	const removals: Record<string, unknown[]> = {};

	// Check each property in old frontmatter
	for (const [key, oldValue] of Object.entries(oldProps)) {
		const newValue = newProps[key];

		// Property was completely removed
		if (newValue === undefined) {
			if (Array.isArray(oldValue)) {
				removals[key] = oldValue;
			} else {
				removals[key] = [oldValue];
			}
			continue;
		}

		// Check for removed array items
		if (Array.isArray(oldValue) && Array.isArray(newValue)) {
			const oldSet = new Set(oldValue.map((v) => (typeof v === "string" ? normalizeWikiLink(v) : v)));
			const newSet = new Set(newValue.map((v) => (typeof v === "string" ? normalizeWikiLink(v) : v)));

			const removed = [...oldSet].filter((v) => !newSet.has(v));
			if (removed.length > 0) {
				removals[key] = removed;
			}
		}
	}

	return removals;
}

/**
 * Apply inheritance updates to child files.
 * Updates frontmatter for each file with inherited properties.
 * Arrays are merged (union with automatic deduplication via Set).
 * Also normalizes existing wiki links in the child's frontmatter.
 */
export async function applyInheritanceUpdates(app: App, updates: InheritanceUpdate[]): Promise<void> {
	for (const update of updates) {
		const file = app.vault.getAbstractFileByPath(update.filePath);
		if (!(file instanceof TFile)) {
			continue;
		}

		try {
			await app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
				for (const [key, existingValue] of Object.entries(fm)) {
					if (existingValue !== undefined && existingValue !== null) {
						fm[key] = normalizeValue(existingValue);
					}
				}
				for (const [key, value] of Object.entries(update.properties)) {
					fm[key] = key in fm ? mergeValues(fm[key], value) : value;
				}
			});
		} catch (error) {
			console.error(`Failed to update frontmatter for ${update.filePath}:`, error);
		}
	}
}

/**
 * Apply inheritance removals to child files.
 * Removes specific values from array properties in child files.
 * Also normalizes existing wiki links in the child's frontmatter.
 */
export async function applyInheritanceRemovals(app: App, removals: InheritanceRemoval[]): Promise<void> {
	for (const removal of removals) {
		const file = app.vault.getAbstractFileByPath(removal.filePath);
		if (!(file instanceof TFile)) {
			continue;
		}

		try {
			await app.fileManager.processFrontMatter(file, (fm: Frontmatter) => {
				for (const [key, existingValue] of Object.entries(fm)) {
					if (existingValue !== undefined && existingValue !== null) {
						fm[key] = normalizeValue(existingValue);
					}
				}

				for (const [key, valuesToRemove] of Object.entries(removal.propertyRemovals)) {
					if (!(key in fm)) {
						continue;
					}

					const currentValue = fm[key];

					// If current value is an array, filter out the removed values
					if (Array.isArray(currentValue)) {
						const normalizedRemovals = new Set(
							valuesToRemove.map((v) => (typeof v === "string" ? normalizeWikiLink(v) : v))
						);

						const filtered = currentValue.filter((item) => {
							const normalized = typeof item === "string" ? normalizeWikiLink(item) : item;
							return !normalizedRemovals.has(normalized);
						});

						// Update or delete the property
						if (filtered.length === 0) {
							delete fm[key]; // Remove empty arrays
						} else {
							fm[key] = filtered;
						}
					} else {
						// If it's a single value and matches one of the removed values, delete it
						const normalized = typeof currentValue === "string" ? normalizeWikiLink(currentValue) : currentValue;
						const normalizedRemovals = valuesToRemove.map((v) => (typeof v === "string" ? normalizeWikiLink(v) : v));

						if (normalizedRemovals.includes(normalized)) {
							delete fm[key];
						}
					}
				}
			});
		} catch (error) {
			console.error(`Failed to remove inherited properties from ${removal.filePath}:`, error);
		}
	}
}
