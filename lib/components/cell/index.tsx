import React from 'react';
import Text from '../text';
import Value from '../value';
import Chart from '../chart';
import Table from '../table';
import { ErrorBoundary } from 'react-error-boundary';
import MapComponent from '../map';
import { SDMXChartConfig, SDMXMapConfig, SDMXTableConfig, SDMXTheme, SDMXVisualConfig, SDMXVisualProps } from '../types';
import { toSDMXRenderError } from '../../errors';
import { REPORTING_VISUAL_TYPES, failedRenderStatus } from '../../utils/renderStats';
import { failureSlot } from '../../utils/slots';
import { Map } from 'ol';
import type { EChartsType } from 'echarts/core';

type CellProps = SDMXVisualProps & {
    config: SDMXVisualConfig | SDMXChartConfig | SDMXMapConfig,
    callback?: (component: React.JSX.Element | EChartsType | Map) => void,
    language: string,
    className: string,
    theme?: SDMXTheme,
}

/**
 * Return div/col with component corresponding to chart type
 *
 * @todo create component with type = VALUE
 *
 * @param config Dashboard element configuration
 * @param theme dashboard theme, for charts, tables and values
 * @param visualProps props shared by every data visual, passed through unchanged
 * @returns
 */
const Cell = ({
    config,
    callback,
    language,
    className,
    theme,
    ...visualProps
}: CellProps) => {

    const conditionalBoardComponent = () => {

        switch (config.type) {
            case 'bar':
            case 'column':
            case 'line':
            case 'drilldown':
            case 'lollipop':
            case 'treemap':
            case 'pie':
                return <Chart
                    {...visualProps}
                    config={config as SDMXChartConfig}
                    key={language}
                    callback={callback}
                    language={language}
                    theme={theme}
                />
            case 'map':
                return <MapComponent
                    {...visualProps}
                    config={config as SDMXMapConfig}
                    key={language}
                    language={language}
                    callback={callback}
                />
            case 'value':
                return <Value
                    {...visualProps}
                    config={config}
                    key={language}
                    language={language}
                    callback={callback}
                    theme={theme}
                />
            case 'table':
                return <Table
                    {...visualProps}
                    config={config as SDMXTableConfig}
                    key={language}
                    language={language}
                    callback={callback}
                    theme={theme}
                />
            case 'note':
                return <Text
                    config={config}
                    key={language}
                    language={language}
                />
            default:
                return <p className="text-danger">[{config.type}]<br />Type does not exists.</p>
        }

    }

    const fallbackRender = ({ error }: { error: Error }) => {
        const slot = REPORTING_VISUAL_TYPES[config.type]
            ? failureSlot(toSDMXRenderError(error, config.id), config.id, visualProps)
            : undefined;
        if (slot !== undefined) return <>{slot}</>;
        return (
            <div className="text-danger">
                <p>Something went wrong:</p>
                <pre style={{ color: "red" }}>{error.message}</pre>
            </div>
        )
    }

    // a render-time throw never reaches the component's own reporting
    const reportBoundaryError = (error: unknown) => {
        if (!REPORTING_VISUAL_TYPES[config.type]) return;
        visualProps.onVisualRender?.(failedRenderStatus(toSDMXRenderError(error, config.id), config.id));
    }


    return (
        <ErrorBoundary
            fallbackRender={fallbackRender}
            onError={reportBoundaryError}
            onReset={() => { }}
        >
            <div className={`${className} bg-light`}>
                {conditionalBoardComponent()}
            </div>

        </ErrorBoundary>
    )
}

export default Cell;
