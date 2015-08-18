define("dojo/_base/declare", "dojo/parser", "dojo/ready",  "dojo/on", "dojo/_base/array", "dojo/dom", "dojo/dom-construct",
 "dojo/dom-class", "dojo/Deferred", "dojo/promise/all",  "esri/geometry/webMercatorUtils", "esri/tasks/Geoprocessor",
    "dijit/_WidgetBase", "esri/tasks/FeatureSet","esri/layers/ArcGISDynamicMapServiceLayer",
     "esri/layers/ImageParameters", "esri/geometry/Extent", "esri/layers/FeatureLayer", "esri/arcgis/utils",
     "esri/graphicsUtils", "esri/geometry/geometryEngine", "esri/tasks/query", "esri/tasks/QueryTask",
      "esri/geometry/Point", "esri/geometry/Polygon", "esri/layers/LabelLayer", "esri/renderers/SimpleRenderer",
       "esri/renderers/smartMapping", "esri/symbols/TextSymbol", "esri/request",  "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", 
       "esri/Color"], function(declare, parser, ready on, arrayUtils, dom, domConstruct, domClass, deferred, all, webMercatorUtils, Geoprocessor,
                               _WidgetBase, FeatureSet, ArcGISDynamicMapServiceLayer, ImageParameters, Extent, FeatureLayer, arcgisUtils, graphicsUtils,
                               geometryEngine, Query, QueryTask, Point, Polygon, LabelLayer, SimpleRenderer, smartMapping, TextSymbol, esriRequest, SimpleFillSymbol, 
                               SimpleLineSymbol) {

           return declare("addGraphics", [_WidgetBase], {

                    labelLayer: function(inlayer, callback) {
                            var label = new TextSymbol().setColor(new Color("#666"));
                            label.font.setSize("14pt.");
                            label.font.setFamily("arial");
                            var mainRenderer = new SimpleRenderer(label);
                            var mainLabel = new LabelLayer({ id: "labels" });
                            mainLabel.addFeatureLayer(layer, mainRenderer, "{Material Class}");
                            callback(mainLabel);    
                    },

                    addSmartMapping: function(map, layer, callback) {
                          smartMapping.createTypeRenderer({
                                basemap: 'streets',
                                field: "Subtype",
                                layer: layer,
                                numTypes: -1,
                                theme: 'default'
                            }).then(function(typeRenderer) {
                                layer.setRenderer(typeRenderer.renderer);
                                callback(layer);
                            });
                    },

                    addClassificationSymbols: function(inlayer) {

                    },

                    addProportianalSymbols: function(inlayer) {

                    },

                    Colors: {},

                    Lines: {},

                    Circles: {},

                    Polygons: {},

                    Points: {},

                    Markers: {},

                    fillSymbols: {},

                    
                                    
