import React from 'react';
import type { TableModel } from './table/model';

// inline screen-reader-only styling so the fallback does not depend on a
// particular CSS framework being loaded by the consumer
const srOnly: React.CSSProperties = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
};

/**
 * A visually hidden data table giving assistive technology the observations
 * behind a chart, independent of the charting engine's own accessibility
 * support. Rows are the x-axis concept values, columns the legend concept
 * values; the same pivot as the table visual.
 */
const HiddenDataTable = ({ model, caption }: { model: TableModel, caption: string }) => (
    <div style={srOnly} className="sdmx-hidden-data-table">
        <table>
            <caption>{caption}</caption>
            <thead>
                <tr>
                    <th scope="col">{model.categoryLabel}</th>
                    {model.columns.map((name, index) => <th key={`${name}-${index}`} scope="col">{name}</th>)}
                </tr>
            </thead>
            <tbody>
                {model.rows.map((row) => (
                    <tr key={row.category}>
                        <th scope="row">{row.category}</th>
                        {row.values.map((cell, index) => <td key={index}>{cell.text}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default HiddenDataTable;
