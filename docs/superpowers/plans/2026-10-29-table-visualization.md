# Table Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `table` visualization that renders column-chart data as an accessible HTML table, both standalone and inside dashboards.

**Architecture:** A new `Table` component loads data through the existing `loadDatasets` helper, pivots it through `collectColumnLike` and `sortColumnLikeCategories`, formats values into a `TableModel`, and renders semantic HTML. `Cell` routes `type: "table"` to the new component; the component and config type are exported from the package.

**Tech Stack:** React 19, TypeScript, the ECharts chart data pipeline, Bootstrap 5 utility classes, CSS modules.

**Spec:** `docs/superpowers/specs/2026-10-29-table-visualization-design.md`

## Global Constraints

- The repository has no test framework or test script. Verify every task with `npm run build` and `npm run lint`; verify runtime behavior in the demo.
- Fetch data only through `loadDatasets` in `lib/components/chart/options.ts`.
- Pivot data only through `collectColumnLike` and `sortColumnLikeCategories` in `lib/utils/chartHelpers.ts`.
- Tables ignore `extraOptions`, `theme`, drilldown, and ECharts callbacks.
- Missing, `null`, empty, and non-finite values render exactly `N/A`.
- `decimals` is a number or a numeric string. `{$...}` operand expressions are unsupported for tables.
- Wide tables must scroll horizontally. The output must remain a real `<table>` with `thead`, `tbody`, and `scope` attributes.

## Review Focus

- A cell whose value is missing, `null`, empty, or `NaN` must show `N/A`, never blank, `NaN`, or `0` (Task 1, checked in Task 3).
- A config without `legend` must produce one value column per value of the first non-`xAxisConcept` active dimension (mirroring the chart), not zero columns (Task 1, checked in Task 3).
- Two datasets with the same legend value must produce distinct headers through `resolveSeriesNames` (Task 1).
- A table with many value columns or long labels must scroll horizontally without clipping headers (Task 2).
- `decimals: 0`, `decimals: "2"`, and an unsupported expression like `{$DECIMALS}` must not crash and must choose zero decimals or the locale default respectively (Task 1).

---

### Task 1: Table config type and table model

**Files:**
- Modify: `lib/components/types.ts`
- Create: `lib/components/table/model.ts`

**Interfaces:**
- Consumes: `ChartContext` and `ParsedDataset` from `lib/utils/chartHelpers.ts`; `collectColumnLike` and `sortColumnLikeCategories` from the same file.
- Produces:
  - `SDMXTableConfig` type in `lib/components/types.ts`
  - `TableModel` type
  - `formatTableValue(value: unknown, config: SDMXTableConfig, language: string): string`
  - `buildTableModel(config: SDMXTableConfig, language: string, datasets: ParsedDataset[]): TableModel`

- [ ] **Step 1: Add `table` to the visualization type union and define `SDMXTableConfig`**

In `lib/components/types.ts`, add `"table"` to the `type` union in `SDMXVisualConfig`:

```ts
type: "line" | "bar" | "pie" | "column" | "lollipop" | "treemap" | "value" | "drilldown" | "note" | "map" | "table",
```

After `SDMXChartConfig`, add:

```ts
export type SDMXTableConfig = {
    categoryLabel?: string, // header of the first column; defaults to "Category"
} & SDMXChartConfig
```

- [ ] **Step 2: Create the table model**

Create `lib/components/table/model.ts` with this public shape:

```ts
export type TableModel = {
  categoryLabel: string;
  columns: string[];
  rows: { category: string; values: string[] }[];
};
```

Implement `formatTableValue` with these rules, in order:

1. Return `'N/A'` for `null`, `undefined`, `''`, or any value where `Number(value)` is not finite.
2. Read `const decimals = Number(config.decimals)`. If it is an integer, format with `minimumFractionDigits` and `maximumFractionDigits` set to `decimals`.
3. Otherwise format with `numeric.toLocaleString(language)`.

Implement `buildTableModel`:

1. Build a `ChartContext` with the given `config`, `language`, `datasets`, and empty `titleText`/`subtitleText`.
2. `const collection = collectColumnLike(context)`.
3. `const categories = sortColumnLikeCategories(collection.categories, collection.entries, config.sortByValue)`.
4. Columns: map `collection.entries` in order, using `collection.resolvedNames.get(entry) ?? entry.name`. When `config.unit?.text` is set, append ` (${config.unit.text})` to each column name.
5. Rows: map `categories` in order to `{ category: String(category), values: collection.entries.map((entry) => formatTableValue(entry.valueByName.get(category)?.value, config, language)) }`.
6. Return `{ categoryLabel: config.categoryLabel ?? 'Category', columns, rows }`.

- [ ] **Step 3: Verify the type changes compile and lint**

Run: `npm run build`
Expected: build completes and writes `dist`.

Run: `npm run lint`
Expected: passes with no new warnings or errors.

- [ ] **Step 4: Commit**

```bash
git add lib/components/types.ts lib/components/table/model.ts
git commit -m "feat(table): add table config and model builder"
```

---

### Task 2: Table component and styles

**Files:**
- Create: `lib/components/table/index.tsx`
- Create: `lib/components/table/styles.module.css`

**Interfaces:**
- Consumes: `SDMXTableConfig` from `../types`; `TableModel`, `buildTableModel` from `./model`; `loadDatasets` from `../chart/options`; `parseTextExpr` from `../../utils/parseTextExpr`.
- Produces: default-exported `Table` component with props:

```ts
interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  config: SDMXTableConfig;
  language: string;
  placeholder?: React.JSX.Element;
  callback?: (table: React.JSX.Element) => void;
}
```

- [ ] **Step 1: Create the stylesheet**

Create `lib/components/table/styles.module.css` with classes `.container`, `.table`, `.headerCell`, `.categoryCell`, and `.valueCell`:

- `.container`: `background: var(--bs-body-bg, #fff);`
- `.table`: `width: 100%; border-collapse: collapse; color: var(--bs-body-color, #212529);`
- `.headerCell`: background `#5b8db8`, white bold text, left aligned, `0.75rem` padding, `1px solid #dee2e6` border.
- `.categoryCell`: bold, left aligned, `0.75rem` padding, same border.
- `.valueCell`: right aligned, `0.75rem` padding, same border.
- Add `:global([data-bs-theme="dark"])` overrides: `.container` background `#000`, `.table` color `#e9ecef`, `.headerCell` background `#3c5f7a` with `#495057` borders, and `.categoryCell`/`.valueCell` borders `#495057`.

- [ ] **Step 2: Create the component**

Create `lib/components/table/index.tsx` with:

- Imports `parse` from `html-react-parser`, `InfoCircle` from `react-bootstrap-icons`, and `Button` from `react-bootstrap`.
- A module-level `resolveText(text, dimensions, language)` that mirrors `resolveText` in `lib/components/chart/options.ts`, falling back to `''` when a translated string is missing.
- A module-level `renderTable(model: TableModel, config: SDMXTableConfig): React.JSX.Element` that returns:

```tsx
<div className="table-responsive">
  {config.dataLink
    ? <a href={config.dataLink} target="_blank" rel="noreferrer">{table}</a>
    : table}
</div>
```

where `table` is:

```tsx
<table className={styles.table}>
  <thead>
    <tr>
      <th scope="col" className={styles.headerCell}>{model.categoryLabel}</th>
      {model.columns.map((name, index) => (
        <th key={`${name}-${index}`} scope="col" className={styles.headerCell}>{name}</th>
      ))}
    </tr>
  </thead>
  <tbody>
    {model.rows.map((row) => (
      <tr key={row.category}>
        <th scope="row" className={styles.categoryCell}>{row.category}</th>
        {row.values.map((value, index) => (
          <td key={index} className={styles.valueCell}>{value}</td>
        ))}
      </tr>
    ))}
  </tbody>
</table>
```

- Component state: `isLoading` (initial `true`), `error` (`string | null`), `loadedData` (`{ key: string; datasets: ParsedDataset[] } | null`), `model` (`TableModel | null`), `titleText`, `subtitleText`, `noteText` (strings, initial `''`).
- Refs: `containerRef`, `callbackRef` (kept in sync with the `callback` prop), no chart instance.
- Compute `const dataKey = JSON.stringify(config.data)` and `const loadKey = \`${dataKey}|${language}|${config.xAxisConcept ?? ''}\``.
- Load effect keyed on `[loadKey, language]`: call `loadDatasets(config.data, config.xAxisConcept, language)`, then `setLoadedData({ key: loadKey, datasets })`. On error, log it, set `error` to `'Failed to load table.'`, and set `isLoading` to `false`. Guard state updates with a `cancelled` flag.
- Build effect keyed on `[config, language, loadKey, loadedData]`: return early unless `loadedData` exists and `loadedData.key === loadKey`. Then:
  1. `const nextModel = buildTableModel(config, language, loadedData.datasets)`.
  2. `const dimensions = loadedData.datasets[0]?.dimensions ?? []`.
  3. Set `model`, `titleText`, `subtitleText`, `noteText` from the config and `resolveText`.
  4. Set `isLoading` to `false` and `error` to `null`.
  5. Call `callbackRef.current?.(renderTable(nextModel, config))`.
- Container div: `ref={containerRef}`, `className={\`${className || ''} ${styles.container} ${config.frame ? 'border' : ''}\`}`, `style={{ width: '100%', ...(style || {}) }}`, spread remaining props.
- When loading, render `placeholder` or a centered `Loading...` block.
- When errored, render `{error}` inside a `text-danger` block.
- When loaded, render, in order:
  1. `config.metadataLink` button with `<InfoCircle />`, using `window.open(config.metadataLink, '_blank')`.
  2. Title (`<h2>`) when `titleText`, rendering `parse(titleText)` with `fontSize`, `color`, `fontFamily`, and `fontStyle` from `config.title`; wrap in an anchor when `config.title.link` is set, using `target={config.title.target ?? 'blank'}`.
  3. Subtitle (`<h4>`) when `subtitleText`, rendering `parse(subtitleText)` and styled the same way from `config.subtitle`.
  4. Note (`<p>`) when `noteText`, rendering `parse(noteText)` and styled from `config.note`.
  5. `renderTable(model, config)`.
- Alignment: helper returning `text-center` for `center`, `text-end` for `right`, and `text-start` otherwise. Apply it to title, subtitle, and note.

- [ ] **Step 3: Verify the component compiles and lints**

Run: `npm run build`
Expected: build completes.

Run: `npm run lint`
Expected: passes with no new warnings or errors.

- [ ] **Step 4: Commit**

```bash
git add lib/components/table/index.tsx lib/components/table/styles.module.css
git commit -m "feat(table): add table visualization component"
```

---

### Task 3: Wire the table into cells, exports, demo, and docs

**Files:**
- Modify: `lib/components/cell/index.tsx`
- Modify: `lib/index.ts`
- Create: `src/components/Table.tsx`
- Modify: `src/App.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: the default `Table` component and `SDMXTableConfig` from Task 2 and Task 1.
- Produces: `SDMXTable` public export, `SDMXTableConfig` public type, `type: "table"` dashboard support, and a `Tables` demo tab at `/table`.

- [ ] **Step 1: Route `type: "table"` in `Cell`**

In `lib/components/cell/index.tsx`, import `Table` and `SDMXTableConfig`, then add before the `default` case:

```tsx
case 'table':
    return <Table
        config={config as SDMXTableConfig}
        key={language}
        language={language}
        callback={callback}
    />
```

- [ ] **Step 2: Export the component and config type**

In `lib/index.ts`, import `SDMXTable` from `./components/table` and `SDMXTableConfig` from `./components/types`, then add both to the existing export block.

- [ ] **Step 3: Add the demo**

Create `src/components/Table.tsx` following the structure of `src/components/Column.tsx`: a `content` array with one item, a `LiveProvider` with `scope = { SDMXTable }`, and `Tabs` for preview and code.

Use this exact config inside the code string:

```js
<SDMXTable
    config={{
        data: ["https://stats-sdmx-disseminate.pacificdata.org/rest/data/DF_BP50/A.SH_STA_MORT.CK+FJ+FM+KI+MH+NC+NR+NU+PF+PG+PW+SB+TO+TV+VU+WS.F+M._T._T._T._T._T._T._Z._T?dimensionAtObservation=AllDimensions"],
        id: "SH_STA_MORT_TABLE",
        type: "table",
        xAxisConcept: "GEO_PICT",
        legend: { concept: "SEX" },
        categoryLabel: "Country",
        title: { text: "Maternal mortality ratio" },
        subtitle: { text: "Source PDH.stat", style: "italic" },
        note: { text: "Note that the figures are reported per 100,000 live births." },
        decimals: 1
    }}
    language='en'
/>
```

- [ ] **Step 4: Add the demo tab**

In `src/App.tsx`, import `Table` from `./components/Table` and add to the `tabs` object:

```tsx
table: {
  title: 'Tables',
  component: <Table />,
},
```

- [ ] **Step 5: Document tables in the README**

Add a `### Tables` section after `### Sorting data by value`. Include a minimal example with `type: "table"`, `xAxisConcept`, and `legend.concept`, and state that:

- The first column is the `xAxisConcept` category, headed `Category` unless `categoryLabel` overrides it.
- Each legend value becomes a value column; without `legend`, columns are built from the values of the first non-x active dimension.
- Missing values show `N/A`; `decimals` and `unit` apply to values and headers.
- `extraOptions` and ECharts theming do not apply.

- [ ] **Step 6: Verify build, lint, and the demo**

Run: `npm run build`
Expected: build completes.

Run: `npm run lint`
Expected: passes with no new warnings or errors.

Run: `npm run dev`, open `http://localhost:5173/table`, and check:
- The table has a blue header row with `Country`, `Female`, `Male`.
- Country cells are bold and values respect `decimals: 1`.
- Title, italic subtitle, and note appear above the table.
- The table scrolls horizontally when the viewport is narrow.
- No console errors.

- [ ] **Step 7: Commit**

```bash
git add lib/components/cell/index.tsx lib/index.ts src/components/Table.tsx src/App.tsx README.md
git commit -m "feat(table): expose and document the table visualization"
```
