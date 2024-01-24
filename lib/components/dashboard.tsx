import { useState, useEffect } from 'react';

import Cell from './cell';
import Text from './text';

import 'bootstrap/dist/css/bootstrap.css';
import '../global.module.css';

const Dashboard = ({ dashUrl, lang = document.documentElement.lang || "en" }: { dashUrl: string, lang?: string}) => {

    const [pageData, setPageData] = useState<any>({});

    useEffect(() => {
        fetch(dashUrl).then(response => response.json()).then((data) => {
            setPageData(data)
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

        }).catch((e) => {
            console.log(e)
        })
    }, [dashUrl])

    return (
        <>
          { Object.keys(pageData).length !== 0 ?
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
                          <Cell key={`col-${cell.id}`} className={`col-md-${Math.ceil((12/pageData.colCount)*cell.colSize)}`} language={lang} config={cell} />
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
