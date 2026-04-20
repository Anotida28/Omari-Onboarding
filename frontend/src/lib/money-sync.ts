export type MoneySyncField = "unit" | "total" | "qty";

type MoneySyncInput = {
  qty: number;
  unit?: number | null;
  total?: number | null;
  changedField: MoneySyncField;
};

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeValue = (value: number | null | undefined) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function syncUnitTotal({
  qty,
  unit,
  total,
  changedField,
}: MoneySyncInput) {
  const safeQty = Number(qty);
  const unitValue = normalizeValue(unit);
  const totalValue = normalizeValue(total);

  if (!Number.isFinite(safeQty) || safeQty <= 0) {
    return {
      unit: changedField === "total" ? null : unitValue,
      total: changedField === "unit" ? null : totalValue,
    };
  }

  if (changedField === "unit") {
    return {
      unit: unitValue,
      total: unitValue == null ? null : roundMoney(unitValue * safeQty),
    };
  }

  if (changedField === "total") {
    return {
      unit: totalValue == null ? null : roundMoney(totalValue / safeQty),
      total: totalValue,
    };
  }

  if (unitValue != null) {
    return {
      unit: unitValue,
      total: roundMoney(unitValue * safeQty),
    };
  }

  if (totalValue != null) {
    return {
      unit: roundMoney(totalValue / safeQty),
      total: totalValue,
    };
  }

  return { unit: null, total: null };
}
