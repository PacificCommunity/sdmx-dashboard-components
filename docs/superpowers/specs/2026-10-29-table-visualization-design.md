# Table visualization component — design

Date: 2026-10-29

## Intent

Add a `table` visualization that presents the same data a column chart would
present, but as an HTML table instead of an ECharts chart. It must work both
standalone (`<SDMXTable>`) and inside an `SDMXDashboard` (`type: "table"`).

The target look (from the reference screenshot):

| Category | Female | Male |
| --- | --- | --- |
| Cook Islands | 9.87 | 9.92 |

with a bold title, an italic subtitle, a note line above the table, a blue
header row, bold first-column labels, and thin row borders.

## Goals

- Reuse the column chart's data path exactly: same `data` expression parsing,
  same SDMX fetch, same category/series pivot.
- Render a semantic, accessible `<table>` (`thead`, `tbody`, `scope`).
- Support title, subtitle, note, `metadataLink`, `dataLink`, `frame`,
  `decimals`, `unit`, and `sortByValue` consistently with existing components.
- Register the type in `Cell` and export the component and config type from
  `lib/index.ts`.
- Add a demo tab so the component can be exercised in the demo app.

## Non-goals

- No ECharts rendering, theming, `extraOptions`, tooltips, drilldown, download
  button, or `callback` with an `EChartsType`.
- No CSV export, pagination, sorting on click, or cell-level editing.
- No changes to existing chart behavior.

## Constraints

- Data fetching must stay in `lib/components/chart/options.ts`
  (`loadDatasets`); pivot logic must stay in
  `lib/utils/chartHelpers.ts` (`collectColumnLike`,
  `sortColumnLikeCategories`).
- The repository has no test framework or test script; verification is build,
  lint, and manual demo check.
- `decimals` may be a number or a numeric string. Operand expressions such as
  `{$DECIMALS}` are out of scope for the table.

## Approaches considered

### 1. Dedicated `SDMXTable` component — chosen

New `lib/components/table/index.tsx` plus `styles.module.css`. It loads data
with `loadDatasets`, pivots with `collectColumnLike`, builds a simple
`{ categoryLabel, columns, rows }` model, and renders HTML. `Cell` routes
`type: "table"` to it. `Chart` is untouched.

Trade-off: a new component directory and a small amount of title/subtitle/note
markup duplicated from `Text`.

### 2. Branch inside `Chart`

Detect `type: "table"` at the top of `Chart` and return a table. Rejected: it
mixes two renderers in one component and leaves ECharts-only props
(`theme`, `extraOptions`, ECharts `callback`) meaningless.

### 3. ECharts `custom`/`graphic` table

Rejected: not a semantic table, no text selection, poor accessibility.

## Design

### Configuration

Add `"table"` to the `type` union in `SDMXVisualConfig`. Add:

```ts
export type SDMXTableConfig = {
  categoryLabel?: string, // header of the first column; default "Category"
} & SDMXChartConfig;
```

`SDMXChartConfig` already carries `data`, `xAxisConcept`, `legend`,
`title`, `subtitle`, `note`, `decimals`, `unit`, `sortByValue`, `frame`,
`metadataLink`, and `dataLink`. `extraOptions` is accepted for type
compatibility but ignored.

### Data

1. `loadDatasets(config.data, config.xAxisConcept, language)` returns
   `ParsedDataset[]` exactly as for a column chart.
2. Build a `ChartContext` with empty `titleText`/`subtitleText` and call
   `collectColumnLike(context)`.
3. Apply `sortColumnLikeCategories(categories, entries, config.sortByValue)`.
4. One value column per `entries` entry, using
   `resolvedNames.get(entry)`. This matches the column chart's series names and
   column order.
5. Cell value = `entry.valueByName.get(category)?.value`; missing values render
   as `N/A`.
6. Format numbers with `Number(value).toLocaleString(language)`; when
   `Number(config.decimals)` is finite, fix to that many fraction digits.
7. When `config.unit?.text` is set, append ` (<unit>)` to each value column
   header.

### Titles and note

Resolve `title`, `subtitle`, and `note` with `parseTextExpr` against the first
dataset's dimensions (same as `options.ts`), then render with
`html-react-parser` so inline HTML works. Reuse the `SDMXTextConfig` styling
fields (`size`, `weight`, `color`, `font`, `style`, `align`, `link`).

Layout order: title, subtitle, note, table — matching the reference image.

### Rendering

```tsx
<div className={frame ? "border" : ""}>
  {metadataLink && <InfoCircle button />}
  {title/subtitle/note blocks}
  <div className="table-responsive">
    <table>
      <thead>
        <tr>
          <th scope="col">{categoryLabel ?? "Category"}</th>
          {columns.map((name) => <th scope="col">{name}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr>
            <th scope="row">{row.category}</th>
            {row.values.map((value) => <td>{value}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

`dataLink` wraps the table in an `<a>`, consistent with `Chart`. Loading and
error states mirror `Chart`: "Loading..." placeholder and "Failed to load
table." message.

### Styling

`lib/components/table/styles.module.css`:

- full-width table, collapsed borders, 1px `#dee2e6` borders;
- header row background `#5b8db8`, white bold text, left aligned;
- first-column cells bold, left aligned;
- numeric cells right aligned;
- responsive horizontal scrolling via Bootstrap's `.table-responsive`;
- dark-theme overrides keyed on `[data-bs-theme="dark"]` for background, text,
  and borders.

### Registration and exports

- `lib/components/cell/index.tsx`: add `case 'table'` returning
  `<Table config={config as SDMXTableConfig} ... />`.
- `lib/index.ts`: export `SDMXTable` and `SDMXTableConfig`.
- `src/components/Table.tsx` + a `table` tab in `src/App.tsx`.
- `README.md`: short "Tables" section documenting `type: "table"`,
  `categoryLabel`, and that `extraOptions` does not apply.

### Callback

Accept `callback?: (table: React.JSX.Element) => void` and call it with the
rendered table node once loaded, matching how `Value` reports its node.

## Decisions made in this design

- Reuse `collectColumnLike` rather than writing a second pivot.
- First-column header defaults to `Category`, overridable with
  `categoryLabel`; it is not derived from SDMX dimension metadata.
- Missing values render as `N/A` rather than blank, `–`, or `0`.
- Unit is shown once in each value column header, not repeated in every cell.
- Long/wide tables scroll horizontally instead of shrinking text.
- `labels` is ignored (table always shows values).

## Verification

1. `npm run build` succeeds.
2. `npm run lint` passes with no new warnings.
3. Demo tab renders the reference shape: `Category | Female | Male`, bold row
   labels, blue header, and correct values for a column-chart data URL.
4. A dashboard config with `type: "table"` renders through `Cell`.
5. Sorting, decimals, note, and frame render as specified.
