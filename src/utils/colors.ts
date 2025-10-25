import type { BehaviorSubject } from "rxjs";
import type { FusionGoalsSettings } from "../types/settings";
import { BaseEvaluator, type BaseRule } from "./base-evaluator";

export interface ColorRule extends BaseRule {
	color: string;
}

export class ColorEvaluator extends BaseEvaluator<ColorRule, FusionGoalsSettings> {
	private defaultColor: string;

	constructor(settingsStore: BehaviorSubject<FusionGoalsSettings>) {
		super(settingsStore);
		this.defaultColor = settingsStore.value.defaultNodeColor;

		settingsStore.subscribe((settings) => {
			if (settings.defaultNodeColor) {
				this.defaultColor = settings.defaultNodeColor;
			}
		});
	}

	protected extractRules(settings: FusionGoalsSettings): ColorRule[] {
		return settings.colorRules;
	}

	evaluateColor(frontmatter: Record<string, unknown>): string {
		const match = this.rules.find((rule) => this.isTruthy(this.evaluateRule(rule, frontmatter)));
		return match?.color ?? this.defaultColor;
	}
}
