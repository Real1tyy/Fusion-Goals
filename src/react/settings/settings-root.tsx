import { buildUtmUrl, SettingsUIBuilder } from "@real1ty-obsidian-plugins";
import { SettingsNav, type SettingsNavTab } from "@real1ty-obsidian-plugins-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { BasesViewSettingsSection } from "../../components/settings/sections/bases-view";
import { GraphDisplaySettingsSection } from "../../components/settings/sections/graph-display";
import { HierarchySection } from "../../components/settings/sections/hierarchy";
import { PropertyDisplaySettingsSection } from "../../components/settings/sections/property-display";
import { RulesSection } from "../../components/settings/sections/rules";
import { UserInterfaceSettingsSection } from "../../components/settings/sections/user-interface";
import type { SettingsSection } from "../../components/settings/types";
import type FusionGoalsPlugin from "../../main";
import type { FusionGoalsSettingsSchema } from "../../types/settings";

interface SettingsRootProps {
	plugin: FusionGoalsPlugin;
}

const TABS: SettingsNavTab[] = [
	{ id: "user-interface", label: "User Interface" },
	{ id: "hierarchy", label: "Hierarchy" },
	{ id: "graph-display", label: "Graph" },
	{ id: "property-display", label: "Properties" },
	{ id: "bases-view", label: "Bases" },
	{ id: "rules", label: "Rules" },
];

const FOOTER_LINKS = [
	{
		text: "Support",
		href: buildUtmUrl("https://matejvavroproductivity.com/support/", "fusion-goals", "plugin", "settings", "support"),
	},
];

export const SettingsRoot = memo(function SettingsRoot({ plugin }: SettingsRootProps) {
	const [activeTab, setActiveTab] = useState("user-interface");
	const sectionsRef = useRef<Map<string, SettingsSection>>(new Map());

	if (sectionsRef.current.size === 0) {
		const uiBuilder = new SettingsUIBuilder<typeof FusionGoalsSettingsSchema>(plugin.settingsStore as never);
		const sections: SettingsSection[] = [
			new UserInterfaceSettingsSection(uiBuilder),
			new HierarchySection(plugin, uiBuilder),
			new GraphDisplaySettingsSection(uiBuilder),
			new PropertyDisplaySettingsSection(uiBuilder),
			new BasesViewSettingsSection(plugin, uiBuilder),
			new RulesSection(plugin, uiBuilder),
		];
		for (const s of sections) sectionsRef.current.set(s.id, s);
	}

	return (
		<SettingsNav tabs={TABS} activeId={activeTab} onChange={setActiveTab} footerLinks={FOOTER_LINKS}>
			<ImperativeSection section={sectionsRef.current.get(activeTab)} />
		</SettingsNav>
	);
});

const ImperativeSection = memo(function ImperativeSection({ section }: { section: SettingsSection | undefined }) {
	const ref = useRef<HTMLDivElement>(null);

	const mount = useCallback(() => {
		if (!ref.current || !section) return;
		ref.current.replaceChildren();
		section.render(ref.current);
	}, [section]);

	useEffect(() => {
		mount();
	}, [mount]);

	return <div ref={ref} />;
});
