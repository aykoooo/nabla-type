import { parse } from 'opentype.js'
import type { Font } from 'opentype.js'

export class FontLoader {
    private font: Font | null = null

    /**
     * Load a font from a File (user upload)
     */
    async loadFromFile(file: File): Promise<Font> {
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('Font file is too large. Maximum size is 10 MB.')
        }
        const buffer = await file.arrayBuffer()
        this.font = parse(buffer)
        return this.font
    }

    /**
     * Get the currently loaded font
     */
    getFont(): Font | null {
        return this.font
    }

    /**
     * Clear loaded font
     */
    clear(): void {
        this.font = null
    }
}
