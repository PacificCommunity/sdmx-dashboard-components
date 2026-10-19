import React from 'react';
import { useState, useRef, useEffect } from 'react';
// @ts-ignore
import { SDMXParser } from 'sdmx-json-parser';

import Map from 'ol/Map';
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorTileLayer from 'ol/layer/VectorTile'
import VectorSource from 'ol/source/Vector'
import VectorTileSource from 'ol/source/VectorTile'
import XYZ from 'ol/source/XYZ'
import GeoJSON from 'ol/format/GeoJSON'
import MVT from 'ol/format/MVT'
import Feature, { FeatureLike } from 'ol/Feature';
import proj4 from 'proj4';
import {Projection, get} from 'ol/proj';
import {register} from 'ol/proj/proj4';
import { MapBrowserEvent, Overlay } from 'ol';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import 'ol/ol.css';

import styles from './styles.module.css';


import Control from 'ol/control/Control';
import { parseDataExpr } from '../../utils/parseDataExpr';
import { parseTextExpr } from '../../utils/parseTextExpr';
import { SDMXMapConfig } from '../types';
import RenderFeature from 'ol/render/Feature';
import { isISO3Code, isoCountryCode3To2 } from '../../utils/isoCountryCode';
import { getColorSchemeFunction, getColorSchemePreview, getReadableTextColor, getTextHaloColor } from '../../utils/mapColors';
import TileGrid from 'ol/tilegrid/TileGrid';

type MapDataLayer = VectorLayer<VectorSource> | VectorTileLayer

const MapComponent = ({ config, language, callback }: { config: SDMXMapConfig, language: string, callback?: (map: Map) => void }) => {
  // set intial state - used to track references to OpenLayers
  //  objects for use in hooks, event handlers, etc.
  const [featuresLayer, setFeaturesLayer] = useState<MapDataLayer>()
  const [obsValueMin, setObsValueMin] = useState<number>(1e9)
  const [obsValueMax, setObsValueMax] = useState<number>(0)

  const [dimensions, setDimensions] = useState<any[]>([])
  const [unit, setUnit] = useState<string>(config.unit?.text || '')
  const [indicatorName, setIndicatorName] = useState<string>('')

  // get ref to div element - OpenLayers will render into this div
  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const dataLayerRef = useRef<MapDataLayer | null>(null)
  const sdmxDataByGeoIdRef = useRef<{ [id: string]: any }>({})
  const geojsonKeyRef = useRef<string>('')
  const tooltipElement = useRef<HTMLDivElement>(null)
  const legendElement = useRef<HTMLDivElement>(null)

  const getSDMXPropsForFeature = (feature: FeatureLike) => {
    const geojsonKey = geojsonKeyRef.current
    let geoId = geojsonKey ? feature.get(geojsonKey) : undefined
    let featureValue = feature.get('value')
    let sdmxProps = null
    if (geoId && !featureValue) {
      if (isISO3Code(String(geoId))) {
        geoId = isoCountryCode3To2(String(geoId))
      }
      sdmxProps = sdmxDataByGeoIdRef.current[String(geoId)] || null
      if (sdmxProps && !(feature instanceof RenderFeature)) {
        const vectorFeature = feature as Feature
        vectorFeature.setProperties({ ...sdmxProps, ...feature.getProperties() }, true)
      }
      featureValue = sdmxProps?.['value']
    }
    return { sdmxProps, featureValue }
  }

  const isVectorTileUrl = (url: string) => {
    return /\{z\}.*\{x\}.*\{y\}/.test(url) || /\.(mvt|pbf)(\?|$)/i.test(url)
  }

  const getSingleMapDataObj = () => {
    const dataObjs = parseDataExpr(config.data);
    if (dataObjs.length > 1) {
      throw new Error('Multiple data expressions are not supported for Value component');
    }
    return dataObjs[0];
  }

  const resolveGeojsonProjection = (projectionCode: string) => {
    let geojsonProj = get(projectionCode);
    if (!geojsonProj && projectionCode === 'EPSG:3832') {
      proj4.defs('EPSG:3832', '+proj=merc +lon_0=150 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs');
      register(proj4);
      geojsonProj = get('EPSG:3832');
      if (geojsonProj) {
        const epsg3857 = get('EPSG:3857');
        if (epsg3857) {
          geojsonProj.setExtent(epsg3857.getExtent());
        }
        geojsonProj.setGlobal(true);
      }
    }
    return geojsonProj;
  }

  const initMapIfNeeded = (geojsonProj: Projection | null) => {
    if (mapElement.current && !mapRef.current) {
      mapRef.current = new Map({
        target: mapElement.current || '',
        layers: [
          new TileLayer({
            source: new XYZ({
              attributions:
                'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/' +
                'rest/services/World_Imagery/MapServer">ArcGIS</a>',
              url:
                'https://server.arcgisonline.com/ArcGIS/rest/services/' +
                'World_Imagery/MapServer/tile/{z}/{y}/{x}',
            }),
          }),
        ],
        view: new View({
          center: [0, 0],
          zoom: 2,
          projection: geojsonProj || 'EPSG:3857'
        })
      });
      mapRef.current.addControl(new Control({
        element: legendElement.current || undefined
      }));

      const overlay = new Overlay({
        element: tooltipElement.current || undefined,
        offset: [10, 0],
        positioning: 'bottom-left',
        id: 'tooltip-overlay'
      });
      mapRef.current.addOverlay(overlay);
    }
    return mapRef.current?.getView().getProjection() || null;
  }

  const getGeoLookup = (data: any[], dimensionsFromData: any[], dataFlowKey: string) => {
    const geoDimension = dimensionsFromData.find((dimension: any) => dimension.id === dataFlowKey);
    const sdmxDataByGeoId: { [id: string]: any } = {};
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    geoDimension?.values.forEach((geoValue: any) => {
      const sdmxData = data.find((valData: any) => valData[dataFlowKey] === geoValue.name);
      if (!sdmxData) {
        return;
      }
      sdmxDataByGeoId[geoValue.id] = {
        ...sdmxData,
        name: sdmxData[dataFlowKey]
      };
      const obsValue = sdmxData.value;
      if (max < obsValue) {
        max = obsValue;
      }
      if (min > obsValue) {
        min = obsValue;
      }
    });

    return {
      sdmxDataByGeoId,
      min: min === Number.POSITIVE_INFINITY ? 0 : min,
      max: max === Number.NEGATIVE_INFINITY ? 0 : max
    };
  }

  const createInitialFeaturesLayer = (geojsonUrl: string, projection: string | null) => {
    let initialLayer: MapDataLayer;
    if (isVectorTileUrl(geojsonUrl)) {
      // handle special case for EPSG:3832 used with a vector tile source - need to create custom tile grid and set it on the source for tiles to load correctly
      let customTileGrid: TileGrid | undefined = undefined;
      if (projection == "EPSG:3832") {
        // create custom tilegrid
        customTileGrid = new TileGrid({
          extent: [-19628687.512850948, -8362698.548500745, 15807367.692644844, 10023392.492023032],
          resolutions: [71820.668127046, 35910.334063523, 17955.167031761, 8977.5835158805, 4488.7917579403, 2244.3958789701, 1122.1979394851, 561.09896974255, 280.54948487127, 140.27474243563, 70.13737121782, 35.06868560891, 17.534342804455, 8.767171402227, 4.3835857011135, 2.1917928505567, 1.0958964252784, 0.5479482126392],
          tileSize: 256
        });
      }
      const vectorTileSource = new VectorTileSource({
        format: new MVT(),
        url: geojsonUrl,
        projection: projection || 'EPSG:3857',
        tileGrid: customTileGrid
      });
      initialLayer = new VectorTileLayer({
        source: vectorTileSource,
      });
      vectorTileSource.once('tileloadend', () => {
        if (callback && mapRef.current) {
          callback(mapRef.current);
        }
      });
    } else {
      const vectorSource = new VectorSource({
        format: new GeoJSON(),
        url: geojsonUrl
      });
      vectorSource.on('featuresloadend', () => {
        if (callback && mapRef.current) {
          callback(mapRef.current);
        }
      });
      initialLayer = new VectorLayer({
        source: vectorSource
      });
    }
    return initialLayer;
  }


  useEffect(() => {
    let titleText = config.title ? 'Loading...' : '';

    const sdmxParser = new SDMXParser();
    const dataObj = getSingleMapDataObj();
    const geojsonProj = resolveGeojsonProjection(dataObj.geojsonProjection);
    initMapIfNeeded(geojsonProj);


    const dataFlowUrl = dataObj.dataFlowUrl;
    sdmxParser.getDatasets(dataFlowUrl, {
      headers: new Headers({
        Accept: "application/vnd.sdmx.data+json;version=2.0.0",
        "Accept-Language": language
      })
    }).then(() => {
      const data = sdmxParser.getData();
      const _dim = sdmxParser.getDimensions();
      const _att = sdmxParser.getAttributes();
      setDimensions(_dim)
      if (config.legend?.concept) {
        setIndicatorName(data.length > 0 ? data[0][config.legend.concept] : '')
      } else {
        setIndicatorName('')
      }
      const unitAttribute = _att.find((attribute: any) => attribute.id === 'UNIT_MEASURE')
      const detectedUnit = unitAttribute?.values?.[0]?.name || ''
      setUnit(config.unit?.text || detectedUnit)

      if (typeof config.title == 'string') {
        titleText = parseTextExpr(config.title, _dim)
      } else if (typeof config.title === 'object') {
        titleText = typeof config.title.text == 'string' ? parseTextExpr(config.title.text, _dim) : parseTextExpr(config.title.text[language], _dim)
      }

      geojsonKeyRef.current = dataObj.geojsonKey
      const { sdmxDataByGeoId, min, max } = getGeoLookup(data, _dim, dataObj.dataFlowKey)
      sdmxDataByGeoIdRef.current = sdmxDataByGeoId
      setObsValueMax(max)
      setObsValueMin(min)

      if (dataLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(dataLayerRef.current)
      }

      const initalFeaturesLayer = createInitialFeaturesLayer(dataObj.geojsonUrl, dataObj.geojsonProjection)

      setFeaturesLayer(initalFeaturesLayer)
      dataLayerRef.current = initalFeaturesLayer
      mapRef.current?.addLayer(initalFeaturesLayer)

      legendElement.current!.children[0]!.innerHTML = titleText

    });
  }, [config, language, callback])

  useEffect(() => {
    const styleFunction = (feature: FeatureLike) => {
      const { sdmxProps, featureValue } = getSDMXPropsForFeature(feature)

      let fillColor = 'transparent';
      let strokeColor = 'transparent';
      if(featureValue) {
        const normalisedValue = (featureValue - obsValueMin)/obsValueMax;
        fillColor = getColorSchemeFunction(config.colorScheme)(normalisedValue);
        strokeColor = fillColor
      }
      const textColor = getReadableTextColor(fillColor)
      return new Style({
        text: new Text({
          font: 'bold 13px Calibri,sans-serif',
          text: `${feature.get('name') || sdmxProps?.name || ''}`,
          stroke: new Stroke({
            color: getTextHaloColor(textColor),
            width: 2.5
          }),
          fill: new Fill({
            color: textColor
          })
        }),
        fill: new Fill({
          color: fillColor
        }),
        stroke: new Stroke({
          color: strokeColor
        })
      })
    }
    featuresLayer?.setStyle(styleFunction);
    if (obsValueMax !== 0) {
      legendElement.current!.children[1]!.innerHTML = `${Math.floor(obsValueMin).toLocaleString()} <img src="${getColorSchemePreview(config.colorScheme)}"/> ${Math.ceil(obsValueMax).toLocaleString()} ${indicatorName}`
    }

  }, [config.colorScheme, featuresLayer, obsValueMax, obsValueMin, indicatorName])

  useEffect(() => {
    const displayFeatureInfo = (evt: MapBrowserEvent<UIEvent>) => {
      if (evt.dragging) {
        return;
      }
      const map = evt.map;
      const pixel = map.getEventPixel(evt.originalEvent);
      const features: FeatureLike[] = [];
      map.forEachFeatureAtPixel(pixel, (feature: FeatureLike) => {
        features.push(feature);
      });
      if (features.length > 0) {
        let info: string = "";
        let tableRows: string = "";
        features.forEach((feature: FeatureLike) => {
          const { sdmxProps } = getSDMXPropsForFeature(feature)
          tableRows = dimensions
            .map((dimension: any) => {
              const value = sdmxProps?.[dimension.id]
              if (value === undefined || value === null || value === '') {
                return ''
              }
              return `<tr><td>${dimension.name}</td><td>${value}</td></tr>`
            })
            .filter((row: string) => row !== '')
            .join('')
          info =
            `<table class="${styles.mapTooltipTable}">
              <tbody>
                ${tableRows}
              </tbody>
            </table>`

        })
        if (tableRows === "") {
          tooltipElement.current!.style.display = 'none';
          mapElement.current!.style.cursor = '';
        } else {
          const overlay = map.getOverlayById('tooltip-overlay')
          overlay.setPosition(evt.coordinate);
          tooltipElement.current!.style!.display = 'block';
          const firstFeatureData = getSDMXPropsForFeature(features[0])
          const firstFeatureValue = firstFeatureData.featureValue ?? features[0].get('value') ?? ''
          tooltipElement.current!.children[0]!.innerHTML = `${firstFeatureValue}${unit ? ` ${unit}` : ''}`
          tooltipElement.current!.children[1]!.innerHTML = info

          mapElement.current!.style.cursor = 'pointer';
        }
      } else {
        tooltipElement.current!.style.display = 'none';
        mapElement.current!.style.cursor = '';
      }
    };
    const onPointerMove = (evt: MapBrowserEvent<UIEvent>) => {
      displayFeatureInfo(evt);
    };
    const onClick = (evt: MapBrowserEvent<UIEvent>) => {
      displayFeatureInfo(evt);
    };
    mapRef.current?.on('pointermove', onPointerMove);
    mapRef.current?.on('click', onClick);

    return () => {
      mapRef.current?.un('pointermove', onPointerMove);
      mapRef.current?.un('click', onClick);
    }
  }, [dimensions, unit])

    return (
      <div className={`${config.frame ? "border" : "" }`}>
        <div id={`map-${config.id || 'id'}`} ref={mapElement} className={`map ${styles.minCellHeight}`}></div>
        <div ref={tooltipElement} className={styles.mapTooltip}>
          <div className={styles.mapTooltipHeader} id="map-tooltip-header"></div>
          <div id="map-tooltip-content"></div>
        </div>
        <div ref={legendElement} className={`${styles.mapLegend} ol-control-panel ol-unselectable ol-control`}>
          <div className={styles.legendTitle}></div>
          <div className={styles.legendItem}></div>
        </div>

      </div>

    )
  }

export default MapComponent;
