import React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';

import Cell from './cell';
import Text from './text';

import '../global.module.css';
import { SDMXDashboardConfig, SDMXVisualProps, VisualRenderStatus } from './types';
import { REPORTING_VISUAL_TYPES } from '../utils/renderStats';
import { useLatest } from '../utils/useLatest';
import { createTransport } from '../utils/transport';

type DashboardProps = SDMXVisualProps & {
    url?: string,
    config?: SDMXDashboardConfig,
    lang?: string,
    onRenderComplete?: (all: VisualRenderStatus[]) => void, // once per config and language, after every visual settled
}

// ids of the visuals that report a render status, in layout order
const reportingVisualIds = (pageData: SDMXDashboardConfig): string[] =>
    pageData.rows
        .flatMap((row: any) => row.columns ?? [])
        .filter((cell: any) => REPORTING_VISUAL_TYPES[cell.type as keyof typeof REPORTING_VISUAL_TYPES])
        .map((cell: any) => cell.id);

type RenderTracking = {
    pageData: SDMXDashboardConfig,
    lang: string,
    statuses: { [visualId: string]: VisualRenderStatus },
    completed: boolean
}

// tracking for the rendered config and language. A new config or language
// restarts the aggregation but keeps the last status of every visual: a
// visual whose own config did not change does not report again, and one that
// did reports "loading" before the dashboard checks for completion.
const trackingFor = (
    ref: React.MutableRefObject<RenderTracking | null>,
    pageData: SDMXDashboardConfig,
    lang: string
): RenderTracking => {
    const tracking = ref.current;
    if (tracking && tracking.pageData === pageData && tracking.lang === lang) {
        return tracking;
    }
    ref.current = { pageData, lang, statuses: tracking?.statuses ?? {}, completed: false };
    return ref.current;
}

// fire onRenderComplete once per tracking, when every reporting visual has
// settled (immediately, with [], when the config has none)
const settleTracking = (tracking: RenderTracking, onRenderComplete?: (all: VisualRenderStatus[]) => void) => {
    if (tracking.completed) {
        return;
    }
    const expectedIds = reportingVisualIds(tracking.pageData);
    const allSettled = expectedIds.every((id) => {
        const reported = tracking.statuses[id];
        return reported && reported.status !== 'loading';
    });
    if (allSettled) {
        tracking.completed = true;
        onRenderComplete?.(expectedIds.map((id) => tracking.statuses[id]));
    }
}

const Dashboard = ({ url, config, lang = document.documentElement.lang || "en", onRenderComplete, fetcher, onDataFetch, ...visualProps }: DashboardProps) => {

    const [pageData, setPageData] = useState<SDMXDashboardConfig>();

    const onVisualRenderRef = useLatest(visualProps.onVisualRender);
    const onRenderCompleteRef = useLatest(onRenderComplete);
    const onDataFetchRef = useLatest(onDataFetch);
    const fetcherRef = useLatest(fetcher);

    // one transport per rendered config and language: visuals of the same
    // dashboard share identical in-flight requests and the response cache,
    // and a config or language change invalidates both. The fetcher is read
    // through a ref, so an inline one does not invalidate them.
    const transport = useMemo(
        () => createTransport(
            (url, init) => (fetcherRef.current ?? fetch)(url, init),
            (telemetry) => onDataFetchRef.current?.(telemetry)
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pageData, lang]
    );

    // created lazily: child effects, which report first, run before any
    // dashboard effect
    const renderTrackingRef = useRef<RenderTracking | null>(null);

    const handleVisualRender = (status: VisualRenderStatus) => {
        onVisualRenderRef.current?.(status);
        if (!pageData) {
            return;
        }
        const tracking = trackingFor(renderTrackingRef, pageData, lang);
        tracking.statuses[status.visualId] = status;
        settleTracking(tracking, onRenderCompleteRef.current);
    }

    useEffect(() => {
      if (url) {
        (fetcherRef.current ?? fetch)(url).then(response => response.json()).then((data) => {
            // set default values
            if (!data.colCount) {
                data.colCount = 3;
            }
            data.rows.forEach((row: any) => {
              row.columns.forEach((cell: any) => {
                if (!cell.colSize) {
                  cell.colSize = 1;
                }
              })
            })
            setPageData(data)

        }).catch((e) => {
            console.log(e)
        })
      }
    }, [url, fetcherRef])

    // key on config content, not object identity: a consumer passing an
    // inline config={{...}} literal (new object each render) would otherwise
    // setPageData on every render, churning the transport and re-fetching
    const configKey = config ? JSON.stringify(config) : undefined
    useEffect(() => {
      if(config) {
        if (!config.colCount) {
            config.colCount = 3;
        }
        config.rows.forEach((row: any) => {
          row.columns.forEach((cell: any) => {
            if (!cell.colSize) {
              cell.colSize = 1;
            }
          })
        })
        setPageData(config)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configKey])

    // after the children's effects of this commit have reported: settles a
    // config without reporting visuals, or one whose visuals did not change
    useEffect(() => {
      if (pageData) {
        settleTracking(trackingFor(renderTrackingRef, pageData, lang), onRenderCompleteRef.current);
      }
    }, [pageData, lang, onRenderCompleteRef])

    return (
        <>
          { pageData && Object.keys(pageData).length !== 0 ?
            <div key={`container-${pageData.id}`} className="container-fluid mt-2">
                {
                  pageData.header ?
                    <div className="row mb-3 display-flex">
                      <Text config={pageData.header} language={lang} />
                    </div> : null
                }
                {
                  pageData.rows.map((row : any, index_row : number) => (
                    <div key={`row-${index_row}`} className="row mb-3 display-flex">
                      {
                        row.columns.map((cell: any) => (
                          <Cell
                            {...visualProps}
                            key={`col-${cell.id}`}
                            className={`col-md-${Math.ceil((12/(pageData.colCount || 3))*cell.colSize)}`}
                            language={lang}
                            config={cell}
                            onVisualRender={handleVisualRender}
                            fetcher={transport}
                          />
                        ))
                      }
                    </div>
                  ))
                }
                {
                  pageData.footer ?
                    <div className="row mb-3 display-flex">
                      <Text config={pageData.footer} language={lang}/>
                    </div> : null
                }
            </div>
          : <div>Loading...</div>}
        </>
    );
}

export default Dashboard
