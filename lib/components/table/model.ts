import type { ChartContext, ParsedDataset } from '../../utils/chartHelpers';
import { collectColumnLike, sortColumnLikeCategories } from '../../utils/chartHelpers';
import type { SDMXTableConfig } from '../types';

export type TableModel = {
  categoryLabel: string;
  columns: string[];
  rows: { category: string; values: string[] }[];
};

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
  const categories = sortColumnLikeCategories(
    collection.categories,
    collection.entries,
    config.sortByValue
  );
  const unit = config.unit?.text;
  const columns = collection.entries.map((entry) => {
    const name = collection.resolvedNames.get(entry) ?? entry.name;
    return unit ? `${name} (${unit})` : name;
  });
  const rows = categories.map((category) => ({
    category: String(category),
    values: collection.entries.map((entry) =>
      formatTableValue(entry.valueByName.get(category)?.value, config, language)
    ),
  }));

  return {
    categoryLabel: config.categoryLabel ?? 'Category',
    columns,
    rows,
  };
};
