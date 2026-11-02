import React from 'react';
import { useState, useEffect } from 'react';

import Cell from './cell';
import Text from './text';

import '../global.module.css';
import { SDMXDashboardConfig } from './types';

// accept the deprecated `colums` misspelling as an alias for `columns` and
// apply the layout defaults, so every downstream read uses `columns`
const normalizeConfig = (config: SDMXDashboardConfig): SDMXDashboardConfig => {
    if (!config.colCount) {
        config.colCount = 3;
    }
    (config.rows || []).forEach((row) => {
        if (!row.columns) {
            row.columns = row.colums ?? [];
        }
        row.columns.forEach((cell) => {
            if (!cell.colSize) {
                cell.colSize = 1;
            }
        })
    })
    return config;
}

const Dashboard = ({ url, config, lang = document.documentElement.lang || "en" }: { url?: string, config?: SDMXDashboardConfig, lang?: string}) => {

    const [pageData, setPageData] = useState<SDMXDashboardConfig>();

    useEffect(() => {
      if (url) {
        fetch(url).then(response => response.json()).then((data) => {
            setPageData(normalizeConfig(data))
        }).catch((e) => {
            console.log(e)
        })
      }
    }, [url])

    useEffect(() => {
      if(config) {
        setPageData(normalizeConfig(config))
      }
    }, [config])

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
                          <Cell key={`col-${cell.id}`} className={`col-md-${Math.ceil((12/(pageData.colCount || 3))*cell.colSize)}`} language={lang} config={cell} />
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
