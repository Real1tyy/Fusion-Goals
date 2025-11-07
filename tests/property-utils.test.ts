import { describe, expect, it } from "vitest";
import { parseLinkedPathsFromProperty } from "../src/utils/property";

describe("parseLinkedPathsFromProperty", () => {
	describe("string values", () => {
		it("should parse simple wiki link", () => {
			expect(parseLinkedPathsFromProperty("[[Goals/My Goal]]")).toEqual(["Goals/My Goal.md"]);
		});

		it("should parse wiki link with spaces", () => {
			expect(parseLinkedPathsFromProperty("[[Goals/Achieve Clarity]]")).toEqual(["Goals/Achieve Clarity.md"]);
		});

		it("should parse wiki link with special characters", () => {
			expect(parseLinkedPathsFromProperty("[[Goals/Plan & Organize]]")).toEqual(["Goals/Plan & Organize.md"]);
		});

		it("should parse wiki link with alias", () => {
			expect(parseLinkedPathsFromProperty("[[Goals/My Goal|Display Name]]")).toEqual(["Goals/My Goal.md"]);
		});

		it("should parse complex path with alias", () => {
			expect(
				parseLinkedPathsFromProperty("[[Goals/Achieve Clarity, Structure -> Plan And Organize Your Life -> Dreams]]")
			).toEqual(["Goals/Achieve Clarity, Structure -> Plan And Organize Your Life -> Dreams.md"]);
		});

		it("should return empty array for empty string", () => {
			expect(parseLinkedPathsFromProperty("")).toEqual([]);
		});

		it("should return empty array for whitespace-only string", () => {
			expect(parseLinkedPathsFromProperty("   ")).toEqual([]);
		});

		it("should return empty array for non-wiki-link string", () => {
			expect(parseLinkedPathsFromProperty("just text")).toEqual([]);
		});

		it("should return empty array for malformed wiki link", () => {
			expect(parseLinkedPathsFromProperty("[[]]")).toEqual([]);
		});
	});

	describe("array values", () => {
		it("should parse single element from array", () => {
			expect(parseLinkedPathsFromProperty(["[[Goals/My Goal]]"])).toEqual(["Goals/My Goal.md"]);
		});

		it("should parse element with alias", () => {
			expect(parseLinkedPathsFromProperty(["[[Projects/Nexus Properties|Nexus Properties]]"])).toEqual([
				"Projects/Nexus Properties.md",
			]);
		});

		it("should parse all elements when multiple links in array", () => {
			expect(parseLinkedPathsFromProperty(["[[Goals/First]]", "[[Goals/Second]]"])).toEqual([
				"Goals/First.md",
				"Goals/Second.md",
			]);
		});

		it("should parse multiple complex paths", () => {
			expect(
				parseLinkedPathsFromProperty(["[[Goals/First Goal]]", "[[Goals/Second Goal]]", "[[Goals/Third Goal]]"])
			).toEqual(["Goals/First Goal.md", "Goals/Second Goal.md", "Goals/Third Goal.md"]);
		});

		it("should parse complex path from array", () => {
			expect(
				parseLinkedPathsFromProperty(["[[Goals/Achieve Clarity, Structure -> Plan And Organize Your Life -> Dreams]]"])
			).toEqual(["Goals/Achieve Clarity, Structure -> Plan And Organize Your Life -> Dreams.md"]);
		});

		it("should return empty array for empty array", () => {
			expect(parseLinkedPathsFromProperty([])).toEqual([]);
		});

		it("should skip empty strings in array", () => {
			expect(parseLinkedPathsFromProperty(["[[Goals/Valid]]", "", "[[Goals/Also Valid]]"])).toEqual([
				"Goals/Valid.md",
				"Goals/Also Valid.md",
			]);
		});

		it("should skip whitespace in array", () => {
			expect(parseLinkedPathsFromProperty(["[[Goals/Valid]]", "   ", "[[Goals/Also Valid]]"])).toEqual([
				"Goals/Valid.md",
				"Goals/Also Valid.md",
			]);
		});

		it("should skip non-wiki-links in array", () => {
			expect(parseLinkedPathsFromProperty(["[[Goals/Valid]]", "just text", "[[Goals/Also Valid]]"])).toEqual([
				"Goals/Valid.md",
				"Goals/Also Valid.md",
			]);
		});

		it("should skip malformed links in array", () => {
			expect(parseLinkedPathsFromProperty(["[[Goals/Valid]]", "[[]]", "[[Goals/Also Valid]]"])).toEqual([
				"Goals/Valid.md",
				"Goals/Also Valid.md",
			]);
		});

		it("should handle array with non-string elements", () => {
			expect(parseLinkedPathsFromProperty(["[[Goals/Valid]]", 123, "[[Goals/Also Valid]]"])).toEqual([
				"Goals/Valid.md",
				"Goals/Also Valid.md",
			]);
		});

		it("should handle array with null elements", () => {
			expect(parseLinkedPathsFromProperty(["[[Goals/Valid]]", null, "[[Goals/Also Valid]]"])).toEqual([
				"Goals/Valid.md",
				"Goals/Also Valid.md",
			]);
		});
	});

	describe("edge cases", () => {
		it("should return empty array for null", () => {
			expect(parseLinkedPathsFromProperty(null)).toEqual([]);
		});

		it("should return empty array for undefined", () => {
			expect(parseLinkedPathsFromProperty(undefined)).toEqual([]);
		});

		it("should return empty array for number", () => {
			expect(parseLinkedPathsFromProperty(123)).toEqual([]);
		});

		it("should return empty array for boolean", () => {
			expect(parseLinkedPathsFromProperty(true)).toEqual([]);
		});

		it("should return empty array for object", () => {
			expect(parseLinkedPathsFromProperty({ link: "[[Goals/Test]]" })).toEqual([]);
		});
	});

	describe("real-world examples", () => {
		it("should parse goal link from task frontmatter", () => {
			const goalValue = ["[[Goals/Achieve Clarity, Structure -> Plan And Organize Your Life -> Dreams]]"];
			expect(parseLinkedPathsFromProperty(goalValue)).toEqual([
				"Goals/Achieve Clarity, Structure -> Plan And Organize Your Life -> Dreams.md",
			]);
		});

		it("should parse project link from task frontmatter", () => {
			const projectValue = ["[[Projects/Nexus Properties|Nexus Properties]]"];
			expect(parseLinkedPathsFromProperty(projectValue)).toEqual(["Projects/Nexus Properties.md"]);
		});

		it("should handle empty array from frontmatter", () => {
			const emptyValue: unknown[] = [];
			expect(parseLinkedPathsFromProperty(emptyValue)).toEqual([]);
		});

		it("should handle single string from frontmatter", () => {
			const singleValue = "[[Goals/My Goal]]";
			expect(parseLinkedPathsFromProperty(singleValue)).toEqual(["Goals/My Goal.md"]);
		});

		it("should handle task with multiple goals", () => {
			const multipleGoals = ["[[Goals/First Goal]]", "[[Goals/Second Goal]]", "[[Goals/Third Goal]]"];
			expect(parseLinkedPathsFromProperty(multipleGoals)).toEqual([
				"Goals/First Goal.md",
				"Goals/Second Goal.md",
				"Goals/Third Goal.md",
			]);
		});

		it("should handle mixed valid and invalid links", () => {
			const mixedLinks = ["[[Goals/Valid Goal]]", "", null, "[[Goals/Another Valid]]", "not a link"];
			expect(parseLinkedPathsFromProperty(mixedLinks)).toEqual(["Goals/Valid Goal.md", "Goals/Another Valid.md"]);
		});
	});
});
