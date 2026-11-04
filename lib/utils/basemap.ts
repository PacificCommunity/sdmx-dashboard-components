import type Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';

const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION =
    'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">ArcGIS</a>';

/**
 * The background tile layer of a map: "satellite" (the default) is ArcGIS
 * World Imagery, "none" draws no tiles, and any other string is an XYZ
 * tile URL template ({z}, {x}, {y}). Tiles are requested with CORS
 * (crossOrigin: "anonymous") so the map canvas stays readable for export;
 * a tile server that sends no CORS headers then fails to load its tiles
 * instead of tainting the canvas.
 */
export const createBasemapLayer = (basemap: string | undefined): TileLayer<XYZ> | null => {
    const choice = basemap || 'satellite';
    if (choice === 'none') {
        return null;
    }
    const satellite = choice === 'satellite';
    return new TileLayer({
        source: new XYZ({
            url: satellite ? SATELLITE_URL : choice,
            crossOrigin: 'anonymous',
            ...(satellite ? { attributions: SATELLITE_ATTRIBUTION } : {}),
        }),
    });
};

const MATRIX = /^matrix\(([^(]*)\)$/;

/**
 * A PNG data URL of what the map shows: every layer canvas of the viewport
 * composed in order, with its opacity and transform, once the map has
 * finished rendering. HTML overlays (legend, tooltip) are not included.
 */
export const mapToImage = (map: Map): Promise<string> => {
    const { promise, resolve, reject } = Promise.withResolvers<string>();
    map.once('rendercomplete', () => {
        try {
            const [width, height] = map.getSize() ?? [0, 0];
            const output = document.createElement('canvas');
            output.width = width;
            output.height = height;
            const context = output.getContext('2d');
            if (!context) {
                throw new Error('The map image could not be drawn: no 2D canvas context');
            }
            map.getViewport().querySelectorAll<HTMLCanvasElement>('.ol-layer canvas, canvas.ol-layer').forEach((canvas) => {
                if (canvas.width === 0) {
                    return;
                }
                const parent = canvas.parentElement;
                const opacity = parent?.style.opacity || canvas.style.opacity;
                context.globalAlpha = opacity === '' || opacity === undefined ? 1 : Number(opacity);
                const matrix = MATRIX.exec(canvas.style.transform)?.[1].split(',').map(Number);
                if (matrix && matrix.length === 6) {
                    context.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
                } else {
                    context.setTransform(1, 0, 0, 1, 0, 0);
                }
                const background = parent?.style.backgroundColor;
                if (background) {
                    context.fillStyle = background;
                    context.fillRect(0, 0, canvas.width, canvas.height);
                }
                context.drawImage(canvas, 0, 0);
            });
            context.globalAlpha = 1;
            context.setTransform(1, 0, 0, 1, 0, 0);
            resolve(output.toDataURL('image/png'));
        } catch (err) {
            reject(err);
        }
    });
    map.renderSync();
    return promise;
};
