import { PRIVATE_KEY } from "../src/codegen-runtime/base.js";
import {
  _EMPTY_ARRAY,
  _FrozenBase,
  _INITIALIZER,
  _initModuleClasses,
  primitiveSerializer,
  type PrimitiveTypes,
  type Serializer,
} from "../src/skir-client.js";

type TypeSpec = Extract<
  Parameters<typeof _initModuleClasses>[1][number],
  { kind: "struct" }
>["fields"][number]["type"];

type StructSchema = Record<string, keyof PrimitiveTypes | TypeSpec>;

export type StructInstance = Record<string, unknown>;

let structNumber = 0;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Infer the fixture class API.
export function defineStruct(
  schema: StructSchema,
  initFn: (
    target: StructInstance,
    initializer: StructInstance,
  ) => void = Object.assign,
) {
  const fields = Object.entries(schema).map(([name, type], number) => ({
    name,
    property: name,
    number,
    type:
      typeof type === "string"
        ? { kind: "primitive" as const, primitive: type }
        : type,
  }));
  const defaults = Object.fromEntries(
    fields.map(({ name, type }) => {
      switch (type.kind) {
        case "primitive":
          return [name, primitiveSerializer(type.primitive).fromJson(0)];
        case "optional":
          return [name, null];
        case "array":
          return [name, _EMPTY_ARRAY];
        case "record":
          return [name, (type.ctor as typeof Struct).serializer.fromJson(0)];
      }
    }),
  );

  class Struct extends _FrozenBase {
    static serializer: Serializer<StructInstance>;
    declare static create: (initializer: StructInstance) => Struct;
    declare static Mutable: new (
      initializer?: StructInstance,
    ) => StructInstance;
    declare [_INITIALIZER]: StructInstance;
    [key: string]: unknown;

    constructor(privateKey = PRIVATE_KEY) {
      super(privateKey);
      Object.assign(this, defaults);
    }
  }

  _initModuleClasses("test.skir", [
    {
      kind: "struct",
      ctor: Struct,
      name: `Struct${structNumber++}`,
      initFn: (target, initializer): void => {
        initFn(target as StructInstance, initializer as StructInstance);
      },
      fields,
    },
  ]);
  return Struct;
}

export function structSerializer(
  schema: StructSchema,
): Serializer<StructInstance> {
  return defineStruct(schema).serializer;
}

export function binary(...payload: number[]): ArrayBuffer {
  return Uint8Array.from([115, 107, 105, 114, ...payload]).buffer;
}
