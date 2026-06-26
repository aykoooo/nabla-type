let lockCount = 0;
let originalCursor = "";

export function setGlobalCursor(cursor: string): void {
    if (lockCount === 0) {
        originalCursor = document.body.style.cursor;
    }
    lockCount++;
    document.body.style.cursor = cursor;
}

export function restoreGlobalCursor(): void {
    if (lockCount <= 0) return;
    lockCount--;
    if (lockCount === 0) {
        document.body.style.cursor = originalCursor;
    }
}
