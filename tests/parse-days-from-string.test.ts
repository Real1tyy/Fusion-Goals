import { describe, expect, it } from "vitest";
import { parseDaysFromString } from "../src/utils/date";

describe("parseDaysFromString", () => {
	describe("null and undefined", () => {
		it("should return null for undefined", () => {
			expect(parseDaysFromString(undefined)).toBe(null);
		});

		it("should return null for empty string", () => {
			expect(parseDaysFromString("")).toBe(null);
		});
	});

	describe("today", () => {
		it("should return 0 for 'today'", () => {
			expect(parseDaysFromString("today")).toBe(0);
		});
	});

	describe("future dates (positive days)", () => {
		it("should parse 'in 1 day'", () => {
			expect(parseDaysFromString("in 1 day")).toBe(1);
		});

		it("should parse 'in 5 days'", () => {
			expect(parseDaysFromString("in 5 days")).toBe(5);
		});

		it("should parse 'in 10 days'", () => {
			expect(parseDaysFromString("in 10 days")).toBe(10);
		});

		it("should parse 'in 100 days'", () => {
			expect(parseDaysFromString("in 100 days")).toBe(100);
		});

		it("should parse 'in 365 days'", () => {
			expect(parseDaysFromString("in 365 days")).toBe(365);
		});
	});

	describe("past dates (negative days)", () => {
		it("should parse '1 day ago'", () => {
			expect(parseDaysFromString("1 day ago")).toBe(-1);
		});

		it("should parse '5 days ago'", () => {
			expect(parseDaysFromString("5 days ago")).toBe(-5);
		});

		it("should parse '10 days ago'", () => {
			expect(parseDaysFromString("10 days ago")).toBe(-10);
		});

		it("should parse '100 days ago'", () => {
			expect(parseDaysFromString("100 days ago")).toBe(-100);
		});

		it("should parse '365 days ago'", () => {
			expect(parseDaysFromString("365 days ago")).toBe(-365);
		});
	});

	describe("edge cases", () => {
		it("should return null for strings without numbers", () => {
			expect(parseDaysFromString("no numbers here")).toBe(null);
		});

		it("should return null for empty 'in' or 'ago'", () => {
			expect(parseDaysFromString("in days")).toBe(null);
		});

		it("should handle strings with only numbers", () => {
			expect(parseDaysFromString("5")).toBe(5);
		});

		it("should handle negative numbers in string", () => {
			expect(parseDaysFromString("-5 days")).toBe(-5);
		});

		it("should prioritize 'ago' over negative sign", () => {
			expect(parseDaysFromString("-5 days ago")).toBe(-5);
		});

		it("should handle large numbers", () => {
			expect(parseDaysFromString("in 9999 days")).toBe(9999);
		});

		it("should extract first number from complex strings", () => {
			expect(parseDaysFromString("in 5 days (about 1 week)")).toBe(5);
		});

		it("should handle zero days", () => {
			expect(parseDaysFromString("0 days ago")).toBe(0);
		});
	});

	describe("whitespace variations", () => {
		it("should handle extra whitespace", () => {
			expect(parseDaysFromString("  in   5   days  ")).toBe(5);
		});

		it("should handle no whitespace", () => {
			expect(parseDaysFromString("in5days")).toBe(5);
		});

		it("should handle tabs and newlines", () => {
			expect(parseDaysFromString("in\t5\ndays")).toBe(5);
		});
	});

	describe("case sensitivity", () => {
		it("should handle lowercase 'ago'", () => {
			expect(parseDaysFromString("5 days ago")).toBe(-5);
		});

		it("should handle uppercase 'AGO'", () => {
			expect(parseDaysFromString("5 days AGO")).toBe(-5);
		});

		it("should handle mixed case 'AgO'", () => {
			expect(parseDaysFromString("5 days AgO")).toBe(-5);
		});
	});
});
