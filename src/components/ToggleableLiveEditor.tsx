import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { LiveEditor } from "react-live";


const ToggleableLiveEditor = () => {
    const [showEditor, setShowEditor] = useState(false);
    return (
        <>
            <Button variant="primary" onClick={() => setShowEditor(!showEditor)}>Show Editor</Button>
            <div className={`collapse ${showEditor ? 'show' : ''}`}>
                <LiveEditor className="text-start" />
            </div>
        </>
    )
}

export default ToggleableLiveEditor;