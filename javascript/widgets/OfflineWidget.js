define(["dojo/_base/declare", "dojo/parser", "dojo/ready",  "dojo/on", "utils/debouncer", "esri/geometry/webMercatorUtils", "esri/tasks/Geoprocessor",
    "dijit/_WidgetBase", "widgets/OfflineMap", "widgets/OfflineTiles", "esri/tasks/FeatureSet", "esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/ImageParameters",
"esri/geometry/Extent", "esri/dijit/PopupTemplate", "esri/geometry/geometryEngine", "esri/layers/FeatureLayer", "esri/geometry/Point",
  "javascript/dist/offline-edit-src.js"], function (declare, parser, ready, on,  debouncer,
 webMercatorUtils, Geoprocessor, _WidgetBase, OfflineMap, OfflineTiles, FeatureSet, ArcGISDynamicMapServiceLayer, ImageParameters, Extent, PopupTemplate, geometryEngine,
 FeatureLayer, Point) { 

     return declare("OfflineWidget", [_WidgetBase], {   

     
             onlineFeatureLayers: [],
             layerUrls: {},
             indexes: [],
             map: "",
             testUrl: "",

            startup: function() {

                this.validateOnline(function(result) {
                    if(result) {
                        _isOnline = true;
                        _isOffline = false;
                        //setUIOnline();
                       
                    }
                    else {
                        _isOnline = false;
                        _isOffline = true;
                        //setUIOffline();
                       
                    }
                    
                });

                 // Service List widget is created with the methods needed to manage multiple map services
                // Also included with the widget are buttons and event listeners to call the custom methods
                Offline.check();
                Offline.on('up down', this.updateState);

                //Make sure map shows up after a browser refresh
                if(Offline.state === 'up') {
                    zoom = 18 ;
                } else {
                    zoom = 17;
                }

                $('#basemapButton').on('mousedown', function(e) {
                    $(this).css('transform', 'scale(1.5, 1.5)');
                });
                $('#basemapButton').on('mouseup', function(e) {
                    $(this).css('transform', 'scale(1.25, 1.25)');
                    offlineWidget.downloadTiles();
                });

          
                
            },

            initModules: function(){
                (function(){
                    offlineWidget.offlineMap = new OfflineMap();
                    offlineWidget.offlineTiles = new OfflineTiles();
                    offlineWidget.offlineMap.startup();
                    offlineWidget.offlineTiles.startup();
                })();
              
            },

            startTest: function(callback) {

                //var clipper = new Geoprocessor("http://127.0.0.1/waadmin/rest/services/RSW_BoundaryClip/GPServer/Clip%202");

                 // var imageParams = new ImageParameters();
                 //    imageParams.bbox = new Extent({
                 //        xmin: -9104703.725260664,
                 //        ymin: 3062031.7028226587,
                 //        xmax: -9097270.224259939,
                 //        ymax: 3068700.8335405313,
                 //        spatialReference: {
                 //            wkid: 102659
                 //        }
                 //    });

                //var url  = this.testUrl + "?token=" + this.token;
                var url  = this.testUrl + '/23';
                // var url  = this.testUrl
                var map = this.map;
               // var jsonurl = url + "&f=json";
                var jsonurl = url + "?f=json";
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.open('GET', jsonurl, false);
                xmlhttp.send();
                var rawresponse = xmlhttp.response;
                var response = JSON.parse(rawresponse);
                var err = 0;

                if (response.type === "Feature Layer") {

                    // create the field info array for the feature layer
                    var fieldinfo = [];
                    var fields = response.fields;
                    var count;
                   
                    for (count=0; count < fields.length; count ++) {
                        
                        var f = fields.shift();
                        var entry = {
                            fieldName: f.name,
                            label: f.alias,
                            visible: true
                        };

                        fieldinfo.push(entry);
                    }

                    
                    var popupTemplate = new PopupTemplate({
                        title: response.name,
                        fieldInfos: fieldinfo
                    });


                    this.testLayer = new FeatureLayer(url, {
                         mode: FeatureLayer.ON_DEMAND,
                         outFields: ["*"],
                         infoTemplate: popupTemplate
                     });
                   
                   map.addLayer(this.testLayer);
                   offlineWidget._listener = this.testLayer.on('update-end', function(e) {

                        // clipper.outSpatialReference = this.testLayer.SpatialReference;
                        // clipper.processSpatialReference = this.testLayer.SpatialReference;
                        
                        //  var inFeatureSet = new FeatureSet();
                        // inFeatureSet.features = this.graphics;

                        // clipper.submitJob({
                        //      in_features : inFeatureSet
                        // }, completeCallback, statusCallback, errCallback);

                        // function completeCallback(jobInfo) {
                        //     console.log(jobinfo)
                        //     clipper.getResultImagerLayer(jobInfo.job.id, "out_feature_class", imageParams, function(gpLayer) {
                        //         map.removeLayer(offlineWidget.testLayer);
                        //         map.addLayer(gpLayer);
                        //         gpLayer.on('update-end', function(e) {
                        //             //offlineWidget.initFeatureUpdateEndListener;
                        //         });
                        //     });
                        // }

                        // function statusCallback(jobInfo) {
                        //     console.log(jobInfo)
                        // }

                        // function errCallback(err) {
                        //     console.log(err)
                        // }
                        offlineWidget.initFeatureUpdateEndListener();
                    });

                 } else if (response.error !== undefined) {
                    offlineWidget.offlineFeaturesManager = new O.esri.Edit.OfflineFeaturesManager();
                    
                     offlineWidget.loadFeatureLayerOffline(function(success) {
                        console.log("Unable to Reach GIS Server, offline features added to map");
                    });

                 } else {
                   
                    this.mapServiceLayer = new ArcGISDynamicMapServiceLayer(url, {
                        visible: false
                    });
                  
                    map.addLayer(this.mapServiceLayer);

                    this.mapServiceLayer.show();
                }
                 
                 
                },

            init: function(callback) {
                var map = this.map;
                var tileLayer = this.offlineTiles.tileLayer;
                map.addLayer(tileLayer);

                map.on('layer-add-result', function() {
                    (function initSplashPage() {
                        var intro = $("#splashPage");
                        var mapPage = $(".container-fluid");
                        
                        mapPage.css('visibility', 'visible');
                        mapPage.css('opacity', 1);
                        intro.css('opacity', 0);
                        intro.css('visibility', 'hidden');
                    })();
                });
                this.offlineMap.initEvents();
                
             },
         //////////////////////////////////////
        ///Online Offline Methods//
       //////////////////////////////////////
            updateState: function(){
                var tileLayer = offlineWidget.offlineTiles.tileLayer;
                var offlineFeaturesManager = this.offlineFeaturesManager;

                if(Offline.state === 'up'){
                    //updateOfflineUsage();
                    offlineWidget.toggleStateUp(true);
                    if(typeof tileLayer != "undefined") tileLayer.goOnline();
                }
                else{
                    offlineWidget.toggleStateUp(false);
                    if(typeof tileLayer != "undefined") tileLayer.goOffline();
                }
            },

            toggleStateUp: function (state){
                var tileLayer = offlineWidget.offlineTiles.tileLayer;
                var offlineFeaturesManager = this.offlineFeaturesManager;

                if(state){
                    tileLayer.goOnline();
                    offlineFeaturesManager.goOnline();
                    $("#btn-online-offline").innerHTML = "Go Offline";
                }
                else{
                    $("#btn-online-offline").innerHTML = "Go Online";
                    tileLayer.goOffline();
                    this.offlineFeaturesManager.goOffline();
                    
                }
            },

              /**
             * Attempts an http request to verify if app is online or offline.
             * Use this in conjunction with the offline checker library: offline.min.js
             * @param callback
             */
            validateOnline: function(callback) {
                    var req = new XMLHttpRequest();
                    req.open("GET", "http://esri.github.io/offline-editor-js/samples/images/blue-pin.png?" + (Math.floor(Math.random() * 1000000000)), true);
                    req.onload = function() {
                        if( req.status === 200 && req.responseText !== "") {
                            req = null;
                            callback(true);
                        }
                        else {
                            console.log("verifyOffline failed");
                            req = null;
                            callback(false);
                        }
                    };
                    req.onerror = function(e) {
                        console.log("verifyOnline failed: " + e);
                        callback(false);
                    };
                    req.send(null);

                },
            ////////////////////////////////////
            //Tile Layer Functions////
            ////////////////////////////////////
             
            updateOfflineUsage: function() {
                 {
                    var tileLayer = this.offlineTiles.tileLayer;
                }
            },

            updateMinMaxLayerInfo: function(){
                    var map = this.map;
                    var tileLayer = this.offlineTiles.tileLayer;

                    var zoomLevel = map.getLevel();
                    dojo.byId('currentLevel').value = zoomLevel;
                    var low = Math.max(tileLayer.minLevel, zoomLevel - 3);
                    var high = Math.min(tileLayer.maxLevel, zoomLevel + 4);
                    dojo.byId('minLevel').value = low;
                    dojo.byId('maxLevel').value = high;
                },

             /**
             * Forces offlineTileEnabler to go online or offline.
             * If it is offline it will try to find a tile in the local database.
             */
            goOnlineOffline: function(){
                var btn = document.getElementById('state-span');
                if(btn.innerHTML == " Up"){
                    toggleStateUp(false);
                    console.log("Map is offline");
                }
                else{
                    toggleStateUp(true);
                    console.log("Map is online");
                }
            }, 

             /**
             * Manually starts the process to download and store tiles
             * in the local database
             */
            downloadTiles: function(){
                var tileLayer = this.offlineTiles.tileLayer;
                var minZoomAdjust = this.offlineTiles.minZoomAdjust;
                var maxZoomAdjust = this.offlineTiles.maxZoomAdjust;
                var EXTENT_BUFFER = this.offlineTiles.EXTENT_BUFFER;
                var map = this.map;

                tileLayer.deleteAllTiles(function(success,err){
                    if(success === false){
                        alert("There was a problem deleting the tile cache");
                    }
                    else{
                        console.log("success deleting tile cache");
                        var self = this.data;

                        if( offlineWidget.downloadState == 'downloading')
                        {
                            console.log("cancel!");
                            _wantToCancel = true;
                            $('#basemapButton').attr('src', "images/LayerBasemap32.png");


                         
                        }
                        else
                        {
                            var zoom = tileLayer.getMinMaxLOD(minZoomAdjust,maxZoomAdjust);

                            var extent = tileLayer.getExtentBuffer(EXTENT_BUFFER,map.extent);
                            _wantToCancel = false;
                             var message = "<span id='message' style='z-index: 100; position: absolute; top: 0px; right: 5px; font: black; arial; text-shadow: 1px 1px 3px white'>downloading tiles...</span>";
                            $('#navbar' ).append(message);
                            tileLayer.prepareForOffline(zoom.min, zoom.max, extent, offlineWidget.reportProgress.bind(this));
                            offlineWidget.downloadState = 'downloading';
                            $('#basemapButton').attr('src', "images/loading.gif");
                        }
                    }
                }.bind(this));
            },

            /**
             * Reports the process while downloading tiles.
             */
            reportProgress: function(progress)
            {
            
               
                if(progress.hasOwnProperty("countNow")){
                 
                  
                }

                if( progress.finishedDownloading )
                {
                    $('#navbar > span').remove();
                    if( progress.cancelRequested )
                    {
                        offlineWidget.downloadState = 'cancelled';
                        alert("Tile download was cancelled");
                    }
                    else
                    {
                        offlineWidget.downloadState = 'downloaded';
                      
                        alert("Tile download complete");
                        $('#basemapButton').attr('src', "images/LayerBasemap32.png");
                    }

            
                }
                return _wantToCancel; //determines if a cancel request has been issued
            },


           

            clearMap: function() {
                var map = this.map;
                var graphicIds = map.graphicsLayerIds;
                var mapIds = map.layerIds;
                var totalIds = mapIds.concat(graphicIds);
                if (totalIds.length > 1) {
                    for (i=1; i < totalIds.length; i++) {
                        var layer = map.getLayer(totalIds[i]);
                        map.removeLayer(layer);
                    }
                }
            },

            displayMap: function() {
                var map = this.map;
                var layer = this.serviceList.mapServiceLayer;
                map.addLayer(layer);
            },

            updateLocalStorage: function() {
                var map = offlineWidget.map;
                var zoom = map.getZoom();
                var extent = JSON.stringify(map.extent);

                if (typeof (Storage) !== "undefined") {
                    localStorage.offlineZoom = zoom;
                    localStorage.offlineExtent = extent;
                    console.log("Done updating zoom and extent to localStorage.");
                } else {
                    alert("The offline library is not supported on this browser.");
                }
            },
         
              ///////////////////////////////////////////
             /// Offline Feature Functions//
            ///////////////////////////////////////////

            initFeatureUpdateEndListener: function() {

                   offlineWidget._listener.remove();

                    //**************************************************
                    //
                    // This is where we detect an offline condition
                    // within the lifecycle of the "mapping" application.
                    // If we are offline then run our offline
                    // specific code for reconstituting our map.
                    //
                    //**************************************************

                    //
                    // Extend the feature layer with offline capabilities.
                    //

                    offlineWidget.initOfflineFeaturesMgr();

                    // If app is online then we ONLY need to extend the feature layer.
                    if(_isOnline === true){
                       offlineWidget.extendFeatureLayer(true, function(success) {
                            if(success){

                              offlineWidget.initPanZoomListeners();

                            }
                            else{
                                alert("There was a problem initializing the map for offline.");
                            }
                        });
                    }
                    // If the app is offline then we need to retrieve the dataStore from OfflineFeaturesManager
                    // and then extend the feature layer using that information.
                    else {
                        offlineWidget.loadFeatureLayerOffline(function(success) {
                            if(success) {
                                offlineWidget.extendFeatureLayer(_isOnline, function(success) {
                                    console.log("Feature Layer extended successfully OFFLINE!");
                                });
                            }
                            else {
                                alert("There was a problem initializing the map for offline.");
                            }
                        });
                    }

                },

                 /**
                 * **********************************************
                 * EVENT LISTENER MANAGEMENT CODE
                 * **********************************************
                 */

                /**
                 * When panning or zooming let's update certain properties in our offline featureLayerJSON dataStore. offlineWidget
                 * dataStore is available once a feature layer has been extended.
                 */
                initPanZoomListeners: function () {
                    offlineWidget.updateOfflineUsage();
                    this.updateStatus();
                    var map = this.map;

                    map.on("zoom-end",function(evt) {
                        _currentExtent = evt.extent;
                        offlineWidget.updateFeatureLayerJSON();
                    });

                    map.on("pan-end",function(evt) {
                        _currentExtent = evt.extent;
                        offlineWidget.updateFeatureLayerJSON();
                    });
                },

                 /**
                 * Load the feature while offline using information stored in database
                 */
                loadFeatureLayerOffline: function (callback) {
                    this.offlineFeaturesManager.getFeatureLayerJSONDataStore(function(success,dataStore) {
                        if(success){


                            // Use the feature layer returns from getFeatureDefinition() to reconstitute the layer
                            // We don't have to set any other properties on the layer because we are using it
                            // in SNAPSHOT mode which downloads all features within the given extent.
                            var testLayer = new FeatureLayer(JSON.parse(dataStore.featureLayerCollection));

                             // create the field info array for the feature layer
                            var fieldinfo = [];
                            var fields = testLayer.fields;
                            var count;
                           
                            for (count=0; count < fields.length; count ++) {
                                
                                var f = fields.shift();
                                var entry = {
                                    fieldName: f.name,
                                    label: f.alias,
                                    visible: true
                                };

                                fieldinfo.push(entry);
                            }

                            
                            var popupTemplate = new PopupTemplate({
                                title: testLayer.name,
                                fieldInfos: fieldinfo
                            });

                            if(testLayer.url === null){
                                testLayer.url = dataStore.featureLayerUrl;
                            }

                            testLayer.infoTemplate = popupTemplate;

                            offlineWidget.map.addLayer(testLayer);

                            console.log("Feature has been added back to the map while offline.");
                           
                           
                            offlineWidget.map.centerAt(dataStore.centerPt);
                            offlineWidget.map.setZoom(dataStore.zoom);

                            callback(true);
                        }
                        else{
                            alert("There was a problem retrieving feature layer options object. " + dataStore);
                            callback(false);
                        }
                    });
                },

                /**
                 * **********************************************
                 * FEATURE LAYER MANAGEMENT CODE
                 * **********************************************
                 */

                 initOfflineFeaturesMgr: function(callback) {
                    offlineWidget.offlineFeaturesManager = new O.esri.Edit.OfflineFeaturesManager();
                    var offlineFeaturesManager = offlineWidget.offlineFeaturesManager;
                    // IMPORTANT!!!
                    // This tells the database which graphic.attribute property to use as a unique identifier
                    // You can look this information up in your feature service directory under the "Fields" category.
                    // Example: http://services1.arcgis.com/M8KJPUwAXP8jhtnM/arcgis/rest/services/Denver_Bus_Stops/FeatureServer/0
                    offlineFeaturesManager.DB_UID = "OID";
                    if (_isOffline) {
                        offlineFeaturesManager.ENABLE_FEATURECOLLECTION = true;
                    } else {
                        _isOnline = true;
                        _isOffline = false;
                        offlineFeaturesManager.ENABLE_FEATURECOLLECTION = false;
                    }

                    // IMPORTANT!!!
                    // A proxy page may be required to upload attachments.
                    // If you are using a CORS enabled feature service you can ignore this.
                    // If your feature service is not CORS-enabled then you will need to configure this.
                    // Refer to "Using the Proxy Page" for more information:  https://developers.arcgis.com/en/javascript/jshelp/ags_proxy.html
                    offlineFeaturesManager.proxyPath = null;

                    offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_ENQUEUED, offlineWidget.updateStatus);
                    offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_SENT, offlineWidget.updateStatus);
                    offlineFeaturesManager.on(offlineFeaturesManager.events.ALL_EDITS_SENT, offlineWidget.updateStatus);
                    offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_SENT_ERROR, offlineWidget.editsError);
                },

                extendFeatureLayer: function (online,callback){
                    var featureLayerJSON = null;
                    var testLayer = offlineWidget.testLayer;
                    var offlineFeaturesManager = offlineWidget.offlineFeaturesManager;
                    
                    if(_isOnline) {

                        // This object contains everything we need to restore the map and feature layer after an offline restart
                        //
                        // There are two caveats:
                        // First, you cannot use the object key 'id'. That's a reserved key for internal offline library use.
                        // Second, complex objects need to be serialized or you'll get a database cloning error.
                        //
                        // We do not want to (re)set this if are offline. We can modify it but we don't want to overwrite it.
                        featureLayerJSON = offlineWidget.getFeatureLayerJSON();
                        this.featureLayerJSON = featureLayerJSON;
                    }

                    // NOTE: if app is offline then we want the dataStore object to be null
                    this.offlineFeaturesManager.extend(testLayer,function(result, error) {
                        if(result) {
                            console.log("offlineFeaturesManager initialized.");

                            // This sets listeners to detect if the app goes online or offline.
                            Offline.on('up', offlineWidget.goOnline);
                            Offline.on('down', offlineWidget.goOffline);

                                // If the app is online then force offlineFeaturesManager to its online state
                                // This will force the library to check for pending edits and attempt to
                                // resend them to the Feature Service.
                                if(_isOnline){
                                    offlineFeaturesManager.goOnline(function(result){
                                        if(!result.success){
                                            alert("There was a problem when attempting to go back online.");
                                        }
                                        else {
                                            offlineWidget.updateStatus();
                                        }
                                    });
                                }
                                else {
                                    offlineWidget.offlineFeaturesManager.goOffline();
                                    offlineWidget.updateStatus();
                                }

                            callback(true);
                        }
                        else {
                            callback(false);
                            alert("Unable to initialize the database. " + error);
                        }
                    }.bind(this),/* This is the optional offline configuration property */featureLayerJSON);
                },

                getFeatureLayerJSON: function () {
                        var testLayer = this.testLayer;
                        var map = this.map;
                    return {
                        "featureLayerCollection": JSON.stringify(testLayer.toJson()),
                        "zoomLevel": map.getZoom(),
                        "centerPt" : (map.extent.getCenter()).toJson(),
                        "featureLayerUrl": testLayer.url
                    };
                },

                updateFeatureLayerJSON: function () {
                    var testLayer = this.testLayer;
                    var fl = offlineWidget.getFeatureLayerJSON();
                    testLayer.setFeatureLayerJSONDataStore(fl,function(result,error){
                        console.log("updateFeatureLayerJSON - Result: " + result + ", error: " + error);
                    });
                },

                goOnline: function () {
                    var testLayer = this.testLayer;
                    var tileLayer = this.offlineTiles.tileLayer;
                    console.log("Going online...");

                    if(testLayer && testLayer.offlineExtended) {

                    }

                    offlineWidget.offlineFeaturesManager.goOnline(function(success,error) {
                        if(error === undefined) {
                            offlineWidget.setUIOnline();
                            console.log("offlineFeatureManager is online.");
                        }
                        else {
                            alert("There was a problem syncing offline edits: " + JSON.stringify(error));
                        }

                    });

                    offlineWidget.updateOfflineUsage();
                    if(typeof tileLayer != "undefined") tileLayer.goOnline();
                },

                 /**
                 * Forces offlineFeaturesManager offline
                 */
                 goOffline: function() {
                    var tileLayer = offlineWidget.offlineTiles.tileLayer;
                    console.log("Going offline...");
                    offlineWidget.setUIOffline();
                    offlineWidget.offlineFeaturesManager.goOffline();
                    if(typeof tileLayer != "undefined") tileLayer.goOffline();
                },

                setUIOnline: function () {
                    // var menu = offlineWidget.offlineMenu;
                    // menu.btnOnlineOffline[0].innerHTML = "Go Offline";
                    // menu.imgOfflineIndicator[0].className = "glyphicon glyphicon-link";
                    // menu.imgOfflineIndicator[0].innerHTML = " Up";
                    // menu.btnState[0].className = "btn btn-success btn-large floatRight";
                },

                setUIOffline: function () {
                    // var menu = offlineWidget.offlineMenu;
                    // menu.btnOnlineOffline[0].innerHTML = "Go Online";
                    // menu.imgOfflineIndicator[0].className = "glyphicon glyphicon-thumbs-down";
                    // menu.imgOfflineIndicator[0].innerHTML = " Down";
                    // menu.btnState[0].className = "btn btn-danger btn-large floatRight";
                },

                 /**
                 * ***********************************************
                 * OFFLINE FEATURE MANAGER - EVENT MANAGEMENT CODE
                 * ***********************************************å
                 */

                editsError:  function (evt) {
                    alert("There was a problem. Not all edits were synced with the server. " + JSON.stringify(evt));
                },

               updateStatus:  function () {
                    var testLayer = this.testLayer;
                 
                }
        });
});