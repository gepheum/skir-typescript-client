import { expect } from "buckwheat";
import { describe, it } from "mocha";
import * as skir from "./skir-client.js";

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
