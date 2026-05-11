import { expect } from "buckwheat";
import { describe, it } from "mocha";
import { SerializerTester } from "./serializer_tester.js";
import * as skir from "./skir-client.js";

describe("Timestamp", () => {
  it("#MIN is min timestamp rerpresentable as Date objects", () => {
    expect(new Date(skir.Timestamp.MIN.unixMillis).getTime()).toBe(
      -8640000000000000,
    );
    expect(new Date(skir.Timestamp.MIN.unixMillis - 1).getTime()).toBe(
      Number.NaN,
    );
  });

  it("#MAX is max timestamp rerpresentable as Date objects", () => {
    expect(new Date(skir.Timestamp.MAX.unixMillis).getTime()).toBe(
      8640000000000000,
    );
    expect(new Date(skir.Timestamp.MAX.unixMillis + 1).getTime()).toBe(
      Number.NaN,
    );
  });

  describe("#fromUnixMillis()", () => {
    it("works", () => {
      expect(skir.Timestamp.fromUnixMillis(3000).unixMillis).toBe(3000);
      expect(skir.Timestamp.fromUnixMillis(3001).unixSeconds).toBe(3.001);
    });
    it("clamp timestamps outside of valid range", () => {
      expect(
        skir.Timestamp.fromUnixMillis(skir.Timestamp.MAX.unixMillis + 1)
          .unixMillis,
      ).toBe(skir.Timestamp.MAX.unixMillis);
    });
    it("truncates to millisecond precision", () => {
      expect(skir.Timestamp.fromUnixMillis(2.8).unixMillis).toBe(3);
    });
  });

  describe("#fromUnixSeconds()", () => {
    it("works", () => {
      expect(skir.Timestamp.fromUnixSeconds(3).unixMillis).toBe(3000);
      expect(skir.Timestamp.fromUnixSeconds(3).unixSeconds).toBe(3);
    });
    it("truncates to millisecond precision", () => {
      expect(skir.Timestamp.fromUnixSeconds(2.0061).unixSeconds).toBe(2.006);
    });
  });

  describe("#toDate()", () => {
    it("works", () => {
      expect(
        skir.Timestamp.fromUnixMillis(1694467279837).toDate().getTime(),
      ).toBe(1694467279837);
    });
  });

  describe("#now()", () => {
    it("works", () => {
      const now = skir.Timestamp.now();
      expect(now.toDate().getFullYear()).toCompare(">=", 2023);
      expect(now.toDate().getFullYear()).toCompare(
        "<=",
        new Date().getFullYear() + 1,
      );
    });
  });

  describe("#toString()", () => {
    it("works", () => {
      const timestamp = skir.Timestamp.fromUnixMillis(1694467279837);
      expect(timestamp.toString()).toBe("2023-09-11T21:21:19.837Z");
    });
  });

  describe("#parse()", () => {
    it("works", () => {
      const timestamp = skir.Timestamp.fromUnixMillis(1694467279837);
      const parseResult = skir.Timestamp.parse(timestamp.toString());
      expect(parseResult.unixMillis).toBe(timestamp.unixMillis);
    });
  });
});

describe("timestamp serializer", () => {
  const serializer = skir.primitiveSerializer("timestamp");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "timestamp",
    });
  });

  it("TypeDescriptor#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "timestamp",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  it("TypeDescriptor#asJsonCode()", () => {
    expect(serializer.typeDescriptor.asJsonCode()).toMatch(
      [
        "{",
        '  "type": {',
        '    "kind": "primitive",',
        '    "value": "timestamp"',
        "  },",
        '  "records": []',
        "}",
      ].join("\n"),
    );
    expect(
      skir
        .parseTypeDescriptorFromJsonCode(serializer.typeDescriptor.asJsonCode())
        .asJson(),
    ).toMatch(serializer.typeDescriptor.asJson());
  });

  it("can deserialize any number", () => {
    expect(serializer.fromJson("888888888888").unixMillis).toBe(888888888888);
  });

  tester.reserializeAndAssert(
    skir.Timestamp.UNIX_EPOCH,
    {
      denseJson: 0,
      readableJson: {
        unix_millis: 0,
        formatted: "1970-01-01T00:00:00.000Z",
      },
      bytesAsBase16: "00",
    },
    "reserialize Unix EPOCH",
  );

  tester.reserializeAndAssert(
    skir.Timestamp.fromUnixMillis(1692999034586),
    {
      denseJson: 1692999034586,
      readableJson: {
        unix_millis: 1692999034586,
        formatted: "2023-08-25T21:30:34.586Z",
      },
      bytesAsBase16: "efda269b2e8a010000",
    },
    "reserialize normal timestamp",
  );

  tester.reserializeAndAssert(
    skir.Timestamp.fromUnixMillis(-1692999034586),
    {
      denseJson: -1692999034586,
      readableJson: {
        unix_millis: -1692999034586,
        formatted: "1916-05-09T02:29:25.414Z",
      },
      bytesAsBase16: "ef26d964d175feffff",
    },
    "reserialize negative timestamp",
  );

  it("default JSON flavor is dense", () => {
    expect(serializer.toJson(skir.Timestamp.UNIX_EPOCH)).toBe(0);
  });
});

describe("ByteString", () => {
  const makeTestByteArray = (length = 4, start = 0): Uint8Array => {
    const array: number[] = [];
    for (let i = 0; i < length; ++i) {
      array[i] = start + i;
    }
    return new Uint8Array(array);
  };

  const makeTestByteString = (length = 4, start = 0): skir.ByteString => {
    return skir.ByteString.sliceOf(makeTestByteArray(length, start).buffer);
  };

  const makeSlicedTestByteString = (length = 4): skir.ByteString => {
    const superByteString = makeTestByteString(length + 2, -1);
    return skir.ByteString.sliceOf(superByteString, 1, length + 1);
  };

  const toArray = (byteString: skir.ByteString): number[] => {
    return Array.from(new Uint8Array(byteString.toBuffer()));
  };

  describe("#EMPTY", () => {
    it("works", () => {
      expect(skir.ByteString.EMPTY.byteLength).toBe(0);
      expect(skir.ByteString.EMPTY.toBuffer().byteLength).toBe(0);
    });
  });

  describe("#sliceOf", () => {
    it("works when no start/end is specified", () => {
      let byteString = makeTestByteString();
      byteString = skir.ByteString.sliceOf(byteString);
      expect(byteString.byteLength).toBe(4);
      expect(toArray(byteString)).toMatch([0, 1, 2, 3]);
    });

    it("works when only start is specified", () => {
      let byteString = makeTestByteString();
      byteString = skir.ByteString.sliceOf(byteString, 1);
      expect(byteString.byteLength).toBe(3);
      expect(toArray(byteString)).toMatch([1, 2, 3]);
    });

    it("works when both start/end are specified", () => {
      let byteString = makeTestByteString();
      byteString = skir.ByteString.sliceOf(byteString, 1, 3);
      expect(byteString.byteLength).toBe(2);
      expect(toArray(byteString)).toMatch([1, 2]);
    });

    it("copies ArrayBuffer slice", () => {
      const byteString = makeTestByteString();
      expect(byteString.byteLength).toBe(4);
      expect(toArray(byteString)).toMatch([0, 1, 2, 3]);
    });

    it("returns empty when start === end", () => {
      const byteString = makeTestByteString();
      expect(skir.ByteString.sliceOf(byteString, 3, 3)).toBe(
        skir.ByteString.EMPTY,
      );
    });

    it("returns empty when start > end", () => {
      const byteString = makeTestByteString();
      expect(skir.ByteString.sliceOf(byteString, 3, 0)).toBe(
        skir.ByteString.EMPTY,
      );
    });

    it("doesn't copy ByteString if it doesn't need to", () => {
      const byteString = makeTestByteString();
      expect(skir.ByteString.sliceOf(byteString, 0, 4)).toBe(byteString);
    });

    it("start can be < 0", () => {
      const byteString = makeTestByteString();
      expect(skir.ByteString.sliceOf(byteString, -1, 4)).toBe(byteString);
    });

    it("end can be > byteLength", () => {
      const byteString = makeTestByteString();
      expect(skir.ByteString.sliceOf(byteString, 0, 5)).toBe(byteString);
    });

    it("copies bytes in the ArrayBuffer", () => {
      const array = makeTestByteArray();
      const byteString = skir.ByteString.sliceOf(array.buffer);
      array[3] = 4;
      expect(toArray(byteString)).toMatch([0, 1, 2, 3]);
    });

    it("works with SharedArrayBuffer", () => {
      const sharedBuffer = new SharedArrayBuffer(4);
      const view = new Uint8Array(sharedBuffer);
      view[0] = 10;
      view[1] = 20;
      view[2] = 30;
      view[3] = 40;
      const byteString = skir.ByteString.sliceOf(sharedBuffer);
      expect(byteString.byteLength).toBe(4);
      expect(toArray(byteString)).toMatch([10, 20, 30, 40]);
    });
  });

  for (const sliced of [false, true]) {
    const description = sliced ? "on sliced instance" : "on normal instance";
    const byteString = //
      sliced ? makeSlicedTestByteString(20) : makeTestByteString(20);
    describe(description, () => {
      describe("#byteLength", () => {
        it("works", () => {
          expect(byteString.byteLength).toBe(20);
        });
      });

      describe("#toBuffer", () => {
        it("works", () => {
          const buffer = byteString.toBuffer();
          expect(buffer.byteLength).toBe(20);
          expect(new Uint8Array(buffer)[2]).toBe(2);
        });
      });

      describe("#copyTo", () => {
        it("works", () => {
          const buffer = new ArrayBuffer(22);
          byteString.copyTo(buffer, 1);
          const array = new Uint8Array(buffer);
          expect(array[5]).toBe(4);
        });
      });

      describe("#at()", () => {
        it("works with normal index", () => {
          expect(byteString.at(2)).toBe(2);
        });

        it("works with negative index", () => {
          expect(byteString.at(-1)).toBe(19);
        });
      });

      describe("base64", () => {
        const base64 = byteString.toBase64();
        it("#toBase64() works", () => {
          expect(base64).toBe("AAECAwQFBgcICQoLDA0ODxAREhM=");
        });
        const fromBase64 = skir.ByteString.fromBase64(base64);
        it("#fromBase64() works", () => {
          expect(toArray(fromBase64)).toMatch(toArray(byteString));
        });
      });

      describe("base16", () => {
        const array = toArray(byteString);
        const base16 = byteString.toBase16();
        it("#toBase16() works", () => {
          expect(base16).toBe("000102030405060708090a0b0c0d0e0f10111213");
        });
        it("#fromBase16() works", () => {
          const fromBase64 = skir.ByteString.fromBase16(base16);
          expect(toArray(fromBase64)).toMatch(array);
        });
        it("#fromBase16() accepts uppercase", () => {
          const fromBase64 = skir.ByteString.fromBase16(base16.toUpperCase());
          expect(toArray(fromBase64)).toMatch(array);
        });
      });
    });
  }
});

describe("bool serializer", () => {
  const serializer = skir.primitiveSerializer("bool");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "bool",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "bool",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

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

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "int32",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "int32",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

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

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "int64",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "int64",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

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

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "hash64",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "hash64",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

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

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "float32",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "float32",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

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

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "float64",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "float64",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

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

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "string",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "string",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

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

  it("sanitizes lone surrogates when encoding to binary", () => {
    // U+D800 is an unpaired surrogate. It is not a valid Unicode scalar value.
    const bytes = serializer.toBytes("\uD800z").toBuffer();
    expect(serializer.fromBytes(bytes)).toBe("\uFFFDz");
  });

  it("escapes lone surrogates in JSON serialization", () => {
    expect(serializer.toJsonCode("\uD800z")).toBe('"\\ud800z"');
  });
});

describe("bytes serializer", () => {
  const serializer = skir.primitiveSerializer("bytes");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "bytes",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "bytes",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
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

describe("optional serializer", () => {
  const otherSerializer = skir.primitiveSerializer("int32");
  const serializer = skir.optionalSerializer(otherSerializer);
  it("is idempotent", () => {
    expect(skir.optionalSerializer(serializer)).toMatch(serializer);
  });

  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "optional",
      otherType: otherSerializer.typeDescriptor,
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "optional",
        value: {
          kind: "primitive",
          value: "int32",
        },
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    bytesAsBase16: "02",
  });
  tester.reserializeAndAssert(null, {
    denseJson: null,
    bytesAsBase16: "ff",
  });
  tester.deserializeZeroAndAssert((i) => i === 0);
});

describe("array serializer", () => {
  const itemSerializer = skir.primitiveSerializer("int32");
  const serializer = skir.arraySerializer(itemSerializer, "foo.bar");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "array",
      itemType: itemSerializer.typeDescriptor,
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "array",
        value: {
          item: {
            kind: "primitive",
            value: "int32",
          },
          key_extractor: "foo.bar",
        },
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  tester.reserializeAndAssert([], {
    denseJson: [],
    bytesAsBase16: "f6",
  });

  tester.reserializeAndAssert([10], {
    denseJson: [10],
    bytesAsBase16: "f70a",
  });

  tester.reserializeAndAssert([10, 11], {
    denseJson: [10, 11],
    bytesAsBase16: "f80a0b",
  });

  tester.reserializeAndAssert([10, 11, 12], {
    denseJson: [10, 11, 12],
    bytesAsBase16: "f90a0b0c",
  });

  tester.reserializeAndAssert([10, 11, 12, 13], {
    denseJson: [10, 11, 12, 13],
    bytesAsBase16: "fa040a0b0c0d",
  });

  tester.deserializeZeroAndAssert((a) => a.length === 0);
});

describe("string array serializer", () => {
  const itemSerializer = skir.primitiveSerializer("string");
  const serializer = skir.arraySerializer(itemSerializer);
  const tester = new SerializerTester(serializer);

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "array",
        value: {
          item: {
            kind: "primitive",
            value: "string",
          },
          key_extractor: undefined,
        },
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  tester.reserializeAndAssert([], {
    denseJson: [],
    bytesAsBase16: "f6",
  });

  tester.reserializeAndAssert(["foo", "bar"], {
    denseJson: ["foo", "bar"],
    bytesAsBase16: "f8f303666f6ff303626172",
  });
});

describe("bytes array serializer", () => {
  const itemSerializer = skir.primitiveSerializer("bytes");
  const serializer = skir.arraySerializer(itemSerializer);
  const tester = new SerializerTester(serializer);

  tester.reserializeAndAssert([], {
    denseJson: [],
    bytesAsBase16: "f6",
  });

  const a = skir.ByteString.fromBase64("bGlnaHQgdw==");
  const b = skir.ByteString.fromBase64("bGlnaHQgd28=");

  tester.reserializeAndAssert([a, b], {
    denseJson: [a.toBase64(), b.toBase64()],
    readableJson: ["hex:6c696768742077", "hex:6c6967687420776f"],
    bytesAsBase16: "f8f5076c696768742077f5086c6967687420776f",
  });
});

describe("complex nested types with enums", () => {
  it("can transform parsed type descriptor", () => {
    const typeDefinitionJson = {
      type: {
        kind: "record",
        value: "service.skir:CalculateMetricsRequest",
      },
      records: [
        {
          kind: "struct",
          id: "service.skir:CalculateMetricsRequest",
          doc: "Request to calculate basic metrics for a shape",
          fields: [
            {
              name: "shape",
              number: 0,
              type: {
                kind: "record",
                value: "geometry.skir:Shape",
              },
              doc: "The shape to analyze",
            },
            {
              name: "unit",
              number: 1,
              type: {
                kind: "record",
                value: "geometry.skir:MeasurementUnit",
              },
              doc: "Unit for the results",
            },
          ],
        },
        {
          kind: "enum",
          id: "geometry.skir:Shape",
          doc: "Geometric shape - demonstrates enum with wrapper variants",
          variants: [
            {
              name: "triangle",
              number: 1,
              doc: "A triangle defined by three vertices",
              type: {
                kind: "record",
                value: "geometry.skir:Shape.Triangle",
              },
            },
            {
              name: "circle",
              number: 2,
              doc: "A circle defined by center and radius",
              type: {
                kind: "record",
                value: "geometry.skir:Shape.Circle",
              },
            },
            {
              name: "rectangle",
              number: 3,
              doc: "A rectangle defined by top-left corner and dimensions",
              type: {
                kind: "record",
                value: "geometry.skir:Shape.Rectangle",
              },
            },
            {
              name: "polygon",
              number: 4,
              doc: "A general polygon defined by its vertices",
              type: {
                kind: "record",
                value: "geometry.skir:Shape.Polygon",
              },
            },
          ],
        },
        {
          kind: "struct",
          id: "geometry.skir:Shape.Triangle",
          fields: [
            {
              name: "vertices",
              number: 0,
              type: {
                kind: "array",
                value: {
                  item: {
                    kind: "record",
                    value: "geometry.skir:Point",
                  },
                },
              },
              doc: "The three corner points",
            },
          ],
        },
        {
          kind: "struct",
          id: "geometry.skir:Point",
          doc: "A point in 2D space",
          fields: [
            {
              name: "x",
              number: 0,
              type: {
                kind: "primitive",
                value: "float64",
              },
            },
            {
              name: "y",
              number: 1,
              type: {
                kind: "primitive",
                value: "float64",
              },
            },
          ],
        },
        {
          kind: "struct",
          id: "geometry.skir:Shape.Circle",
          fields: [
            {
              name: "center",
              number: 0,
              type: {
                kind: "record",
                value: "geometry.skir:Point",
              },
            },
            {
              name: "radius",
              number: 1,
              type: {
                kind: "primitive",
                value: "float64",
              },
            },
          ],
        },
        {
          kind: "struct",
          id: "geometry.skir:Shape.Rectangle",
          fields: [
            {
              name: "top_left",
              number: 0,
              type: {
                kind: "record",
                value: "geometry.skir:Point",
              },
            },
            {
              name: "width",
              number: 1,
              type: {
                kind: "primitive",
                value: "float64",
              },
            },
            {
              name: "height",
              number: 2,
              type: {
                kind: "primitive",
                value: "float64",
              },
            },
          ],
        },
        {
          kind: "struct",
          id: "geometry.skir:Shape.Polygon",
          fields: [
            {
              name: "vertices",
              number: 0,
              type: {
                kind: "array",
                value: {
                  item: {
                    kind: "record",
                    value: "geometry.skir:Point",
                  },
                },
              },
              doc: "Vertices in order (at least 3 required)",
            },
          ],
        },
        {
          kind: "enum",
          id: "geometry.skir:MeasurementUnit",
          doc: "Unit of measurement for distances and areas",
          variants: [
            {
              name: "METERS",
              number: 1,
              doc: "Metric system (meters, square meters)",
            },
            {
              name: "FEET",
              number: 2,
              doc: "Imperial system (feet, square feet)",
            },
            {
              name: "custom",
              number: 3,
              doc: "Custom unit with conversion factor to meters",
              type: {
                kind: "primitive",
                value: "float64",
              },
            },
          ],
        },
      ],
    };

    const typeDescriptor = skir.parseTypeDescriptorFromJson(
      typeDefinitionJson as unknown as skir.Json,
    );

    // Test with empty array (default value)
    {
      const resultFromEmpty = typeDescriptor.transform([], "readable");
      expect(JSON.stringify(resultFromEmpty)).toMatch("{}");
    }
    {
      const resultFromEmpty = typeDescriptor.transform([], "dense");
      expect(JSON.stringify(resultFromEmpty)).toMatch("[]");
    }
    {
      const resultFromEmpty = typeDescriptor.transform([], "bytes");
      expect(skir.ByteString.sliceOf(resultFromEmpty).toBase16()).toMatch(
        "736b6972f6",
      );
    }

    // Test with default value in readable format
    const resultFromEmptyObj = typeDescriptor.transform({}, "dense");
    expect(JSON.stringify(resultFromEmptyObj)).toMatch("[]");

    // Test with actual data containing constant enum variant
    const denseWithConstant = [
      [2, [[], 5]], // shape: circle with center (0,0) and radius 5
      1, // unit: METERS (constant variant)
    ];
    const readableResult = typeDescriptor.transform(
      denseWithConstant,
      "readable",
    );
    expect(readableResult).toMatch({
      shape: {
        kind: "circle",
        value: {
          // center is omitted because it's default (x: 0, y: 0)
          radius: 5,
        },
      },
      unit: "meters",
    });

    // Test with wrapper enum variant
    const denseWithWrapper = [
      [2, [[1, 2], 5]], // shape: circle with center (1, 2) and radius 5
      [3, 2.5], // unit: custom variant with value 2.5
    ];
    const readableWithWrapper = typeDescriptor.transform(
      denseWithWrapper,
      "readable",
    );
    expect(readableWithWrapper).toMatch({
      shape: {
        kind: "circle",
        value: {
          center: {
            x: 1,
            y: 2,
          },
          radius: 5,
        },
      },
      unit: {
        kind: "custom",
        value: 2.5,
      },
    });

    // Test roundtrip: dense -> readable -> dense
    const roundtrip = typeDescriptor.transform(
      typeDescriptor.transform(denseWithWrapper, "readable"),
      "dense",
    );
    expect(roundtrip).toMatch(denseWithWrapper);
  });
});

// =============================================================================
// Enum name case-compatibility tests
// =============================================================================

describe("enum name case-compatibility", () => {
  // Build a minimal enum serializer with lower_case constant and wrapper names,
  // mirroring what the code generator will produce after the casing change.
  type WeekdayEnum = {
    kind: string;
    value?: unknown;
    "^"?: unknown;
  };

  const weekdaySerializer = (() => {
    // Parse a minimal type descriptor that sets up a simple enum with
    // lower_case constant names and a lower_case wrapper variant name.
    const typeDesc = skir.parseTypeDescriptorFromJson({
      type: { kind: "record", value: "test.skir:Weekday" },
      records: [
        {
          kind: "enum",
          id: "test.skir:Weekday",
          doc: "",
          variants: [
            { name: "monday", number: 1 },
            { name: "tuesday", number: 2 },
            {
              name: "custom",
              number: 3,
              type: { kind: "primitive", value: "string" },
            },
          ],
        },
      ],
    } as unknown as skir.Json);
    return typeDesc as skir.TypeDescriptor & {
      fromJson(j: skir.Json): WeekdayEnum;
      toJson(v: WeekdayEnum, f?: skir.JsonFlavor): skir.Json;
    };
  })();

  it("serializes lowercase-named constant to lower_case readable JSON", () => {
    // Arrange: parse a constant from its dense number.
    const monday = weekdaySerializer.fromJson(1);
    // Act: serialize to readable JSON.
    const readable = weekdaySerializer.toJson(
      monday as unknown as WeekdayEnum,
      "readable",
    );
    // Assert: output is lower_case.
    expect(readable).toBe("monday");
  });

  it("parses UPPER_CASE constant name in readable JSON", () => {
    // Arrange: readable JSON produced by old serializers uses UPPER_CASE.
    const fromUpper = weekdaySerializer.fromJson("MONDAY");
    const fromLower = weekdaySerializer.fromJson("monday");
    // Act & Assert: both resolve to the same value.
    expect(
      weekdaySerializer.toJson(fromUpper as unknown as WeekdayEnum, "dense"),
    ).toBe(
      weekdaySerializer.toJson(fromLower as unknown as WeekdayEnum, "dense"),
    );
    // Both should not be the default (UNKNOWN).
    const dense = weekdaySerializer.toJson(
      fromUpper as unknown as WeekdayEnum,
      "dense",
    );
    expect(dense).toBe(1);
  });

  it("parses lower_case constant name in readable JSON", () => {
    const result = weekdaySerializer.fromJson("tuesday");
    expect(
      weekdaySerializer.toJson(result as unknown as WeekdayEnum, "dense"),
    ).toBe(2);
  });
});
