export function hexToRgb(hex: string): [number, number, number] {
    const safe = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#000000";
    return [
        parseInt(safe.slice(1, 3), 16),
        parseInt(safe.slice(3, 5), 16),
        parseInt(safe.slice(5, 7), 16),
    ];
}
