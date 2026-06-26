export function blurActiveElement(): void {
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === "function") {
        active.blur();
    }
}
