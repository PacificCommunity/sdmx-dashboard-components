import React, { useCallback, useEffect, useRef, useState } from "react";
import parse from "html-react-parser";
import { parseOperandTextExpr, parseTextExpr } from '../../utils/parseTextExpr';
// @ts-ignore sdmx-json-parser ships no type declarations
import { SDMXParser } from 'sdmx-json-parser';
import { fetchDataExprOperand, parseDataExpr } from "../../utils/parseDataExpr";
import { dataRequestOptions } from "../../utils/requestHeaders";
import { InfoCircle } from "react-bootstrap-icons";
import { Button } from "react-bootstrap";
import { SDMXAttribute, SDMXDimension, SDMXObservation, SDMXTheme, SDMXVisualConfig, SDMXVisualProps } from "../types";
import { resolveNumberLocale, resolveThemeFont } from "../../utils/theme";
import { textConfigStyle, textLinkStyle } from "../../utils/textStyles";
import { SDMXRenderError, emptyDataError, toSDMXRenderError } from "../../errors";
import { computeRenderStats, failedRenderStatus } from "../../utils/renderStats";
import { useLatest } from "../../utils/useLatest";
import { failureSlot } from "../../utils/slots";
import { useTransport } from "../../utils/transport";
import { parse as parseExpr, EvalAstFactory, Scope } from "jexpr";


interface ValueProps extends React.HTMLAttributes<HTMLDivElement>, SDMXVisualProps {
    config: SDMXVisualConfig;
    valueClassName?: string;
    placeholder?: React.JSX.Element;
    callback?: (value: React.JSX.Element) => void;
    language: string;
    theme?: SDMXTheme; // numberFormat and fontFamily apply to a value
}

const Value = ({ config, placeholder, callback, language, theme, onVisualRender, onUserInteraction: _onUserInteraction, fetcher, onDataFetch, renderLoading, renderEmpty, renderError: renderErrorSlot, ...props }: ValueProps) => {

    const numberLocale = resolveNumberLocale(theme, language);
    const displayFont = resolveThemeFont(theme, 'display');
    const dataFont = resolveThemeFont(theme, 'data');
    const [valueElement, setValueElement] = useState(<span>Loading...</span>)
    const [popupStr, setPopupStr] = useState<string>("")
    const [titleText, setTitleText] = useState<string>(config.title?'Loading...':'')
    const [subtitleText, setSubtitleText] = useState<string>(config.subtitle?'Loading...':'')
    const [isLoading, setIsLoading] = useState(true)
    const [renderError, setRenderError] = useState<SDMXRenderError | null>(null)

    const containerRef = useRef<HTMLDivElement>(null);
    const onVisualRenderRef = useLatest(onVisualRender);
    // the same load key as the chart: a new data URL, language or x-axis
    // concept gets a fresh transport and so a fresh request; any other config
    // change re-renders from the transport's cache
    const loadKey = `${JSON.stringify(config.data)}|${language}|${config.xAxisConcept ?? ''}`;
    const transport = useTransport(fetcher, onDataFetch, loadKey);
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
    // after the in-place default above, so that default does not change the key
    const configKey = JSON.stringify(config);

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

    const formatValue = useCallback((rawValue: string | number | null, config: SDMXVisualConfig, data: SDMXObservation[], attributes: SDMXAttribute[], language: string) => {
        let valueStr: string | number = rawValue ?? '';
        if (config['decimals']) {
            const decimalNumber = Number(parseOperandTextExpr(String(config['decimals']), data[0], attributes));
            valueStr = Number(valueStr).toFixed(decimalNumber);
        }
        let valueLabel = '';
        let valueUnder = false;
        if (config.unit) {
            // if config.unit[text] is string, just use it as is, otherwise use the language version
            if (typeof config.unit.text === 'string') {
                valueLabel = config.unit.text;
            } else {
                // Older configs supply a per-language map here even though the type says string.
                valueLabel = (config.unit.text as unknown as Record<string, string>)[language];
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
        const formattedValue = typeof valueStr === 'number' ? valueStr.toLocaleString(numberLocale) : valueStr;
        const valueSize = config.adaptiveTextSize ? calculateFontSize(formattedValue) : '4em';
        const unitSize = ( config.adaptiveTextSize && valueUnder ) ? calculateFontSize(valueLabel) : '4em';
        return (
            <>
            <span className="lh-1" style={{fontSize: valueSize, cursor: "default"}}>{formattedValue}</span>
            {
                valueUnder && <span style={{fontSize: unitSize, cursor: "default"}}>{valueLabel}</span>
            }
            </>
        )
    }, [calculateFontSize, numberLocale]);

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
            return sdmxParser.getDatasets(dataFlowUrl, dataRequestOptions(language, transport)).then(() => {
                const data = sdmxParser.getData() as SDMXObservation[];
                if (data.length === 0) {
                    throw emptyDataError(config.id, dataFlowUrl);
                }
                const dimensions = sdmxParser.getDimensions() as SDMXDimension[];
                const attributes = sdmxParser.getAttributes() as SDMXAttribute[];

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
                        const exprOperand = Array.isArray(dataObj.exprOperand) ? dataObj.exprOperand[0] : dataObj.exprOperand ?? '';
                        const countData = data
                            .map((item: SDMXObservation) => {
                                const expr = parseExpr(`x0 ${dataObj.exprOperator} x1`, new EvalAstFactory());
                                const scope: Scope = {x0: item.value}
                                if (isNaN(parseInt(exprOperand))) {
                                    const dataPromises = fetchDataExprOperand([exprOperand], data, scope, attributes, language, transport)
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
                                    scope['x1'] = parseInt(exprOperand)
                                    valueStr = expr?.evaluate(scope)
                                    return valueStr && item;
                                }
                            })
                            .filter((item: SDMXObservation | undefined) => item); // count number of true
                        renderedElement = formatValue(countData.length, config, countData, attributes, language);
                        setValueElement(renderedElement);
                        setPopupStr(countData.map((item: SDMXObservation) => item[config.xAxisConcept]).join(', '))
                    } else if (dataObj.operator === "expr") {
                        const operands = Array.isArray(dataObj.exprOperand) ? dataObj.exprOperand : dataObj.exprOperand ? [dataObj.exprOperand] : [];
                        const scope: Scope = {x0: valueStr}
                        const dataPromises = fetchDataExprOperand(operands, data, scope, attributes, language, transport)
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
                            setPopupStr(String(data[0][config.xAxisConcept] ?? ''))
                        }))
                    }
                } else {
                    renderedElement = formatValue(valueStr, config, data, attributes, language);
                    setValueElement(renderedElement);
                    setPopupStr(String(data[0][config.xAxisConcept] ?? ''))
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
        // config is read at its configKey; its identity alone must not refetch
    }, [configKey, language, numberLocale, transport, config, onVisualRenderRef, formatValue, callbackRef ]);

    const valueNode: React.ReactNode =
        <div className="value-node d-flex flex-column h-100">
            {config.title &&
                <h2 style={textConfigStyle(config.title, displayFont)}>
                    {titleText}
                    {config.metadataLink &&
                        <Button variant="link" onClick={() => {window.open(config.metadataLink, "_blank")}}>
                            <InfoCircle/>
                        </Button>
                    }
                </h2>
            }
            {config.subtitle &&
                <h4 style={textConfigStyle(config.subtitle, displayFont)}>
                    {config.subtitle.link
                        ? <a
                            href={config.subtitle.link}
                            target={config.subtitle.target ?? 'blank'}
                            rel="noreferrer"
                            style={textLinkStyle(config.subtitle)}
                        >
                            {parse(subtitleText)}
                        </a>
                        : parse(subtitleText)}
                </h4>
            }
            <div
                className={`${valueClassName || ''} flex-grow-1 d-flex flex-column align-items-center justify-content-center`}
                style={dataFont ? { fontFamily: dataFont, ...valueStyle } : valueStyle}
                title={popupStr}>
                {valueElement}
            </div>
        </div>

    const errorSlot = renderError ? failureSlot(renderError, config.id, { renderEmpty, renderError: renderErrorSlot }) : undefined;

    return (
        <div
            ref={containerRef}
            className={`${containerClass || ''} ${config.frame ? "border" : ""}`}
            style={containerStyle}
            {...otherProps}>
            { renderError ?
                errorSlot !== undefined ? errorSlot :
                <div className="sdmx-render-error text-danger" role="alert" data-error-code={renderError.code}>
                    {renderError.message}
                </div>
            :   isLoading ? (renderLoading ? renderLoading(config.id) : placeholder) || <div className="opacity-50 d-flex align-items-center justify-content-center h-100 w-100"><span>Loading...</span></div>
            :   config.dataLink ? <a href={config.dataLink} target="_blank">{valueNode}</a> :
                valueNode
            }
        </div>
    )
}
export default Value;
