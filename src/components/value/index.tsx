import { useEffect, useState } from "react";
import { parseOperandTextExpr, parseTextExpr } from '../../utils/parseTextExpr';
// @ts-ignore
import { SDMXParser } from 'sdmx-json-parser';
import { parseDataExpr } from "../../utils/parseDataExpr";
import { format } from "path";

const Value = ({ config }: {config: any}) => {

    const [titleObject, setTitleObject] = useState<any>({ text: "Loading..." })
    const [subTitleObject, setSubTitleObject] = useState<any>({ text: "Loading..." })
    const [valueStr, setValueStr] = useState("Loading...")

    const sdmxParser = new SDMXParser();

    const formatValue = (valueStr: any, config: any, data: any, attributes: any) => {
        if (config['Decimals']) {
            const decimalNumber = Number(parseOperandTextExpr(config['Decimals'], data[0], attributes));
            valueStr = Number(valueStr).toFixed(decimalNumber);
        }
        if (config['Unit']) {
            if (config['unitLoc'] == 'SUFFIX') {
                valueStr += config['Unit'];
            } else if (config['unitLoc'] == 'PREFIX') {
                valueStr = config['Unit'] + valueStr;
            }
        }
        return valueStr.toLocaleString();
    }

    useEffect(() => {
        const dataObjs = parseDataExpr(config.DATA);
        if(dataObjs.length > 1) {
            throw new Error('Multiple data expressions are not supported for Value component');
        }
        const dataObj = dataObjs[0];

        const dataFlowUrl = dataObj.dataFlowUrl;
        sdmxParser.getDatasets(dataFlowUrl, {
            headers: new Headers({
                Accept: "application/vnd.sdmx.data+json;version=2.0.0",
            })
        }).then(() => {
            const data = sdmxParser.getData();
            const dimensions = sdmxParser.getDimensions();
            const attributes = sdmxParser.getAttributes();

            const titleObj = parseTextExpr(config.Title, dimensions);
            const subTitleObj = parseTextExpr(config.Subtitle, dimensions);
            setTitleObject(titleObj);
            setSubTitleObject(subTitleObj);

            let valueStr = data[0].value;
            // apply operation to data
            if(dataObj.operator) {
                if(dataObj.operand.startsWith('{')) {
                    // if operand starts with { then it is an attribute
                    const operandValue = parseOperandTextExpr(dataObj.operand, data[0], attributes);
                    valueStr = eval(`${valueStr} ${dataObj.operator} ${operandValue}`);
                    setValueStr(formatValue(valueStr, config, data, attributes));
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
                        setValueStr(formatValue(valueStr, config, data, attributes));
                    });
                }

            } else {
                setValueStr(formatValue(valueStr, config, data, attributes));
            }
        });
    }, []);

    return (
        <div className={`pt-3 pb-2 px-2 px-xl-3 bg-white h-100 d-flex flex-column min-cell-height ${config.frameYN && config.frameYN.toLowerCase() == 'yes' ? "border" : "" }`}>
            <h2 className={`${titleObject.bootstrapcss && titleObject.bootstrapcss.join(' ')}`} style={titleObject.inlinecss}>{titleObject.text}</h2>
            {subTitleObject['text'] && (<h4 className={`${subTitleObject.bootstrapcss && subTitleObject.bootstrapcss.join(' ')}`} style={subTitleObject.inlinecss}>{subTitleObject.text}</h4>)}
            <div className="display-2 flex-grow-1 d-flex align-items-center justify-content-center">
                <p>{valueStr}</p>
            </div>
        </div>

    )
}
export default Value;