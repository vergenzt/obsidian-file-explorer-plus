import { App, PluginSettingTab, Setting } from "obsidian";

import { PathSuggest } from "./ui/suggest";

import FileExplorerPlusPlugin from "./main";
import { PathsActivatedModal } from "./ui/modals";

export type FilterAction = "HIDE" | "PIN";

export interface TagFilter {
	kind: "TAG";
    name: string;
    active: boolean;
    pattern: string;
    patternType: "REGEX" | "WILDCARD" | "STRICT";
}

export interface PathFilter {
	kind: "PATH";
    name: string;
    active: boolean;
    type: "FILES" | "DIRECTORIES" | "FILES_AND_DIRECTORIES";
    pattern: string;
    patternType: "REGEX" | "WILDCARD" | "STRICT";
}

export interface PropertyFilter {
	kind: "PROPERTY";
    name: string;
    active: boolean;
    propertyNamePattern: string;
    propertyNamePatternType: "REGEX" | "WILDCARD" | "STRICT";
    propertyValuePattern: string;
    propertyValuePatternType: "REGEX" | "WILDCARD" | "STRICT";
}

export interface FileExplorerPlusPluginSettings {
    hideStrictPathFilters: boolean;
	actions: Record<FilterAction, {
		enabled: boolean;
		filters: Filter[];
	}>;
}

const DEFAULT_FILTERS: Filter[] = [
	{
		kind: "TAG",
		name: "",
		active: true,
		pattern: "",
		patternType: "STRICT",
	},
	{
		kind: "PATH",
		name: "",
		active: true,
		type: "FILES_AND_DIRECTORIES",
		pattern: "",
		patternType: "WILDCARD",
	}
];

export const UNSEEN_FILES_DEFAULT_SETTINGS: FileExplorerPlusPluginSettings = {
    hideStrictPathFilters: true,
    actions: {
		PIN: {
			enabled: true,
			filters: JSON.parse(JSON.stringify(DEFAULT_FILTERS)),
		},
		HIDE: {
			enabled: true,
			filters: JSON.parse(JSON.stringify(DEFAULT_FILTERS)),
		},
	},
};

export type Filter = TagFilter | PathFilter;

export default class FileExplorerPlusSettingTab extends PluginSettingTab {
    constructor(
        app: App,
        private plugin: FileExplorerPlusPlugin,
    ) {
        super(app, plugin);
    }

    display(): void {
        this.cleanSettings();

        this.containerEl.empty();
        this.containerEl.addClass("file-explorer-plus");

        new Setting(this.containerEl)
            .setName("Hide strict path filters in settings")
            .setDesc(
                "Hide path filters with type strict from both the pin and hide filter tables below. Good for decluttering the filter tables. These are created when pinning or hiding a file straight in the file explorer.",
            )
            .addToggle((toggle) => {
                toggle
                    .setTooltip("Active")
                    .setValue(this.plugin.settings.hideStrictPathFilters)
                    .onChange((isActive) => {
                        this.plugin.settings.hideStrictPathFilters = isActive;

                        this.plugin.saveSettings();

                        this.display();
                    });
            });

        this.containerEl.createEl("h2", { text: "Pin filters", attr: { class: "settings-header" } });
        new Setting(this.containerEl)
            .setName("Enable pin filters")
            .setDesc("Toggle whether or not pin filters for paths and folders should be active.")
            .addToggle((toggle) => {
                toggle
                    .setTooltip("Active")
                    .setValue(this.plugin.settings.actions.PIN.enabled)
                    .onChange((isActive) => {
                        this.plugin.settings.actions.PIN.enabled = isActive;

                        this.plugin.saveSettings();

                        this.plugin.getFileExplorer()?.requestSort();
                    });
            });

        new Setting(this.containerEl)
            .setName("View paths pinned by filters")
            .setDesc("View paths that are currently being pinned by the active filters below.")
            .addButton((button) => {
                button.setButtonText("View").onClick(() => {
                    new PathsActivatedModal(this.plugin, "PIN").open();
                });
            });
        this.pinTagFiltersSettings();
        this.pinPathFiltersSettings();

        this.containerEl.createEl("h2", { text: "Hide filters", attr: { class: "settings-header" } });
        new Setting(this.containerEl)
            .setName("Enable hide filters")
            .setDesc("Toggle whether or not hide filters for paths and folders should be active.")
            .addToggle((toggle) => {
                toggle
                    .setTooltip("Active")
                    .setValue(this.plugin.settings.actions.HIDE.enabled)
                    .onChange((isActive) => {
                        this.plugin.settings.actions.HIDE.enabled = isActive;

                        this.plugin.saveSettings();

                        this.plugin.getFileExplorer()?.requestSort();
                    });
            });

        new Setting(this.containerEl)
            .setName("View paths hidden by filters")
            .setDesc("View paths that are currently being hidden by the active filters below.")
            .addButton((button) => {
                button.setButtonText("View").onClick(() => {
                    new PathsActivatedModal(this.plugin, "HIDE").open();
                });
            });
        this.hideTagFiltersSettings();
        this.hidePathFiltersSettings();
    }

    cleanSettings() {
        this.plugin.settings.actions.HIDE.filters = this.plugin.settings.actions.HIDE.filters.filter((filter, index, arr) => {
            if (index == arr.length - 1) {
                return true;
            }

            return filter.pattern !== "" && arr.findIndex((x) => x.pattern === filter.pattern) === index;
        });
    }

    pinTagFiltersSettings() {
        this.containerEl.createEl("h2", { text: "Tag filters" });

        this.plugin.settings.actions.PIN.filters.filter(f => f.kind == "TAG").forEach((filter, index) => {
            new Setting(this.containerEl)
                .addText((text) => {
                    text.setPlaceholder("Name (optional)")
                        .setValue(filter.name)
                        .onChange((newName) => {
                            this.plugin.settings.actions.PIN.tags[index].name = newName;

                            this.plugin.saveSettings();
                        });
                })
                .addText((text) => {
                    text.setPlaceholder("Tag pattern (required)")
                        .setValue(filter.pattern)
                        .onChange((newPattern) => {
                            this.plugin.settings.actions.PIN.tags[index].pattern = newPattern;

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            WILDCARD: "Wildcard",
                            REGEX: "Regex",
                            STRICT: "Strict",
                        })
                        .setValue(filter.patternType)
                        .onChange((newPatternType) => {
                            this.plugin.settings.actions.PIN.tags[index].patternType = newPatternType as Filter["patternType"];

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addToggle((toggle) => {
                    toggle
                        .setTooltip("Active")
                        .setValue(filter.active)
                        .onChange((isActive) => {
                            this.plugin.settings.actions.PIN.tags[index].active = isActive;

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("calculator")
                        .setTooltip("View paths pinned by this filter")
                        .onClick(() => {
                            new PathsActivatedModal(this.plugin, "PIN", filter, "TAG").open();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            this.plugin.settings.actions.PIN.tags.splice(index, 1);

                            this.plugin.saveSettings();
                            this.display();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                });
        });

        new Setting(this.containerEl).addButton((button) => {
            button
                .setButtonText("Add new pin filter for tags")
                .setCta()
                .onClick(() => {
                    this.plugin.settings.actions.PIN.tags.push({
						kind: "TAG",
                        name: "",
                        active: true,
                        pattern: "",
                        patternType: "STRICT",
                    });
                    this.plugin.saveSettings();
                    this.display();
                });
        });
    }

    pinPathFiltersSettings() {
        this.containerEl.createEl("h2", { text: "Path filters" });

        this.plugin.settings.actions.PIN.paths.forEach((filter, index) => {
            if (this.plugin.settings.hideStrictPathFilters && filter.patternType === "STRICT") {
                return;
            }

            new Setting(this.containerEl)
                .addText((text) => {
                    text.setPlaceholder("Name (optional)")
                        .setValue(filter.name)
                        .onChange((newName) => {
                            this.plugin.settings.actions.PIN.paths[index].name = newName;

                            this.plugin.saveSettings();
                        });
                })
                .addSearch((text) => {
                    new PathSuggest(this.app, text.inputEl);

                    text.setPlaceholder("Path pattern (required)")
                        .setValue(filter.pattern)
                        .onChange((newPattern) => {
                            this.plugin.settings.actions.PIN.paths[index].pattern = newPattern;

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            FILES_AND_DIRECTORIES: "Files and folders",
                            FILES: "Files",
                            DIRECTORIES: "Folders",
                        })
                        .setValue(filter.type)
                        .onChange((newType) => {
                            this.plugin.settings.actions.PIN.paths[index].type = newType as PathFilter["type"];

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            WILDCARD: "Wildcard",
                            REGEX: "Regex",
                            STRICT: "Strict",
                        })
                        .setValue(filter.patternType)
                        .onChange((newPatternType) => {
                            this.plugin.settings.actions.PIN.paths[index].patternType = newPatternType as Filter["patternType"];

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addToggle((toggle) => {
                    toggle
                        .setTooltip("Active")
                        .setValue(filter.active)
                        .onChange((isActive) => {
                            this.plugin.settings.actions.PIN.paths[index].active = isActive;

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("calculator")
                        .setTooltip("View paths pinned by this filter")
                        .onClick(() => {
                            new PathsActivatedModal(this.plugin, "PIN", filter, "PATH").open();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            this.plugin.settings.actions.PIN.paths.splice(index, 1);

                            this.plugin.saveSettings();
                            this.display();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                });
        });

        new Setting(this.containerEl).addButton((button) => {
            button
                .setButtonText("Add new pin filter for paths")
                .setCta()
                .onClick(() => {
                    this.plugin.settings.actions.PIN.paths.push({
						kind: "PATH",
                        name: "",
                        active: true,
                        type: "FILES_AND_DIRECTORIES",
                        pattern: "",
                        patternType: "WILDCARD",
                    });
                    this.plugin.saveSettings();
                    this.display();
                });
        });
    }
    hideTagFiltersSettings() {
        this.containerEl.createEl("h2", { text: "Tag filters" });

        this.plugin.settings.actions.HIDE.tags.forEach((filter, index) => {
            new Setting(this.containerEl)
                .addText((text) => {
                    text.setPlaceholder("Name (optional)")
                        .setValue(filter.name)
                        .onChange((newName) => {
                            this.plugin.settings.actions.HIDE.tags[index].name = newName;

                            this.plugin.saveSettings();
                        });
                })
                .addText((text) => {
                    text.setPlaceholder("Tag pattern (required)")
                        .setValue(filter.pattern)
                        .onChange((newPattern) => {
                            this.plugin.settings.actions.HIDE.tags[index].pattern = newPattern;

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            WILDCARD: "Wildcard",
                            REGEX: "Regex",
                            STRICT: "Strict",
                        })
                        .setValue(filter.patternType)
                        .onChange((newPatternType) => {
                            this.plugin.settings.actions.HIDE.tags[index].patternType = newPatternType as Filter["patternType"];

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addToggle((toggle) => {
                    toggle
                        .setTooltip("Active")
                        .setValue(filter.active)
                        .onChange((isActive) => {
                            this.plugin.settings.actions.HIDE.tags[index].active = isActive;

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("calculator")
                        .setTooltip("View paths hidden by this filter")
                        .onClick(() => {
                            new PathsActivatedModal(this.plugin, "HIDE", filter, "TAG").open();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            this.plugin.settings.actions.HIDE.tags.splice(index, 1);

                            this.plugin.saveSettings();
                            this.display();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                });
        });

        new Setting(this.containerEl).addButton((button) => {
            button
                .setButtonText("Add new hide filter for tags")
                .setCta()
                .onClick(() => {
                    this.plugin.settings.actions.HIDE.tags.push({
						kind: "TAG",
                        name: "",
                        active: true,
                        pattern: "",
                        patternType: "STRICT",
                    });
                    this.plugin.saveSettings();
                    this.display();
                });
        });
    }

    hidePathFiltersSettings() {
        this.containerEl.createEl("h2", { text: "Path filters" });

        this.plugin.settings.actions.HIDE.paths.forEach((filter, index) => {
            if (this.plugin.settings.hideStrictPathFilters && filter.patternType === "STRICT") {
                return;
            }

            new Setting(this.containerEl)
                .addText((text) => {
                    text.setPlaceholder("Name (optional)")
                        .setValue(filter.name)
                        .onChange((newName) => {
                            this.plugin.settings.actions.HIDE.paths[index].name = newName;

                            this.plugin.saveSettings();
                        });
                })
                .addSearch((text) => {
                    new PathSuggest(this.app, text.inputEl);

                    text.setPlaceholder("Path pattern (required)")
                        .setValue(filter.pattern)
                        .onChange((newPattern) => {
                            this.plugin.settings.actions.HIDE.paths[index].pattern = newPattern;

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            FILES_AND_DIRECTORIES: "Files and folders",
                            FILES: "Files",
                            DIRECTORIES: "Folders",
                        })
                        .setValue(filter.type)
                        .onChange((newType) => {
                            this.plugin.settings.actions.HIDE.paths[index].type = newType as PathFilter["type"];

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addDropdown((dropdown) => {
                    dropdown
                        .addOptions({
                            WILDCARD: "Wildcard",
                            REGEX: "Regex",
                            STRICT: "Strict",
                        })
                        .setValue(filter.patternType)
                        .onChange((newPatternType) => {
                            this.plugin.settings.actions.HIDE.paths[index].patternType = newPatternType as Filter["patternType"];

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addToggle((toggle) => {
                    toggle
                        .setTooltip("Active")
                        .setValue(filter.active)
                        .onChange((isActive) => {
                            this.plugin.settings.actions.HIDE.paths[index].active = isActive;

                            this.plugin.saveSettings();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("calculator")
                        .setTooltip("View paths hidden by this filter")
                        .onClick(() => {
                            new PathsActivatedModal(this.plugin, "HIDE", filter, "PATH").open();
                        });
                })
                .addExtraButton((button) => {
                    button
                        .setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(() => {
                            this.plugin.settings.actions.HIDE.paths.splice(index, 1);

                            this.plugin.saveSettings();
                            this.display();
                            this.plugin.getFileExplorer()?.requestSort();
                        });
                });
        });

        new Setting(this.containerEl).addButton((button) => {
            button
                .setButtonText("Add new hide filter for paths")
                .setCta()
                .onClick(() => {
                    this.plugin.settings.actions.HIDE.paths.push({
						kind: "PATH",
                        name: "",
                        active: true,
                        type: "FILES_AND_DIRECTORIES",
                        pattern: "",
                        patternType: "WILDCARD",
                    });
                    this.plugin.saveSettings();
                    this.display();
                });
        });
    }
}
