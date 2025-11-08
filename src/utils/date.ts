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

export interface DateInfo {
	label: string;
	value: string;
	type: "since" | "remaining";
}

export interface DateInfoOptions {
	frontmatter: Record<string, unknown>;
	startDateProperty?: string;
	endDateProperty?: string;
	showDaysSince: boolean;
	showDaysRemaining: boolean;
}

/**
 * Extract date information (days since start, days remaining) from frontmatter.
 * Returns an array of formatted date info that can be rendered by UI components.
 *
 * @param options - Configuration options
 * @returns Array of date info objects
 */
export function extractDateInfo(options: DateInfoOptions): DateInfo[] {
	const { frontmatter, startDateProperty, endDateProperty, showDaysSince, showDaysRemaining } = options;
	const dateParts: DateInfo[] = [];

	// Calculate days since start
	if (showDaysSince && startDateProperty) {
		const startValue = frontmatter[startDateProperty];
		const daysSince = calculateDaysRemainingFromFrontmatter(startValue);
		if (daysSince) {
			dateParts.push({ label: "Started", value: daysSince, type: "since" });
		}
	}

	// Calculate days remaining
	if (showDaysRemaining && endDateProperty) {
		const endValue = frontmatter[endDateProperty];
		const daysRemaining = calculateDaysRemainingFromFrontmatter(endValue);
		if (daysRemaining) {
			dateParts.push({ label: "Due", value: daysRemaining, type: "remaining" });
		}
	}

	return dateParts;
}

/**
 * Parse a relative date string into a numeric day count.
 * Converts human-readable strings like "in 5 days", "5 days ago", "today"
 * into numeric values (positive = future, negative = past, 0 = today).
 *
 * @param daysString - Formatted string from calculateDaysRemainingFromFrontmatter
 * @returns Numeric day count or null if invalid
 */
export function parseDaysFromString(daysString?: string): number | null {
	if (!daysString) return null;

	// Handle "today" case
	if (daysString === "today") return 0;

	// Extract the numeric value from strings like "in 5 days" or "5 days ago"
	const match = daysString.match(/-?\d+/);
	if (!match) return null;

	let days = parseInt(match[0], 10);

	// If the string contains "ago" (case-insensitive), make it negative (past dates)
	if (daysString.toLowerCase().includes("ago")) {
		days = -Math.abs(days);
	}

	// Handle -0 case (convert to 0)
	return days === 0 ? 0 : days;
}

/**
 * Format days remaining with special handling for Today/Tomorrow/Yesterday.
 * Used in deadline overview UI.
 *
 * @param days - Number of days (positive = future, negative = past)
 * @returns Formatted string like "Today", "Tomorrow", "in 5 days", etc.
 */
export function formatDaysRemaining(days: number): string {
	if (days === 0) return "Today";
	if (days === 1) return "Tomorrow";
	if (days === -1) return "Yesterday";
	if (days > 0) return `in ${days} days`;
	return `${Math.abs(days)} days ago`;
}

export type DaysRemainingClass = "past" | "today" | "urgent" | "soon" | "future";

/**
 * Get CSS class name based on days remaining for styling urgency.
 *
 * @param days - Number of days remaining
 * @returns Class name for styling
 */
export function getDaysRemainingClass(days: number): DaysRemainingClass {
	if (days < 0) return "past";
	if (days === 0) return "today";
	if (days <= 3) return "urgent";
	if (days <= 7) return "soon";
	return "future";
}
