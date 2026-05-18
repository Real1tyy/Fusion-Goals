import { extractDisplayName, removeMarkdownExtension } from "@real1ty-obsidian-plugins";

/**
 * Matches separator characters at the start of a string (spaces, dashes, en-dashes, em-dashes).
 */
const SEPARATOR_PATTERN = /^[\s\-–—]+/;

/**
 * Strips the parent name prefix from a display name if it matches common patterns.
 * Handles patterns like:
 * - "Parent - Child" → "Child"
 * - "Parent – Child" → "Child" (en-dash)
 * - "Parent Child" → "Child"
 * - "Parent-Child" → "Child"
 *
 * @param displayName - The display name to strip the prefix from
 * @param parentDisplayName - The parent display name to strip
 * @returns The display name with the parent prefix removed, or the original name if no match
 */
export function stripParentPrefix(displayName: string, parentDisplayName: string): string {
	if (!parentDisplayName) return displayName;

	// Check if display name starts with parent name
	if (!displayName.startsWith(parentDisplayName)) {
		return displayName;
	}

	// Get the remainder after the parent name
	const remainder = displayName.slice(parentDisplayName.length);

	// Must have a separator after the parent name (space, dash, en-dash, em-dash)
	if (!SEPARATOR_PATTERN.test(remainder)) {
		return displayName;
	}

	// Strip leading separators to get the actual child name
	const stripped = remainder.replace(SEPARATOR_PATTERN, "");

	// Only return stripped version if we have meaningful content left
	return stripped || displayName;
}

/**
 * Computes the display title for a file based on its basename and parent links.
 * If the file has parents, strips the first parent's name from the basename.
 *
 * @param baseName - The file's base name (display name)
 * @param parentWikiLinks - Array of parent wiki links
 * @returns Computed title with parent prefix stripped if applicable
 */
export function computeTitle(baseName: string, parentWikiLinks: string[]): string {
	if (!parentWikiLinks.length) {
		return baseName;
	}
	const firstParentLink = parentWikiLinks[0];
	const parentDisplayName = extractDisplayName(firstParentLink);
	return stripParentPrefix(baseName, parentDisplayName);
}

/**
 * Builds a complete title property wiki link for a file based on its path and parent relationships.
 *
 * @param filePath - The full file path (with or without extension)
 * @param parentWikiLinks - Array of parent wiki links
 * @returns Formatted wiki link in the format `[[path|title]]`
 *
 * @example
 * buildTitleLink("Tasks/My Goal - Task Name.md", ["[[Goals/My Goal|My Goal]]"])
 * // Returns: "[[Tasks/My Goal - Task Name|Task Name]]"
 */
export function buildTitleLink(filePath: string, parentWikiLinks: string[]): string {
	const pathWithoutExt = removeMarkdownExtension(filePath);
	const displayName = extractDisplayName(filePath);
	const title = computeTitle(displayName, parentWikiLinks);
	return `[[${pathWithoutExt}|${title}]]`;
}

/**
 * Extracts raw wiki link strings from a frontmatter property value.
 * Handles both single string values and array values.
 *
 * @param value - The frontmatter property value
 * @returns Array of raw wiki link strings
 */
export function extractWikiLinksFromValue(value: unknown): string[] {
	if (typeof value === "string" && value.trim()) {
		return [value];
	}
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
	}
	return [];
}
