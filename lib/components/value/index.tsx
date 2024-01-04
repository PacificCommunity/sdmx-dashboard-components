import React, { useEffect, useState } from "react";
import { parseOperandTextExpr, parseTextExpr } from '../../utils/parseTextExpr';
// @ts-ignore
import { SDMXParser } from 'sdmx-json-parser';
import { parseDataExpr } from "../../utils/parseDataExpr";
import { InfoCircle } from "react-bootstrap-icons";
import { Button } from "react-bootstrap";

const Value = ({ config, language }: { config: any, language: string }) => {

    const [valueStr, setValueStr] = useState("Loading...")
    const [titleText, setTitleText] = useState<string>(config.title?'Loading...':'')
    const [subtitleText, setSubtitleText] = useState<string>(config.subtitle?'Loading...':'')

    const sdmxParser = new SDMXParser();

    const formatValue = (valueStr: any, config: any, data: any, attributes: any, language: string) => {
        if (config['Decimals']) {
            const decimalNumber = Number(parseOperandTextExpr(config['Decimals'], data[0], attributes));
            valueStr = Number(valueStr).toFixed(decimalNumber);
        }
        if (config['Unit']) {
            if (config['unitLoc'] === 'SUFFIX') {
                valueStr += config['Unit'];
            } else if (config['unitLoc'] === 'PREFIX') {
                valueStr = config['Unit'] + valueStr;
            }
        }
        return valueStr.toLocaleString(language);
    }

    useEffect(() => {
        const dataObjs = parseDataExpr(config.data);
        if (dataObjs.length > 1) {
            throw new Error('Multiple data expressions are not supported for Value component');
        }
        const dataObj = dataObjs[0];
 
        const dataFlowUrl = dataObj.dataFlowUrl;
        sdmxParser.getDatasets(dataFlowUrl, {
            headers: new Headers({
                Accept: "application/vnd.sdmx.data+json;version=2.0.0",
                "Accept-Language": language
            })
        }).then(() => {
            const data = sdmxParser.getData();
            const dimensions = sdmxParser.getDimensions();
            const attributes = sdmxParser.getAttributes();

            if(config.title) {
                if(typeof config.title == 'string') {
                    setTitleText(parseTextExpr(config.title, dimensions))
                } else {
                    setTitleText(typeof config.title.text == 'string'? parseTextExpr(config.title.text, dimensions) : parseTextExpr(config.title.text[language], dimensions))
                }
            }
            if(config.subtitle) {
                if(typeof config.subtitle == 'string') {
                    setSubtitleText(parseTextExpr(config.subtitle, dimensions))
                } else {
                    setSubtitleText(typeof config.subtitle.text == 'string'? parseTextExpr(config.subtitle.text, dimensions) : parseTextExpr(config.subtitle.text[language], dimensions))
                }
            }

            let valueStr = data[0].value;
            // apply operation to data
            if (dataObj.operator) {
                if (dataObj.operand.startsWith('{')) {
                    // if operand starts with { then it is an attribute
                    const operandValue = parseOperandTextExpr(dataObj.operand, data[0], attributes);
                    valueStr = eval(`${valueStr} ${dataObj.operator} ${operandValue}`);
                    setValueStr(formatValue(valueStr, config, data, attributes, language));
                } else {
                    // we presume it is a dataflow url
                    const parserOperand = new SDMXParser();
                    parserOperand.getDatasets(dataObj.operand, {
                        headers: new Headers({
                            Accept: "application/vnd.sdmx.data+json;version=2.0.0",
                        })
                    }).then(() => {
                        const dataOperand = parserOperand.getData();
                        const dataOperandValue = dataOperand[0].value;
                        valueStr = eval(`${valueStr} ${dataObj.operator} ${dataOperandValue}`);
                        setValueStr(formatValue(valueStr, config, data, attributes, language));
                    });
                }

            } else {
                setValueStr(formatValue(valueStr, config, data, attributes, language));
            }
        });
    }, [language]);

    const valueNode: React.ReactNode =
        <div className={`pt-3 pb-2 px-2 px-xl-3 bg-white h-100 d-flex flex-column min-cell-height ${config.frame ? "border" : ""}`}>
            {config.title && <h2 className={`${config.title.weight?"fw-"+config.title.weight:""} ${ config.title.italic?'fst-italic':''} ${config.title.align === "left"? "text-start": config.title.align === "right"?"text-end": config.title.align === "center"?"text-center":""}`} style={{fontSize: config.title.size}}>{titleText}{config.metadataLink && <Button variant="link" onClick={() => {window.open(config.metadataLink, "_blank")}}><InfoCircle/></Button>} </h2>}
            {config.subtitle && (<h4 className={`${config.subtitle.weight?"fw-"+config.subtitle.weight:""}  ${config.subtitle.italic?'fst-italic':''}`} style={{fontSize: config.subtitle.size}}>{subtitleText}</h4>)}
            <div className="display-2 flex-grow-1 d-flex align-items-center justify-content-center">
                <p>{valueStr}</p>
            </div>
        </div> 

    return (
        <>
        { config.dataLink ? <a href={config.dataLink} target="_blank">{valueNode}</a> :
            valueNode}
        </>

    )
}
export default Value;