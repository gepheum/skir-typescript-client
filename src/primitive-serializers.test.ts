import { expect } from "buckwheat";
import { describe, it } from "mocha";
import assert from "node:assert/strict";
import { SerializerTester } from "./serializer_tester.js";
import * as skir from "./skir-client.js";
import { binary, structSerializer } from "./test_helpers.js";

for (const primitive of [
  "bool",
  "int32",
  "int64",
  "hash64",
  "float32",
  "float64",
  "timestamp",
  "string",
  "bytes",
] as const) {
  describe(`${primitive} type descriptor`, () => {
    const serializer = skir.primitiveSerializer(primitive);

    it("#typeDescriptor", () => {
      expect(serializer.typeDescriptor).toMatch({
        kind: "primitive",
        primitive,
      });
    });

    it("#asJson()", () => {
      expect(serializer.typeDescriptor.asJson()).toMatch({
        type: { kind: "primitive", value: primitive },
        records: [],
      });
    });

    new SerializerTester(serializer).reserializeTypeAdapterAndAssertNoLoss();
  });
}

describe("bool serializer", () => {
  const serializer = skir.primitiveSerializer("bool");
  const tester = new SerializerTester(serializer);

  it("from number", () => {
    expect(serializer.fromJsonCode("888888")).toBe(true);
    expect(serializer.fromJsonCode('"0"')).toBe(false);
    expect(
      serializer.fromBytes(
        skir.primitiveSerializer("int32").toBytes(888888).toBuffer(),
      ),
    ).toBe(true);
  });

  tester.reserializeAndAssert(true, {
    denseJson: 1,
    readableJson: true,
    bytesAsBase16: "01",
  });
  tester.reserializeAndAssert(false, {
    denseJson: 0,
    readableJson: false,
    bytesAsBase16: "00",
  });
  tester.deserializeZeroAndAssert((input) => input === false);
});

describe("int32 serializer", () => {
  const serializer = skir.primitiveSerializer("int32");
  const tester = new SerializerTester(serializer);

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    bytesAsBase16: "02",
  });
  tester.reserializeAndAssert(0, {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.reserializeAndAssert(-1, {
    denseJson: -1,
    bytesAsBase16: "ebff",
  });
  tester.reserializeAndAssert(2.8, {
    denseJson: 2,
    bytesAsBase16: "02",
  });
  tester.reserializeAndAssert(-3.8, {
    denseJson: -3,
    bytesAsBase16: "ebfc",
    denseJsonFromReserialized: -4,
    lossy: true,
  });
  tester.reserializeAndAssert(231, {
    denseJson: 231,
    bytesAsBase16: "e7",
  });
  tester.reserializeAndAssert(232, {
    denseJson: 232,
    bytesAsBase16: "e8e800",
  });
  tester.reserializeAndAssert(65535, {
    denseJson: 65535,
    bytesAsBase16: "e8ffff",
  });
  tester.reserializeAndAssert(65536, {
    denseJson: 65536,
    bytesAsBase16: "e900000100",
  });
  tester.reserializeAndAssert(2147483647, {
    denseJson: 2147483647,
    bytesAsBase16: "e9ffffff7f",
  });
  tester.reserializeAndAssert(-255, {
    denseJson: -255,
    bytesAsBase16: "eb01",
  });
  tester.reserializeAndAssert(-256, {
    denseJson: -256,
    bytesAsBase16: "eb00",
  });
  tester.reserializeAndAssert(-257, {
    denseJson: -257,
    bytesAsBase16: "ecfffe",
  });
  tester.reserializeAndAssert(-65536, {
    denseJson: -65536,
    bytesAsBase16: "ec0000",
  });
  tester.reserializeAndAssert(-65537, {
    denseJson: -65537,
    bytesAsBase16: "edfffffeff",
  });
  tester.reserializeAndAssert(-2147483648, {
    denseJson: -2147483648,
    bytesAsBase16: "ed00000080",
  });

  it("accepts string", () => {
    expect(serializer.fromJson("0")).toBe(0);
  });

  it("transforms to integer", () => {
    expect(serializer.fromJson("2.3")).toBe(2);
  });

  it("accepts NaN", () => {
    expect(serializer.fromJson("NaN")).toBe(0);
  });

  it("accepts Infinity", () => {
    expect(serializer.fromJson("Infinity")).toBe(0);
  });

  it("accepts -Infinity", () => {
    expect(serializer.fromJson("-Infinity")).toBe(0);
  });

  it("accepts numbers out of int32 range", () => {
    expect(serializer.fromJson(2147483648)).toBe(-2147483648);
    expect(serializer.fromJson(-2147483649)).toBe(2147483647);
    expect(
      serializer.fromBytes(
        skir
          .primitiveSerializer("int64")
          .toBytes(BigInt(2147483648))
          .toBuffer(),
      ),
    ).toBe(-2147483648);
  });

  it("accepts booleans", () => {
    expect(serializer.fromJson(false)).toBe(0);
    expect(serializer.fromJson(true)).toBe(1);
  });
});

describe("int64 serializer", () => {
  const serializer = skir.primitiveSerializer("int64");
  const tester = new SerializerTester(serializer);

  it("can deserialize any number", () => {
    expect(serializer.fromJson(3.14)).toBe(BigInt(3));
  });

  tester.reserializeAndAssert(BigInt("888888888888"), {
    denseJson: 888888888888,
    bytesAsBase16: "ee380ee8f5ce000000",
  });
  // Numbers outside of bounds are clamped.
  tester.reserializeAndAssert(BigInt("9223372036854775808"), {
    denseJson: "9223372036854775807",
    bytesAsBase16: "eeffffffffffffff7f",
  });
  tester.reserializeAndAssert(BigInt("-9223372036854775809"), {
    denseJson: "-9223372036854775808",
    bytesAsBase16: "ee0000000000000080",
  });
  tester.reserializeAndAssert(BigInt("0"), {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.deserializeZeroAndAssert(
    (i) => typeof i === "bigint" && Number(i) === 0,
  );
  it("accepts number", () => {
    expect(serializer.fromJson(123)).toBe(BigInt(123));
  });
  it("accepts number outside of range", () => {
    expect(serializer.fromJson("-99999999999999999999999999")).toBe(
      BigInt("-99999999999999999999999999"),
    );
  });
});

describe("hash64 serializer", () => {
  const serializer = skir.primitiveSerializer("hash64");
  const tester = new SerializerTester(serializer);

  it("can deserialize any number", () => {
    expect(serializer.fromJson(3.14)).toBe(BigInt(3));
  });

  tester.reserializeAndAssert(BigInt("888888888888"), {
    denseJson: 888888888888,
    bytesAsBase16: "ea380ee8f5ce000000",
  });
  tester.reserializeAndAssert(BigInt("4294967295"), {
    denseJson: 4294967295,
    bytesAsBase16: "e9ffffffff",
  });
  // Numbers outside of bounds are clamped.
  tester.reserializeAndAssert(BigInt("18446744073709551616"), {
    denseJson: "18446744073709551615",
    bytesAsBase16: "eaffffffffffffffff",
  });
  tester.reserializeAndAssert(BigInt("-1"), {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.reserializeAndAssert(BigInt("0"), {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.deserializeZeroAndAssert(
    (i) => typeof i === "bigint" && Number(i) === 0,
  );
  it("accepts number", () => {
    expect(serializer.fromJson(123)).toBe(BigInt(123));
  });
  it("accepts number outside of range", () => {
    expect(serializer.fromJson("-99999999999999999999999999")).toBe(
      BigInt("-99999999999999999999999999"),
    );
  });
});

describe("float32 serializer", () => {
  const serializer = skir.primitiveSerializer("float32");
  const tester = new SerializerTester(serializer);

  it("can deserialize any number", () => {
    expect(serializer.fromJson("1111111111")).toMatch(1111111111);
    expect(
      serializer.fromJson("1111111111111111111111111111111111111111"),
    ).toMatch(1.1111111111111112e39);
  });

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    bytesAsBase16: "f000000040",
  });
  tester.reserializeAndAssert(0, {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.reserializeAndAssert(-1, {
    denseJson: -1,
    bytesAsBase16: "f0000080bf",
  });
  tester.reserializeAndAssert(-1.5, {
    denseJson: -1.5,
    bytesAsBase16: "f00000c0bf",
  });
  tester.reserializeAndAssert(2.8, {
    denseJson: 2.8,
    bytesAsBase16: "f033333340",
    denseJsonFromReserialized: 2.799999952316284,
    lossy: true,
  });
  tester.reserializeAndAssert(-3.8, {
    denseJson: -3.8,
    bytesAsBase16: "f0333373c0",
    denseJsonFromReserialized: -3.799999952316284,
    lossy: true,
  });
  tester.reserializeAndAssert(Number.NaN, {
    denseJson: "NaN",
    bytesAsBase16: "f00000c07f",
  });
  tester.reserializeAndAssert(Number.POSITIVE_INFINITY, {
    denseJson: "Infinity",
    bytesAsBase16: "f00000807f",
  });
  tester.reserializeAndAssert(Number.NEGATIVE_INFINITY, {
    denseJson: "-Infinity",
    bytesAsBase16: "f0000080ff",
  });
  it("accepts string", () => {
    expect(serializer.fromJson("0")).toBe(0);
    expect(serializer.fromJson("2.5")).toBe(2.5);
  });
});

describe("float64 serializer", () => {
  const serializer = skir.primitiveSerializer("float64");
  const tester = new SerializerTester(serializer);

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    bytesAsBase16: "f10000000000000040",
  });
  tester.reserializeAndAssert(0, {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.reserializeAndAssert(-1, {
    denseJson: -1,
    bytesAsBase16: "f1000000000000f0bf",
  });
  tester.reserializeAndAssert(2.8, {
    denseJson: 2.8,
    bytesAsBase16: "f16666666666660640",
  });
  tester.reserializeAndAssert(-3.8, {
    denseJson: -3.8,
    bytesAsBase16: "f16666666666660ec0",
  });
  tester.reserializeAndAssert(Number.NaN, {
    denseJson: "NaN",
    bytesAsBase16: "f1000000000000f87f",
  });
  tester.reserializeAndAssert(Number.POSITIVE_INFINITY, {
    denseJson: "Infinity",
    bytesAsBase16: "f1000000000000f07f",
  });
  tester.reserializeAndAssert(Number.NEGATIVE_INFINITY, {
    denseJson: "-Infinity",
    bytesAsBase16: "f1000000000000f0ff",
  });
  it("accepts string", () => {
    expect(serializer.fromJson("0")).toBe(0);
    expect(serializer.fromJson("2.5")).toBe(2.5);
  });
});

describe("string serializer", () => {
  const serializer = skir.primitiveSerializer("string");
  const tester = new SerializerTester(serializer);

  tester.reserializeAndAssert("", {
    denseJson: "",
    bytesAsBase16: "f2",
  });
  tester.reserializeAndAssert("Foôbar", {
    denseJson: "Foôbar",
    bytesAsBase16: "f307466fc3b4626172",
  });
  tester.reserializeAndAssert('Foo\n"bar"', {
    denseJson: 'Foo\n"bar"',
    bytesAsBase16: "f309466f6f0a2262617222",
  });
  tester.reserializeAndAssert(
    "é".repeat(5000),
    {
      denseJson: "é".repeat(5000),
      bytesAsBase16: `f3e81027${"c3a9".repeat(5000)}`,
    },
    'reserialize "é".repeat(5000)',
  );
  // See https://stackoverflow.com/questions/55056322/maximum-utf-8-string-size-given-utf-16-size
  tester.reserializeAndAssert(
    "\uFFFF".repeat(5000),
    {
      denseJson: "\uFFFF".repeat(5000),
      bytesAsBase16: `f3e8983a${"efbfbf".repeat(5000)}`,
    },
    'reserialize "\\uFFFF".repeat(5000)',
  );
  tester.deserializeZeroAndAssert((s) => s === "");

  it("rejects non-string inputs when writing strings", () => {
    const writer = serializer as skir.Serializer<unknown>;
    for (const input of [null, undefined, false, 0, 1, [], {}]) {
      assert.throws(() => writer.toJson(input), TypeError);
      assert.throws(() => writer.toBytes(input), TypeError);
    }
  });

  it("rejects invalid JSON inputs when reading strings", () => {
    for (const json of [null, false, 1, [], {}]) {
      assert.throws(() => serializer.fromJson(json), TypeError);
    }
  });

  it("rejects unpaired surrogates in JSON and binary writers and JSON readers", () => {
    for (const string of [
      "\uD800z",
      "\uDC00",
      "\uD800\uD800",
      "\uD800",
      "\uDFFF",
    ]) {
      assert.throws(() => serializer.toBytes(string), /surrogate/i);
      assert.throws(() => serializer.toJson(string), /surrogate/i);
      assert.throws(() => serializer.fromJson(string), /surrogate/i);
    }
  });

  it("preserves paired surrogates and characters bordering the surrogate range", () => {
    for (const string of [
      "a\uD83D\uDE00z",
      "\uD800\uDC00",
      "\uDBFF\uDFFF",
      "\uD7FF\uE000",
    ]) {
      assert.equal(serializer.fromJson(serializer.toJson(string)), string);
      assert.equal(
        serializer.fromBytes(serializer.toBytes(string).toBuffer()),
        string,
      );
    }
  });

  const stringType: skir.Json = { kind: "primitive", value: "string" };
  const struct = structSerializer([
    { name: "text", number: 0, type: stringType },
    {
      name: "optional",
      number: 1,
      type: { kind: "optional", value: stringType },
    },
    {
      name: "items",
      number: 2,
      type: { kind: "array", value: { item: stringType } },
    },
  ]);

  it("preserves leading BOMs in standalone strings", () => {
    for (const string of ["\uFEFF", "\uFEFF\uFEFFtext", "\uFEFF\uD83D\uDE00"]) {
      assert.equal(
        serializer.fromBytes(serializer.toBytes(string).toBuffer()),
        string,
      );
    }
  });

  it("preserves BOMs and paired surrogates in defined, optional and array string fields", () => {
    const text = "\uFEFF\uD83D\uDE00";
    const json: skir.Json = [text, text, [text]];
    const input = struct.fromJson(json);
    assert.deepEqual(
      struct.toJson(struct.fromBytes(struct.toBytes(input).toBuffer())),
      json,
    );
  });

  it("rejects malformed UTF-8 in standalone and defined string fields", () => {
    for (const payload of [
      [243, 1, 255],
      [243, 2, 192, 175],
      [243, 3, 237, 160, 128],
    ]) {
      assert.throws(() => serializer.fromBytes(binary(...payload)));
    }
    assert.throws(() => struct.fromBytes(binary(247, 243, 1, 255)));
  });

  it("rejects invalid string tags, lengths and truncated payloads", () => {
    for (const payload of [
      [247, 1, 65],
      [243, 3, 65],
      [243, 235, 255],
      [243, 234, 0, 0, 0, 0, 0, 0, 0, 0],
      [243, 241, 0, 0, 0, 0, 0, 0, 248, 63],
    ]) {
      assert.throws(() => serializer.fromBytes(binary(...payload)));
    }
    assert.throws(() => struct.fromBytes(binary(247, 243, 3, 65)));
  });

  it("checks UTF-8 in skipped fields as well as defined fields", () => {
    const empty = structSerializer([]);
    for (const keep of [undefined, "keep-unrecognized-values"] as const) {
      assert.throws(() => empty.fromBytes(binary(247, 243, 1, 255), keep));
      assert.throws(() => empty.fromBytes(binary(247, 243, 3, 65), keep));
    }
  });

  it("rejects invalid string fields instead of omitting them as defaults", () => {
    const writer = struct as skir.Serializer<unknown>;
    for (const text of [null, false, 0, "\uD800z"]) {
      const input = { text, optional: null, items: [] };
      assert.throws(() => writer.toJson(input));
      assert.throws(() => writer.toJson(input, "readable"));
      assert.throws(() => writer.toBytes(input));
    }
    for (const text of ["\uD800z", "\uDC00"]) {
      for (const json of [[text], ["", text], ["", null, [text]]]) {
        assert.throws(() => struct.fromJson(json));
      }
    }
  });
});

describe("bytes serializer", () => {
  const serializer = skir.primitiveSerializer("bytes");
  const tester = new SerializerTester(serializer);

  it("rejects invalid lengths in skipped byte fields", () => {
    const empty = structSerializer([]);
    for (const keep of [undefined, "keep-unrecognized-values"] as const) {
      assert.doesNotThrow(() => empty.fromBytes(binary(247, 245, 1, 65), keep));
      assert.throws(
        () => empty.fromBytes(binary(247, 245, 235, 255), keep),
        /unsigned length/i,
      );
    }
  });

  tester.reserializeAndAssert(skir.ByteString.fromBase64("abc123"), {
    denseJson: "abc12w==",
    readableJson: "hex:69b735db",
    bytesAsBase16: "f50469b735db",
  });
  tester.reserializeAndAssert(skir.ByteString.EMPTY, {
    denseJson: "",
    readableJson: "hex:",
    bytesAsBase16: "f4",
  });
  tester.deserializeZeroAndAssert((s) => s.byteLength === 0);
});
