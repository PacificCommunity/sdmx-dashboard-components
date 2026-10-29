# Latest TIME_PERIOD selection and table cell tooltip — design

Date: 2026-10-29

## Intent

Two related changes:

1. When a column-like visualization collapses several observations for one
   x-axis category, show the observation for the **latest non-empty
   `TIME_PERIOD`** instead of the first row the SDMX response happens to
   return. `0` is a valid value; null/empty observations are skipped.
2. Give table value cells a hover/focus tooltip that exposes the `TIME_PERIOD`
   used for that cell, with content customisable through a formatter in the
   same spirit as chart tooltips.

The types affected are `column`, `bar`, `lollipop`, `treemap`, `table`, and
`drilldown`. `bar` and `treemap` are included because they share the same
collector as `column` and `lollipop`.

## Goals

- One shared rule for "latest non-empty observation along TIME_PERIOD", used
  by the column-like collector and by drilldown.
- Correct ordering for annual, quarterly, monthly, weekly, and daily periods
  (not `parseInt`, which collapses all periods of a year to the same value).
- Table model carries the period for each cell without changing the rendered
  text.
- Table tooltip configurable with a formatter that receives chart-shaped
  params, so a chart formatter can be reused with little or no change.
- Default tooltip content resembles the chart tooltip: category on the first
  line, then a marker, series name, formatted value, and the period.
- Tooltip works on mouse hover and keyboard focus, is not clipped by the
  responsive table wrapper, and follows the Bootstrap dark theme.

## Non-goals

- No changes to `line`, `pie`, `map`, or `value` charts.
- No changes to the default chart tooltip (it still does not print
  `TIME_PERIOD`; custom chart formatters may keep doing so).
- No rewriting of SDMX query URLs (no automatic `lastNObservations`).
- No client-side aggregation, averaging, or summing of observations.
- No CSV export, sorting on click, pagination, or cell editing.
- No new runtime dependency; `react-bootstrap` and `html-react-parser` are
  already peer dependencies.
- The repository has no test framework, so no automated unit tests are added.

## Constraints

- `collectColumnLike` in `lib/utils/chartHelpers.ts` is the shared pivot for
  `column`, `bar`, `lollipop`, `treemap`, and `table`; changing it changes all
  of them.
- `drilldown` has its own collector in `lib/components/chart/drilldown.ts` and
  already picks the last `TIME_PERIOD` row when
  `drilldown.xAxisConcept === 'TIME_PERIOD'`.
- Data rows contain dimension **names**, not code ids. Period ranking must use
  the `TIME_PERIOD` dimension's `values` order (or the name itself as a
  fallback), because a name like `Jan 2023` does not sort lexicographically.
- `SDMXTableConfig` already extends `SDMXChartConfig`, so `extraOptions`
  remains accepted but is still ignored by the table.
- `renderTable` is also called from the `callback` prop with a static React
  element, so tooltip state must live inside reusable components rather than
  depend on layout effects in the parent `Table`.

## Approaches considered

### 1. Dedicated table tooltip config with chart-shaped params — chosen

Add `tooltip?: { enabled?: boolean; formatter?: (params) => string | ReactNode }`
to `SDMXTableConfig`. `params` mirrors ECharts:

```ts
{
  name,                 // row category
  seriesName,           // value column header
  value,                // raw numeric value
  data: { TIME_PERIOD? },
  marker,               // colored-dot HTML, empty when no palette color
  color,                // resolved hex color or undefined
}
```

A string return value is treated as HTML (like chart formatters); a React node
is rendered as React. Existing chart formatters such as
`src/components/Column.tsx:182` work as table formatters with no change.

Trade-off: a new config field, and chart tooltips remain configured under
`extraOptions.tooltip` rather than the same key.

### 2. Reuse `extraOptions.tooltip.formatter`

Rejected. `extraOptions` is ECharts-typed: its formatter may return
`HTMLElement`, and its params are ECharts-specific. The table documents that it
ignores `extraOptions`, and exposing one slice of it would make the rest look
meaningful when it is not.

### 3. Table-specific formatter with richer params

Rejected. Params such as `{ category, column, value, period, rowIndex, columnIndex }`
are clearer for a table author, but a chart formatter cannot be reused, which
is the point of "like for charts".

## Design

### Latest TIME_PERIOD rule

Add helpers in `lib/utils/chartHelpers.ts`:

```ts
export const timePeriodRank = (dimension: any): Map<any, number>;
export const getLatestTimePeriodRow = (
  data: any[],
  timeDimension: any | undefined
): any | undefined;
```

- `timePeriodRank` maps each `TIME_PERIOD` value name to its index in the
  dimension's `values` array. The SDMX response lists time values in
  chronological order, so the highest index is the latest period.
- `getLatestTimePeriodRow` returns the row with the highest rank **among rows
  whose value is non-empty**. If the dimension is missing or a name is not in
  the map, fall back to comparing names as strings (works for ISO-style
  `2023`, `2023-Q1`, `2023-01`, `2023-01-01`); if names are still incomparable,
  keep the existing data order (last non-empty row wins).
- "Non-empty" means the value is not `null`, `undefined`, `''`, or `NaN`.
  `0` and negative numbers are valid values and can be selected. A row with an
  empty value never wins, even when it has the latest period.
- The helper considers only rows whose `TIME_PERIOD` value exists; rows with a
  null/empty `TIME_PERIOD` lose to rows with a period.

Apply it only when all of the following hold:

- the dataset has a `TIME_PERIOD` dimension;
- `config.xAxisConcept` is not `TIME_PERIOD`;
- the series/legend dimension is not `TIME_PERIOD`.

Otherwise keep today's behaviour: `getLatestValue` (first row per category)
when there is no usable time dimension.

`getLatestValue` is left in place for that fallback. A new
`getLatestValueByTimePeriod` is not added; the collector uses
`getLatestTimePeriodRow` directly.

### `collectColumnLike`

For each dataset and each legend value:

1. Filter rows by legend value.
2. Sort by `xAxisConcept` as today, so category order is unchanged.
3. If the latest-period rule applies, reduce the sorted rows to one row per
   x category by keeping the row with the highest period rank. Otherwise use
   `getLatestValue` as today.
4. Only non-empty values take part in the reduction: the latest period with a
   non-empty value wins. If the latest period is empty but an earlier period
   has a value, the earlier value is shown. If no period has a non-empty
   value, the category has no point and the column/cell is empty (existing
   `N/A` rendering in the table). `0` is a valid value.
5. Store the selected row's `TIME_PERIOD` on the point, as the code already
   does at `lib/utils/chartHelpers.ts:812`.

Because `bar` and `treemap` share this collector, they inherit the new rule.
`table` inherits it too, which is why the table model can read the period
without a second pass over the raw data.

### Drilldown

`drilldown` already selects the last row when `drilldown.xAxisConcept` is
`TIME_PERIOD` (`lib/components/chart/drilldown.ts:74-94`) and stores it in
`periodByName`. Replace its `sortByDimension(...); tmpArr[last]` step with the
shared rank helper so quarterly/monthly periods order correctly, and keep
`TIME_PERIOD` on the root point (`:180`).

When `TIME_PERIOD` is present but `drilldown.xAxisConcept` is not
`TIME_PERIOD`, select the latest **non-empty** period first, use its `Total`
row (or first non-`Total` row) for the root value, and build the child chart
from rows at that same latest non-empty period. This keeps the root value and
the child breakdown consistent. **This is a behaviour change for non-time
drilldowns and is called out for approval.** Child charts over `TIME_PERIOD`
are sorted by the dimension's value order so quarterly and monthly periods are
chronological.

When no `TIME_PERIOD` is present, drilldown keeps its current `Total`/first
behaviour.

### Table model

`lib/components/table/model.ts` changes each value from a string to an object:

```ts
export type TableCell = {
  text: string;        // formatted display value, or "N/A"
  rawValue: unknown;   // number | null | undefined
  period?: string;     // TIME_PERIOD for this cell
};

export type TableModel = {
  categoryLabel: string;
  columns: string[];
  rows: { category: string; values: TableCell[] }[];
};
```

`formatTableValue` keeps its current output and uses the raw value. The period
comes from `entry.valueByName.get(category)?.TIME_PERIOD`: since only
non-empty values are selected, every populated cell has the period of the
observation it shows. An `N/A` cell has no period and therefore no default
tooltip.

The rendered text, column order, `categoryLabel`, `decimals`, `unit`, and
`sortByValue` behaviour do not change.

### Table tooltip configuration

Add to `lib/components/types.ts`:

```ts
export type SDMXTableCellTooltipParams = {
  name: string;
  seriesName: string;
  value: unknown;
  data: { TIME_PERIOD?: string };
  marker: string;
  color?: string;
};

export type SDMXTableTooltipConfig = {
  enabled?: boolean; // default true
  formatter?: (params: SDMXTableCellTooltipParams) => string | React.ReactNode;
};

export type SDMXTableConfig = {
  categoryLabel?: string;
  tooltip?: SDMXTableTooltipConfig;
} & SDMXChartConfig;
```

Export the two new types from `lib/index.ts`.

- `name` is `row.category`.
- `seriesName` is the column header including the unit suffix, matching what
  the user sees.
- `value` is the raw numeric value (`null` for `N/A`).
- `data.TIME_PERIOD` is present only when the cell has a period.
- `marker` is an HTML string for a small colored dot when a palette color
  resolves through the existing `paletteColor(config, legendConcept, id)`
  lookup; otherwise it is `''`. `color` carries the same hex value for React
  formatters that prefer to build their own marker.

Tooltip is shown when `config.tooltip?.enabled !== false` and either the cell
has a `period` or a `formatter` is configured. Cells with neither stay plain.

### Default tooltip content

When no formatter is provided:

```
<category>
<dot> <column>: <formatted value> in <period>
```

This mirrors the chart tooltip shape: category first, then the series line.
The period is omitted when the cell has none. The default is implemented as a
React node; custom string output is parsed with `html-react-parser`, the same
way table titles already handle HTML.

### Tooltip rendering

- Wrap the value text in a focusable `<span>` (`tabIndex={0}`) inside the
  `<td>`; do not make the whole cell focusable.
- Use `OverlayTrigger` and `Tooltip` from `react-bootstrap` with
  `trigger={['hover', 'focus']}` and `placement="top"`. Portal the overlay
  into the table's outer container (`containerRef`), which sits outside
  `.table-responsive` and inside the theme scope, so it is not clipped and
  inherits the `data-bs-theme` CSS variables (the demo scopes the theme to a
  container, not `<html>`).
- Give each tooltip a stable id built from `config.id` plus row/column index
  (`${config.id}-tooltip-${rowIndex}-${colIndex}`) so multiple tables on one
  page do not collide.
- Keep the tooltip trigger inside the existing `dataLink` anchor; hovering
  still shows the tooltip, clicking still follows the link.
- Add only minimal styles to `lib/components/table/styles.module.css`:
  `cursor: help`, a subtle focus outline, and any dark-theme colour override
  Bootstrap does not already provide. The tooltip box itself uses Bootstrap's
  styling rather than a bespoke copy of ECharts.

### Documentation and demo

- `README.md`:
  - document the latest-`TIME_PERIOD` rule for column-like charts and tables;
  - replace the "tables ignore extraOptions" note with a pointer to the new
    `tooltip` config and a formatter example;
  - state that a formatter may return HTML (chart-compatible) or React nodes.
- `src/components/Table.tsx`: add a second example using a formatter copied
  from the column demo, so the chart/table formatter compatibility is visible.

## Decisions made in this design

- "Latest" means the highest position in the `TIME_PERIOD` dimension's value
  list among observations with a non-empty value; ISO-style string order is
  the fallback; never `parseInt`.
- A null/empty latest observation is skipped: the most recent non-empty value
  is shown. `0` is valid and is never treated as empty.
- `bar` and `treemap` inherit the change; they are not frozen on the old
  behaviour.
- Drilldown root values use the same helper; non-time drilldowns restrict
  their child breakdown to the selected latest period (flagged above).
- Table tooltips live under a dedicated `tooltip` key, not inside
  `extraOptions`.
- Tooltip params mirror ECharts so chart formatters are reusable.
- Tooltip strings are HTML, matching charts; React nodes are also accepted for
  table-only authors.
- Bootstrap's `OverlayTrigger`/`Tooltip` is used instead of a hand-rolled
  portal or a native `title` attribute.
- No tooltip is shown for cells with neither a period nor a formatter.

## Verification

1. `npm run build` succeeds.
2. `npm run lint` passes with no new warnings.
3. Demo column with a multi-period URL (e.g. the `SH_STA_MORT` example, which
   does not use `lastNObservations=1`) shows the latest period's value; the
   custom tooltip reports the same period.
4. Same data as a table shows identical values; hovering a value cell shows
   the period; keyboard focus shows it too.
5. Table with a custom `tooltip.formatter` renders the custom HTML/React
   content; a formatter copied from the column chart works unchanged.
6. A dataset without `TIME_PERIOD` keeps the previous first-row behaviour and
   shows no period tooltip.
7. A quarterly or monthly dataset selects the chronologically latest period,
   not the first month of the latest year.
8. When the latest period is null and an earlier period has a value, the
   earlier value is shown; a period whose value is `0` is selected and shown
   as `0`.
9. A drilldown over `TIME_PERIOD` still shows the latest non-empty period at
   the root and the full series in the child chart; a drilldown over another
   dimension with `TIME_PERIOD` present uses the latest non-empty period
   consistently.
10. `bar`, `lollipop`, and `treemap` show the same latest-period values as
    `column`.
11. Dark theme and a horizontally scrolling table do not clip the tooltip.
