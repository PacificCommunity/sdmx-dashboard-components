import React, { useEffect, useRef, useState } from "react";
import { parseOperandTextExpr, parseTextExpr } from '../../utils/parseTextExpr';
// @ts-ignore
import { SDMXParser } from 'sdmx-json-parser';
import { parseDataExpr } from "../../utils/parseDataExpr";
import { InfoCircle } from "react-bootstrap-icons";
import { Button } from "react-bootstrap";
import { SDMXVisualConfig } from "../types";


interface ValueProps extends React.HTMLAttributes<HTMLDivElement> {
    config: SDMXVisualConfig;
    placeholder?: React.JSX.Element;
    language: string;
}

const Value = ({ config, placeholder, language, ...props }: ValueProps) => {

    const [valueElement, setValueElement] = useState(<span>Loading...</span>)
    const [popupStr, setPopupStr] = useState<string>("")
    const [titleText, setTitleText] = useState<string>(config.title?'Loading...':'')
    const [subtitleText, setSubtitleText] = useState<string>(config.subtitle?'Loading...':'')
    const [isLoading, setIsLoading] = useState(true)

    const sdmxParser = new SDMXParser();
    const containerRef = useRef<HTMLDivElement>(null);

    // className is applied to container div
    // style is applied to value div
    // style main contain width, height, color and backgroundColor
    // other props are applied to container div
    let { className, style, ...otherProps } = props;

    let containerClass = props.className || '';
    let containerStyle = {};
    let valueStyle = style;

    // create valueDivWidth variable as a string or number, and store the width of the value div
    // this will be either a percentage or a number of pixels
    // percentage: width is a percentage of the container div
    // number: width is fixed in pixels
    let valueDivWidth: string | number = '100%';

    // if no className and no style are provided, set default style
    if (!containerClass) {
        // container div default className
        containerClass = 'pt-3 pb-2 px-2 px-xl-3 bg-white h-100';
        // container default style
        containerStyle = { minHeight: '400px', width: '100%' };
    }
    if (!props.style) {
        // value div default style
        valueStyle = { height: '100%', width: '100%' };
    } else if (props.style && props.style.width) {
        if (typeof props.style.width === 'number') {
            // number provided: width is in pixels
            valueDivWidth = props.style.width;
        } else if (typeof props.style.width === 'string') {
            if (props.style.width.endsWith('px')) {
                // string provided ending with 'px': width is in pixels
                valueDivWidth = parseInt(props.style.width);
            } else if (props.style.width.endsWith('%')) {
                // a percentage value
                // note: if 'em' or 'rem' is used, the value will be ignored
                valueDivWidth = props.style.width;
            }
        }
    }

    const calculateFontSize = (text: string) => {
        if (typeof valueDivWidth === 'number') {
            return Math.min(valueDivWidth / text.length, valueDivWidth / 2) + 'px';
        }
        if (containerRef.current) {
            // calculate the width of the value div in pixel, as a percentage of the container div
            let containerWidth = containerRef.current.clientWidth * parseInt(valueDivWidth) / 100;
            // Adjust the formula as needed to fit your design
            return Math.min(containerWidth / text.length, containerWidth / 2) + 'px';
        }
        // default value if no container found
        return '4em';
    };

    const formatValue = (valueStr: any, config: any, data: any, attributes: any, language: string) => {
        if (config['decimals']) {
            const decimalNumber = Number(parseOperandTextExpr(config['decimals'], data[0], attributes));
            valueStr = Number(valueStr).toFixed(decimalNumber);
        }
        let valueLabel = '';
        let valueUnder = false;
        if (config.unit) {
            // if config.unit[text] is string, just use it as is, otherwise use the language version
            if (typeof config.unit['text'] === 'string') {
                valueLabel = config.unit['text'];
            } else {
                valueLabel = config.unit['text'][language];
            }
            // position the unit label
            if (config.unit['location'] === 'suffix') {
                valueStr += ' '+valueLabel;
            } else if (config.unit['location'] === 'prefix') {
                valueStr = valueLabel+' '+valueStr;
            } else if (config.unit['location'] === 'under') {
                valueUnder = true;
            }
        }
        const valueSize = config.adaptiveTextSize ? calculateFontSize(valueStr.toLocaleString(language)) : '4em';
        const unitSize = config.adaptiveTextSize && valueUnder? calculateFontSize(valueLabel) : '4em';
        return (
            <>
            <span className="lh-1" style={{fontSize: valueSize}}>{valueStr.toLocaleString(language)}</span>
            {
                valueUnder && <span style={{fontSize: unitSize}}>{valueLabel}</span>
            }
            </>
        )
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
                if (dataObj.operator === 'hist') {
                    // we compute the histogram of values along the xAxisConcept
                    // we also need to get all the values for the xAxisConcept dimension to take into account the 'no-data'
                    let histData: any[] = []
                    data.forEach((_dataItem: any) => {
                        let histItemIndex = histData.findIndex(item => {
                            if (item.binValue === _dataItem.value) {
                                let found = true
                                return found
                            } else {
                                return false
                            }
                        })
                        if (histItemIndex === -1) {
                            let histItem: any = {}
                            histItem[config.xAxisConcept] = _dataItem[config.xAxisConcept]
                            histItem.value = 1
                            histItem.binValue = _dataItem.value
                            histData.push(histItem)
                        } else {
                            histData[histItemIndex].value += 1
                            histData[histItemIndex][config.xAxisConcept] = `${histData[histItemIndex][config.xAxisConcept]}, ${_dataItem[config.xAxisConcept]}`
                        }
                    })
                    setValueElement(formatValue(histData[0].value, config, histData, attributes, language));
                    setPopupStr(histData[0][config.xAxisConcept])
                } else if (dataObj.operand.startsWith('{')) {
                    // if operand starts with { then it is an attribute
                    const operandValue = parseOperandTextExpr(dataObj.operand, data[0], attributes);
                    valueStr = eval(`${valueStr} ${dataObj.operator} ${operandValue}`);
                    setValueElement(formatValue(valueStr, config, data, attributes, language));
                    setPopupStr(data[0][config.xAxisConcept])
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
                        setValueElement(formatValue(valueStr, config, data, attributes, language));
                        setPopupStr(data[0][config.xAxisConcept])
                    });
                }

            } else {
                setValueElement(formatValue(valueStr, config, data, attributes, language));
                setPopupStr(data[0][config.xAxisConcept])
            }
            
            setIsLoading(false)
        });
    }, [language]);

    const valueNode: React.ReactNode =
        <div className="d-flex flex-column h-100">
            {config.title && <h2 className={`${config.title.weight?"fw-"+config.title.weight:""} ${ config.title.style?'fst-'+config.title.style:''} ${config.title.align === "left"? "text-start": config.title.align === "right"?"text-end": config.title.align === "center"?"text-center":""}`} style={{fontSize: config.title.size}}>{titleText}{config.metadataLink && <Button variant="link" onClick={() => {window.open(config.metadataLink, "_blank")}}><InfoCircle/></Button>} </h2>}
            {config.subtitle && (<h4 className={`${config.subtitle.weight?"fw-"+config.subtitle.weight:""}  ${config.subtitle.style?'fst-'+config.title?.style:''}`} style={{fontSize: config.subtitle.size}}>{subtitleText}</h4>)}
            <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center" style={valueStyle} title={popupStr}>
                {valueElement}
            </div>
        </div>

    return (
        <div ref={containerRef}
            className={`${containerClass} ${config.adaptiveTextSize ? "adaptive-text" : ""} ${config.frame ? "border" : ""}`}
            style={containerStyle}
            {...otherProps}
        >
            { isLoading ? placeholder || <div className="opacity-50 d-flex align-items-center justify-content-center h-100 w-100"><span>Loading...</span></div>
            :   config.dataLink ? <a href={config.dataLink} target="_blank">{valueNode}</a> :
                valueNode
            }
        </div>

    )
}
export default Value;