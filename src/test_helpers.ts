import {
  parseTypeDescriptorFromJson,
  type Json,
  type Serializer,
} from "./skir-client.js";

export function structSerializer(fields: Json[]): Serializer<Json> {
  return parseTypeDescriptorFromJson({
    type: { kind: "record", value: "test.skir:Record" },
    records: [{ kind: "struct", id: "test.skir:Record", fields }],
  }) as unknown as Serializer<Json>;
}

export function binary(...payload: number[]): ArrayBuffer {
  return Uint8Array.from([115, 107, 105, 114, ...payload]).buffer;
}
