import React, { useState, useEffect } from 'react';

import Cell from './cell';
import Title from './title';

import 'bootstrap/dist/css/bootstrap.css';
import '../global.css';

const Dashboard = ({ dashUrl }: { dashUrl: string }) => {

    const [pageData, setPageData] = useState({ id: '', languages: [], header: {}, rows: [], footer: [] });
    const [language, setLanguage] = useState<string>();

    useEffect(() => {
        fetch(dashUrl).then(response => response.json()).then((data) => {
            setPageData(data)
        }).catch((e) => {
            console.log(e)
        })
    }, [])

    return (
        <div key={`container-${pageData.id}`} className="container-fluid mt-2">
            <select value={language} onChange={(evt)=>setLanguage(evt.target.value)}>
              {pageData.languages.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {
              pageData.header ?
                <div className="row mb-3 display-flex">
                  <Title config={pageData.header} />
                </div> : null
            }
            {
              pageData.rows.map((row, index_row) => (
                <div key={`row-${index_row}`} className="row mb-3 display-flex">
                  {
                    row.columns.map((cell: any, index_col: number) => (
                      <Cell key={`col-${cell.id}`} className={`col-md-${cell.bootstrapCol}`} language={language} config={cell} />
                    ))
                  }
                </div>
              ))
            }
            {
              pageData.footer ?
                <div className="row mb-3 display-flex">
                  <Title config={pageData.footer} />
                </div> : null
            }
        </div>
    );
}

export default Dashboard
