import { parseWikiLink } from "./frontmatter-value";

/**
 * Parse wiki links from a frontmatter property value.
 * Handles both single string values and array values.
 * Returns an array of file paths with .md extensions.
 *
 * @param value - The frontmatter property value (string, array, or other)
 * @returns Array of parsed file paths with .md extension (empty if none found)
 *
 * @example
 * // String value
 * parseLinkedPathsFromProperty("[[Goals/My Goal]]")
 * // => ["Goals/My Goal.md"]
 *
 * @example
 * // Array value (parses all)
 * parseLinkedPathsFromProperty(["[[Goals/First]]", "[[Goals/Second]]"])
 * // => ["Goals/First.md", "Goals/Second.md"]
 *
 * @example
 * // Empty array
 * parseLinkedPathsFromProperty([])
 * // => []
 *
 * @example
 * // With alias
 * parseLinkedPathsFromProperty("[[Goals/My Goal|Display Name]]")
 * // => ["Goals/My Goal.md"]
 */
export function parseLinkedPathsFromProperty(value: unknown): string[] {
	const results: string[] = [];

	// Handle string values - convert to single-element array
	if (typeof value === "string" && value.trim()) {
		const parsed = parseWikiLink(value);
		if (parsed?.linkPath) {
			results.push(`${parsed.linkPath}.md`);
		}
	}

	// Handle array values - parse all elements
	if (Array.isArray(value)) {
		for (const item of value) {
			if (typeof item === "string" && item.trim()) {
				const parsed = parseWikiLink(item);
				if (parsed?.linkPath) {
					results.push(`${parsed.linkPath}.md`);
				}
			}
		}
	}

	return results;
}
