/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from "react";
import parse from "html-react-parser";
import { parseOperandTextExpr, parseTextExpr } from '../../utils/parseTextExpr';
// @ts-ignore sdmx-json-parser ships no type declarations
import { SDMXParser } from 'sdmx-json-parser';
import { fetchDataExprOperand, parseDataExpr } from "../../utils/parseDataExpr";
import { dataRequestHeaders } from "../../utils/requestHeaders";
import { InfoCircle } from "react-bootstrap-icons";
import { Button } from "react-bootstrap";
import { SDMXVisualConfig, SDMXVisualProps } from "../types";
import { SDMXRenderError, emptyDataError, toSDMXRenderError } from "../../errors";
import { computeRenderStats, failedRenderStatus } from "../../utils/renderStats";
import { useLatest } from "../../utils/useLatest";
import { parse as parseExpr, EvalAstFactory, Scope } from "jexpr";


interface ValueProps extends React.HTMLAttributes<HTMLDivElement>, SDMXVisualProps {
    config: SDMXVisualConfig;
    valueClassName?: string;
    placeholder?: React.JSX.Element;
    callback?: (value: React.JSX.Element) => void;
    language: string;
}

const Value = ({ config, placeholder, callback, language, onVisualRender, ...props }: ValueProps) => {

    const [valueElement, setValueElement] = useState(<span>Loading...</span>)
    const [popupStr, setPopupStr] = useState<string>("")
    const [titleText, setTitleText] = useState<string>(config.title?'Loading...':'')
    const [subtitleText, setSubtitleText] = useState<string>(config.subtitle?'Loading...':'')
    const [isLoading, setIsLoading] = useState(true)
    const [renderError, setRenderError] = useState<SDMXRenderError | null>(null)

    const containerRef = useRef<HTMLDivElement>(null);
    const onVisualRenderRef = useLatest(onVisualRender);
    const callbackRef = useLatest(callback);

    // className is applied to container div
    // style is applied to value div
    // style main contain width, height, color and backgroundColor
    // other props are applied to container div
    const { className: _className, style, valueClassName, ...otherProps } = props;

    let containerClass = props.className || '';
    let containerStyle = {};
    let valueStyle = style;

    // is adtaptive text size requested ?
    // check from config and from classname "adaptive-text"
    if (config.adaptiveTextSize || containerClass.indexOf("adaptive-text-size") > -1) {
        config.adaptiveTextSize = true;
    }

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

    const calculateFontSize = useCallback((text: string) => {
        if (typeof valueDivWidth === 'number') {
            return Math.min(valueDivWidth / text.length, valueDivWidth / 2) + 'px';
        }
        if (containerRef.current) {
            // calculate the width of the value div in pixel, as a percentage of the container div
            const containerWidth = containerRef.current.clientWidth * parseInt(valueDivWidth) / 100;
            // Adjust the formula as needed to fit your design
            return Math.min(containerWidth / text.length, containerWidth / 2) + 'px';
        }
        // default value if no container found
        return '4em';
    }, [valueDivWidth]);

    const formatValue = useCallback((valueStr: any, config: any, data: any, attributes: any, language: string) => {
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
        const unitSize = ( config.adaptiveTextSize && valueUnder ) ? calculateFontSize(valueLabel) : '4em';
        return (
            <>
            <span className="lh-1" style={{fontSize: valueSize, cursor: "default"}}>{valueStr.toLocaleString(language)}</span>
            {
                valueUnder && <span style={{fontSize: unitSize, cursor: "default"}}>{valueLabel}</span>
            }
            </>
        )
    }, [calculateFontSize]);

    useEffect(() => {
        let cancelled = false;
        let renderedElement: React.JSX.Element | undefined;
        setRenderError(null);
        onVisualRenderRef.current?.({ visualId: config.id, status: 'loading' });
        const sdmxParser = new SDMXParser();

        // start from a resolved promise so a synchronous throw (a malformed
        // data expression) settles the visual like a failed fetch would
        Promise.resolve().then(() => {
            const dataObjs = parseDataExpr(config.data);
            if (dataObjs.length > 1) {
                throw new SDMXRenderError('ERR_ENGINE', 'Multiple data expressions are not supported for Value component');
            }
            const dataObj = dataObjs[0];
            dataObj.index = dataObj.index || 0;

            const dataFlowUrl = dataObj.dataFlowUrl;
            return sdmxParser.getDatasets(dataFlowUrl, {
                headers: dataRequestHeaders(language)
            }).then(() => {
                const data = sdmxParser.getData();
                if (data.length === 0) {
                    throw emptyDataError(config.id, dataFlowUrl);
                }
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
                // operand requests still in flight; their failures settle the visual
                const pending: Promise<unknown>[] = [];
                // apply operation to data
                if (dataObj.operator) {
                    if(dataObj.operator === "count") {
                        const countData = data
                            .map((item: any) => {
                                const expr = parseExpr(`x0 ${dataObj.exprOperator} x1`, new EvalAstFactory());
                                const scope: Scope = {x0: item.value}
                                if (isNaN(parseInt(dataObj.exprOperand))) {
                                    const dataPromises = fetchDataExprOperand([dataObj.exprOperand], data, scope, attributes, language)
                                    pending.push(Promise.all(dataPromises).then(() => {
                                        Object.keys(scope).forEach((key: string) => {
                                            if (Array.isArray(scope[key])) {
                                                scope[key] = scope[key][0]
                                            }
                                        })
                                        valueStr = expr?.evaluate(scope)
                                        return valueStr && item;
                                    }))
                                } else {
                                    scope['x1'] = parseInt(dataObj.exprOperand)
                                    valueStr = expr?.evaluate(scope)
                                    return valueStr && item;
                                }
                            })
                            .filter((item: any) => item); // count number of true
                        renderedElement = formatValue(countData.length, config, countData, attributes, language);
                        setValueElement(renderedElement);
                        setPopupStr(countData.map((item: any) => item[config.xAxisConcept]).join(', '))
                    } else if (dataObj.operator === "expr") {
                        const scope: Scope = {x0: valueStr}
                        const dataPromises = fetchDataExprOperand(dataObj.exprOperand, data, scope, attributes, language)
                        pending.push(Promise.all(dataPromises).then(() => {
                            const astFactory = new EvalAstFactory();
                            const expr = parseExpr(dataObj.expression, astFactory);
                            // fetchDataExprOperand returns an array for variables, so we need to flatten it
                            Object.keys(scope).forEach((key: string) => {
                                if (Array.isArray(scope[key])) {
                                    scope[key] = scope[key][0]
                                }
                            })
                            valueStr = expr?.evaluate(scope)
                            renderedElement = formatValue(valueStr, config, data, attributes, language);
                            setValueElement(renderedElement);
                            setPopupStr(data[0][config.xAxisConcept])
                        }))
                    }
                } else {
                    renderedElement = formatValue(valueStr, config, data, attributes, language);
                    setValueElement(renderedElement);
                    setPopupStr(data[0][config.xAxisConcept])
                }
                return Promise.all(pending).then(() => data);
            });
        }).then((data) => {
            if (cancelled) return;
            setIsLoading(false)
            onVisualRenderRef.current?.({
                visualId: config.id,
                status: 'rendered',
                stats: computeRenderStats(data, 1)
            })
            if (callbackRef.current && renderedElement) {
                callbackRef.current(renderedElement)
            }
        }).catch((err: unknown) => {
            if (cancelled) return;
            const valueError = toSDMXRenderError(err, config.id);
            setRenderError(valueError);
            setIsLoading(false);
            onVisualRenderRef.current?.(failedRenderStatus(valueError, config.id));
        });
        return () => {
            cancelled = true;
        };
    }, [language, config, onVisualRenderRef, formatValue, callbackRef ]);

    const valueNode: React.ReactNode =
        <div className="value-node d-flex flex-column h-100">
            {config.title &&
                <h2
                    className={`${config.title.weight?"fw-"+config.title.weight:""} ${ config.title.style?'fst-'+config.title.style:''} ${config.title.align === "left"? "text-start": config.title.align === "right"?"text-end": config.title.align === "center"?"text-center":""}`}
                    style={{
                        fontSize: config.title.size,
                        color: config.title?.color
                    }}>
                    {titleText}
                    {config.metadataLink &&
                        <Button variant="link" onClick={() => {window.open(config.metadataLink, "_blank")}}>
                            <InfoCircle/>
                        </Button>
                    }
                </h2>
            }
            {config.subtitle &&
                <h4
                    className={`${config.subtitle.weight?"fw-"+config.subtitle.weight:""} ${config.subtitle.style?'fst-'+config.title?.style:''}`}
                    style={{
                        fontSize: config.subtitle.size,
                        textAlign: config.subtitle?.align
                    }}>
                    {parse(subtitleText)}
                </h4>
            }
            <div
                className={`${valueClassName || ''} flex-grow-1 d-flex flex-column align-items-center justify-content-center`}
                style={valueStyle}
                title={popupStr}>
                {valueElement}
            </div>
        </div>

    return (
        <div
            ref={containerRef}
            className={`${containerClass || ''} ${config.frame ? "border" : ""}`}
            style={containerStyle}
            {...otherProps}>
            { renderError ?
                <div className="sdmx-render-error text-danger" role="alert" data-error-code={renderError.code}>
                    {renderError.message}
                </div>
            :   isLoading ? placeholder || <div className="opacity-50 d-flex align-items-center justify-content-center h-100 w-100"><span>Loading...</span></div>
            :   config.dataLink ? <a href={config.dataLink} target="_blank">{valueNode}</a> :
                valueNode
            }
        </div>
    )
}
export default Value;
