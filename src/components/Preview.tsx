import React from "react"
import { LiveProvider } from "react-live"
import { Tabs, Tab } from "react-bootstrap"
import { LivePreview, LiveEditor } from "react-live"

const Preview = ({content, scope}: {content: any, scope: any}) => {

    return (
        <>
            {content.map((item: any) => (
                <div key={item.id} className="border rounded p-3 d-flex flex-column code-tabs mt-3">
                    <LiveProvider code={item.code} scope={scope} disabled={true}>
                        <Tabs>
                            <Tab eventKey="preview" title="Preview">
                                <LivePreview />
                            </Tab>
                            <Tab eventKey="editor" title="Code">
                                <LiveEditor className="text-start" />
                            </Tab>
                        </Tabs>
                    </LiveProvider>
                </div>
            ))}
        </>
    )
}

export default Preview;