import { describe, it, expect } from "vitest";
import {
  validarNombreUsuario,
  validarEmail,
  validarPassword,
} from "../validaciones";

describe("validarNombreUsuario", () => {
  it("acepta entre 3 y 32 letras, números, puntos y guion bajo", () => {
    expect(validarNombreUsuario("andres")).toBeNull();
    expect(validarNombreUsuario("andres.garcia")).toBeNull();
    expect(validarNombreUsuario("usuario_99")).toBeNull();
    expect(validarNombreUsuario("a".repeat(32))).toBeNull();
  });

  it("rechaza menos de 3 caracteres", () => {
    expect(validarNombreUsuario("ab")).toMatch(/3 caracteres/i);
  });

  it("rechaza más de 32 caracteres", () => {
    expect(validarNombreUsuario("a".repeat(33))).toMatch(/32 caracteres/i);
  });

  it("rechaza caracteres no permitidos", () => {
    expect(validarNombreUsuario("andres garcia")).toMatch(/letras, números/i);
    expect(validarNombreUsuario("andres-garcia")).toMatch(/letras, números/i);
    expect(validarNombreUsuario("andres@uni")).toMatch(/letras, números/i);
  });
});

describe("validarEmail", () => {
  it("acepta emails con formato razonable", () => {
    expect(validarEmail("a@b.co")).toBeNull();
    expect(validarEmail("andres.garcia@uni.es")).toBeNull();
  });

  it("rechaza emails sin @ o sin dominio", () => {
    expect(validarEmail("noarroba")).toMatch(/válido/i);
    expect(validarEmail("a@")).toMatch(/válido/i);
    expect(validarEmail("@b.co")).toMatch(/válido/i);
  });
});

describe("validarPassword", () => {
  it("acepta contraseñas de 8 caracteres o más", () => {
    expect(validarPassword("12345678")).toBeNull();
    expect(validarPassword("contraseña-segura-larga")).toBeNull();
  });

  it("rechaza contraseñas más cortas", () => {
    expect(validarPassword("1234567")).toMatch(/8 caracteres/i);
    expect(validarPassword("")).toMatch(/8 caracteres/i);
  });
});
