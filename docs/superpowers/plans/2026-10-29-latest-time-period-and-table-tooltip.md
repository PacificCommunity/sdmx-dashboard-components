# Latest TIME_PERIOD and Table Cell Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make column-like visualizations and tables show the latest non-empty `TIME_PERIOD` observation, and give table value cells a formatter-driven hover/focus tooltip that reports that period.

**Architecture:** A shared rank-based helper in `lib/utils/chartHelpers.ts` selects the latest non-empty observation; `collectColumnLike` uses it for `column`, `bar`, `lollipop`, `treemap`, and `table`, and `drilldown` uses it for its root value. The table model carries each cell's raw value, formatted text, period, and series color; a small React cell component renders a Bootstrap tooltip with either default chart-style content or a user formatter.

**Tech Stack:** React 19, TypeScript, the SDMX/ECharts data pipeline, Bootstrap 5 via `react-bootstrap`, CSS modules, `html-react-parser`.

**Spec:** `docs/superpowers/specs/2026-10-29-latest-time-period-and-table-tooltip-design.md`

## Global Constraints

- The repository has no test framework or test script. Verify every task with `npm run build` and `npm run lint`; verify runtime behaviour in the demo app (`npm run dev`) or preview build.
- "Latest" means the highest position in the `TIME_PERIOD` dimension's `values` array, with ISO-style string comparison as fallback. Never use `parseInt` — it collapses quarters and months of the same year.
- Empty means `null`, `undefined`, `''`, or numeric `NaN`. `0` and negative numbers are valid and must be selectable.
- If the latest period is empty, select the most recent earlier non-empty value. If no period has a non-empty value, the category has no point and the table renders `N/A`.
- Apply the latest-period rule only when a `TIME_PERIOD` dimension exists and is neither `config.xAxisConcept` nor the series/legend dimension. Otherwise keep the existing first-row-per-category behaviour.
- `bar` and `treemap` inherit the change through `collectColumnLike`; do not add special cases.
- No new runtime dependency. `react-bootstrap`, `html-react-parser`, and `react-bootstrap-icons` are already peer dependencies.
- Table output must remain a semantic `<table>` with `thead`, `tbody`, and `scope` attributes. Wide tables keep scrolling horizontally.
- Table tooltip strings are HTML (chart-compatible); React nodes are also accepted. Tooltips must work on hover and keyboard focus.
- No changes to `line`, `pie`, `map`, or `value`; no changes to the default chart tooltip.

## Review Focus

- The latest period is empty but an earlier period has a value: the earlier value must be shown, and `0` must never be treated as empty (Task 1).
- Quarterly/monthly data: the latest quarter/month must win, not the first period of the latest year (Task 1).
- A dataset with no `TIME_PERIOD`, or with `TIME_PERIOD` as the x-axis/legend concept, must keep the old behaviour and not crash (Task 1).
- Drilldown over `TIME_PERIOD` must keep the full series in the child chart while the root shows the latest non-empty value; a non-time drilldown with `TIME_PERIOD` present must use one consistent period (Task 2).
- A custom tooltip formatter may return an HTML string or a React node, and may receive `value: null` for `N/A`; a cell with neither a period nor a formatter must not render a tooltip (Task 4).
- A horizontally scrolling table and the dark theme must not clip or hide the tooltip (Task 4).

---

### Task 1: Latest non-empty TIME_PERIOD helpers and collector

**Files:**
- Modify: `lib/utils/chartHelpers.ts` (helpers near `getLatestValue`; `collectColumnLike` around the legend loop)

**Interfaces:**
- Consumes: existing `ParsedDataset`, `ChartContext`, `sortByDimension`, `getLatestValue`.
- Produces:
  - `isNonEmptyValue(value: unknown): boolean`
  - `timePeriodRank(dimension: any): Map<any, number>`
  - `getLatestTimePeriodRow(data: any[], timeDimension?: any): any | undefined`
  - `sortTimePeriodValues(data: any[], timeDimension?: any): any[]`
  - Updated `collectColumnLike(context: ChartContext): ColumnLikeCollection`, whose points keep carrying `TIME_PERIOD`.

- [ ] **Step 1: Add the value and period helpers**

In `lib/utils/chartHelpers.ts`, next to `getLatestValue`, add:

```ts
export const isNonEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return false;
  return !(typeof value === 'number' && Number.isNaN(value));
};

export const timePeriodRank = (dimension: any): Map<any, number> => {
  const ranks = new Map<any, number>();
  if (!dimension || !Array.isArray(dimension.values)) return ranks;
  dimension.values.forEach((value: any, index: number) => {
    if (value && value.name !== undefined) ranks.set(value.name, index);
  });
  return ranks;
};

const timePeriodKey = (period: any, ranks: Map<any, number>): [number, any] => {
  const index = ranks.get(period);
  return index === undefined ? [0, String(period)] : [1, index];
};

export const getLatestTimePeriodRow = (
  data: any[],
  timeDimension?: any
): any | undefined => {
  const ranks = timePeriodRank(timeDimension);
  let latest: any | undefined;
  let latestKey: [number, any] | undefined;
  data.forEach((row) => {
    if (!isNonEmptyValue(row?.value)) return;
    const period = row?.TIME_PERIOD;
    if (period === undefined || period === null || period === '') return;
    const key = timePeriodKey(period, ranks);
    if (
      !latestKey ||
      key[0] > latestKey[0] ||
      (key[0] === latestKey[0] && key[1] > latestKey[1])
    ) {
      latest = row;
      latestKey = key;
    }
  });
  return latest;
};
```

The `[1, index]` key marks a period found in the dimension and ranks it by list position. `[0, name]` marks an unknown period and falls back to string comparison. A known period always beats an unknown one. Ties keep the first row.

- [ ] **Step 2: Add the per-category reduction used by the collector**

Add this module-level helper next to the functions above (not exported):

```ts
const latestValuesByCategory = (
  data: any[],
  categoryDimension: string,
  timeDimension: any
): any[] => {
  const byCategory = new Map<any, any[]>();
  data.forEach((row) => {
    if (!isNonEmptyValue(row?.value)) return;
    const category = row[categoryDimension];
    const rows = byCategory.get(category);
    if (rows) rows.push(row);
    else byCategory.set(category, [row]);
  });
  return Array.from(byCategory.values()).map(
    (rows) => getLatestTimePeriodRow(rows, timeDimension) ?? rows[0]
  );
};
```

`Map` keeps the first insertion position, so categories stay in the order produced by `sortByDimension`. The helper is called once per category rather than once per row.

- [ ] **Step 3: Use the reduction inside `collectColumnLike`**

In `collectColumnLike`, after `const xAxisDimension = ...`, add:

```ts
const timeDimension = dimensions.find((d: any) => d.id === 'TIME_PERIOD');
const useLatestTimePeriod = Boolean(timeDimension)
  && xAxisConcept !== 'TIME_PERIOD'
  && legendDimension?.id !== 'TIME_PERIOD';
```

Replace:

```ts
const latestValues = getLatestValue(sortedData, xAxisConcept);
```

with:

```ts
const latestValues = useLatestTimePeriod
  ? latestValuesByCategory(sortedData, xAxisConcept, timeDimension)
  : getLatestValue(sortedData, xAxisConcept);
```

Keep the existing `latestValues.filter((val: any) => val.value !== null)` and the point construction unchanged, including `...(val['TIME_PERIOD'] ? { TIME_PERIOD: val['TIME_PERIOD'] } : {})`.

- [ ] **Step 4: Verify build and lint**

Run: `npm run build`
Expected: build completes and writes `dist`.

Run: `npm run lint`
Expected: passes with no new warnings or errors.

- [ ] **Step 5: Verify in the demo**

Run `npm run dev`, open the Column tab, and use the `SH_STA_MORT_COLUMN` example (its URL has no `lastNObservations=1`). Confirm:
- values match the latest year present in the response, not the first year;
- the custom tooltip's `in <year>` matches the plotted value;
- switching to the Lollipop demo shows the same values.

- [ ] **Step 6: Commit**

```bash
git add lib/utils/chartHelpers.ts
git commit -m "feat(chart): select latest non-empty time period"
```

---

### Task 2: Drilldown uses the shared latest-period rule

**Files:**
- Modify: `lib/components/chart/drilldown.ts` (per-category selection around the `xAxisDimension.values.forEach` loop)

**Interfaces:**
- Consumes: `getLatestTimePeriodRow(data, timeDimension)` from Task 1; existing `sortByDimension`.
- Produces: unchanged `buildDrilldown(context: ChartContext)` behaviour, with root values selected from the latest non-empty period and `periodByName` populated whenever `TIME_PERIOD` is available.

- [ ] **Step 1: Locate the time dimension per dataset**

Add `getLatestTimePeriodRow` and `isNonEmptyValue` to the existing import list
from `../../utils/chartHelpers`.

After `const drilldownXAxisDimension = ...`, add:

```ts
const timeDimension = dimensions.find((d: any) => d.id === 'TIME_PERIOD');
```

- [ ] **Step 2: Replace the per-category selection block**

Replace the block that currently starts with `let tmpArr = legendSerie.filter(...)` and ends with `if (tmpArr.length === 0) return;` with:

```ts
let tmpArr = legendSerie.filter(
  (val: any) => val[xAxisConcept] === xAxisDimensionValue.name
);
let legendSerieDataValue: any;

if (drilldownXAxisConcept === 'TIME_PERIOD') {
  legendSerieDataValue = getLatestTimePeriodRow(tmpArr, timeDimension);
  if (!legendSerieDataValue) return;
  tmpArr = sortByDimension(tmpArr, drilldownXAxisConcept);
} else if (timeDimension) {
  const latest = getLatestTimePeriodRow(tmpArr, timeDimension);
  if (!latest) return;
  const periodRows = tmpArr.filter(
    (val: any) => val['TIME_PERIOD'] === latest['TIME_PERIOD']
  );
  legendSerieDataValue = periodRows.find(
    (val: any) =>
      val[drilldownXAxisConcept] === 'Total' && isNonEmptyValue(val.value)
  ) ?? periodRows.find(
    (val: any) =>
      val[drilldownXAxisConcept] !== 'Total' && isNonEmptyValue(val.value)
  );
  if (!legendSerieDataValue) return;
  tmpArr = periodRows.filter(
    (val: any) => val[drilldownXAxisConcept] !== 'Total'
  );
  tmpArr = sortByDimension(tmpArr, drilldownXAxisConcept);
  if (tmpArr.length === 0) return;
} else {
  tmpArr = sortByDimension(tmpArr, drilldownXAxisConcept);
  legendSerieDataValue = tmpArr.find(
    (val: any) => val[drilldownXAxisConcept] === 'Total'
  );
  tmpArr = tmpArr.filter(
    (val: any) => val[drilldownXAxisConcept] !== 'Total'
  );
  if (!legendSerieDataValue || tmpArr.length === 0) return;
}
```

Do not change the `childData` mapping or the child `series` construction.
In the `TIME_PERIOD` branch, sort with `sortTimePeriodValues(tmpArr, timeDimension)`
rather than `sortByDimension`, so quarterly and monthly child series are
chronological. In the non-time branch, sort the filtered rows with
`sortByDimension(tmpArr, drilldownXAxisConcept)` before building `childData`.

- [ ] **Step 3: Store the period whenever it exists**

Replace:

```ts
if (drilldownXAxisConcept === 'TIME_PERIOD') {
  seriesEntry.periodByName.set(category, legendSerieDataValue[drilldownXAxisConcept]);
}
```

with:

```ts
if (legendSerieDataValue['TIME_PERIOD']) {
  seriesEntry.periodByName.set(category, legendSerieDataValue['TIME_PERIOD']);
}
```

The root point construction at the end of the function already copies `periodByName` into `TIME_PERIOD`, so non-time drilldowns now expose the period too.

- [ ] **Step 4: Verify build and lint**

Run: `npm run build`
Expected: build completes.

Run: `npm run lint`
Expected: passes with no new warnings or errors.

- [ ] **Step 5: Verify in the demo**

Open the Drilldown tab and the `SH_STA_MORT` drilldown example:
- the root bar for each country shows the latest non-empty year;
- hovering a root bar reports that year;
- clicking a country still opens the full time series in the child chart;
- the "Back" control still works.

- [ ] **Step 6: Commit**

```bash
git add lib/components/chart/drilldown.ts
git commit -m "feat(drilldown): use latest non-empty time period"
```

---

### Task 3: Table model carries period, raw value, and series color

**Files:**
- Modify: `lib/components/table/model.ts`
- Modify: `lib/components/table/index.tsx` (render `cell.text`; the tooltip is Task 4)

**Interfaces:**
- Consumes: `collectColumnLike`, `sortColumnLikeCategories`, `paletteColor` from `lib/utils/chartHelpers.ts`.
- Produces:
  - `TableCell` with `{ text: string; rawValue: unknown; period?: string; color?: string }`
  - `TableModel` with `rows: { category: string; values: TableCell[] }[]`
  - Unchanged `formatTableValue(value, config, language): string`

- [ ] **Step 1: Define the cell type and update the model**

In `lib/components/table/model.ts`, replace `TableModel` and add `TableCell`:

```ts
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
```

Import `paletteColor` alongside the existing chart helper imports.

- [ ] **Step 2: Build one cell object per value**

Replace the `rows` construction in `buildTableModel` with:

```ts
const rows = categories.map((category) => ({
  category: String(category),
  values: entries.map((entry) => {
    const point = entry.valueByName.get(category);
    const color = paletteColor(config, entry.legendConcept, entry.id);
    return {
      text: formatTableValue(point?.value, config, language),
      rawValue: point?.value ?? null,
      ...(point?.TIME_PERIOD ? { period: String(point.TIME_PERIOD) } : {}),
      ...(color ? { color } : {}),
    };
  }),
}));
```

Do not change `formatTableValue`, column construction, `categoryLabel`, or `sortColumnLikeCategories`.

- [ ] **Step 3: Keep the existing render compiling**

In `lib/components/table/index.tsx`, change the value cell render from:

```tsx
<td key={index} className={styles.valueCell}>{value}</td>
```

to:

```tsx
<td key={index} className={styles.valueCell}>{value.text}</td>
```

No tooltip changes in this task.

- [ ] **Step 4: Verify build and lint**

Run: `npm run build`
Expected: build completes; the type error from rendering an object is gone.

Run: `npm run lint`
Expected: passes with no new warnings or errors.

- [ ] **Step 5: Verify the table still renders**

Open the Table demo tab and confirm the existing table looks and behaves exactly as before: same columns, same formatted values, `N/A` for missing data, horizontal scrolling.

- [ ] **Step 6: Commit**

```bash
git add lib/components/table/model.ts lib/components/table/index.tsx
git commit -m "feat(table): carry period and series color per cell"
```

---

### Task 4: Table cell tooltip config and rendering

**Files:**
- Modify: `lib/components/types.ts`
- Modify: `lib/components/table/index.tsx`
- Modify: `lib/components/table/styles.module.css`
- Modify: `lib/index.ts`

**Interfaces:**
- Consumes: `TableCell` from Task 3; `parse` from `html-react-parser`; `OverlayTrigger` and `Tooltip` from `react-bootstrap`.
- Produces:
  - `SDMXTableCellTooltipParams = { name: string; seriesName: string; value: unknown; data: { TIME_PERIOD?: string }; marker: string; color?: string }`
  - `SDMXTableTooltipConfig = { enabled?: boolean; formatter?: (params: SDMXTableCellTooltipParams) => string | ReactNode }`
  - `SDMXTableConfig` with `tooltip?: SDMXTableTooltipConfig`
  - Exports for both new types from `lib/index.ts`.

- [ ] **Step 1: Add the tooltip types**

In `lib/components/types.ts`, add `import type { ReactNode } from 'react';` at the top, then add before `SDMXTableConfig`:

```ts
export type SDMXTableCellTooltipParams = {
    name: string, // row category
    seriesName: string, // value column header, including the unit suffix
    value: unknown, // raw value; null for N/A
    data: { TIME_PERIOD?: string }, // chart-shaped data object
    marker: string, // colored-dot HTML, empty when no palette color resolves
    color?: string, // resolved hex color, when available
}

export type SDMXTableTooltipConfig = {
    enabled?: boolean, // default true
    formatter?: (params: SDMXTableCellTooltipParams) => string | ReactNode,
}
```

Change `SDMXTableConfig` to:

```ts
export type SDMXTableConfig = {
    categoryLabel?: string, // header of the first column; defaults to "Category"
    tooltip?: SDMXTableTooltipConfig, // value-cell tooltip
} & SDMXChartConfig
```

- [ ] **Step 2: Export the new types**

In `lib/index.ts`, add `type SDMXTableCellTooltipParams` and `type SDMXTableTooltipConfig` to the import from `./components/types`, and add both names to the exported type list.

- [ ] **Step 3: Add the tooltip helpers and cell component**

In `lib/components/table/index.tsx`, update imports:

```tsx
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import type { SDMXChartConfig, SDMXTableConfig, SDMXTableCellTooltipParams } from '../types';
import { buildTableModel, type TableCell, type TableModel } from './model';
```

Add module-level helpers above `renderTable`:

```tsx
const markerHtml = (color?: string): string =>
  color
    ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;"></span>`
    : '';

const defaultTableCellTooltip = (
  params: SDMXTableCellTooltipParams,
  text: string
): React.ReactNode => (
  <>
    <div>{params.name}</div>
    <div>
      {params.marker
        ? <span dangerouslySetInnerHTML={{ __html: params.marker }} />
        : null}
      {params.seriesName}: {text}
      {params.data.TIME_PERIOD ? ` in ${params.data.TIME_PERIOD}` : ''}
    </div>
  </>
);
```

Add a module-level component:

```tsx
const TableCellValue = ({
  cell,
  category,
  seriesName,
  tooltipId,
  container,
  config,
}: {
  cell: TableCell;
  category: string;
  seriesName: string;
  tooltipId: string;
  container?: HTMLElement | null;
  config: SDMXTableConfig;
}) => {
  const tooltip = config.tooltip;
  const formatter = tooltip?.formatter;
  const marker = markerHtml(cell.color);

  if (tooltip?.enabled === false || (!formatter && !cell.period)) {
    return <>{cell.text}</>;
  }

  const params: SDMXTableCellTooltipParams = {
    name: category,
    seriesName,
    value: cell.rawValue,
    data: cell.period ? { TIME_PERIOD: cell.period } : {},
    marker,
    ...(cell.color ? { color: cell.color } : {}),
  };
  const content = formatter
    ? formatter(params)
    : defaultTableCellTooltip(params, cell.text);

  return (
    <OverlayTrigger
      placement="top"
      trigger={['hover', 'focus']}
      container={container ?? undefined}
      overlay={
        <Tooltip id={tooltipId}>
          {typeof content === 'string' ? parse(content) : content}
        </Tooltip>
      }
    >
      <span className={styles.tooltipTrigger} tabIndex={0}>{cell.text}</span>
    </OverlayTrigger>
  );
};
```

The overlay is portalled into the table's outer container, which is outside
`.table-responsive` (so it cannot be clipped) and inside the `data-bs-theme`
scope (so the demo's container-scoped dark theme still applies). A React node
is rendered directly; a string is parsed as HTML, matching chart formatters.

- [ ] **Step 4: Use the cell component in `renderTable`**

Change the signature to:

```tsx
const renderTable = (
  model: TableModel,
  config: SDMXTableConfig,
  container?: HTMLElement | null
): React.JSX.Element => {
```

Build a stable tooltip id from the table id and cell position before the
`table` element:

```tsx
const tableId = String(config.id ?? 'table').replace(/[^\w-]/g, '-');
```

Inside the row map, replace the value cell with:

```tsx
{row.values.map((cell, columnIndex) => (
  <td key={columnIndex} className={styles.valueCell}>
    <TableCellValue
      cell={cell}
      category={row.category}
      seriesName={model.columns[columnIndex]}
      tooltipId={`${tableId}-tooltip-${rowIndex}-${columnIndex}`}
      container={container}
      config={config}
    />
  </td>
))}
```

Use the row map's index for `rowIndex` (`model.rows.map((row, rowIndex) => ...)`).
Update both `renderTable` call sites in the `Table` component:

```tsx
callbackRef.current?.(renderTable(nextModel, config, containerRef.current));
```

```tsx
{!isLoading && !error && model && renderTable(model, config, containerRef.current)}
```

- [ ] **Step 5: Add the trigger styles**

Append to `lib/components/table/styles.module.css`:

```css
.tooltipTrigger {
  cursor: help;
  outline-offset: 2px;
}

.tooltipTrigger:focus-visible {
  outline: 2px solid #5b8db8;
}

:global([data-bs-theme="dark"]) .tooltipTrigger:focus-visible {
  outline-color: #9ec5e8;
}
```

Bootstrap styles the tooltip box itself. Do not add a bespoke tooltip box.

- [ ] **Step 6: Verify build and lint**

Run: `npm run build`
Expected: build completes and the new types are present in the generated declarations.

Run: `npm run lint`
Expected: passes with no new warnings or errors.

- [ ] **Step 7: Verify in the demo**

With a multi-period table URL:
- hovering a populated value cell shows the category, column, formatted value, and `in <period>`;
- tabbing to a value and focusing it shows the same tooltip;
- a cell with a `0` value shows `0`, not `N/A`;
- a config with `tooltip: { enabled: false }` shows no tooltip;
- a custom formatter returning an HTML string renders the markup, not escaped tags;
- a custom formatter returning a React node renders without `[object Object]`;
- a value cell with neither a period nor a formatter has no tooltip;
- in a narrow window with a horizontally scrolling table, the tooltip is not clipped;
- in dark theme the tooltip remains readable.

- [ ] **Step 8: Commit**

```bash
git add lib/components/types.ts lib/index.ts lib/components/table/index.tsx lib/components/table/styles.module.css
git commit -m "feat(table): add formatter-driven cell tooltip"
```

---

### Task 5: Documentation and demo examples

**Files:**
- Modify: `README.md`
- Modify: `src/components/Table.tsx`

**Interfaces:**
- Consumes: the public `tooltip` config from Task 4.
- Produces: user-facing documentation and a runnable demo of both the default tooltip and a custom formatter.

- [ ] **Step 1: Document the latest-period rule in the README**

In the chart data section (near "Sorting data by value"), add a short subsection:

````markdown
### Choosing the observation

When the data contains more than one observation per x-axis category, `column`,
`bar`, `lollipop` and `treemap` charts show the observation for the latest
`TIME_PERIOD` with a non-empty value. Empty means `null`, `undefined`, `""`, or
`NaN`; `0` is a valid value. If the latest period is empty, the most recent
earlier period with a value is used. `drilldown` applies the same rule to its
root values.

The rule applies only when `TIME_PERIOD` is neither `xAxisConcept` nor the
legend concept. Otherwise the previous first-row-per-category behaviour is
kept. Tables use the same selection.
````

- [ ] **Step 2: Document the table tooltip in the README**

In the "Tables" section, replace the final paragraph's claim that tables ignore `extraOptions` with:

````markdown
Tables ignore `extraOptions` and ECharts theming. Use the `tooltip` config for
value-cell tooltips. By default a tooltip shows the row category, the value
column, the formatted value, and the `TIME_PERIOD` used for that cell. Override
the content with `tooltip.formatter`; it receives chart-shaped params and may
return an HTML string (like a chart formatter) or a React node.

```javascript
<SDMXTable
  config={{
    ...
    tooltip: {
      formatter: ({ name, seriesName, value, data, marker }) => {
        const display = value == null || value === ""
          ? "N/A"
          : Number(value).toLocaleString("en");
        const period = data.TIME_PERIOD ? ` in ${data.TIME_PERIOD}` : "";
        return `${name}<br/>${marker}${seriesName}: ${display}${period}`;
      }
    }
  }}
  language="en"
/>
```

Tooltips appear on hover and keyboard focus. Set `tooltip: { enabled: false }`
to disable them. Cells with no `TIME_PERIOD` and no formatter show no tooltip.
````

Keep the existing explanation that each legend value becomes a value column and missing values render `N/A`.

- [ ] **Step 3: Add a multi-period table demo**

In `src/components/Table.tsx`, add a second entry to `content` using the `SH_STA_MORT` multi-period URL from `src/components/Column.tsx` (the one without `lastNObservations=1`), with:

- `id: "SH_STA_MORT_TABLE"`, `type: "table"`, `xAxisConcept: "GEO_PICT"`, `legend: { concept: "INDICATOR", location: "none" }`;
- the same `GEO_PICT` palette as the column demo, so the tooltip marker has a color;
- `tooltip.formatter` copied from the column demo, with the null guard shown in Step 2;
- a title/subtitle so the example is readable.

Leave the existing `SI_POV_DAY1_TABLE` demo unchanged so the default tooltip is still exercised (its data has `lastNObservations=1`, which still yields one period per cell).

- [ ] **Step 4: Verify build and lint**

Run: `npm run build`
Expected: build completes.

Run: `npm run lint`
Expected: passes with no new warnings or errors.

- [ ] **Step 5: Verify the demo end to end**

Run `npm run dev` and check:
- the new table shows the latest year's values, matching the column demo;
- the custom formatter renders the marker, value, and period;
- the old table shows the default tooltip with its period;
- the README example code is valid JSX and matches the formatter contract.

- [ ] **Step 6: Commit**

```bash
git add README.md src/components/Table.tsx
git commit -m "docs(table): document latest period and table tooltips"
```

---

## Final verification

- [ ] `npm run build` succeeds.
- [ ] `npm run lint` passes with no new warnings.
- [ ] `git diff` contains no changes to `line.ts`, `pie.ts`, `map`, or `value`.
- [ ] `bar` and `treemap` (Other tab) show the same latest-period values and
  still render their existing layouts.
- [ ] The five Review Focus scenarios have each been exercised in the demo.
- [ ] `docs/superpowers/specs/2026-10-29-latest-time-period-and-table-tooltip-design.md` and this plan are committed with the feature.
