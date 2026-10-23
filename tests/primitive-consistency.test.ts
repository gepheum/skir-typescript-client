import { describe, it } from "mocha";
import assert from "node:assert/strict";
import * as skir from "../src/skir-client.js";
import { defineStruct } from "./test_helpers.js";

describe("primitive serialization consistency", () => {
  const int32 = skir.primitiveSerializer("int32");
  const float32 = skir.primitiveSerializer("float32");
  const float64 = skir.primitiveSerializer("float64");

  it("truncates negative int32 fractions before choosing a binary encoding", () => {
    for (const [input, expected] of [
      [-3.8, -3],
      [-256.8, -256],
      [-65536.8, -65536],
      [-0.8, 0],
      [3.8, 3],
    ]) {
      assert.equal(int32.toJson(input!), expected);
      assert.equal(int32.fromBytes(int32.toBytes(input!).toBuffer()), expected);
    }
  });

  it("normalizes nonfinite int32 inputs to zero without throwing", () => {
    for (const input of [NaN, Infinity, -Infinity]) {
      assert.equal(int32.toJson(input), 0);
      assert.equal(int32.fromBytes(int32.toBytes(input).toBuffer()), 0);
      assert.equal(int32.fromJson(input), 0);
      assert.equal(int32.fromJson(String(input)), 0);
      assert.equal(int32.fromBytes(float64.toBytes(input).toBuffer()), 0);
    }
  });

  it("rounds float32 JSON and compatible binary reads to float32 precision", () => {
    assert.equal(float32.toJson(2.8), 2.799999952316284);
    assert.equal(float32.fromJson(2.8), 2.799999952316284);
    assert.equal(
      float32.fromBytes(float64.toBytes(0.1).toBuffer()),
      0.10000000149011612,
    );
  });

  it("uses float32 overflow and underflow without finite range clamping", () => {
    for (const [input, expected, json] of [
      [1e40, Infinity, "Infinity"],
      [-1e40, -Infinity, "-Infinity"],
      [1e-50, 0, 0],
      [-1e-50, 0, 0],
    ] as const) {
      assert.equal(float32.toJson(input), json);
      assert.equal(float32.fromJson(input), expected);
      assert.equal(
        float32.fromBytes(float32.toBytes(input).toBuffer()),
        expected,
      );
    }
  });

  for (const type of ["float32", "float64"] as const) {
    it(`normalizes signed zero in every ${type} representation`, () => {
      const serializer = skir.primitiveSerializer(type);
      assert.equal(serializer.toJson(-0), 0);
      assert.equal(serializer.fromJson(-0), 0);
      assert.equal(serializer.fromBytes(float64.toBytes(-0).toBuffer()), 0);
      // A raw float64 payload can preserve the sign lost by ordinary writing.
      assert.equal(
        serializer.fromBytes(
          Uint8Array.from([115, 107, 105, 114, 241, 0, 0, 0, 0, 0, 0, 0, 128])
            .buffer,
        ),
        0,
      );
    });
  }

  for (const [type, input] of [
    ["int32", -0.8],
    ["int32", NaN],
    ["int32", Infinity],
    ["int32", -Infinity],
    ["float32", 1e-50],
    ["hash64", BigInt(-1)],
  ] as const) {
    it(`omits normalized ${type} defaults consistently`, () => {
      const Struct = defineStruct({ value: type });
      assert.deepEqual(Struct.serializer.toJson({ value: input }), []);
      assert.deepEqual(
        Struct.serializer.toJson({ value: input }, "readable"),
        {},
      );
      assert.deepEqual(
        Struct.serializer.toBytes({ value: input }).toBuffer(),
        Struct.serializer.toBytes(new Struct()).toBuffer(),
      );
    });
  }
});
