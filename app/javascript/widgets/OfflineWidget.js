define(["dojo/_base/declare","dojo/_base/array","dojo/parser", "dojo/ready",  "dojo/dom", "dojo/dom-class", "dojo/on", "dojo/Deferred", "utils/debouncer", "esri/geometry/webMercatorUtils", "esri/tasks/Geoprocessor",
    "dijit/_WidgetBase", "widgets/OfflineMap", "widgets/OfflineTiles", "esri/tasks/FeatureSet","esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/ImageParameters",
"esri/geometry/Extent", "esri/dijit/PopupTemplate", "esri/layers/FeatureLayer", "esri/arcgis/utils", "esri/graphicsUtils", "esri/geometry/geometryEngine", "esri/tasks/query", "esri/geometry/Point",
  "esri/geometry/Polygon", "esri/dijit/PopupMobile", "dojo/dom-construct", "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color"],
  function (declare, arrayUtils, parser, ready, dom, domClass, on, Deferred, debouncer, webMercatorUtils, Geoprocessor, _WidgetBase, OfflineMap, OfflineTiles, FeatureSet,
   ArcGISDynamicMapServiceLayer, ImageParameters, Extent, PopupTemplate, FeatureLayer, arcgisUtils, graphicsUtils, geometryEngine,
    Query, Point, Polygon, PopupMobile, domConstruct, SimpleFillSymbol, SimpleLineSymbol, Color) { 

     return declare("OfflineWidget", [_WidgetBase], {   

     
            indexes: [],
            map: "",
            testUrls: [],
            onlineTest: "",
            editStore: {DB_NAME:"features_store",  
                        DB_STORE_NAME:  "features",
                        DB_UID:  "objectid"
                    },
            
            initialize: function() {
                offlineWidget.initModules(null, function(e) {
                  offlineWidget.init(null, function(e) {
                    console.log("offline widget has been fully initialized");
                    });
                });
            },

            validate: function(callback) {
                (function() {
                    var downloadTiles = dom.byId('downloadTiles');
                    var downloadFeatures = dom.byId('downloadFeatures');
                    var clearButton = dom.byId('clearButton');
                    var buttons = [downloadTiles, downloadFeatures, clearButton];

                    offlineWidget.validateOnline(function(result) {
                     
                        if(result !== 'failed') {
                            _isOnline = true;
                            _isOffline = false;
                            //setUIOnline();
                           arrayUtils.forEach(buttons, function(e) {
                                    if (domClass.contains(e, "disabled") === true) {
                                        domClass.remove(e, "disabled");
                                    }
                                });
                            callback(_isOnline);
                           
                        }
                        else {
                            _isOnline = false;
                            _isOffline = true;
                            arrayUtils.forEach(buttons, function(e) {
                                    if (domClass.contains(e, "disabled") === false) {
                                        domClass.add(e, "disabled");
                                    }
                                });
                            callback(_isOnline);
                        }
                        
                    });
                })();
                    
                },

            startup: function(params, callback) {
               var editStore = this.editStore;
               var DB_NAME = editStore.DB_NAME;
               var DB_STORE_NAME = editStore.DB_STORE_NAME;
                 
                this.onlineTest = params.onlineTest;
                this.mapService = params.mapService;
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

                $('#downloadTiles, #downloadFeatures, #clearButton').on('mousedown', function(e) {
                    e.preventDefault();
                    $(this).css('transform', 'scale(1.25, 1.25)');
                });

                $('#downloadTiles, #downloadFeatures, #clearButton').on('mouseout', function(e) {
                    e.preventDefault();
                    $(this).css('transform', 'scale(1, 1)');
                });

                $('#downloadTiles').on('mouseup', function(e) {
                    e.preventDefault();
                    $(this).css('-webkit-transform', 'scale(1, 1)');
                    offlineWidget.downloadTiles();
                });


                $('#downloadFeatures').on('mouseup', function(e) {
                    e.preventDefault();
                    $(this).css('-webkit-transform', 'scale(1, 1)');
                    offlineWidget.startFeatureDownload(null);

                });

                $('#clearButton').on('mouseup', function(e) {
                    e.preventDefault();
                    $(this).css('-webkit-transform', 'scale(1, 1)');
                    
                    var db;

                    var openDb = function (params, callback) {
                        request = indexedDB.open(DB_NAME, 11);
                        request.onupgradeneeded = function(event) {
                            var db = event.target.result;
                            var store = db.createObjectStore(DB_STORE_NAME, {keyPath: 'id'});
                            var index = store.createIndex("by_id", "id", {unique: true});
                            db.close();
                        };

                        request.onsuccess = function(event) {
                          db = event.target.result;
                          callback(db);
                        };

                        request.onerror = function() {
                            console.log(request.error);
                        };
                    };

                    var getObjectStore = function (store_name, mode) {
                        
                        var tx = db.transaction(store_name, mode);
                        tx.onabort = function() {
                            console.log(tx.error);
                            return; 
                        };
                        return tx.objectStore(store_name);
                      };

                    
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
                    return deferred.promise;
                    }

                    openDb(null, function(e) {
                        db = e;
                        var map = offlineWidget.map;
                        var process = clearObjectStore();
                        process.then( function(results) {
                            var rem = function reCreate(callback) {
                                db.close();
                                offlineWidget.clearMap(null, function(e) {
                                    map.graphics.clear();
                                    callback();
                                });
                            };
                            
                            rem(function(e) {
                                offlineWidget.displayMap(); 
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

            /*Begin the process of downloading the feature services and collecting them in layerholder*/

            startFeatureDownload: function(param) {
                var downloadTiles = dom.byId('downloadTiles');
                var downloadFeatures = dom.byId('downloadFeatures');
                var clearButton = dom.byId('clearButton');
                var buttons = [downloadTiles, downloadFeatures, clearButton];

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
                        return;
                    }, maxWaitTime);
                
                    xmlhttp.onreadystatechange = function() {
                        var status = xmlhttp.status;
                        if (this.readyState != 4) {
                            return;
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
                    };
                    
                    xmlhttp.open('GET', inputUrl, false);
                    xmlhttp.send();

                };

                window.addEventListener("connectionerror", function(e) {
                  alert("There is a connection error");
                });

                window.addEventListener("goodconnection", function(e) {
                  console.log("There is a good connection");
                });

            
                var polys = [];
                var lines = [];
                var points = [];
                offlineWidget.clearMap(null, function(evt) {

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
                            }

                                var popupTemplate = new PopupTemplate({
                                    title: response.name,
                                    fieldInfos: fieldinfo
                                });


                                var xxx = new FeatureLayer(item, {
                                     mode: FeatureLayer.MODE_ONDEMAND,
                                     outFields: ["*"],
                                     infoTemplate: popupTemplate,
                                     visible: true,

                                 });

                            var geometries = graphicsUtils.getGeometries(xxx.graphics);
                            
                               switch (response.geometryType) {
                                    case "esriGeometryPolygon":
                                        polys.push(xxx);
                                        break;
                                    case "esriGeometryPolyline":
                                        lines.push(xxx);
                                        break;
                                    case "esriGeometryPoint":
                                        points.push(xxx);
                                        break;
                               }

                          } else if (response === "failed") {
                                _isOnline = false;
                                _isOffline = true;

                                arrayUtils.forEach(buttons, function(e) {
                                    if (domClass.contains(e, "disabled") === false) {
                                        domClass.add(e, "disabled");
                                    }
                                });
                            }
                        });
                    }); 

                    var _layerslistener = map.on('layers-add-result', function(e) {
                        
                         var ids = map.graphicsLayerIds;
                         var layerholder = [];
                         _layerslistener.remove();
                         arrayUtils.forEach(ids, function(id) {
                            var xxx = map.getLayer(id);
                            if (xxx.loaded === true) {
                                layerholder.push(xxx);
                            } else {
                                (function(callback) {
                                var _singleListen = xxx.on('loaded', function(e) {
                                    e.visible = true;
                                    layerholder.push(e);
                                    _singleListen.remove();
                                    callback();
                                    });
                                })();
                            }
                        });
                        offlineWidget.initPanZoomListeners();
                        offlineWidget.layerholder = layerholder;
                        // offlineWidget.initOfflineDatabase(offlineWidget.layerholder);
                     });

                    var finalLayerList = polys.concat(lines.reverse(), points);
                    // map.addLayers(polys.concat(lines.reverse(), points.slice(4,8)));
                    map.addLayers(polys.concat(lines));

                });
            },

            init: function(params, callback) {
                var map = offlineWidget.map;
                var mapService = this.mapService;
                var tileLayer = offlineWidget.offlineTiles.tileLayer;
                map.addLayers([tileLayer,mapService]);

                var splash = map.on('layers-add-result', initSplashPage);
                    
                function initSplashPage(e) {
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
         /*////////////////////////////////
        /Online Offline Methods
       //////////////////////////////////*/
            updateState: function(){
                if(Offline.state === 'up'){
                    offlineWidget.toggleStateUp(true);
                }
                else{
                    offlineWidget.toggleStateUp(false);
                }
            },

            toggleStateUp: function (state){
                var downloadTiles = dom.byId('downloadTiles');
                var downloadFeatures = dom.byId('downloadFeatures');
                var clearButton = dom.byId('clearButton');
                var buttons = [downloadTiles, downloadFeatures, clearButton];

                var tileLayer = offlineWidget.offlineTiles.tileLayer;
                    if(state){
                        tileLayer.goOnline();
                        offlineWidget.clearMap(null, function(e) {
                            offlineWidget.displayMap();
                            arrayUtils.forEach(buttons, function(e) {
                                    if (domClass.contains(e, "disabled") === true) {
                                        domClass.remove(e, "disabled");
                                    }
                                });
                        });
                        
                    }
                        else{
                            tileLayer.goOffline();
                            offlineWidget.clearMap(null, function(e) {
                                arrayUtils.forEach(buttons, function(e) {
                                    if (domClass.contains(e, "disabled") === false) {
                                        domClass.add(e, "disabled");
                                    }
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
                    var maxWaitTime = 100000;
                    var noResponseTimer = setTimeout(function() {
                        req.abort();
                        callback('failed');
                        return;
                    }, maxWaitTime);

                    if (Offline.state === 'up') {
                        req.open("GET", offlineWidget.onlineTest, false);
                        req.onreadystatechange = function() {
                            var status = req.status;
                            if (this.readyState != 4) {
                                return;
                            }
                            if (this.readyState == 4 && this.status == 200) {
                                
                                clearTimeout(noResponseTimer); 
                                
                                req.onload = function() {
                                    req = null;
                                    callback(true);
                                    };
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
                        console.log(err);
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
            downloadTiles: function(callback){
                var tileLayer = this.offlineTiles.tileLayer;
                var minZoomAdjust = this.offlineTiles.minZoomAdjust;
                var maxZoomAdjust = this.offlineTiles.maxZoomAdjust;
                var EXTENT_BUFFER = this.offlineTiles.EXTENT_BUFFER;
                var map = this.map;
                

                tileLayer.deleteAllTiles(function(success,err){
                    var deferred = new Deferred();
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
             * Reports the process while downloading tiles. and initiates the feature layer downloads upon completion
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
                        offlineWidget.offlineTiles.tileLayer.saveToFile("myOfflineTilesLayer.csv", function(success, msg) {
                            console.log(success);
                            console.log(msg);
                        });
                    }

            
                }
                return _wantToCancel; //determines if a cancel request has been issued
            },


           

            clearMap: function(params, callback) {
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
                    console.log("All graphic layers removed from Map");
                    callback();
                }


                
            },

            displayMap: function() {
                var map = this.map;
                var layer = this.mapService;
                var _listener = map.on('layer-add-result', function(e) {
                    console.log("Map Service Added back to Map");
                    _listener.remove();
                });

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

                initOfflineDatabase: function(layerholder) {
                    offlineWidget.buildDatabase(layerholder, function(e) {
                        console.log(e);
                        var clearNode = dom.byId("clearButton");
                        var tileNode = dom.byId("downloadButton");
                        var featureNode = dom.byId("downloadFeatures");

                        if(_isOnline === true){
                             var test = 1;
                             if (test === 0) {
                                offlineWidget.clearMap(null, function(e) {
                                    offlineWidget.displayMap();
                                    
                                    domClass.add(tileNode, "disabled");
                                    domClass.remove(clearNode, "disabled");
                                });
                            } else {
                                 offlineWidget.clearMap(null, function(e) {
                                    offlineWidget.loadOffline();
                                    domClass.add(tileNode, "disabled");
                                });
                            }

                        } else {
                             offlineWidget.clearMap(null, function(e) {
                                offlineWidget.loadOffline();
                                domClass.add(tileNode, "disabled");
                            });
                        }
                    });
                    
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
                            success = true;
                        } else {
                            success = false;
                        }
                            callback(success, dataStore);
                    },

                loadOffline: function () {
                    var map = offlineWidget.map;
                    // retreive the features from indexedDB and load into the map
                     offlineWidget.initDB(function(e) {
                            var layerlist = [];
                            var editStore = offlineWidget.editStore;
                            var deferred = new Deferred();
                            var request = indexedDB.open(editStore.DB_NAME, 11);
                            request.onsuccess = function(event) {
                                    var map = offlineWidget.map;
                                    var db = event.target.result;
                                    var tx = db.transaction([editStore.DB_STORE_NAME], 'readonly');
                                    var store = tx.objectStore(editStore.DB_STORE_NAME);
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
                                            var _listener = map.on('layer-add-result', function(e) {
                                                _listener.remove();
                                                e.layer.visible = true;
                                                e.layer.refresh();
                                                cursor.continue();
                                            });
                                            offlineWidget.map.addLayer(testLayer, 1);
                                            // layerlist.push(testLayer);
                                            
                                            
                                        }
                                    };

                                    tx.oncomplete = function(evt) {
                                        deferred.resolve("transaction completed collecting layers from store");
                                    };

                                    //deferred.then(offlineWidget.map.addLayers(layerlist));
                                };

                                request.onerror = function() {
                                        alert("There was a problem retrieving feature layer options object. " + dataStore);
                                        callback(false);
                                };


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
                                
                                if (names.contains(editStore.DB_STORE_NAME)) {
                                    db.close();
                                } else {
                                    var store = db.createObjectStore(editStore.DB_STORE_NAME, {keyPath: "id"});
                                    var index = store.createIndex("by_id", "id", {unique: true});
                                    db.close();
                                }

                            };
                            
                             request.onsuccess = function() {
                                var db = request.result;
                                db.close();
                            };
                            editStore._isDBInit = true;
                            
                        }
                        callback();
                       

                    },

                buildDatabase: function (layerholder, callback){
                        
                        // params should be an object of {json: layer}
                        var editStore = offlineWidget.editStore;
                        editStore._featureLayers = [];
                       
                        offlineWidget.initDB(function(e) {
                            var db;
                            var deferred = new Deferred();
                            var request = indexedDB.open(editStore.DB_NAME, 11);
                            request.onsuccess = function(evt) {
                                    db = evt.target.result;
                                    
                                    var myDataStore = function (layer) {
                                          var dataStore = offlineWidget.getFeatureLayerJSON(layer);
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

                                          return dataStore;
                                    };

                                    var entries = [];
                                    arrayUtils.forEach(layerholder, function(layer) {
                                        var entry = myDataStore(layer);
                                        entries.push(entry);
                                    });
                                    
                                    var tx = db.transaction(editStore.DB_STORE_NAME, 'readwrite');
                                    var store = tx.objectStore(editStore.DB_STORE_NAME);

                                 
                                    arrayUtils.forEach(entries, function(entry) {
                                        console.log(entry);
                                        store.put(entry);
                                        console.log("entry put");
                                    });

                                    tx.oncomplete = function() {
                                       deferred.resolve('all features loaded into indexedDB');
                                    };

                                    tx.onabort = function() {
                                        console.log(tx.errorCode);
                                        deferred.resolve('error');
                                    };
                                };
                            request.onerror = function(evt) {
                                console.log(evt.target.errorCode);
                                deferred.resolve('error');
                            };

                            deferred.then(function(e) {
                                callback(e);
                            });
                          
                        });
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