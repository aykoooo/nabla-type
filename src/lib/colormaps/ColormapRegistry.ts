export interface Colormap {
    id: string
    label: string
    buildLUT(): Uint8Array
}

class ColormapRegistryImpl {
    private maps: Map<string, Colormap> = new Map()

    register(colormap: Colormap): void {
        this.maps.set(colormap.id, colormap)
    }

    get(id: string): Colormap {
        const cm = this.maps.get(id)
        if (!cm) throw new Error(`Colormap '${id}' not found`)
        return cm
    }

    list(): Colormap[] {
        return Array.from(this.maps.values())
    }
}

// Singleton
export const ColormapRegistry = new ColormapRegistryImpl()
