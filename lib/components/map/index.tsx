import { useState, useRef, useEffect } from 'react';
// @ts-ignore
import { SDMXParser } from 'sdmx-json-parser';

import Map from 'ol/Map';
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import GeoJSON from 'ol/format/GeoJSON'
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


import {interpolateBlues, interpolateGreens, interpolateGreys, interpolateOranges, interpolatePurples, interpolateReds, interpolateBrBG, interpolatePRGn, interpolatePiYG, interpolatePuOr, interpolateRdGy, interpolateRdYlBu, interpolateRdYlGn, interpolateSpectral, interpolateTurbo, interpolateViridis } from 'd3-scale-chromatic';
import Control from 'ol/control/Control';
import { parseDataExpr } from '../../utils/parseDataExpr';
import { Polygon } from 'ol/geom';
import { parseTextExpr } from '../../utils/parseTextExpr';
import { SDMXVisualConfig } from '../types';

const MapComponent = ({config, language} : {config: SDMXVisualConfig, language : string}) => {
  // set intial state - used to track references to OpenLayers 
  //  objects for use in hooks, event handlers, etc.
  const [ featuresLayer, setFeaturesLayer ] = useState<VectorLayer<VectorSource>>()
  const [ obsValueMin, setObsValueMin ] = useState<number>(1e9)
  const [ obsValueMax, setObsValueMax ] = useState<number>(0)

  const [ dimensions, setDimensions ] = useState<any[]>([])

  // get ref to div element - OpenLayers will render into this div
  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map|null>(null)
  const tooltipElement = useRef<HTMLDivElement>(null)
  const legendElement = useRef<HTMLDivElement>(null)
    

  useEffect(() => {
    let titleText = config.title?'Loading...':'';

    const sdmxParser = new SDMXParser();
    const dataObjs = parseDataExpr(config.data);
    if(dataObjs.length > 1) {
      throw new Error('Multiple data expressions are not supported for Value component');
    }
    const dataObj = dataObjs[0];

    let geojsonProj = get(dataObj.geojsonProjection);
    
    // create map
    let mapProj: Projection|null = null 
    if (mapElement.current && !mapRef.current) {
      if (!geojsonProj) {
        // special case for map centered in the Pacific with EPSG:3832
        if (dataObj.geojsonProjection === 'EPSG:3832') {
          proj4.defs( "EPSG:3832", "+proj=merc +lon_0=150 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs" ); 
          register(proj4);
          geojsonProj = get("EPSG:3832");
          if (geojsonProj) {
            const epsg3857 = get('EPSG:3857')
            if (epsg3857) {
              geojsonProj?.setExtent(epsg3857?.getExtent());
            }
            geojsonProj?.setGlobal(true);
          }
          mapProj = geojsonProj
        }
      }
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
              projection: mapProj || 'EPSG:3857'
          })
      })
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
    } else {
      mapProj = mapRef.current?.getView().getProjection() || null
    }


    const dataFlowUrl = dataObj.dataFlowUrl;
    sdmxParser.getDatasets(dataFlowUrl, {
        headers: new Headers({
            Accept: "application/vnd.sdmx.data+json;version=2.0.0",
            "Accept-Language": language
        })
    }).then(() => {
      const data = sdmxParser.getData();
      const _dim = sdmxParser.getDimensions();
      setDimensions(_dim)

      if(typeof config.title == 'string') {
        titleText = parseTextExpr(config.title, dimensions)
      } else if (typeof config.title === 'object') {
          titleText = typeof config.title.text == 'string'? parseTextExpr(config.title.text, dimensions) : parseTextExpr(config.title.text[language], dimensions)
      }

      // create and add vector source layer
      const vectorSource = new VectorSource({
          format: new GeoJSON(),
          loader: () => {
            const url = dataObj["geojsonUrl"];
            fetch(url).then((response) => response.json()).then((response) => {
              const features = new GeoJSON().readFeatures(response, {
                dataProjection: geojsonProj || 'EPSG:3857',
                featureProjection: mapProj || 'EPSG:3857',
                
              })
              let min = obsValueMin
              let max = obsValueMax 
              const geoDimension = _dim.find((dimension: any) => dimension.id === dataObj.dataFlowKey)
              geoDimension.values.forEach((geoValue: any) => {
                const featureLike = features?.find((feat: FeatureLike) => feat.getProperties()[dataObj.geojsonKey] === geoValue['id'])
                // we continue if features does not contain the geoValue
                if (!featureLike) {
                  return
                }
                const feature = featureLike as Feature<Polygon>
                const sdmxData = data.find((valData : any) => valData[dataObj.dataFlowKey] === geoValue.name)
                // we continue if data does not contain the geoValue
                if (!sdmxData) {
                  return
                }
                sdmxData['name'] = sdmxData[dataObj.dataFlowKey]
                feature?.setProperties({...sdmxData, ...feature.getProperties()})
                if (feature) {
                  vectorSource.addFeature(feature)
                }
                // update obsValueMin and obsValueMax for color scales
                const obsValue = sdmxData['value']
                if (max < obsValue){
                  max = obsValue
                }
                if (min > obsValue) {
                  min = obsValue
                }
              })
              setObsValueMax(max)
              setObsValueMin(min)
            })
          },
          url: dataObj["geojsonUrl"]
      })

      vectorSource.on('featuresloadend', (event) => {
        console.log(event)
      })
      const initalFeaturesLayer = new VectorLayer({
          source: vectorSource,
      })

      setFeaturesLayer(initalFeaturesLayer)
      mapRef.current?.addLayer(initalFeaturesLayer)

      legendElement.current!.children[0]!.innerHTML = titleText


    });
  }, [config, language])

  useEffect(() => {
    const getColorSchemePreview = () => {
      const magicWand : { [K: string] : string} = {
        Blues: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Blues.png",
        BrBg: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/BrBG.png",
        Greens: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Greens.png",
        Greys: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Greys.png",
        Oranges: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Oranges.png",
        PRGn: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/PRGn.png",
        PiYG: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/PiYG.png",
        PuOr: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/PuOr.png",
        Purples: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Purples.png",
        RdGy: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/RdGy.png",
        RdYlBu: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/RdYlBu.png",
        RdYlGn: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/RdYlGn.png",
        Reds: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/Reds.png",
        Spectral: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/spectral.png",
        Turbo: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/turbo.png",
        Viridis: "https://raw.githubusercontent.com/d3/d3-scale-chromatic/master/img/viridis.png"
      }
      const colorScaleName = config.colorScheme || "Greens"
      return magicWand[colorScaleName]
    }
    const getColorSchemeFunction = () => {
      const magicWand : { [K: string] : Function} = {
        Blues: interpolateBlues,
        BrBg: interpolateBrBG,
        Greens: interpolateGreens,
        Greys: interpolateGreys,
        Oranges: interpolateOranges,
        PRGn: interpolatePRGn,
        PiYG: interpolatePiYG,
        PuOr: interpolatePuOr,
        Purples: interpolatePurples,
        RdGy: interpolateRdGy,
        RdYlBu: interpolateRdYlBu,
        RdYlGn: interpolateRdYlGn,
        Reds: interpolateReds,
        Spectral: interpolateSpectral,
        Turbo: interpolateTurbo,
        Viridis: interpolateViridis
      }
      const colorScaleName = config.colorScheme || "Greens"
      return magicWand[colorScaleName]
    }
    const styleFunction = (feature: FeatureLike) => {
      
      let fillColor = 'transparent';
      if(feature.get('value')) {
        const normalisedValue = (feature.get('value') - obsValueMin)/obsValueMax;
        fillColor = getColorSchemeFunction()(normalisedValue);
      }
      return new Style({
        text: new Text({
          font: '13px Calibri,sans-serif',
          text: `${feature.get('name')}`,
          fill: new Fill({
            color: 'white'
          })
        }),
        fill: new Fill({
          color: fillColor
        }),
        stroke: new Stroke({
          color: 'white'
        })
      })
    }
    featuresLayer?.setStyle(styleFunction);
    if (obsValueMax !== 0) {
      legendElement.current!.children[1]!.innerHTML = `${Math.floor(obsValueMin).toLocaleString()} <img src="${getColorSchemePreview()}"/> ${Math.ceil(obsValueMax).toLocaleString()}`
    }

  }, [config.colorScheme, featuresLayer, obsValueMax, obsValueMin])

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
        const info: any[] = [];
        features.forEach((feature: FeatureLike) => {
          const others = dimensions.map((dimension: any) => {
            return `${dimension.name} : ${feature.get(dimension.id)}`
          })
          info.push(`<p>${feature.get('value')}</p><small>(${others})</small>`);

        })
        const overlay = map.getOverlayById('tooltip-overlay')
        overlay.setPosition(evt.coordinate);
        tooltipElement.current!.style!.display = 'block';
        tooltipElement.current!.children[0]!.innerHTML = features[0].get(config.legend.concept)
        tooltipElement.current!.children[1]!.innerHTML = info.join('\n')
    
        mapElement.current!.style.cursor = 'pointer';
      } else {
        tooltipElement.current!.style.display = 'none';
        mapElement.current!.style.cursor = '';
      }
    };
    mapRef.current?.on('pointermove', (evt: MapBrowserEvent<UIEvent>) => {
      displayFeatureInfo(evt);
    });
    
    mapRef.current?.on('click',  (evt: MapBrowserEvent<UIEvent>) => {
      displayFeatureInfo(evt);
    });
  }, [dimensions])
    
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