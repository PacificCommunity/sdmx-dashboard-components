'use client';

import React, { useState } from 'react';
import Title from '../title';
import Value from '../value';
import Chart from '../chart';
// import MapComponent from '../map';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * Return div/col with component corresponding to chart type
 * 
 * @todo create component with type = VALUE
 * 
 * @param config Dashboard element configuration
 * @returns 
 */
const Cell = ({ config }: {config: any}) => {

    const [ready, setReady] = useState(false)

    const conditionalBoardComponent = () => {

        switch (config.chartType) {
            case 'BARS':
            case 'VBARS':
            case 'HBARS':
            case 'LINES':
            case 'DRILLDOWN':
            case 'PIE':
                return <Chart
                    config={config}
                />
            /* 
            case 'MAP':
                return <MapComponent
                    config={config}
                />
            */
            case 'TITLE':
            case 'FOOTER':
                return <Title
                    config={config}
                />
            case 'VALUE':
                return <Value
                    config={config}
                />
            default:
                return <p className="text-danger">[{config.chartType}]<br />{config.Title}</p>
        }

    }

    const fallbackRender = ({ error, resetErrorBoundary }: {error: any, resetErrorBoundary: any}) => {
        return (
            <div className="text-danger">
                <p>Something went wrong:</p>
                <pre style={{ color: "red" }}>{error.message}</pre>
            </div>
        )
    }


    return (
        <ErrorBoundary
            fallbackRender={fallbackRender}
            onReset={() => {}}
        >
            <div className={`${config.className} bg-light`}>
                {conditionalBoardComponent()}
            </div>

        </ErrorBoundary>
    )
}

export default Cell;