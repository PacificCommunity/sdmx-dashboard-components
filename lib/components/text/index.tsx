import { useEffect, useState } from "react";
import { parseTextExpr } from '../../utils/parseTextExpr';

const Text = ({ config, language }: { config: any, language: string }) => {

    const [titleText, setTitleText] = useState<string>('Loading...')
    const [titleStyle, setTitleStyle] = useState<any>({})
    const [subtitleText, setSubtitleText] = useState<string>('Loading...')
    const [subtitleStyle, setSubtitleStyle] = useState<any>({})
    const [noteText, setNoteText] = useState<string>('Loading...')
    const [noteStyle, setNoteStyle] = useState<any>({})

    useEffect(() => {
        if(Object.keys(config).length === 0) {
            return
        }
        if(config.title) {
            if(typeof config.title == 'string') {
                setTitleText(parseTextExpr(config.title, []))
            } else {
                setTitleStyle({...titleStyle, ...config.title})
                setTitleText(typeof config.title.text == 'string'? parseTextExpr(config.title.text, []) : parseTextExpr(config.title.text[language], []))
            }
        }
        if(config.subtitle) {
            if(typeof config.subtitle == 'string') {
                setSubtitleText(parseTextExpr(config.subtitle, []))
            } else {
                setSubtitleStyle({...subtitleStyle, ...config.subtitle})
                setSubtitleText(typeof config.subtitle.text == 'string'? parseTextExpr(config.subtitle.text, []) : parseTextExpr(config.subtitle.text[language], []))
            }
        }
        if(config.note) {
            if(typeof config.note == 'string') {
                setNoteText(parseTextExpr(config.note, []))
            } else {
                setNoteText(typeof config.note.text == 'string'? parseTextExpr(config.note.text, []) : parseTextExpr(config.note.text[language], []))
                setNoteStyle({...noteStyle, ...config.note})
            }
        }
    }, [config, language])

    return (
        <div className={`pt-3 pb-2 px-2 px-xl-3 bg-white ${config.frame ? "border" : ""}`}>
            {config.title && <h2 className={`${titleStyle.weight?"fw-"+titleStyle.weight:""} ${ titleStyle.italic?'fst-italic':''} ${titleStyle.align == "left"? "text-start": titleStyle.align === "right"?"text-end": titleStyle.align === "center"?"text-center":""}`} style={{fontSize: titleStyle.size}}>{titleText}</h2>}
            {config.subtitle && (<h4 className={`${subtitleStyle.weight?"fw-"+subtitleStyle.weight:""}  ${subtitleStyle.italic?'fst-italic':''}`} style={{fontSize: subtitleStyle.size}}>{subtitleText}</h4>)}
            {config.note && (<p className={`${noteStyle.weight?"fw-"+noteStyle.weight:""}  ${noteStyle.italic?'fst-italic':''}`} style={{fontSize: noteStyle.size}}>{noteText}</p>)}
        </div>
    )
}
export default Text