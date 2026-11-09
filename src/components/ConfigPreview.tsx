import React, { useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { SDMXChart } from '../../lib';
import type { SDMXChartConfig } from '../../lib';

const EXAMPLE_CONFIG: SDMXChartConfig = {
    id: 'key_rates_line',
    data: 'https://data-api.ecb.europa.eu/service/data/FM/B.U2.EUR.4F.KR.DFR+MRR_FR+MLFR.LEV?dimensionAtObservation=AllDimensions&startPeriod=2014-01-01',
    type: 'line',
    unit: {
        text: '%',
        location: 'suffix',
    },
    title: {
        text: 'Key ECB Interest Rates Since 2014',
    },
    legend: {
        concept: 'PROVIDER_FM_ID',
        location: 'top',
    },
    decimals: 2,
    subtitle: {
        text: 'Levels at dates of change',
    },
    xAxisConcept: 'TIME_PERIOD',
};

const parseConfig = (text: string): SDMXChartConfig => {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Config must be a JSON object.');
    }
    if (typeof (parsed as { type?: unknown }).type !== 'string') {
        throw new Error('Config must have a "type" field.');
    }
    return parsed as SDMXChartConfig;
};

const ConfigPreview = () => {
    const [text, setText] = useState('');
    const [config, setConfig] = useState<SDMXChartConfig | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (text.trim() === '') {
                setConfig(null);
                setError(null);
                return;
            }
            try {
                setConfig(parseConfig(text));
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            }
        }, 250);
        return () => clearTimeout(timeout);
    }, [text]);

    return (
        <div className="d-flex flex-column gap-3">
            <Form.Control
                as="textarea"
                aria-label="Chart config JSON"
                placeholder='Paste an SDMXChartConfig JSON, e.g. {"id": "my-chart", ...}'
                rows={12}
                value={text}
                onChange={(event) => setText(event.target.value)}
                style={{ fontFamily: 'monospace' }}
            />
            <div>
                <Button variant="primary" onClick={() => setText(JSON.stringify(EXAMPLE_CONFIG, null, 2))}>
                    Load example
                </Button>
            </div>
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}
            {config && <SDMXChart config={config} language="en" />}
        </div>
    );
};

export default ConfigPreview;
