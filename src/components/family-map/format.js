export function formatRelation(relation) {
  if (!relation) return null;
  return relation.replace(/^Head of Family$/i, "Head");
}

const REGIME_LABELS = {
  "British administration": "British administration",
  "Irish Free State": "Irish Free State",
};

export function formatRegime(regime) {
  if (!regime) return "";
  return REGIME_LABELS[regime] || regime;
}
