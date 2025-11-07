import { describe, expect, it } from "vitest";
import { normalizePathToFilename } from "../src/utils/path";

describe("normalizePathToFilename", () => {
	describe("paths with directories", () => {
		it("should extract filename from single directory path", () => {
			expect(normalizePathToFilename("Goals/My Goal.md")).toBe("My Goal.md");
		});

		it("should extract filename from nested directory path", () => {
			expect(normalizePathToFilename("Goals/Subfolder/My Goal.md")).toBe("My Goal.md");
		});

		it("should extract filename from Projects directory", () => {
			expect(normalizePathToFilename("Projects/Weekly Sprints.md")).toBe("Weekly Sprints.md");
		});

		it("should extract filename from Tasks directory", () => {
			expect(normalizePathToFilename("Tasks/My Task.md")).toBe("My Task.md");
		});

		it("should handle complex filenames with special characters", () => {
			expect(
				normalizePathToFilename("Goals/Achieve Clarity, Structure -> Plan And Organize Your Life -> Dreams.md")
			).toBe("Achieve Clarity, Structure -> Plan And Organize Your Life -> Dreams.md");
		});
	});

	describe("paths without directories", () => {
		it("should return filename as-is if no directory", () => {
			expect(normalizePathToFilename("My Goal.md")).toBe("My Goal.md");
		});

		it("should handle filename with spaces", () => {
			expect(normalizePathToFilename("Weekly Sprint Planning.md")).toBe("Weekly Sprint Planning.md");
		});
	});

	describe("edge cases", () => {
		it("should handle empty string", () => {
			expect(normalizePathToFilename("")).toBe("");
		});

		it("should handle path ending with slash", () => {
			expect(normalizePathToFilename("Goals/")).toBe("");
		});

		it("should handle multiple slashes", () => {
			expect(normalizePathToFilename("a/b/c/d/file.md")).toBe("file.md");
		});
	});
});
