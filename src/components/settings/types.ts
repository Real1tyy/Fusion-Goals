export interface SettingsSection {
	id: string;
	label: string;
	render(containerEl: HTMLElement): void;
}
