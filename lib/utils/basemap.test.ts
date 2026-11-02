// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Map from 'ol/Map';

const xyzOptions: Array<Record<string, unknown>> = [];

vi.mock('ol/source/XYZ', () => ({
    default: class {
        constructor(options: Record<string, unknown>) {
            xyzOptions.push(options);
        }
    },
}));
vi.mock('ol/layer/Tile', () => ({
    default: class {
        source: unknown;
        constructor(options: { source: unknown }) {
            this.source = options.source;
        }
    },
}));

import { createBasemapLayer, mapToImage } from './basemap';

beforeEach(() => {
    xyzOptions.length = 0;
});

describe('createBasemapLayer', () => {
    it('defaults to satellite tiles requested with CORS', () => {
        expect(createBasemapLayer(undefined)).not.toBeNull();
        expect(xyzOptions).toHaveLength(1);
        expect(xyzOptions[0].crossOrigin).toBe('anonymous');
        expect(String(xyzOptions[0].url)).toContain('World_Imagery');
        expect(xyzOptions[0].attributions).toBeDefined();
    });

    it('uses a custom XYZ template, also with CORS', () => {
        createBasemapLayer('https://tiles.example.org/{z}/{x}/{y}.png');
        expect(xyzOptions[0]).toMatchObject({
            url: 'https://tiles.example.org/{z}/{x}/{y}.png',
            crossOrigin: 'anonymous',
        });
        expect(xyzOptions[0].attributions).toBeUndefined();
    });

    it('creates no tile layer for "none"', () => {
        expect(createBasemapLayer('none')).toBeNull();
        expect(xyzOptions).toHaveLength(0);
    });
});

describe('mapToImage', () => {
    it('composes the layer canvases once rendering completes', async () => {
        const viewport = document.createElement('div');
        const layer = document.createElement('div');
        layer.className = 'ol-layer';
        layer.style.opacity = '0.5';
        const canvas = document.createElement('canvas');
        canvas.width = 20;
        canvas.height = 10;
        canvas.style.transform = 'matrix(1, 0, 0, 1, 5, 0)';
        layer.appendChild(canvas);
        viewport.appendChild(layer);

        let onRenderComplete: (() => void) | undefined;
        const fakeMap = {
            once: (event: string, handler: () => void) => {
                if (event === 'rendercomplete') onRenderComplete = handler;
            },
            renderSync: () => onRenderComplete?.(),
            getSize: () => [20, 10],
            getViewport: () => viewport,
        } as unknown as Map;

        const drawImage = vi.spyOn(CanvasRenderingContext2D.prototype, 'drawImage');
        const image = await mapToImage(fakeMap);

        expect(image.startsWith('data:image/png')).toBe(true);
        expect(drawImage).toHaveBeenCalledWith(canvas, 0, 0);
        drawImage.mockRestore();
    });
});
