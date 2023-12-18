import React, { useState } from 'react';
import Text from '../text';
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
const Cell = ({ config, language, className }: { config: any, language: string, className: string }) => {

    const conditionalBoardComponent = () => {

        switch (config.type) {
            case 'bar':
            case 'column':
            case 'line':
            case 'drilldown':
            case 'pie':
                return <Chart
                    config={config}
                    language={language}
                />
            /* 
            case 'MAP':
                return <MapComponent
                    config={config}
                />
            */
            case 'value':
                return <Value
                    config={config}
                    language={language}
                />
            case 'note':
                return <Text
                    config={config}
                    language={language}
                />
            default:
                return <p className="text-danger">[{config.chartType}]<br />{config.Title}</p>
        }

    }

    const fallbackRender = ({ error, resetErrorBoundary }: { error: any, resetErrorBoundary: any }) => {
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
            onReset={() => { }}
        >
            <div className={`${className} bg-light`}>
                {conditionalBoardComponent()}
            </div>

        </ErrorBoundary>
    )
}

export default Cell;