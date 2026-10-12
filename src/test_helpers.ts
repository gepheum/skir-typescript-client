import { _initModuleClasses, type Serializer } from "./skir-client.js";

type StructSpec = Extract<
  Parameters<typeof _initModuleClasses>[1][number],
  { kind: "struct" }
>;

export function defineStruct(
  fields: StructSpec["fields"],
  defaults: Record<string, unknown>,
): {
  new (): Record<string, unknown>;
  serializer: Serializer<Record<string, unknown>>;
} {
  class Struct {
    static serializer: Serializer<Struct>;
    [key: string]: unknown;

    constructor() {
      Object.assign(this, defaults);
    }
  }

  _initModuleClasses("test.skir", [
    {
      kind: "struct",
      ctor: Struct,
      name: "Struct",
      initFn: (target, initializer): void => {
        Object.assign(target as object, initializer);
      },
      fields,
    },
  ]);
  return Struct;
}

export function binary(...payload: number[]): ArrayBuffer {
  return Uint8Array.from([115, 107, 105, 114, ...payload]).buffer;
}
