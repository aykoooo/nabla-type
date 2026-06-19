import { store } from "$lib/store/simStore.svelte";
import { actions } from "./actions";
import { isInteractiveElement, matchesShortcut, type Action, type ShortcutDef } from "./types";

class KeyboardManager {
    private handler = this.handleKeyDown.bind(this);
    private listening = false;

    start() {
        if (this.listening || typeof window === "undefined") return;
        window.addEventListener("keydown", this.handler);
        this.listening = true;
    }

    stop() {
        if (!this.listening || typeof window === "undefined") return;
        window.removeEventListener("keydown", this.handler);
        this.listening = false;
    }

    private handleKeyDown(event: KeyboardEvent) {
        // Let modals/overlay components handle their own keyboard interactions.
        if (store.commandPaletteOpen || store.keyboardHelpOpen) return;

        // Ignore auto-repeat events so holding a key doesn't spam actions.
        if (event.repeat) return;

        const target = event.target as HTMLElement | null;
        const inInteractive = target ? isInteractiveElement(target) : false;

        // The parameter map has its own arrow-key handler — leave those events alone
        // so feed/kill nudging works without interference from replay stepping.
        if (
            target?.closest?.("#parameter-map") &&
            (event.code === "ArrowLeft" ||
                event.code === "ArrowRight" ||
                event.code === "ArrowUp" ||
                event.code === "ArrowDown")
        ) {
            return;
        }

        for (const action of actions) {
            // Canvas-only single-key shortcuts can be globally disabled via preference.
            if (action.canvasOnly && !store.singleKeyShortcutsEnabled) continue;

            const shortcuts = action.shortcut
                ? Array.isArray(action.shortcut)
                    ? action.shortcut
                    : [action.shortcut]
                : [];

            const matched = shortcuts.some((shortcut) => {
                // Inside interactive controls (inputs, buttons, custom checkboxes, etc.),
                // only allow modifier shortcuts so native control handling isn't hijacked.
                if (inInteractive && !shortcut.mod) return false;
                return matchesShortcut(event, shortcut);
            });

            if (matched) {
                event.preventDefault();
                event.stopPropagation();
                void action.run();
                return;
            }
        }
    }
}

export const keyboardManager = new KeyboardManager();
