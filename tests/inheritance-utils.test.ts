import { type App, TFile as TFileType } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Frontmatter, FusionGoalsSettings } from "../src/types/settings";
import { applyInheritanceUpdates, getInheritableProperties, mergeProperties } from "../src/utils/inheritance";

// Mock Obsidian imports
vi.mock("obsidian", async () => {
	const actual = await vi.importActual<typeof import("./mocks/obsidian")>("./mocks/obsidian");
	return actual;
});

// Get the mocked TFile constructor
const TFile = TFileType as unknown as new (path: string) => TFileType;

describe("getInheritableProperties", () => {
	const defaultSettings: FusionGoalsSettings = {
		enableFrontmatterInheritance: true,
		inheritanceExcludedProperties: ["Goal", "Project"],
		projectGoalProp: "Goal",
		taskGoalProp: "Goal",
		taskProjectProp: "Project",
	} as FusionGoalsSettings;

	describe("when inheritance is enabled", () => {
		it("should return all non-excluded properties", () => {
			const frontmatter: Frontmatter = {
				Priority: "High",
				Status: "Active",
				Category: "Work",
			};

			const result = getInheritableProperties(frontmatter, defaultSettings);

			expect(result).toEqual({
				Priority: "High",
				Status: "Active",
				Category: "Work",
			});
		});

		it("should exclude relationship properties (Goal, Project)", () => {
			const frontmatter: Frontmatter = {
				Goal: "[[Goals/My Goal]]",
				Project: "[[Projects/My Project]]",
				Priority: "High",
			};

			const result = getInheritableProperties(frontmatter, defaultSettings);

			expect(result).toEqual({
				Priority: "High",
			});
			expect(result).not.toHaveProperty("Goal");
			expect(result).not.toHaveProperty("Project");
		});

		it("should exclude custom excluded properties from settings including tasks", () => {
			const settings: FusionGoalsSettings = {
				...defaultSettings,
				inheritanceExcludedProperties: ["Goal", "Project", "tasks", "CustomProp"],
			};

			const frontmatter: Frontmatter = {
				Priority: "High",
				CustomProp: "Value",
				tasks: ["[[Tasks/Task 1]]"],
				Status: "Active",
			};

			const result = getInheritableProperties(frontmatter, settings);

			expect(result).toEqual({
				Priority: "High",
				Status: "Active",
			});
			expect(result).not.toHaveProperty("CustomProp");
			expect(result).not.toHaveProperty("tasks");
		});

		it("should exclude undefined and null values", () => {
			const frontmatter: Frontmatter = {
				Priority: "High",
				UndefinedProp: undefined,
				NullProp: null,
				Status: "Active",
			};

			const result = getInheritableProperties(frontmatter, defaultSettings);

			expect(result).toEqual({
				Priority: "High",
				Status: "Active",
			});
			expect(result).not.toHaveProperty("UndefinedProp");
			expect(result).not.toHaveProperty("NullProp");
		});

		it("should include zero, false, and empty string values", () => {
			const frontmatter: Frontmatter = {
				NumberZero: 0,
				BooleanFalse: false,
				EmptyString: "",
			};

			const result = getInheritableProperties(frontmatter, defaultSettings);

			expect(result).toEqual({
				NumberZero: 0,
				BooleanFalse: false,
				EmptyString: "",
			});
		});

		it("should return empty object when no inheritable properties exist", () => {
			const frontmatter: Frontmatter = {
				Goal: "[[Goals/My Goal]]",
				Project: "[[Projects/My Project]]",
			};

			const result = getInheritableProperties(frontmatter, defaultSettings);

			expect(result).toEqual({});
		});

		it("should handle empty frontmatter", () => {
			const frontmatter: Frontmatter = {};

			const result = getInheritableProperties(frontmatter, defaultSettings);

			expect(result).toEqual({});
		});

		it("should respect custom relationship property names", () => {
			const settings: FusionGoalsSettings = {
				...defaultSettings,
				projectGoalProp: "ParentGoal",
				taskGoalProp: "LinkedGoal",
				taskProjectProp: "ParentProject",
			};

			const frontmatter: Frontmatter = {
				ParentGoal: "[[Goals/My Goal]]",
				LinkedGoal: "[[Goals/My Goal]]",
				ParentProject: "[[Projects/My Project]]",
				Priority: "High",
			};

			const result = getInheritableProperties(frontmatter, settings);

			expect(result).toEqual({
				Priority: "High",
			});
			expect(result).not.toHaveProperty("ParentGoal");
			expect(result).not.toHaveProperty("LinkedGoal");
			expect(result).not.toHaveProperty("ParentProject");
		});
	});

	describe("when inheritance is disabled", () => {
		it("should return empty object", () => {
			const settings: FusionGoalsSettings = {
				...defaultSettings,
				enableFrontmatterInheritance: false,
			};

			const frontmatter: Frontmatter = {
				Priority: "High",
				Status: "Active",
				Category: "Work",
			};

			const result = getInheritableProperties(frontmatter, settings);

			expect(result).toEqual({});
		});
	});
});

describe("mergeProperties", () => {
	it("should merge properties from single source", () => {
		const result = mergeProperties([{ Priority: "High", Status: "Active" }]);

		expect(result).toEqual({
			Priority: "High",
			Status: "Active",
		});
	});

	it("should merge properties from multiple sources", () => {
		const result = mergeProperties([
			{ Priority: "High", Category: "Work" },
			{ Status: "Active", Owner: "John" },
			{ Difficulty: "Medium" },
		]);

		expect(result).toEqual({
			Priority: "High",
			Category: "Work",
			Status: "Active",
			Owner: "John",
			Difficulty: "Medium",
		});
	});

	it("should merge array properties using union", () => {
		const result = mergeProperties([{ Tags: ["tag-a", "tag-b"] }, { Tags: ["tag-c", "tag-d"] }]);

		expect(result.Tags).toEqual(expect.arrayContaining(["tag-a", "tag-b", "tag-c", "tag-d"]));
		expect((result.Tags as string[]).length).toBe(4);
	});

	it("should deduplicate array properties during merge", () => {
		const result = mergeProperties([{ Tags: ["tag-a", "tag-b", "tag-c"] }, { Tags: ["tag-b", "tag-d", "tag-a"] }]);

		expect(result.Tags).toEqual(expect.arrayContaining(["tag-a", "tag-b", "tag-c", "tag-d"]));
		expect((result.Tags as string[]).length).toBe(4);
	});

	it("should override non-array properties (last value wins)", () => {
		const result = mergeProperties([
			{ Priority: "Low", Status: "Inactive" },
			{ Priority: "Medium" },
			{ Priority: "High" },
		]);

		expect(result).toEqual({
			Priority: "High", // Last value wins
			Status: "Inactive",
		});
	});

	it("should handle mixed array and non-array merging", () => {
		const result = mergeProperties([
			{ Tags: ["tag-a"], Priority: "Low" },
			{ Tags: ["tag-b"], Priority: "High" },
			{ Category: "Work" },
		]);

		expect(result).toEqual({
			Tags: expect.arrayContaining(["tag-a", "tag-b"]),
			Priority: "High", // Last value wins
			Category: "Work",
		});
	});

	it("should handle empty property lists", () => {
		const result = mergeProperties([]);
		expect(result).toEqual({});
	});

	it("should handle empty objects in the list", () => {
		const result = mergeProperties([{ Priority: "High" }, {}, { Status: "Active" }]);

		expect(result).toEqual({
			Priority: "High",
			Status: "Active",
		});
	});

	it("should merge complex nested scenarios", () => {
		const result = mergeProperties([
			{ Tags: ["a", "b"], Priority: "Low", Category: "Work" },
			{ Tags: ["c"], Priority: "Medium", Owner: "Alice" },
			{ Tags: ["b", "d"], Priority: "High" },
		]);

		expect(result).toEqual({
			Tags: expect.arrayContaining(["a", "b", "c", "d"]),
			Priority: "High", // Last wins
			Category: "Work",
			Owner: "Alice",
		});
		expect((result.Tags as string[]).length).toBe(4); // Deduplicated
	});
});

describe("applyInheritanceUpdates", () => {
	let mockApp: App;
	let processFrontMatterSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		processFrontMatterSpy = vi.fn(async (_file, updater) => {
			const mockFm: Frontmatter = {};
			updater(mockFm);
		});

		const mockVault = {
			getAbstractFileByPath: vi.fn((path) => new TFile(path)),
		};

		mockApp = {
			vault: mockVault,
			fileManager: {
				processFrontMatter: processFrontMatterSpy,
			},
		} as unknown as App;
	});

	it("should apply properties to single file", async () => {
		const updates = [
			{
				filePath: "Tasks/Task 1.md",
				properties: {
					Priority: "High",
					Status: "Active",
				},
			},
		];

		await applyInheritanceUpdates(mockApp, updates);

		expect(processFrontMatterSpy).toHaveBeenCalledTimes(1);
		const call = processFrontMatterSpy.mock.calls[0];
		expect(call[0].path).toBe("Tasks/Task 1.md");

		// Test the updater function
		const testFm: Frontmatter = {};
		call[1](testFm);
		expect(testFm).toEqual({
			Priority: "High",
			Status: "Active",
		});
	});

	it("should apply properties to multiple files", async () => {
		const updates = [
			{
				filePath: "Tasks/Task 1.md",
				properties: { Priority: "High" },
			},
			{
				filePath: "Tasks/Task 2.md",
				properties: { Priority: "Low" },
			},
			{
				filePath: "Projects/Project 1.md",
				properties: { Status: "Active" },
			},
		];

		await applyInheritanceUpdates(mockApp, updates);

		expect(processFrontMatterSpy).toHaveBeenCalledTimes(3);
		expect(processFrontMatterSpy.mock.calls[0][0].path).toBe("Tasks/Task 1.md");
		expect(processFrontMatterSpy.mock.calls[1][0].path).toBe("Tasks/Task 2.md");
		expect(processFrontMatterSpy.mock.calls[2][0].path).toBe("Projects/Project 1.md");
	});

	it("should handle empty updates array", async () => {
		await applyInheritanceUpdates(mockApp, []);

		expect(processFrontMatterSpy).not.toHaveBeenCalled();
	});

	it("should skip non-existent files", async () => {
		mockApp.vault.getAbstractFileByPath = vi.fn(() => null);

		const updates = [
			{
				filePath: "NonExistent/File.md",
				properties: { Priority: "High" },
			},
		];

		await applyInheritanceUpdates(mockApp, updates);

		expect(processFrontMatterSpy).not.toHaveBeenCalled();
	});

	it("should skip non-TFile objects", async () => {
		mockApp.vault.getAbstractFileByPath = vi.fn(() => ({
			path: "Folder",
			// Not a TFile
		})) as any;

		const updates = [
			{
				filePath: "Folder",
				properties: { Priority: "High" },
			},
		];

		await applyInheritanceUpdates(mockApp, updates);

		expect(processFrontMatterSpy).not.toHaveBeenCalled();
	});

	it("should handle processFrontMatter errors gracefully", async () => {
		processFrontMatterSpy.mockRejectedValueOnce(new Error("Failed to update"));
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const updates = [
			{
				filePath: "Tasks/Task 1.md",
				properties: { Priority: "High" },
			},
		];

		await expect(applyInheritanceUpdates(mockApp, updates)).resolves.not.toThrow();
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"Failed to update frontmatter for Tasks/Task 1.md:",
			expect.any(Error)
		);

		consoleErrorSpy.mockRestore();
	});

	it("should continue processing remaining files after an error", async () => {
		processFrontMatterSpy
			.mockRejectedValueOnce(new Error("Failed"))
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(undefined);

		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const updates = [
			{ filePath: "Tasks/Task 1.md", properties: { Priority: "High" } },
			{ filePath: "Tasks/Task 2.md", properties: { Status: "Active" } },
			{ filePath: "Tasks/Task 3.md", properties: { Category: "Work" } },
		];

		await applyInheritanceUpdates(mockApp, updates);

		expect(processFrontMatterSpy).toHaveBeenCalledTimes(3);
		expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

		consoleErrorSpy.mockRestore();
	});

	it("should apply empty properties object", async () => {
		const updates = [
			{
				filePath: "Tasks/Task 1.md",
				properties: {},
			},
		];

		await applyInheritanceUpdates(mockApp, updates);

		expect(processFrontMatterSpy).toHaveBeenCalledTimes(1);

		const testFm: Frontmatter = { ExistingProp: "Value" };
		processFrontMatterSpy.mock.calls[0][1](testFm);
		expect(testFm).toEqual({ ExistingProp: "Value" });
	});

	it("should merge array properties without duplicates", async () => {
		const updates = [
			{
				filePath: "Tasks/Task 1.md",
				properties: {
					Tags: ["tag-a", "tag-b", "tag-c"],
					SimpleValue: "new-value",
				},
			},
		];

		await applyInheritanceUpdates(mockApp, updates);

		expect(processFrontMatterSpy).toHaveBeenCalledTimes(1);

		const testFm: Frontmatter = {
			Tags: ["tag-b", "tag-c", "tag-d"], // Existing tags with overlap
			SimpleValue: "old-value",
		};
		processFrontMatterSpy.mock.calls[0][1](testFm);

		// Tags should be merged with deduplication
		expect(testFm.Tags).toEqual(expect.arrayContaining(["tag-a", "tag-b", "tag-c", "tag-d"]));
		expect(testFm.Tags).toHaveLength(4); // No duplicates

		// Simple value should be replaced
		expect(testFm.SimpleValue).toBe("new-value");
	});

	it("should handle incoming array properties with duplicates", async () => {
		const updates = [
			{
				filePath: "Tasks/Task 1.md",
				properties: {
					Tags: ["tag-a", "tag-b", "tag-a", "tag-c", "tag-b"], // Contains duplicates
				},
			},
		];

		await applyInheritanceUpdates(mockApp, updates);

		expect(processFrontMatterSpy).toHaveBeenCalledTimes(1);

		const testFm: Frontmatter = {
			Tags: ["tag-d"], // Existing tag
		};
		processFrontMatterSpy.mock.calls[0][1](testFm);

		// Union operation with Set automatically deduplicates
		expect(testFm.Tags).toEqual(expect.arrayContaining(["tag-a", "tag-b", "tag-c", "tag-d"]));
		expect(testFm.Tags).toHaveLength(4);
	});

	it("should merge multiple inherited array properties", async () => {
		const updates = [
			{
				filePath: "Tasks/Task 1.md",
				properties: {
					Tags: ["tag-a", "tag-b"],
					Categories: ["cat-1", "cat-2"],
				},
			},
		];

		await applyInheritanceUpdates(mockApp, updates);

		expect(processFrontMatterSpy).toHaveBeenCalledTimes(1);

		const testFm: Frontmatter = {
			Tags: ["tag-c", "tag-d"],
			Categories: ["cat-2", "cat-3"], // Overlap with inherited
		};
		processFrontMatterSpy.mock.calls[0][1](testFm);

		// Both arrays should be merged with deduplication
		expect(testFm.Tags).toEqual(expect.arrayContaining(["tag-a", "tag-b", "tag-c", "tag-d"]));
		expect(testFm.Tags).toHaveLength(4);

		expect(testFm.Categories).toEqual(expect.arrayContaining(["cat-1", "cat-2", "cat-3"]));
		expect(testFm.Categories).toHaveLength(3);
	});
});
