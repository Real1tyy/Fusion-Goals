import { createCssUtils } from "@real1ty-obsidian-plugins";

export const CSS_PREFIX = "fusion-goals-";

export const { cls, addCls, removeCls, toggleCls, hasCls } = createCssUtils(CSS_PREFIX);
