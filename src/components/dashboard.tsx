import React, { useState, useEffect } from 'react';

import { loadAndParse } from '../utils/loadDashConfig';

import Cell from './cell';

import 'bootstrap/dist/css/bootstrap.css';
import '../global.css';
import { set } from 'ol/transform';

const Dashboard = ({ dashUrl }: { dashUrl: string }) => {

    const [pageData, setPageData] = useState({ dashId: '', dashConfig: [] });

    useEffect(() => {
        loadAndParse(dashUrl).then((data) => {
            setPageData(data)
        })
    }, [])

    return (
        <div id={`dash-${pageData.dashId}`} className="dashboard-wrapper" >
            <div key={`container-${pageData.dashId}`} className="container-fluid mt-2">
                {
                    pageData.dashConfig.map((row, index) => (
                        <div key={`row-${index}`} className="row mb-3 display-flex">
                            {
                                row.map((element: any, index: string) => (
                                    <Cell key={`col-${index}`} config={element} />
                                )
                                )
                            }
                        </div>
                    ))
                }
            </div>
        </div>
    );
}

export default Dashboard
