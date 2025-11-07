/**
 * Normalize a file path to just the filename (remove directory prefix).
 * This ensures consistent cache keys regardless of how files are linked.
 *
 * @param path - Full path like "Goals/My Goal.md" or just "My Goal.md"
 * @returns Filename only like "My Goal.md"
 *
 * @example
 * normalizePathToFilename("Goals/My Goal.md") // => "My Goal.md"
 * normalizePathToFilename("My Goal.md") // => "My Goal.md"
 */
export function normalizePathToFilename(path: string): string {
	const lastSlash = path.lastIndexOf("/");
	return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
}
