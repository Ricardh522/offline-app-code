define(["dojo/_base/declare","dojo/_base/array","dojo/parser", "dojo/ready",  "dojo/on", "dojo/Deferred", "utils/debouncer", "esri/geometry/webMercatorUtils", "esri/tasks/Geoprocessor",
    "dijit/_WidgetBase", "widgets/OfflineMap", "widgets/OfflineTiles", "esri/tasks/FeatureSet", "esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/ImageParameters",
"esri/geometry/Extent", "esri/dijit/PopupTemplate", "esri/layers/FeatureLayer", "esri/geometry/Point",  "esri/dijit/PopupMobile", "dojo/dom-construct", "esri/symbols/SimpleFillSymbol",
 "esri/symbols/SimpleLineSymbol", "esri/Color"],
  function (declare, arrayUtils, parser, ready, on, Deferred, debouncer, webMercatorUtils, Geoprocessor, _WidgetBase, OfflineMap, OfflineTiles, FeatureSet, ArcGISDynamicMapServiceLayer, ImageParameters,
 Extent, PopupTemplate, FeatureLayer, Point, PopupMobile, domConstruct, SimpleFillSymbol, SimpleLineSymbol, Color) { 

     return declare("OfflineWidget", [_WidgetBase], {   

     
             ayerUrls: {},
            indexes: [],
            map: "",
            testUrls: [],
            onlineTest: "",
            editStore: {DB_NAME:"features_store",  
                        DB_OBJECTSTORE_NAME:  "features",
                        DB_UID:  "objectid"
                    },
            
            initialize: function() {
                offlineWidget.initModules(null, function(e) {
                  offlineWidget.init(null, function(e) {
                    offlineWidget.startTest(null, function(e) {
                      console.log("OfflineWidget has been fully initialized");
                    });
                  });
                });
            },

            validate: function(callback) {
                (function() {
                    offlineWidget.validateOnline(function(result) {
                        if(result !== 'failed') {
                            _isOnline = true;
                            _isOffline = false;
                            //setUIOnline();
                            callback(_isOnline);
                           
                        }
                        else {
                            _isOnline = false;
                            _isOffline = true;
                            //setUIOffline();
                            callback(_isOnline);
                        }
                        
                    });
                })();
                    
                },

            startup: function(params, callback) {
               
                 

                this.onlineTest = params.onlineTest;
                offlineWidget.validate(function(e) {
                    console.log(e);
                });

                Offline.on('up down', offlineWidget.updateState);

                //Make sure map shows up after a browser refresh
                if(Offline.state === 'up') {
                    zoom = 18 ;
                } else if (localStorage.offlineZoom !== undefined) {
                    zoom = localStorage.offlineZoom;
                }

                $('#downloadButton, #clearButton').on('mousedown', function(e) {
                    e.preventDefault();
                    $(this).css('transform', 'scale(1.5, 1.5)');
                });

                $('#downloadButton').on('mouseup', function(e) {
                    $(this).css('-webkit-transform', 'scale(1.25, 1.25)');
                       offlineWidget.downloadTiles();
                       offlineWidget.initOfflineDatabase();
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
                                var index = store.createIndex("by_id", "id", {unique: true});
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
                    var maxWaitTime = 10000;
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

                var polyholder = [];
                var lineholder = [];
                var pointholder = [];
                var layerholder = [];

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
                       xxx.visible = false;
                       xxx.setAutoGeneralize(true);

                       layerholder.push(xxx);
                      

                    } else if (response === "failed") {
                        _isOnline = false;
                        _isOffline = true;
                        $('#downloadButton').attr('disabled', true);
                        } 
                    });
                });

                map.addLayers(layerholder);

                var arrangeLayers = map.on('layers-add-result', sortLayers);

                function sortLayers (evt) {
                    layerholder = [];
                    var layerids = map.graphicsLayerIds;
                    arrayUtils.forEach(layerids, function(id) {
                        var layer = map.getLayer(id);
                        LoadTypes(layer);
                    });

                    reOrder(function(e) {
                        arrangeLayers.remove();
                    });
                };

                var reordered = map.on('layers-reordered', newLayerHolder);

                function newLayerHolder(evt) {
                    layerholder = [];
                    var layerids = map.graphicsLayerIds;
                    arrayUtils.forEach(layerids, function(id) {
                        var layer = map.getLayer(id);
                        layer.visible = true;
                        layerholder.push(layer);
                    });
                    reordered.remove();
                };

                function LoadTypes(layer) {
                       switch (layer.geometryType) {
                        case "esriGeometryPolygon":
                            polyholder.push(layer);
                            break;
                        case "esriGeometryPolyline":
                            lineholder.push(layer);
                            break;
                        case "esriGeometryPoint":
                            pointholder.push(layer);
                            break;
                       }
                   };

                function reOrder(callback) {

                    if (pointholder.length > 0) {
                        for (i=0; i<pointholder.length; i+=1) {
                            map.reorderLayer(pointholder[i], 1);
                        }
                        
                    }

                    if(lineholder.length > 0) {
                        for (i=0; i<lineholder.length; i+=1) {
                            map.reorderLayer(lineholder[i], 1);
                        }
                        
                    }

                    if(polyholder.length > 0) {
                        for (i=0; i<polyholder.length; i+=1) {
                            map.reorderLayer(polyholder[i], 1);
                        }
                        
                    }

                    callback(true);

                };

                offlineWidget.initPanZoomListeners();
                offlineWidget.testLayers = layerholder;
            },

            init: function(params, callback) {
                var map = offlineWidget.map;
                var tileLayer = offlineWidget.offlineTiles.tileLayer;
                map.addLayer(tileLayer);

                var splash = map.on('layer-add-result', initSplashPage);
                    
                function initSplashPage() {
                    var intro = $("#splashPage");
                    var mapPage = $(".container-fluid");
                    
                    mapPage.css('visibility', 'visible');
                    mapPage.css('opacity', 1);
                    intro.css('opacity', 0);
                    intro.css('visibility', 'hidden');
                    splash.remove();
                }

                
                this.offlineMap.initEvents();
                callback(true);
             },
         //////////////////////////////////////
        ///Online Offline Methods//
       //////////////////////////////////////
            updateState: function(){
                if(Offline.state === 'up'){
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
                            $('#downloadButton').attr('disabled', false);
                            $('#clearButton').attr('disabled', false);
                        });
                        
                    }
                        else{
                            tileLayer.goOffline();
                            offlineWidget.clearMap(function(e) {
                                offlineWidget.loadOffline(function(e) {
                                    console.log("All Layers Loaded Offline");
                                    $('#clearButton').attr('disabled', true);
                                    $('#downloadButton').attr('disabled', true);
                                });
                            });
                        }
                    },

              /**
             * Attempts an http request to verify if app is online or offline.
             * Use this in conjunction with the offline checker library: offline.min.js
             * @param callback
             */
            validateOnline: function(callback) {
                (function(evt) {
                    Offline.check();

                    var req = new XMLHttpRequest();
                    var maxWaitTime = 10000;
                    var noResponseTimer = setTimeout(function() {
                        req.abort();
                        callback('failed');
                        return
                    }, maxWaitTime);

                    if (Offline.state === 'up') {
                        req.open("GET", offlineWidget.onlineTest, false);
                        req.onreadystatechange = function() {
                            var status = req.status;
                            if (this.readyState != 4) {
                                return
                            }
                            if (this.readyState == 4 && this.status == 200) {
                                
                                clearTimeout(noResponseTimer); 
                                
                                req.onload = function() {
                                    req = null;
                                    callback(true);
                                    }
                                } else {
                                    console.log("verifyOffline failed");
                                    req = null;
                                    callback('failed');
                                }
                        };

                        req.onerror = function(e) {
                            console.log("verifyOnline failed: " + e);
                            callback('failed');
                        };
                    try {
                        req.send(null);    
                    } catch(err) {
                        console.log(err)
                    }
                        
                } 
                else {
                    callback('failed');
                }

               
                })();
                    
            },

            ////////////////////////////////////
            //Tile Layer Functions////
            ////////////////////////////////////

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
                        offlineWidget.initOfflineDatabase();
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

                initOfflineDatabase: function() {
                    var layers = [];
                    var newLayers = layers.concat(this.testLayers);
                    console.log(newLayers);
                    if (offlineWidget.hasOwnProperty("_listener")) {
                        offlineWidget._listener.remove();
                    };

            
                    offlineWidget.buildDatabase(newLayers);
                    if(_isOnline === true){
                         offlineWidget.clearMap(function(e) {
                            offlineWidget.startTest();
                         })

                    } else {
                         offlineWidget.clearMap(function(e) {
                            offlineWidget.loadOffline();
                        });
                    }
                    

                },

                 /**
                 * **********************************************
                 * EVENT LISTENER MANAGEMENT CODE
                 * **********************************************
                 */

                initPanZoomListeners: function () {
                   
                    var map = offlineWidget.map;

                    map.on("zoom-end",function(evt) {
                        offlineWidget.updateLocalStorage();
                        offlineWidget.validate(function(e) {
                            Offline.check();
                        });
                    });

                    map.on("pan-end",function(evt) {
                        offlineWidget.updateLocalStorage();
                        Offline.check();
                        if (Offline.state === 'up') {
                            _isOnline = true;
                            _isOffline = false;
                        } else {
                            _isOnline = false;
                            _isOffline = true;
                        }

                        offlineWidget.validate(function(e) {
                            console.log(_isOnline + " :ArcServer machine accessible");
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

                loadOffline: function (callback) {
                    // retreive the features from indexedDB and load into the map
                     offlineWidget.initDB(function(e) {
                            var editStore = offlineWidget.editStore;
                            var request = indexedDB.open(editStore.DB_NAME, 11);
                            request.onsuccess = function(event) {
                                    var db = event.target.result
                                    var tx = db.transaction([editStore.DB_OBJECTSTORE_NAME], 'readonly');
                                    var store = tx.objectStore(editStore.DB_OBJECTSTORE_NAME);
                                    var index = store.index('by_id');

                                 
                                    var request = index.openCursor(null, 'next');
                                        //retrieve each entry from the dataStore
                                    request.onsuccess = function(event) {
                                        var cursor = event.target.result;
                                        if (cursor) {
                                                
                                            var dataStore = cursor.value;

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
                                           
                                            cursor.continue();
                                        }
                                    }
                                    callback();
                                }

                                request.onerror = function() {
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

                 // Initialize the database as well as set offline data.
                 initDB: function(callback) {
                    var editStore = offlineWidget.editStore;
                        if(!editStore._isDBInit) {
                            var request = indexedDB.open(editStore.DB_NAME, 11);
                            request.onupgradeneeded = function() {
                                var db = request.result;
                                var names = db.objectStoreNames;
                                
                                if (names.contains(editStore.DB_OBJECTSTORE_NAME)) {
                                    db.close()
                                } else {
                                    var store = db.createObjectStore(editStore.DB_OBJECTSTORE_NAME, {keyPath: "id"});
                                    var index = store.createIndex("by_id", "id", {unique: true});
                                    db.close();
                                }

                            }
                            
                             request.onsuccess = function() {
                                var db = request.result
                                db.close();
                            }
                            editStore._isDBInit = true;
                            
                        };
                        callback()
                        return

                    },

                buildDatabase: function (params){

                        // params should be an object of {json: layer}
                        var editStore = Object.create(offlineWidget.editStore);
                        
                        editStore._isDBInit = false;
                        editStore._featureLayers = [];
                        var db;
                   
                        offlineWidget.initDB(function(e) {
                            var request = indexedDB.open(editStore.DB_NAME);
                            request.onsuccess = function() {
                                    var db = request.result
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