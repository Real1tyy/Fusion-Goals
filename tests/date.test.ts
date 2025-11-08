import { describe, expect, it } from "vitest";
import {
	calculateDaysDifference,
	calculateDaysRemainingFromFrontmatter,
	formatDaysRelative,
	formatDaysRemaining,
	getDaysRemainingClass,
	parseDateFromFrontmatter,
} from "../src/utils/date";

describe("calculateDaysDifference", () => {
	it("should return 0 for same date", () => {
		const date = new Date("2025-01-15T12:00:00Z");
		expect(calculateDaysDifference(date, date)).toBe(0);
	});

	it("should return positive number for future dates", () => {
		const reference = new Date("2025-01-15T12:00:00Z");
		const future = new Date("2025-01-20T12:00:00Z");
		expect(calculateDaysDifference(future, reference)).toBe(5);
	});

	it("should return negative number for past dates", () => {
		const reference = new Date("2025-01-15T12:00:00Z");
		const past = new Date("2025-01-10T12:00:00Z");
		expect(calculateDaysDifference(past, reference)).toBe(-5);
	});

	it("should round to nearest day", () => {
		const reference = new Date("2025-01-15T12:00:00Z");
		const future = new Date("2025-01-16T18:00:00Z"); // 1.25 days
		expect(calculateDaysDifference(future, reference)).toBe(1);
	});

	it("should handle large differences", () => {
		const reference = new Date("2025-01-15T12:00:00Z");
		const future = new Date("2025-03-16T12:00:00Z"); // ~60 days
		expect(calculateDaysDifference(future, reference)).toBe(60);
	});
});

describe("formatDaysRelative", () => {
	it("should format 0 days as 'today'", () => {
		expect(formatDaysRelative(0)).toBe("today");
	});

	it("should format 1 day as 'in 1 day'", () => {
		expect(formatDaysRelative(1)).toBe("in 1 day");
	});

	it("should format -1 day as '1 day ago'", () => {
		expect(formatDaysRelative(-1)).toBe("1 day ago");
	});

	it("should format positive days as 'in X days'", () => {
		expect(formatDaysRelative(5)).toBe("in 5 days");
		expect(formatDaysRelative(30)).toBe("in 30 days");
		expect(formatDaysRelative(100)).toBe("in 100 days");
	});

	it("should format negative days as 'X days ago'", () => {
		expect(formatDaysRelative(-5)).toBe("5 days ago");
		expect(formatDaysRelative(-30)).toBe("30 days ago");
		expect(formatDaysRelative(-100)).toBe("100 days ago");
	});
});

describe("parseDateFromFrontmatter", () => {
	it("should return null for null or undefined", () => {
		expect(parseDateFromFrontmatter(null)).toBeNull();
		expect(parseDateFromFrontmatter(undefined)).toBeNull();
	});

	it("should parse Date objects", () => {
		const date = new Date("2025-01-15T12:00:00Z");
		expect(parseDateFromFrontmatter(date)).toEqual(date);
	});

	it("should parse ISO date strings", () => {
		const dateStr = "2025-01-15T12:00:00Z";
		const parsed = parseDateFromFrontmatter(dateStr);
		expect(parsed).toBeInstanceOf(Date);
		expect(parsed?.toISOString()).toBe("2025-01-15T12:00:00.000Z");
	});

	it("should parse YYYY-MM-DD strings", () => {
		const dateStr = "2025-01-15";
		const parsed = parseDateFromFrontmatter(dateStr);
		expect(parsed).toBeInstanceOf(Date);
	});

	it("should return null for invalid strings", () => {
		expect(parseDateFromFrontmatter("invalid-date")).toBeNull();
		expect(parseDateFromFrontmatter("not a date")).toBeNull();
	});

	it("should return null for non-date types", () => {
		expect(parseDateFromFrontmatter(123)).toBeNull();
		expect(parseDateFromFrontmatter(true)).toBeNull();
		expect(parseDateFromFrontmatter({})).toBeNull();
	});
});

describe("calculateDaysRemainingFromFrontmatter", () => {
	it("should return null for invalid dates", () => {
		expect(calculateDaysRemainingFromFrontmatter(null)).toBeNull();
		expect(calculateDaysRemainingFromFrontmatter("invalid")).toBeNull();
	});

	it("should calculate and format valid dates", () => {
		const now = new Date();
		const future = new Date(now);
		future.setDate(future.getDate() + 5);

		const result = calculateDaysRemainingFromFrontmatter(future.toISOString());
		expect(result).toBe("in 5 days");
	});

	it("should handle past dates", () => {
		const now = new Date();
		const past = new Date(now);
		past.setDate(past.getDate() - 3);

		const result = calculateDaysRemainingFromFrontmatter(past.toISOString());
		expect(result).toBe("3 days ago");
	});

	it("should handle today", () => {
		const now = new Date();
		const result = calculateDaysRemainingFromFrontmatter(now);
		expect(result).toBe("today");
	});
});

describe("formatDaysRemaining", () => {
	it("should format 0 days as 'Today'", () => {
		expect(formatDaysRemaining(0)).toBe("Today");
	});

	it("should format 1 day as 'Tomorrow'", () => {
		expect(formatDaysRemaining(1)).toBe("Tomorrow");
	});

	it("should format -1 day as 'Yesterday'", () => {
		expect(formatDaysRemaining(-1)).toBe("Yesterday");
	});

	it("should format positive days as 'in X days'", () => {
		expect(formatDaysRemaining(2)).toBe("in 2 days");
		expect(formatDaysRemaining(5)).toBe("in 5 days");
		expect(formatDaysRemaining(30)).toBe("in 30 days");
	});

	it("should format negative days as 'X days ago'", () => {
		expect(formatDaysRemaining(-2)).toBe("2 days ago");
		expect(formatDaysRemaining(-5)).toBe("5 days ago");
		expect(formatDaysRemaining(-30)).toBe("30 days ago");
	});
});

describe("getDaysRemainingClass", () => {
	it("should return 'past' for negative days", () => {
		expect(getDaysRemainingClass(-1)).toBe("past");
		expect(getDaysRemainingClass(-5)).toBe("past");
		expect(getDaysRemainingClass(-100)).toBe("past");
	});

	it("should return 'today' for 0 days", () => {
		expect(getDaysRemainingClass(0)).toBe("today");
	});

	it("should return 'urgent' for 1-3 days", () => {
		expect(getDaysRemainingClass(1)).toBe("urgent");
		expect(getDaysRemainingClass(2)).toBe("urgent");
		expect(getDaysRemainingClass(3)).toBe("urgent");
	});

	it("should return 'soon' for 4-7 days", () => {
		expect(getDaysRemainingClass(4)).toBe("soon");
		expect(getDaysRemainingClass(5)).toBe("soon");
		expect(getDaysRemainingClass(6)).toBe("soon");
		expect(getDaysRemainingClass(7)).toBe("soon");
	});

	it("should return 'future' for 8+ days", () => {
		expect(getDaysRemainingClass(8)).toBe("future");
		expect(getDaysRemainingClass(10)).toBe("future");
		expect(getDaysRemainingClass(30)).toBe("future");
		expect(getDaysRemainingClass(100)).toBe("future");
	});
});
