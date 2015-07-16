define(["dojo/_base/declare","dojo/_base/array","dojo/parser", "dojo/ready",  "dojo/on", "utils/debouncer", "esri/geometry/webMercatorUtils", "esri/tasks/Geoprocessor",
    "dijit/_WidgetBase", "widgets/OfflineMap", "widgets/OfflineTiles", "esri/tasks/FeatureSet", "esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/ImageParameters",
"esri/geometry/Extent", "esri/dijit/PopupTemplate", "esri/layers/FeatureLayer", "esri/geometry/Point", "javascript/dist/offline-edit-src.js"], function (declare,
arrayUtils, parser, ready, on,  debouncer, webMercatorUtils, Geoprocessor, _WidgetBase, OfflineMap, OfflineTiles, FeatureSet, ArcGISDynamicMapServiceLayer, ImageParameters,
 Extent, PopupTemplate, FeatureLayer, Point, PopupMobile, domConstruct, SimpleFillSymbol, SimpleLineSymbol, Color) { 

     return declare("OfflineWidget", [_WidgetBase], {   

     
             layerUrls: {},
             indexes: [],
             map: "",
             testUrls: [],
            
            startup: function(callback) {

                var validate = function(callback) {
                    offlineWidget.validateOnline(function(result) {
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
                        callback(true);
                    });
                    
                };

                validate(function(e) {
                    Offline.check();
                });
                
                Offline.on('up down', offlineWidget.updateState);

                //Make sure map shows up after a browser refresh
                if(Offline.state === 'up') {
                    zoom = 18 ;
                } else if (localStorage.offlineZoom !== undefined) {
                    zoom = localStorage.offlineZoom;
                }

                $('#basemapButton, #clearButton').on('mousedown', function(e) {
                    e.preventDefault();
                    $(this).css('transform', 'scale(1.5, 1.5)');
                });

                $('#basemapButton').on('mouseup', function(e) {
                    $(this).css('-webkit-transform', 'scale(1.25, 1.25)');
                    offlineWidget.downloadTiles();
                    offlineWidget.initFeatureUpdateEndListener();
                   });

                $('#clearButton').on('mouseup', function(e) {
                    $(this).css('-webkit-transform', 'scale(1.25, 1.25)');
                        var DB_NAME = 'features_store';
                        var DB_STORE_NAME = 'features';
                        var db;

                        var openDb = function (params, callback) {
                            request = indexedDB.open(DB_NAME);
                            request.onsuccess = function(event) {
                              db = event.target.result;
                              callback(db);
                            };
                        };

                        var getObjectStore = function (store_name, mode) {
                            var tx = db.transaction(store_name, mode);
                            return tx.objectStore(store_name);
                          }

                        var clearObjectStore = function (store_name) {
                            var store = getObjectStore(DB_STORE_NAME, 'readwrite');
                            var req = store.clear();
                            req.onsuccess = function(evt) {
                              console.log("Store cleared");
                            };
                            req.onerror = function (evt) {
                              console.error("clearObjectStore:", evt.target.errorCode);
                            };
                        }

                        openDb(null, function(e) {
                            db = db;
                            clearObjectStore('features_store');
                        });
                    });
            },

            initModules: function(params, callback){
                    offlineWidget.offlineMap = new OfflineMap();
                    offlineWidget.offlineTiles = new OfflineTiles();
                    offlineWidget.offlineMap.startup();
                    offlineWidget.offlineTiles.startup();
                    callback(true);
            },

            startTest: function(param, callback) {

                var map = this.map;
                var featureUrls = this.testUrls;

                var fireEvent = function(name, data) {
                  var e = document.createEvent("Event");
                  e.initEvent(name, true, true);
                  e.data = data;
                  window.dispatchEvent(e);
                };

                var fetch = function(inputUrl, callback) {

                    var xmlhttp = new XMLHttpRequest();
                    var maxWaitTime = 5000;
                    var noResponseTimer = setTimeout(function() {
                        xmlhttp.abort();
                        callback('failed');
                        return
                    }, maxWaitTime);
                
                    xmlhttp.onreadystatechange = function() {
                        var status = xmlhttp.status;
                        if (this.readyState != 4) {
                            return
                        } 

                        if (this.readyState == 4 && this.status == 200) {
                            fireEvent("goodconnection", {});
                            clearTimeout(noResponseTimer);
                            var rawresponse = xmlhttp.response;
                            var response = JSON.parse(rawresponse);
                            console.log(response);
                            callback(response);
                        } else {
                            fireEvent("connectionerror", {});
                        }
                    }
                    
                    xmlhttp.open('GET', inputUrl, false);
                    xmlhttp.send();

                }

                window.addEventListener("connectionerror", function(e) {
                  alert("There is a connection error");
                });

                window.addEventListener("goodconnection", function(e) {
                  console.log("There is a good connection");
                });

                var layerHolder = [];
                arrayUtils.forEach(featureUrls, function(item) {
                    jsonUrl = item + '?f=json';
                    fetch(jsonUrl, function(response) {
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
                        };

                        var popupTemplate = new PopupTemplate({
                            title: response.name,
                            fieldInfos: fieldinfo
                        });


                        var xxx = new FeatureLayer(item, {
                             mode: FeatureLayer.ON_DEMAND,
                             outFields: ["*"],
                             infoTemplate: popupTemplate,
                         });
                       
                       layerHolder.push(xxx);
                       // map.addLayer(xxx);
                       // offlineWidget._listener = testLayer.on('update-end', function(e) {
                       //      if (e.error != undefined) {
                       //          map.removeLayer(offlineWidget.testLayer);
                       //          _isOffline = true;
                       //          _isOnline = false;
                       //      }
                            
                       //      offlineWidget.initFeatureUpdateEndListener();
                       //  });

                     } else if (response.mapName !== undefined) {
                   
                    // offlineWidget.mapServiceLayer = new ArcGISDynamicMapServiceLayer(url, {
                    //     visible: false
                    // });
                  
                    // map.addLayer(offlineWidget.mapServiceLayer);

                    // offlineWidget.mapServiceLayer.show();

                    } else if (response === "failed") {
                        _isOnline = false;
                        _isOffline = true;
                        // offlineWidget.initFeatureUpdateEndListener();
                        } 
                    });
                });

                map.addLayers(layerHolder);
                map.on('layers-add-result', function(e) {
                    offlineWidget.testLayers = layerHolder;
                });

                callback(true);
            },

            init: function(params, callback) {
                var map = offlineWidget.map;
                var tileLayer = offlineWidget.offlineTiles.tileLayer;
                map.addLayer(tileLayer);

                map.on('layers-add-result', function() {
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
                callback(true);
             },
         //////////////////////////////////////
        ///Online Offline Methods//
       //////////////////////////////////////
            updateState: function(){
                var tileLayer = offlineWidget.offlineTiles.tileLayer;
                
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
                //var tileLayer = offlineWidget.offlineTiles.tileLayer;
                var stores = offlineWidget.offlineFeatureLayers;
                var keys = Object.keys(stores);
                arrayUtils.forEach(keys, function(item) {
                     var offlineFeaturesManager = stores[item];
                    if(state){
                       tileLayer.goOnline();
                        offlineFeaturesManager.goOnline();
                        // $("#btn-online-offline").innerHTML = "Go Offline";
                    }
                    else{
                        // $("#btn-online-offline").innerHTML = "Go Online";
                       tileLayer.goOffline();
                        offlineFeaturesManager.goOffline();
                    }
                });
                
            },

              /**
             * Attempts an http request to verify if app is online or offline.
             * Use this in conjunction with the offline checker library: offline.min.js
             * @param callback
             */
            validateOnline: function(callback) {
                var fetch = function(evt) {
                    var req = new XMLHttpRequest();
                    var maxWaitTime = 5000;
                    var noResponseTimer = setTimeout(function() {
                        req.abort();
                        callback('failed');
                        return
                    }, maxWaitTime);

                    req.open("GET", "http://esri.github.io/offline-editor-js/samples/images/blue-pin.png?" + (Math.floor(Math.random() * 1000000000)), false);
                    req.onreadystatechange = function() {
                        var status = req.status;
                        if (this.readyState != 4) {
                            return
                        }
                        if (this.readyState == 4 && this.status == 200) {
                            
                            clearTimeout(noResponseTimer); 
                            
                            req.onload = function() {
                                req = null;
                                x = true;
                                callback(x);
                                }
                            } else {
                                console.log("verifyOffline failed");
                                req = null;
                                x = false;
                                callback(x);
                            }
                        };
                    req.onerror = function(e) {
                        console.log("verifyOnline failed: " + e);
                        callback(false);
                    };
                    
                    req.send(null);

                }

                fetch();
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
                offlineWidget.offlineFeatureLayers = {};
                var testLayers = this.testLayers;
                console.log(testLayers);
                debugger;
                    if (offlineWidget.hasOwnProperty("_listener")) {
                        offlineWidget._listener.remove();
                    };

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

                    arrayUtils.forEach(testLayers, function(item) {
                       offlineWidget.initOfflineFeaturesMgr(function(e) {
                            var name = item.name;
                            offlineWidget.offlineFeatureLayers[name.toString()] = e;
                        });
                    });

                    // If app is online then we ONLY need to extend the feature layer.
                    if(_isOnline === true){
                        arrayUtils.forEach(testLayers, function(item) {
                           offlineWidget.extendFeatureLayer({online: true, inlayer: item}, function(success) {
                                if(success){
                                  console.log("Initialized the feature layer " + item.name);
                                }
                                else{
                                    alert("There was a problem initializing the feature  " + item.name);
                                }
                            });
                       });
                       offlineWidget.initPanZoomListeners();
                    }
                    // If the app is offline then we need to retrieve the dataStore from OfflineFeaturesManager
                    // and then extend the feature layer using that information.
                    else {
                        arrayUtils.forEach(testLayers, function(item) {
                            offlineWidget.loadFeatureLayerOffline(item, function(success) {
                                if(success) {
                                    offlineWidget.extendFeatureLayer(_isOnline, function(success) {
                                        console.log("Feature Layer extended successfully OFFLINE!");
                                    });
                                }
                                else {
                                    alert("There was a problem initializing the map for offline.");
                                }
                            });
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
                loadFeatureLayerOffline: function (inlayer, callback) {
                    var offlineFeaturesManager = offlineWidget.offlineFeatureLayers[inlayer.name.toString()];
                     offlineFeaturesManager.getFeatureLayerJSONDataStore(function(success,dataStore) {
                        if(success){

                            console.log(dataStore);
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

                    var offlineFeaturesManager = new O.esri.Edit.OfflineFeaturesManager();
                   
                    // IMPORTANT!!!
                    // This tells the database which graphic.attribute property to use as a unique identifier
                    // You can look this information up in your feature service directory under the "Fields" category.
                    // Example: http://services1.arcgis.com/M8KJPUwAXP8jhtnM/arcgis/rest/services/Denver_Bus_Stops/FeatureServer/0
                    offlineFeaturesManager.DB_UID = "OID";
                    if (_isOffline === true) {
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

                    offlineFeaturesManager._editStore.dbName = 'features_store';
                    offlineFeaturesManager._editStore.objectStoreName = "features";
                    callback(offlineFeaturesManager);
                },

                extendFeatureLayer: function (params,callback){
                    var featureLayerJSON = null;
                    var layer = params.inlayer;
                    var name = layer.name;
                    var offlineFeaturesManager = offlineWidget.offlineFeatureLayers[name.toString()];
                    
                  
                     // This sets listeners to detect if the app goes online or offline.
                    Offline.on('up',function(e) {
                        offlineWidget.goOnline(layer)
                    });
                    Offline.on('down', function(e) {
                        offlineWidget.goOffline(layer)
                    });

                    if(_isOnline) {

                        // This object contains everything we need to restore the map and feature layer after an offline restart
                        //
                        // There are two caveats:
                        // First, you cannot use the object key 'id'. That's a reserved key for internal offline library use.
                        // Second, complex objects need to be serialized or you'll get a database cloning error.
                        //
                        // We do not want to (re)set this if are offline. We can modify it but we don't want to overwrite it.
                        offlineFeaturesManager._editStore.FEATURE_LAYER_JSON_ID = layer.name;
                        offlineFeaturesManager._editStore.FEATURE_COLLECTION_ID = layer.name + '_collection';
                        
                        featureLayerJSON = offlineWidget.getFeatureLayerJSON(layer);
                       
                         // NOTE: if app is offline then we want the dataStore object to be null
                        offlineFeaturesManager.extend(layer, function(result, error) {
                            if(result) {
                                console.log("offlineFeaturesManager initialized for " + layer.name);
                                // layer.setFeatureLayerJSONDataStore(featureLayerJSON, function(e) {
                                //     console.log(e);
                                // });
                                callback(true);
                            }
                            else {
                                callback(false);
                                alert("Unable to initialize the database. " + error);
                            }

                        }.bind(this), featureLayerJSON);

                    }

                  
                    // // If the app is online then force offlineFeaturesManager to its online state
                    // // This will force the library to check for pending edits and attempt to
                    // // resend them to the Feature Service.
                    // if(_isOnline){
                    //     offlineFeaturesManager.goOnline(function(result){
                    //         if(!result.success){
                    //             alert("There was a problem when attempting to go back online.");
                    //         }
                    //         else {
                    //             offlineWidget.updateStatus();
                    //         }
                    //     });
                    // }
                    // else {
                    //     offlineWidget.offlineFeaturesManager.goOffline();
                    //     offlineWidget.updateStatus();
                    // }
                    
                },

                getFeatureLayerJSON: function (item) {
                        
                    var map = offlineWidget.map;
                    return {
                        "featureLayerCollection": JSON.stringify(item.toJson()),
                        "zoomLevel": map.getZoom(),
                        "centerPt" : (map.extent.getCenter()).toJson(),
                        "featureLayerUrl": item.url
                    };
                },

                updateFeatureLayerJSON: function () {

                        var testLayer =  offlineWidget.testLayers;
                        arrayUtils.forEach(testLayer, function(item) {
                             var fl = offlineWidget.getFeatureLayerJSON(item);
                            item.setFeatureLayerJSONDataStore(fl,function(result,error){
                            console.log("updateFeatureLayerJSON - Result: " + result + ", error: " + error);
                            });
                        });
                       
                },
                

                goOnline: function (inlayer) {
                    var testLayer = inlayer;
                    var name = testLayer.name
                    var offlineFeaturesManager = offlineWidget.offlineFeatureLayers[name.toString()];
                    var tileLayer = offlineWidget.offlineTiles.tileLayer;
                    console.log("Going online...");

                    // if(testLayer && testLayer.offlineExtended) {

                    // }

                    offlineFeaturesManager.goOnline(function(success,error) {
                        if(success) {
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
                 goOffline: function(inlayer) {
                    var tileLayer = offlineWidget.offlineTiles.tileLayer;
                    var testLayer = inlayer;
                    var name = testLayer.name;
                    var offlineFeaturesManager = offlineWidget.offlineFeatureLayers[name.toString()];

                    console.log("Going offline...");
                    
                    offlineFeaturesManager.goOffline();
                    if(typeof tileLayer != "undefined") tileLayer.goOffline();
                }


        });
});