import { SettingsStore as GenericSettingsStore } from "@real1ty-obsidian-plugins/utils/settings-store";
import type { Plugin } from "obsidian";
import { FusionGoalsSettingsSchema } from "../types/settings";

export class SettingsStore extends GenericSettingsStore<typeof FusionGoalsSettingsSchema> {
	constructor(plugin: Plugin) {
		super(plugin, FusionGoalsSettingsSchema);
	}
}
