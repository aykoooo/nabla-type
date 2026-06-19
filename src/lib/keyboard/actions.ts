import { simController } from "$lib/store/simController";
import { store } from "$lib/store/simStore.svelte";
import {
    formatShortcut,
    groupActions,
    isMacPlatform,
    matchesShortcut,
    type Action,
    type ActionCategory,
    type ShortcutDef,
} from "./types";

export { formatShortcut, groupActions, isMacPlatform, matchesShortcut };
export type { Action, ActionCategory, ShortcutDef };

const modShortcut = (code: string): ShortcutDef => ({ code, mod: true });
const canvasShortcut = (code: string): ShortcutDef => ({ code });

export const actions: Action[] = [
    {
        id: "playback.playPause",
        label: "Play / Pause",
        category: "Playback",
        shortcut: { code: "Space", displayKey: "Space" },
        run() {
            simController.handlePause();
        },
    },
    {
        id: "playback.reseed",
        label: "Reseed with current text",
        category: "Playback",
        shortcut: modShortcut("KeyE"),
        run() {
            simController.handleLoop();
        },
    },
    {
        id: "playback.reset",
        label: "Reset simulation",
        category: "Playback",
        shortcut: canvasShortcut("KeyR"),
        canvasOnly: true,
        run() {
            simController.handleLoop();
        },
    },
    {
        id: "playback.clear",
        label: "Clear simulation",
        category: "Playback",
        shortcut: [
            { code: "Backspace", displayKey: "⌫" },
            { code: "Delete", displayKey: "Del" },
        ],
        canvasOnly: true,
        run() {
            simController.handleTrash();
        },
    },
    {
        id: "playback.undo",
        label: "Undo",
        category: "Playback",
        shortcut: modShortcut("KeyZ"),
        run() {
            simController.handleUndo();
        },
    },
    {
        id: "presets.prev",
        label: "Previous preset",
        category: "Presets",
        shortcut: canvasShortcut("BracketLeft"),
        canvasOnly: true,
        run() {
            simController.cyclePreset(-1);
        },
    },
    {
        id: "presets.next",
        label: "Next preset",
        category: "Presets",
        shortcut: canvasShortcut("BracketRight"),
        canvasOnly: true,
        run() {
            simController.cyclePreset(1);
        },
    },
    {
        id: "viewport.fit",
        label: "Fit / fill canvas",
        category: "Viewport",
        shortcut: canvasShortcut("KeyF"),
        canvasOnly: true,
        run() {
            simController.handleMax();
        },
    },
    {
        id: "viewport.center",
        label: "Center canvas",
        category: "Viewport",
        shortcut: canvasShortcut("KeyC"),
        canvasOnly: true,
        run() {
            simController.handleCenter();
        },
    },
    {
        id: "viewport.centerAndFit",
        label: "Center + fit canvas",
        category: "Viewport",
        shortcut: { code: "Digit0", mod: true, displayKey: "0" },
        run() {
            simController.handleCenter();
            simController.handleMax();
        },
    },
    {
        id: "params.resetAll",
        label: "Reset all parameters",
        category: "Parameters",
        shortcut: { code: "KeyE", mod: true, shift: true },
        run() {
            simController.resetParamsToPreset();
        },
    },
    {
        id: "timeline.stepBack",
        label: "Step replay backward",
        category: "Timeline",
        shortcut: { code: "ArrowLeft", displayKey: "←" },
        run() {
            simController.handleReplayStep(-1);
        },
    },
    {
        id: "timeline.stepForward",
        label: "Step replay forward",
        category: "Timeline",
        shortcut: { code: "ArrowRight", displayKey: "→" },
        run() {
            simController.handleReplayStep(1);
        },
    },
    {
        id: "export.savePng",
        label: "Save PNG",
        category: "Export",
        shortcut: modShortcut("KeyS"),
        run() {
            simController.handleSave();
        },
    },
    {
        id: "ui.openCommandPalette",
        label: "Command palette",
        category: "UI",
        shortcut: modShortcut("KeyK"),
        run() {
            store.commandPaletteOpen = true;
        },
    },
    {
        id: "ui.openKeyboardHelp",
        label: "Keyboard shortcuts",
        category: "UI",
        shortcut: { code: "Slash", shift: true, displayKey: "?" },
        run() {
            store.keyboardHelpOpen = true;
        },
    },
];

/** Convenience lookup by action id. */
export function getAction(id: string): Action | undefined {
    return actions.find((a) => a.id === id);
}
