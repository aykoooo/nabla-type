/**
 * Shared keyboard/action types for the command palette and global shortcut manager.
 */

export type ActionCategory =
    | "Playback"
    | "Presets"
    | "Viewport"
    | "Parameters"
    | "Timeline"
    | "Export"
    | "UI";

export interface ShortcutDef {
    /** KeyboardEvent.code used for matching (e.g. "KeyR", "Space", "BracketLeft"). */
    code: string;
    /** When true, this shortcut uses Cmd on macOS and Ctrl on Windows/Linux. */
    mod?: boolean;
    shift?: boolean;
    alt?: boolean;
    /** Optional override for the key shown to the user. */
    displayKey?: string;
}

export interface Action {
    id: string;
    label: string;
    category: ActionCategory;
    /** One or more physical shortcuts that trigger this action. */
    shortcut?: ShortcutDef | ShortcutDef[];
    /** Single-key shortcuts that only work on the canvas and respect the accessibility toggle. */
    canvasOnly?: boolean;
    run(): void | Promise<void>;
}

export function isMacPlatform(): boolean {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
}

function getDisplayKey(shortcut: ShortcutDef): string {
    if (shortcut.displayKey) return shortcut.displayKey;
    switch (shortcut.code) {
        case "Space":
            return "Space";
        case "Backspace":
            return "⌫";
        case "Delete":
        case "Del":
            return "Del";
        case "ArrowLeft":
            return "←";
        case "ArrowRight":
            return "→";
        case "ArrowUp":
            return "↑";
        case "ArrowDown":
            return "↓";
        case "BracketLeft":
            return "[";
        case "BracketRight":
            return "]";
        case "Slash":
            return "/";
        case "Digit0":
            return "0";
        default: {
            // KeyR -> R, etc.
            if (shortcut.code.startsWith("Key")) {
                return shortcut.code.slice(3).toUpperCase();
            }
            if (shortcut.code.startsWith("Digit")) {
                return shortcut.code.slice(5);
            }
            return shortcut.code;
        }
    }
}

function formatSingleShortcut(shortcut: ShortcutDef): string {
    const mac = isMacPlatform();
    const parts: string[] = [];
    if (shortcut.mod) parts.push(mac ? "⌘" : "Ctrl");
    if (shortcut.shift) parts.push(mac ? "⇧" : "Shift");
    if (shortcut.alt) parts.push(mac ? "⌥" : "Alt");
    parts.push(getDisplayKey(shortcut));
    return mac ? parts.join("") : parts.join("+");
}

export function formatShortcut(shortcut: ShortcutDef | ShortcutDef[]): string {
    const list = Array.isArray(shortcut) ? shortcut : [shortcut];
    const formatted = list.map(formatSingleShortcut);
    return formatted.join(" / ");
}

export function matchesShortcut(
    event: KeyboardEvent,
    shortcut: ShortcutDef,
): boolean {
    if (shortcut.code && event.code !== shortcut.code) return false;

    const isMac = isMacPlatform();
    const modHeld = event.ctrlKey || event.metaKey;

    if (shortcut.mod) {
        // Match platform-specific primary modifier exactly.
        const correctMod = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
        if (!correctMod) return false;
    } else if (modHeld) {
        // Single-key/canvas shortcuts should not fire together with a modifier.
        return false;
    }

    if (!!shortcut.shift !== event.shiftKey) return false;
    if (!!shortcut.alt !== event.altKey) return false;
    return true;
}

export function isInteractiveElement(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "BUTTON" || tag === "A" || tag === "DETAILS" || tag === "SUMMARY") return true;
    const role = el.getAttribute("role");
    if (role === "button" || role === "checkbox" || role === "radio" || role === "link" || role === "tab") return true;
    return el.isContentEditable;
}

export function groupActions(actions: Action[]): Record<ActionCategory, Action[]> {
    const grouped = {} as Record<ActionCategory, Action[]>;
    for (const action of actions) {
        if (!grouped[action.category]) grouped[action.category] = [];
        grouped[action.category].push(action);
    }
    return grouped;
}
