import { TFile } from "obsidian";

import FileExplorerPlusPlugin from "./main";
import { InputFilterNameModal } from "./ui/modals";
import { checkTagFilter } from "./utils";

export function addCommands(plugin: FileExplorerPlusPlugin) {
    plugin.addCommand({
        id: "toggle-pin-filter",
        name: "Toggle pin filter",
        callback: () => {
            new InputFilterNameModal(plugin, "PIN").open();
        },
    });

    plugin.addCommand({
        id: "toggle-hide-filter",
        name: "Toggle hide filter",
        callback: () => {
            new InputFilterNameModal(plugin, "HIDE").open();
        },
    });

    plugin.addCommand({
        id: "toggle-global-pin-filters",
        name: "Toggle all pin filters",
        callback: () => {
            plugin.settings.actions.PIN.enabled = !plugin.settings.actions.PIN.enabled;

            plugin.saveSettings();
            plugin.getFileExplorer()?.requestSort();
        },
    });

    plugin.addCommand({
        id: "toggle-global-hide-filters",
        name: "Toggle all hide filters",
        callback: () => {
            plugin.settings.actions.HIDE.enabled = !plugin.settings.actions.HIDE.enabled;

            plugin.saveSettings();
            plugin.getFileExplorer()?.requestSort();
        },
    });
}

export function addOnTagChange(plugin: FileExplorerPlusPlugin) {
    plugin.registerEvent(
        plugin.app.metadataCache.on("changed", (path, data, cache) => {
            const isPinned = plugin.getFileExplorer()!.fileItems[path.path].info.pinned;
            const isHidden = plugin.getFileExplorer()!.fileItems[path.path].info.hidden;

            const shouldBePinned = plugin.settings.actions.PIN.filters.some((filter) => checkTagFilter(filter, path));
            const shouldBeHidden = plugin.settings.actions.HIDE.filters.some((filter) => checkTagFilter(filter, path));

            if (isPinned !== shouldBePinned && !shouldBeHidden) {
                plugin.getFileExplorer()?.requestSort();

                return;
            }

            if (isHidden !== shouldBeHidden) {
                plugin.getFileExplorer()?.requestSort();
            }
        }),
    );
}

export function addOnRename(plugin: FileExplorerPlusPlugin) {
    plugin.registerEvent(
        plugin.app.vault.on("rename", (path, oldPath) => {
            const hideFilterPreviousIndex = plugin.settings.actions.HIDE.paths.findIndex((pathFilter) => {
                if (pathFilter.patternType === "STRICT" && pathFilter.pattern === oldPath) {
                    return true;
                }

                return false;
            });

            if (hideFilterPreviousIndex !== -1) {
                plugin.settings.actions.HIDE.paths[hideFilterPreviousIndex].pattern = path.path;
            }

            const pinFilterPreviousIndex = plugin.settings.actions.PIN.paths.findIndex((pathFilter) => {
                if (pathFilter.patternType === "STRICT" && pathFilter.pattern === oldPath) {
                    return true;
                }

                return false;
            });

            if (pinFilterPreviousIndex !== -1) {
                plugin.settings.actions.PIN.paths[pinFilterPreviousIndex].pattern = path.path;
            }
        }),
    );
}

export function addOnDelete(plugin: FileExplorerPlusPlugin) {
    plugin.registerEvent(
        plugin.app.vault.on("delete", (path) => {
            const hideFilterPreviousIndex = plugin.settings.actions.HIDE.paths.findIndex((pathFilter) => {
                if (pathFilter.patternType === "STRICT" && pathFilter.pattern === path.path) {
                    return true;
                }

                return false;
            });

            if (hideFilterPreviousIndex !== -1) {
                plugin.settings.actions.HIDE.paths.splice(hideFilterPreviousIndex, 1);
            }

            const pinFilterPreviousIndex = plugin.settings.actions.PIN.paths.findIndex((pathFilter) => {
                if (pathFilter.patternType === "STRICT" && pathFilter.pattern === path.path) {
                    return true;
                }

                return false;
            });

            if (pinFilterPreviousIndex !== -1) {
                plugin.settings.actions.PIN.paths.splice(pinFilterPreviousIndex, 1);
            }
        }),
    );
}

export function addCommandsToFileMenu(plugin: FileExplorerPlusPlugin) {
    plugin.registerEvent(
        plugin.app.workspace.on("file-menu", (menu, path) => {
            if (path instanceof TFile) {
                menu.addSeparator()
                    .addItem((item) => {
                        const index = plugin.settings.actions.PIN.paths.findIndex(
                            (filter) => filter.patternType === "STRICT" && filter.type === "FILES" && filter.pattern === path.path,
                        );

                        if (index === -1 || !plugin.settings.actions.PIN.paths[index].active) {
                            item.setTitle("Pin File")
                                .setIcon("pin")
                                .onClick(() => {
                                    if (index === -1) {
                                        plugin.settings.actions.PIN.paths.push({
                                            name: "",
                                            active: true,
                                            type: "FILES",
                                            pattern: path.path,
                                            patternType: "STRICT",
                                        });
                                    } else {
                                        plugin.settings.actions.PIN.paths[index].active = true;
                                    }

                                    plugin.saveSettings();
                                    if (plugin.settings.actions.PIN.enabled) {
                                        plugin.getFileExplorer()?.requestSort();
                                    }
                                });
                        } else {
                            item.setTitle("Unpin File")
                                .setIcon("pin-off")
                                .onClick(() => {
                                    plugin.settings.actions.PIN.paths.splice(index, 1);

                                    plugin.saveSettings();
                                    plugin.getFileExplorer()?.requestSort();
                                });
                        }
                    })
                    .addItem((item) => {
                        const index = plugin.settings.actions.HIDE.paths.findIndex(
                            (filter) => filter.patternType === "STRICT" && filter.type === "FILES" && filter.pattern === path.path,
                        );

                        if (index === -1 || !plugin.settings.actions.HIDE.paths[index].active) {
                            item.setTitle("Hide File")
                                .setIcon("eye-off")
                                .onClick(() => {
                                    if (index === -1) {
                                        plugin.settings.actions.HIDE.paths.push({
                                            name: "",
                                            active: true,
                                            type: "FILES",
                                            pattern: path.path,
                                            patternType: "STRICT",
                                        });
                                    } else {
                                        plugin.settings.actions.HIDE.paths[index].active = true;
                                    }

                                    plugin.saveSettings();
                                    if (plugin.settings.actions.HIDE.enabled) {
                                        plugin.getFileExplorer()?.requestSort();
                                    }
                                });
                        } else {
                            item.setTitle("Unhide File")
                                .setIcon("eye")
                                .onClick(() => {
                                    plugin.settings.actions.HIDE.paths.splice(index, 1);

                                    plugin.saveSettings();
                                    plugin.getFileExplorer()?.requestSort();
                                });
                        }
                    });
            } else {
                menu.addSeparator()
                    .addItem((item) => {
                        const index = plugin.settings.actions.PIN.paths.findIndex(
                            (filter) => filter.patternType === "STRICT" && filter.type === "DIRECTORIES" && filter.pattern === path.path,
                        );

                        if (index === -1 || !plugin.settings.actions.PIN.paths[index].active) {
                            item.setTitle("Pin Folder")
                                .setIcon("pin")
                                .onClick(() => {
                                    if (index === -1) {
                                        plugin.settings.actions.PIN.paths.push({
                                            name: "",
                                            active: true,
                                            type: "DIRECTORIES",
                                            pattern: path.path,
                                            patternType: "STRICT",
                                        });
                                    } else {
                                        plugin.settings.actions.PIN.paths[index].active = true;
                                    }

                                    plugin.saveSettings();
                                    if (plugin.settings.actions.PIN.enabled) {
                                        plugin.getFileExplorer()?.requestSort();
                                    }
                                });
                        } else {
                            item.setTitle("Unpin Folder")
                                .setIcon("pin-off")
                                .onClick(() => {
                                    plugin.settings.actions.PIN.paths.splice(index, 1);

                                    plugin.saveSettings();
                                    plugin.getFileExplorer()?.requestSort();
                                });
                        }
                    })
                    .addItem((item) => {
                        const index = plugin.settings.actions.HIDE.paths.findIndex(
                            (filter) => filter.patternType === "STRICT" && filter.type === "DIRECTORIES" && filter.pattern === path.path,
                        );

                        if (index === -1 || !plugin.settings.actions.HIDE.paths[index].active) {
                            item.setTitle("Hide Folder")
                                .setIcon("eye-off")
                                .onClick(() => {
                                    if (index === -1) {
                                        plugin.settings.actions.HIDE.paths.push({
                                            name: "",
                                            active: true,
                                            type: "DIRECTORIES",
                                            pattern: path.path,
                                            patternType: "STRICT",
                                        });
                                    } else {
                                        plugin.settings.actions.HIDE.paths[index].active = true;
                                    }

                                    plugin.saveSettings();
                                    if (plugin.settings.actions.HIDE.enabled) {
                                        plugin.getFileExplorer()?.requestSort();
                                    }
                                });
                        } else {
                            item.setTitle("Unhide Folder")
                                .setIcon("eye")
                                .onClick(() => {
                                    plugin.settings.actions.HIDE.paths.splice(index, 1);

                                    plugin.saveSettings();
                                    plugin.getFileExplorer()?.requestSort();
                                });
                        }
                    });
            }
        }),
    );
}
