import { describe, it, expect } from "vitest";
import { calcularIniciales } from "../iniciales";

describe("calcularIniciales", () => {
  it("usa la primera letra del primer y último token del nombre completo", () => {
    expect(calcularIniciales("Andrés García", "andres.garcia")).toBe("AG");
    expect(calcularIniciales("María del Carmen López", "marialopez")).toBe("ML");
  });

  it("si el nombre completo es una sola palabra, repite o usa solo la primera", () => {
    expect(calcularIniciales("Andrés", "andres")).toBe("AN");
  });

  it("si no hay nombre completo, usa las dos primeras letras del username", () => {
    expect(calcularIniciales(null, "andres.garcia")).toBe("AN");
    expect(calcularIniciales("", "marialopez")).toBe("MA");
  });

  it("siempre devuelve en mayúsculas", () => {
    expect(calcularIniciales("andrés garcía", "andres")).toBe("AG");
  });

  it("ignora espacios extra", () => {
    expect(calcularIniciales("  Andrés   García  ", "andres")).toBe("AG");
  });
});
