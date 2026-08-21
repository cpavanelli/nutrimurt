import { describe, expect, it } from "vitest";

import { slugify } from "./slug";

describe("slugify", () => {
  it("strips Portuguese accents rather than dropping the letters", () => {
    expect(slugify("João Conceição")).toBe("joao-conceicao");
    expect(slugify("Ângela Muñoz")).toBe("angela-munoz");
  });

  it("collapses runs of punctuation into one hyphen", () => {
    expect(slugify("Ana   Maria!!! Souza")).toBe("ana-maria-souza");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  ...Ana...  ")).toBe("ana");
  });

  it("falls back to 'paciente' for blank or unmappable names", () => {
    expect(slugify("")).toBe("paciente");
    expect(slugify("   ")).toBe("paciente");
    expect(slugify("!!!")).toBe("paciente");
    expect(slugify("日本語")).toBe("paciente");
  });

  it("keeps digits", () => {
    expect(slugify("Paciente 42")).toBe("paciente-42");
  });
});
