require(["esri/tasks/query", "dojo/on", "dojo/parser", "esri/renderers/SimpleRenderer", "esri/dijit/BasemapGallery",
     "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color", "esri/dijit/PopupTemplate",
     "dojo/_base/array", "dojo/dom", "dojo/query", "esri/dijit/LocateButton", "esri/layers/ArcGISDynamicMapServiceLayer",
      "esri/layers/FeatureLayer", "esri/geometry/Point", "dojo/dom-style", "dojo/dom-attr",
     "esri/graphic", "esri/layers/GraphicsLayer", "esri/symbols/PictureMarkerSymbol", "esri/dijit/HomeButton",
     "esri/dijit/Scalebar", "esri/layers/GeoRSSLayer", "esri/geometry/Extent", "esri/SpatialReference", "esri/layers/ImageParameters",
     "esri/arcgis/OAuthInfo", "esri/IdentityManager", "esri/dijit/Legend", 
     // Custom Modules
     "javascript/utils/bootstrapmap.min.js", "utils/appCacheManager", "widgets/OfflineWidget",
     "javascript/dist/offline-edit-src.js", "javascript/dist/offline-tiles-advanced-src.js", "dojo/domReady!"],
    function (Query, on, parser, SimpleRenderer, BasemapGallery, SimpleMarkerSymbol, SimpleLineSymbol, Color, PopupTemplate,
		arrayUtils, dom, query, LocateButton, ArcGISDynamicMapServiceLayer, FeatureLayer, Point, domStyle, domAttr,
        Graphic, GraphicsLayer, PictureMarkerSymbol, HomeButton, Scalebar,
		GeoRSSLayer, Extent, SpatialReference, ImageParameters, OAuthInfo, esriId, Legend,  BootstrapMap,
        AppCacheManager, OfflineWidget) {

            var appCacheManager;
            initAppCacheManager();

             function initAppCacheManager(){
                appCacheManager = new AppCacheManager(true,true);
                appCacheManager.on(appCacheManager.CACHE_EVENT,cacheEventHandler);
                appCacheManager.on(appCacheManager.CACHE_ERROR,cacheErrorHandler);
                appCacheManager.on(appCacheManager.CACHE_LOADED,cacheLoaderHandler);
            }

            function cacheLoaderHandler(evt){
                if(evt == appCacheManager.CACHE_LOADED) console.log("Application cache successfully loaded!");
            }

            function cacheEventHandler(evt){
                console.log("CACHE EVENT: " + JSON.stringify(evt));
            }

            function cacheErrorHandler(evt){
                console.log("CACHE ERROR: " + JSON.stringify(evt));
            }

            offlineWidget = new OfflineWidget();
            
            offlineWidget.startup();
            
            //var machine = "http://192.168.0.8"
            // var machine = "http://192.168.42.164"
            // var machine = "http://127.0.0.1"
            // var machine = "http://192.168.1.134";
            var machine = "http://52.0.185.237";
            var serverUrl = machine + "/waadmin/rest/services";
            var mapName = "Utilities";
            var layerIndex = "10";

            var mapExtent = new Extent({
                        xmin: -9104703.725260664,
                        ymin: 3062031.7028226587,
                        xmax: -9097270.224259939,
                        ymax: 3068700.8335405313,
                        spatialReference: {
                            wkid: 3857
                        }
                    });

            var map = BootstrapMap.create("mapDiv", {
                center: [-81.755557, 26.533963],
                zoom: 14,
                sliderStyle: "small",
                logo: false,
                fadeOnZoom: true,
                isScrollWheelZoom: true,
                force3DTransforms: true,
                maxZoom: 19,
                minZoom: 14,
                showLabels: true,
                extent: mapExtent
            });
    
            offlineWidget.map = map;


            
            // Testing taking a feature service offline
            offlineWidget.testUrl = serverUrl + '/' + mapName + '/MapServer';
            offlineWidget.startTest(offlineWidget.init(offlineWidget.initModules()));
            

            function initHomeButton() {
                homeButton = new HomeButton({
                    map: map,
                    visible: true
                }, 'homeButton');
                homeButton.startup();
            }

            function initEsriLocate() {
                esriLocate = new LocateButton({
                    centerAt: true,
                    geolocationOptions: {
                        maximumAge: 0,
                        timeout: 15000,
                        enableHighAccuracy: true
                    },
                    highlightLocation: true,
                    map: map,
                    setScale: true,
                    theme: 'LocateButton',
                    useTracking: true,
                    visible: true
                }, 'esriLocate');
            }

             function initScalebar() {
                scalebar = new Scalebar({
                    map: map,
                    scalebarStyle: "ruler"
                }, dojo.byId('scalebarHousing'));
            }

            function initLegend() {
                legend = new Legend({
                    arrangement: 2,
                    autoUpdate: true,
                    map: map,
                    respectCurrentMapScale: true
            }, "legendDiv");
                $('#legendHousing').on('click', function(e) {
                    if ($('#legendDiv').css('visibility') === 'visible') {
                        $('#legendDiv').css('visibility', 'hidden');
                         $('#legendHousing').css('transform', 'translate(70%, 80%)');
                    } else {
                        $('#legendDiv').css('visibility', 'visible');
                        $('#legendHousing').css('transform', 'translate(0%, 0%)');
                    }
                });

                 legend.startup();
            }

             map.on('load', function(e) {
                 initScalebar();
                 initHomeButton();
                 initEsriLocate();
                 initLegend();
            });
        });
      

       