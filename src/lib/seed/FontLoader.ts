import opentype from 'opentype.js'

export class FontLoader {
    private font: any | null = null

    /**
     * Load a font from a File (user upload)
     */
    async loadFromFile(file: File): Promise<any> {
        const buffer = await file.arrayBuffer()
        this.font = opentype.parse(buffer)
        return this.font
    }

    /**
     * Get the currently loaded font
     */
    getFont(): any | null {
        return this.font
    }

    /**
     * Clear loaded font
     */
    clear(): void {
        this.font = null
    }
}
