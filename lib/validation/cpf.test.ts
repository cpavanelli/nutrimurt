import { describe, expect, it } from "vitest";

import { isValidCpf } from "./cpf";

describe("isValidCpf", () => {
  it.each([
    "529.982.247-25",
    "52998224725",
    "111.444.777-35",
    "935.411.347-80",
  ])("accepts known-valid CPF %s", (cpf) => {
    expect(isValidCpf(cpf)).toBe(true);
  });

  it.each([
    "529.982.247-24",
    "111.444.777-34",
    "123.456.789-00",
    "111.111.111-11",
    "00000000000",
    "123",
    "",
  ])("rejects known-invalid CPF %s", (cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });
});
