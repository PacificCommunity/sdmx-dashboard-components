import { useEffect, useState } from "react";
import { parseTextExpr } from '../../utils/parseTextExpr';

const Title = ({ config }: {config: any}) => {

    const [titleObject, setTitleObject] = useState<any>({ text: "Loading..." })
    const [subTitleObject, setSubTitleObject] = useState<any>({ text: "Loading..." })

    useEffect(() => {
        const titleObj = parseTextExpr(config.Title, [])
        setTitleObject(titleObj)
        setSubTitleObject(parseTextExpr(config.Subtitle, []))
    }, [config.Title, config.Subtitle])

    return (
        <div className={`pt-3 pb-2 px-2 px-xl-3 bg-white ${config.frameYN && config.frameYN.toLowerCase() == 'yes' ? "border" : "" }`}>
            <h2 className={`${titleObject.bootstrapcss && titleObject.bootstrapcss.join(' ')}`} style={titleObject.inlinecss}>{titleObject.text}</h2>
            {subTitleObject['text'] && (<h4 className={`${subTitleObject.bootstrapcss && subTitleObject.bootstrapcss.join(' ')}`} style={subTitleObject.inlinecss}>{subTitleObject.text}</h4>)}
        </div>
    )
}
export default Title