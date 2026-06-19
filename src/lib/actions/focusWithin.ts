import type { ActionReturn } from "svelte/action";

interface FocusWithinOptions {
    onFocusChange: (focused: boolean) => void;
}

/** Svelte action that fires a callback whenever focus enters/leaves the node subtree. */
export function focusWithin(node: HTMLElement, options: FocusWithinOptions): ActionReturn {
    function onFocusIn() {
        options.onFocusChange(true);
    }

    function onFocusOut(e: FocusEvent) {
        if (!node.contains(e.relatedTarget as Node | null)) {
            options.onFocusChange(false);
        }
    }

    node.addEventListener("focusin", onFocusIn);
    node.addEventListener("focusout", onFocusOut);

    return {
        destroy() {
            node.removeEventListener("focusin", onFocusIn);
            node.removeEventListener("focusout", onFocusOut);
        },
    };
}
