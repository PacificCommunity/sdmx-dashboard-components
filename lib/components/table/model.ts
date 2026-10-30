import type { ChartContext, ParsedDataset } from '../../utils/chartHelpers';
import { collectColumnLike, paletteColor, sortColumnLikeCategories } from '../../utils/chartHelpers';
import type { SDMXTableConfig } from '../types';

export type TableCell = {
  text: string;
  rawValue: unknown;
  period?: string;
  color?: string;
};

export type TableModel = {
  categoryLabel: string;
  columns: string[];
  rows: { category: string; values: TableCell[] }[];
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export const safePaletteColor = (color?: unknown): string | undefined =>
  typeof color === 'string' && HEX_COLOR.test(color) ? color : undefined;

export const formatTableValue = (
  value: unknown,
  config: SDMXTableConfig,
  language: string
): string => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'N/A';
  const decimals = Number(config.decimals);
  if (Number.isInteger(decimals)) {
    return numeric.toLocaleString(language, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return numeric.toLocaleString(language);
};

export const buildTableModel = (
  config: SDMXTableConfig,
  language: string,
  datasets: ParsedDataset[]
): TableModel => {
  const context: ChartContext = {
    config,
    language,
    datasets,
    titleText: '',
    subtitleText: '',
  };
  const collection = collectColumnLike(context);
  const entries = collection.entries.filter((entry) => entry.valueByName.size > 0);
  const categories = sortColumnLikeCategories(
    collection.categories,
    collection.entries,
    config.sortByValue
  );
  const unit = config.unit?.text;
  const columns = entries.map((entry) => {
    const name = collection.resolvedNames.get(entry) ?? entry.name;
    return unit ? `${name} (${unit})` : name;
  });
  const rows = categories.map((category) => ({
    category: String(category),
    values: entries.map((entry) => {
      const point = entry.valueByName.get(category);
      const color = safePaletteColor(paletteColor(config, entry.legendConcept, entry.id));
      return {
        text: formatTableValue(point?.value, config, language),
        rawValue: point?.value ?? null,
        ...(point?.TIME_PERIOD ? { period: String(point.TIME_PERIOD) } : {}),
        ...(color ? { color } : {}),
      };
    }),
  }));

  return {
    categoryLabel: config.categoryLabel ?? 'Category',
    columns,
    rows,
  };
};
