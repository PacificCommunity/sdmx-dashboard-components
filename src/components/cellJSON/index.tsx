import React, { useState } from 'react';
import Title from '../title';
import Value from '../value';
import Chart from '../chart';
// import MapComponent from '../map';
import { ErrorBoundary } from 'react-error-boundary';
import ChartJSON from '../chartJSON';
import ValueJSON from '../valueJSON';

/**
 * Return div/col with component corresponding to chart type
 * 
 * @todo create component with type = VALUE
 * 
 * @param config Dashboard element configuration
 * @returns 
 */
const CellJSON = ({ config, language, className }: { config: any, language: string, className: string }) => {

    const [ready, setReady] = useState(false)

    const conditionalBoardComponent = () => {

        switch (config.type) {
            case 'bar':
            case 'VBARS':
            case 'HBARS':
            case 'line':
            case 'drilldown':
            case 'pie':
                return <ChartJSON
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
                return <ValueJSON
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

export default CellJSON;