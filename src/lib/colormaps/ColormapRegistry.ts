import type { ColormapSpec } from "./spec";
import { isColormapSpec, buildLUTFromSpec } from "./spec";

const modules = import.meta.glob("./maps/*.json", {
  eager: true,
}) as Record<string, unknown>;

function unwrapModule(mod: unknown): unknown {
  return mod && typeof mod === "object" && "default" in mod
    ? (mod as Record<string, unknown>).default
    : mod;
}

class ColormapRegistryImpl {
  private maps = new Map<string, ColormapSpec>();

  constructor() {
    for (const [path, mod] of Object.entries(modules)) {
      const data = unwrapModule(mod);
      if (isColormapSpec(data)) {
        this.maps.set(data.id, data);
      } else {
        throw new Error(`Invalid colormap spec in ${path}`);
      }
    }
  }

  get(id: string): ColormapSpec {
    const cm = this.maps.get(id);
    if (!cm) throw new Error(`Colormap '${id}' not found`);
    return cm;
  }

  has(id: string): boolean {
    return this.maps.has(id);
  }

  list(): ColormapSpec[] {
    return Array.from(this.maps.values()).filter((cm) => !cm.hidden);
  }

  getLUT(id: string): Uint8Array {
    return buildLUTFromSpec(this.get(id));
  }
}

export const ColormapRegistry = new ColormapRegistryImpl();
