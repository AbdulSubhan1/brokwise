// A small fixed list of common car makes and models for the car forms. Not tied to any insurer or rating.

export const CAR_MODELS = {
  Ford: ["Edge", "Explorer", "Mustang", "Ranger"],
  Honda: ["Accord", "City", "Civic", "CR-V"],
  Hyundai: ["Elantra", "Santa Fe", "Sonata", "Tucson"],
  Kia: ["Cerato", "Picanto", "Sorento", "Sportage"],
  Mitsubishi: ["ASX", "Lancer", "Outlander", "Pajero"],
  Nissan: ["Altima", "Patrol", "Sunny", "X-Trail"],
  Suzuki: ["Alto", "Swift", "Vitara", "Wagon R"],
  Toyota: ["Camry", "Corolla", "Hilux", "Land Cruiser"],
} as const satisfies Record<string, readonly string[]>;

export type CarMake = keyof typeof CAR_MODELS;

export const CAR_MAKES = Object.keys(CAR_MODELS) as CarMake[];

export const FIRST_CAR_YEAR = 1990;

/** Model years a visitor can pick, newest first: next year down to 1990. */
export function carYears(now = new Date()): number[] {
  const last = now.getFullYear() + 1;
  return Array.from({ length: last - FIRST_CAR_YEAR + 1 }, (_, i) => last - i);
}

export function isCarMake(value: string): value is CarMake {
  return Object.hasOwn(CAR_MODELS, value);
}

export function modelsOf(make: string): readonly string[] {
  return isCarMake(make) ? CAR_MODELS[make] : [];
}
