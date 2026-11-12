"use client";

import { useState } from "react";
import { CAR_MAKES, carYears, modelsOf } from "@/lib/cars";
import type { FormState } from "@/lib/form-state";
import { FIXED_LABELS } from "@/lobs/build";
import { SelectField } from "./form-controls";

const YEARS = carYears().map((y) => ({ value: String(y), label: String(y) }));
const MAKES = CAR_MAKES.map((m) => ({ value: m, label: m }));

/** Make, model (filtered by make) and model year. */
export function CarFields({ state }: { state: FormState }) {
  const { values, errors } = state;
  const [make, setMake] = useState(values.make ?? "");
  const [model, setModel] = useState(values.model ?? "");
  const models = modelsOf(make).map((m) => ({ value: m, label: m }));

  return (
    <>
      <SelectField
        name="make"
        label={FIXED_LABELS.make}
        placeholder="Choose a make"
        options={MAKES}
        value={make}
        onChange={(e) => {
          setMake(e.target.value);
          setModel("");
        }}
        error={errors.make}
      />
      <SelectField
        name="model"
        label={FIXED_LABELS.model}
        placeholder={make ? "Choose a model" : "Choose a make first"}
        options={models}
        value={model}
        onChange={(e) => setModel(e.target.value)}
        disabled={!make}
        error={errors.model}
      />
      <SelectField
        name="year"
        label={FIXED_LABELS.year}
        placeholder="Choose a year"
        options={YEARS}
        defaultValue={values.year ?? ""}
        error={errors.year}
      />
    </>
  );
}
