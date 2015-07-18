define(["dojo/_base/declare","dojo/_base/array","dojo/parser", "dojo/ready",  "dojo/on", "dojo/Deferred", "utils/debouncer", "esri/geometry/webMercatorUtils", "esri/tasks/Geoprocessor",
    "dijit/_WidgetBase", "widgets/OfflineMap", "widgets/OfflineTiles", "esri/tasks/FeatureSet", "esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/ImageParameters",
"esri/geometry/Extent", "esri/dijit/PopupTemplate", "esri/layers/FeatureLayer", "esri/geometry/Point",  "esri/dijit/PopupMobile", "dojo/dom-construct", "esri/symbols/SimpleFillSymbol",
 "esri/symbols/SimpleLineSymbol", "esri/Color"],
  function (declare, arrayUtils, parser, ready, on, Deferred, debouncer, webMercatorUtils, Geoprocessor, _WidgetBase, OfflineMap, OfflineTiles, FeatureSet, ArcGISDynamicMapServiceLayer, ImageParameters,
 Extent, PopupTemplate, FeatureLayer, Point, PopupMobile, domConstruct, SimpleFillSymbol, SimpleLineSymbol, Color) { 

     return declare("OfflineWidget", [_WidgetBase], {   

     
             layerUrls: {},
             indexes: [],
             map: "",
             testUrls: [],
            
            validate: function(callback) {
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
                    
                },

            startup: function(callback) {

                this.validate(function(e) {
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
                       // offlineWidget.downloadTiles();
                       offlineWidget.initFeatureUpdateEndListener();
                   });

                $('#clearButton').on('mouseup', function(e) {
                    $(this).css('-webkit-transform', 'scale(1.25, 1.25)');
                        var DB_NAME = 'features_store';
                        var DB_STORE_NAME = 'features';
                        var db;

                        var openDb = function (params, callback) {
                            request = indexedDB.open(DB_NAME, 11);
                            request.onupgradeneeded = function(event) {
                                var db = event.target.result;
                                var store = db.createObjectStore(DB_STORE_NAME, {keyPath: 'id'});
                                db.close();
                            }

                            request.onsuccess = function(event) {
                              db = event.target.result;
                              callback(db);
                            };

                            request.onerror = function() {
                                console.log(request.error);
                            }
                        };

                        var getObjectStore = function (store_name, mode) {
                            
                            var tx = db.transaction(store_name, mode);
                            tx.onabort = function() {
                                console.log(tx.error);
                                return 
                            }
                            return tx.objectStore(store_name);
                          }

                        
                       function clearObjectStore() {
                            var deferred = new Deferred();
                            var store = getObjectStore(DB_STORE_NAME, 'readwrite');
                            var req = store.clear();
                            req.onsuccess = function(evt) {
                              console.log("Store cleared");
                              deferred.resolve("sucess");
                            };

                            req.onerror = function (evt) {
                              console.error("clearObjectStore:", evt.target.errorCode);
                              deferred.resolve("fail");
                            };
                            return deferred.promise
                        }

                        openDb(null, function(e) {
                            db = e
                            var map = offlineWidget.map;
                            var process = clearObjectStore();
                            process.then( function(results) {
                                var rem = function reCreate(callback) {
                                    db.close();
                                    offlineWidget.clearMap(function(e) {
                                        map.graphics.clear();
                                        callback();
                                    });
                                };
                                
                                rem(function(e) {
                                        offlineWidget.startTest(null, function(e) {
                                            console.log('features have been cleared from cache and re-added back into Map');

                                        });
                                    }); 
                            });
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
                             mode: FeatureLayer.SNAPSHOT,
                             outFields: ["*"],
                             infoTemplate: popupTemplate,
                         });
                       
                       layerHolder.push(xxx);
                      

                    } else if (response === "failed") {
                        _isOnline = false;
                        _isOffline = true;
                        } 
                    });
                });

                map.addLayers(layerHolder);
                map.on('layers-add-result', function(e) {
                    offlineWidget.testLayers = layerHolder;
                    callback(true);
                });

                
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
                    }
                    else{
                        offlineWidget.toggleStateUp(false);
                    }
            },

            toggleStateUp: function (state){
                var tileLayer = offlineWidget.offlineTiles.tileLayer;
                    if(state){
                        tileLayer.goOnline();
                        offlineWidget.clearMap(function(e) {
                            offlineWidget.startTest();
                        });
                        
                        // $("#btn-online-offline").innerHTML = "Go Offline";
                        }
                else{
                    // $("#btn-online-offline").innerHTML = "Go Online";
                    tileLayer.goOffline();
                    arrayUtils.forEach(offlineWidget.testLayers, function(e) {
                        offlineWidget. loadFeatureLayerOffline(e)
                    });
                   
                }
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

                // tileLayer.deleteAllTiles(function(success,err){
                //     if(success === false){
                //         alert("There was a problem deleting the tile cache");
                //     }
                //     else{
                //         console.log("success deleting tile cache");
                //         var self = this.data;

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
                //     }
                // }.bind(this));
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
                        offlineWidget.initFeatureUpdateEndListener();
                        alert("Tile download complete");
                    }

            
                }
                return _wantToCancel; //determines if a cancel request has been issued
            },


           

            clearMap: function(callback) {
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
                if (map.graphicsLayerIds.length === 0) {
                    callback();
                };
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
                var layers = [];
                var newLayers = layers.concat(this.testLayers);
                console.log(newLayers);
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

                   
                    // If app is online then we ONLY need to extend the feature layer.
                    if(_isOnline === true){
                         offlineWidget.buildDatabase(newLayers);
                         offlineWidget.clearMap(function(e) {
                            offlineWidget.startTest();
                         })
                    }
                    // If the app is offline then we need to retrieve the dataStore from OfflineFeaturesManager
                    // and then extend the feature layer using that information.
                    else {
                        arrayUtils.forEach(newLayers, function(item) {
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
                    offlineWidget.initPanZoomListeners();

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
                   
                    var map = offlineWidget.map;

                    map.on("zoom-end",function(evt) {
                        _currentExtent = evt.extent;
                        
                        offlineWidget.updateLocalStorage();
                        offlineWidget.validate(function(e) {
                            Offline.check();
                        });
                    });

                    map.on("pan-end",function(evt) {
                        _currentExtent = evt.extent;
                       
                        offlineWidget.updateLocalStorage();
                         offlineWidget.validate(function(e) {
                            Offline.check();
                        });
                    });
                },

                 /**
                 * Load the feature while offline using information stored in database
                 */

                 getFeatureLayerJSONDataStore: function(inlayer, callback){
                        var dataStore = offlineWidget.getFeatureLayerJSON(inlayer);
                        var success;
                        if (typeof dataStore === "object") {
                            success = true
                        } else {
                            success = false
                        }
                            callback(success, dataStore);
                    },

                loadFeatureLayerOffline: function (inlayer, callback) {
                    
                     offlineWidget.getFeatureLayerJSONDataStore(function(success,dataStore) {
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
                 * IndexedDB Code
                 * **********************************************
                 */


                buildDatabase: function (params){

                    // params should be an object of {json: layer}
                    offlineWidget.editStore = {};
                    var editStore = offlineWidget.editStore;
                    editStore.DB_NAME =  "features_store";   
                    editStore.DB_OBJECTSTORE_NAME =  "features";
                    editStore.DB_UID =  "objectid"    
                    editStore._isDBInit = false;
                    editStore._featureLayers = [];
                    var db;

                    // Initialize the database as well as set offline data.
                    function initDB(callback) {
                        if(!editStore._isDBInit) {
                            var deferred = new Deferred();
                            var request = indexedDB.open(editStore.DB_NAME);
                            request.onupgradeneeded = function() {
                                var db = request.result;
                                var store = db.createObjectStore(editStore.DB_OBJECTSTORE_NAME, {keyPath: "id"});
                                db.close();
                                callback();
                            }

                             request.onsuccess = function() {
                                db = request.result
                                callback(db);
                            }
                        }
                    }

                   
                    initDB(function(e) {
                        db = e;
                        var tx = db.transaction(editStore.DB_OBJECTSTORE_NAME, 'readwrite');
                        var store = tx.objectStore(editStore.DB_OBJECTSTORE_NAME);
                  
                        arrayUtils.forEach(params, function(e) {
                            store.put(entry(e));
                        });

                        tx.oncomplete = function() {
                            console.log('all requests have succedded');
                            db.close();
                            return
                        }

                        tx.onabort = function() {
                            console.log(tx.error);
                            return 
                        }
                    });
                    
                    var entry = function (layer) {
                        var featureLayerJSON = null;
                        var dataStore = featureLayerJSON = offlineWidget.getFeatureLayerJSON(layer);

                        var name = layer.name;
                         dataStore.id = layer.name;

                         var FEATURE_COLLECTION_ID = layer.name + '_collection';
                     
                          layer.offlineExtended = true; // to identify layer has been extended

                          layer.objectIdField = editStore.DB_UID;

                          var url = null;

                          if(layer.url) {
                                url = layer.url;
                                // we keep track of the FeatureLayer object
                                editStore._featureLayers[layer.url] = layer;
                          } 

                          return dataStore
                    }

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

                        var testLayers =  offlineWidget.testLayers;
                        arrayUtils.forEach(testLayers, function(item) {
                             var fl = offlineWidget.getFeatureLayerJSON(item);
                            item.setFeatureLayerJSONDataStore(fl,function(result,error){
                            console.log("updateFeatureLayerJSON - Result: " + result + ", error: " + error);
                            });
                        });
                       
                }
        });
});