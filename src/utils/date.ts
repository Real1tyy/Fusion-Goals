/**
 * Calculate the difference in days between two dates.
 * Positive values indicate future dates, negative values indicate past dates.
 *
 * @param targetDate - The target date to compare against
 * @param referenceDate - The reference date (defaults to now)
 * @returns Number of days difference (positive = future, negative = past)
 */
export function calculateDaysDifference(targetDate: Date, referenceDate: Date = new Date()): number {
	const msPerDay = 1000 * 60 * 60 * 24;
	const targetTime = targetDate.getTime();
	const referenceTime = referenceDate.getTime();
	const diffMs = targetTime - referenceTime;
	return Math.round(diffMs / msPerDay);
}

/**
 * Format a days difference as a human-readable relative string.
 *
 * @param days - Number of days (positive = future, negative = past)
 * @returns Formatted string like "in 5 days", "5 days ago", "today", etc.
 */
export function formatDaysRelative(days: number): string {
	if (days === 0) {
		return "today";
	}
	if (days === 1) {
		return "in 1 day";
	}
	if (days === -1) {
		return "1 day ago";
	}
	if (days > 0) {
		return `in ${days} days`;
	}
	return `${Math.abs(days)} days ago`;
}

/**
 * Extract and parse a date from frontmatter property value.
 * Supports Date objects, ISO strings, and datetime strings.
 *
 * @param value - The frontmatter property value
 * @returns Parsed Date object or null if invalid
 */
export function parseDateFromFrontmatter(value: unknown): Date | null {
	if (!value) {
		return null;
	}

	if (value instanceof Date) {
		return value;
	}

	if (typeof value === "string") {
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed;
		}
	}

	return null;
}

/**
 * Calculate days remaining until a target date from frontmatter.
 * Returns formatted string or null if date is invalid.
 *
 * @param dateValue - The frontmatter date value
 * @returns Formatted relative string or null
 */
export function calculateDaysRemainingFromFrontmatter(dateValue: unknown): string | null {
	const date = parseDateFromFrontmatter(dateValue);
	if (!date) {
		return null;
	}

	const days = calculateDaysDifference(date);
	return formatDaysRelative(days);
}
