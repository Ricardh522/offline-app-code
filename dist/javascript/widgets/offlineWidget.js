define(["dojo/_base/declare", "dojo/_base/array", "dojo/parser", "dojo/ready", "dojo/dom", "dojo/dom-class", "dojo/on", "dojo/Deferred", "dojo/promise/all", "utils/debouncer", "esri/geometry/webMercatorUtils", "esri/tasks/Geoprocessor", "dijit/_WidgetBase", "esri/tasks/IdentifyTask", "esri/tasks/IdentifyParameters", "esri/tasks/IdentifyResult", "widgets/OfflineMap", "widgets/OfflineTiles", "esri/tasks/FeatureSet", "esri/layers/ArcGISDynamicMapServiceLayer", "esri/layers/ImageParameters", "esri/geometry/Extent", "esri/dijit/PopupTemplate", "esri/layers/FeatureLayer", "esri/arcgis/utils", "esri/graphicsUtils", "esri/geometry/geometryEngine", "esri/tasks/query", "esri/tasks/QueryTask", "esri/geometry/Point", "esri/geometry/Polygon", "esri/layers/LabelLayer", "esri/renderers/SimpleRenderer", "esri/symbols/TextSymbol", "esri/request", "dojo/dom-construct", "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/Color", "esri/dijit/LayerList"], function(e, n, o, t, a, l, r, s, f, d, c, u, g, p, y, v, m, h, b, W, w, S, O, L, _, D, M, T, I, E, B, j, x, N, k, F, P, A, q, C) {
    return e("OfflineWidget", [g], {
        indexes: [],
        map: "",
        onlineTest: "",
        editStore: {
            DB_NAME: "features_store",
            DB_STORE_NAME: "features",
            DB_UID: "objectid"
        },
        initialize: function() {
            offlineWidget.initModules(null, function(e) {
                offlineWidget.init(null, function(e) {
                    console.log("offline widget has been fully initialized")
                })
            })
        },
        validate: function(e) {
            ! function() {
                var o = a.byId("downloadTiles"),
                    i = a.byId("downloadFeatures"),
                    t = a.byId("clearButton"),
                    r = [o, i, t];
                offlineWidget.validateOnline(function(o) {
                    "failed" !== o ? (_isOnline = !0, _isOffline = !1, n.forEach(r, function(e) {
                        l.contains(e, "disabled") === !0 && l.remove(e, "disabled")
                    }), e(_isOnline)) : (_isOnline = !1, _isOffline = !0, n.forEach(r, function(e) {
                        l.contains(e, "disabled") === !1 && l.add(e, "disabled")
                    }), e(_isOnline))
                })
            }()
        },
        startup: function(e, n) {
            var o = this.editStore,
                i = o.DB_NAME,
                t = o.DB_STORE_NAME;
            this.onlineTest = e.onlineTest, this.mapService = e.mapService, offlineWidget.validate(function(e) {
                    console.log(e)
                }), Offline.on("up down", offlineWidget.updateState), "up" === Offline.state ? zoom = 18 : void 0 !== localStorage.offlineZoom && (zoom = localStorage.offlineZoom),
                function() {
                    request = indexedDB.open(i, 11), request.onupgradeneeded = function(e) {
                        var n = e.target.result,
                            i = n.createObjectStore(t, {
                                keyPath: "id"
                            });
                        i.createIndex("by_id", "id", {
                            unique: !0
                        });
                        o._isDBInit = !0, n.close()
                    }, request.onsuccess = function(e) {
                        db = e.target.result, o._isDBInit = !0, db.close()
                    }, request.onerror = function() {
                        o._isDBInit = !1, console.log(request.error)
                    }
                }(), $("#downloadTiles, #downloadFeatures, #clearButton").on("mousedown", function(e) {
                    e.preventDefault(), $(this).css("transform", "scale(1.25, 1.25)")
                }), $("#downloadTiles, #downloadFeatures, #clearButton").on("mouseout", function(e) {
                    e.preventDefault(), $(this).css("transform", "scale(1, 1)")
                }), $("#downloadTiles").on("mouseup", function(e) {
                    e.preventDefault(), $(this).css("-webkit-transform", "scale(1, 1)"), offlineWidget.downloadTiles()
                }), $("#downloadFeatures").on("mouseup", function(e) {
                    e.preventDefault(), $(this).css("-webkit-transform", "scale(1, 1)"), offlineWidget.startFeatureDownload(null)
                }), $("#clearButton").on("mouseup", function(e) {
                    function n(e) {
                        var n = new s,
                            o = r(e, t, "readwrite"),
                            i = o.clear();
                        return i.onsuccess = function(e) {
                            console.log("Store cleared"), n.resolve("sucess")
                        }, i.onerror = function(e) {
                            console.error("clearObjectStore:", e.target.errorCode), n.resolve("fail")
                        }, n.promise
                    }
                    e.preventDefault(), $(this).css("-webkit-transform", "scale(1, 1)"), offlineWidget.offlineMap.showLoading();
                    var a, l = function(e, n) {
                            request = indexedDB.open(i, 11), request.onupgradeneeded = function(e) {
                                var n = e.target.result,
                                    i = n.createObjectStore(t, {
                                        keyPath: "id"
                                    });
                                i.createIndex("by_id", "id", {
                                    unique: !0
                                });
                                o._isDBInit = !0, n.close()
                            }, request.onsuccess = function(e) {
                                a = e.target.result, o._isDBInit = !0, n(a)
                            }, request.onerror = function() {
                                o._isDBInit = !1, console.log(request.error)
                            }
                        },
                        r = function(e, n, o) {
                            var i = e.transaction(n, o);
                            return i.onabort = function() {
                                console.log(i.error)
                            }, i.objectStore(n)
                        };
                    l(null, function(e) {
                        a = e;
                        var o = (offlineWidget.map, n(a));
                        o.then(function(e) {
                            var n = function(e) {
                                a.close(), offlineWidget.clearMap(null, function(n) {
                                    e()
                                })
                            };
                            n(function(e) {
                                offlineWidget.displayMap()
                            })
                        })
                    })
                })
        },
        initModules: function(e, n) {
            ! function() {
                offlineWidget.offlineMap = new m, offlineWidget.offlineTiles = new h, offlineWidget.offlineMap.startup(), offlineWidget.offlineTiles.startup(), n(!0)
            }()
        },
        startFeatureDownload: function(e, o) {
            function i(e, n, o) {
                e.queryIds(n, function(n) {
                    n ? (e.setDefinitionExpression("OBJECTID IN (" + n.join(",") + ")"), o(e)) : o(!1)
                })
            }
            this.offlineMap.showLoading();
            var t = (a.byId("downloadTiles"), a.byId("downloadFeatures"), a.byId("clearButton"), this.map),
                l = this.mapService.url;
            offlineWidget.clearMap(null, function(e) {
                var o = t.extent,
                    a = [],
                    r = offlineWidget.mapService.visibleLayers,
                    d = n.map(r, function(e) {
                        var n = new s,
                            o = l + "/" + e,
                            i = new k({
                                url: o,
                                content: {
                                    f: "json"
                                },
                                handleAs: "json",
                                callbackParamName: "callback"
                            });
                        return n.resolve(i), n
                    });
                f(d).then(function(e) {
                    var r = {
                            polys: [],
                            lines: [],
                            points: [],
                            labels: []
                        },
                        d = n.map(e, function(e) {
                            var n = new s;
                            return e.then(function(e) {
                                if ("Feature Layer" === e.type) {
                                    var t, a = e.id,
                                        s = e.geometryType,
                                        f = e.fields,
                                        d = [];
                                    for (t = 0; t < f.length; t++) {
                                        var c = f.shift(),
                                            u = {
                                                fieldName: c.name,
                                                label: c.alias,
                                                visible: !0
                                            };
                                        d.push(u)
                                    }
                                    var g = new O({
                                            title: e.name,
                                            fieldInfos: d,
                                            showAttachments: !1
                                        }),
                                        p = l + "/" + a,
                                        y = new L(p, {
                                            mode: L.MODE_SNAPSHOT,
                                            infoTemplate: g,
                                            outFields: ["*"],
                                            visible: !0
                                        }),
                                        v = new T;
                                    v.geometry = o, v.returnGeometry = !1, i(y, v, function(e) {
                                        if (e !== !1) {
                                            switch (s) {
                                                case "esriGeometryPolygon":
                                                    r.polys.push(e);
                                                    break;
                                                case "esriGeometryPolyline":
                                                    r.lines.push(e);
                                                    break;
                                                case "esriGeometryPoint":
                                                    r.points.push(e)
                                            }
                                            n.resolve(!0)
                                        } else n.resolve(!1)
                                    })
                                } else n.resolve(!1)
                            }), n.promise
                        });
                    f(d).then(function(e) {
                        var o = t.on("layers-add-result", function(e) {
                                o.remove(), offlineWidget.toc.refresh();
                                var i = [],
                                    a = t.graphicsLayerIds;
                                n.forEach(a, function(e) {
                                    var n = new s,
                                        o = t.getLayer(e);
                                    if (0 === o.graphics.length) {
                                        console.log("graphics have not be created yet");
                                        var a = o.on("update-end", function(e) {
                                            a.remove(), n.resolve(o)
                                        })
                                    } else o.graphics.length > 0 && n.resolve(o);
                                    i.push(n)
                                });
                                var l = f(i);
                                l.then(function(e) {
                                    console.log(e), offlineWidget.initOfflineDatabase(e)
                                })
                            }),
                            i = r.polys.concat(r.lines, r.points),
                            l = [];
                        for (a = 0; a < i.length; a += 1) {
                            var d = {
                                layer: i[a]
                            };
                            l.push(d)
                        }
                        offlineWidget.toc.layers = l, t.addLayers(i)
                    })
                })
            })
        },
        init: function(e, n) {
            function o() {
                var e = $("#splashPage"),
                    o = $(".container-fluid");
                o.css("visibility", "visible"), o.css("opacity", 1), e.css("opacity", 0), e.css("visibility", "hidden"), l.remove(), i.offlineMap.initEvents(), n(!0)
            }
            var i = this,
                t = this.map,
                a = this.mapService;
            offlineWidget.offlineTiles.tileLayer;
            t.addLayer(a);
            var l = t.on("layer-add-result", function(e) {
                o()
            })
        },
        updateState: function() {
            "up" === Offline.state ? offlineWidget.toggleStateUp(!0) : offlineWidget.toggleStateUp(!1)
        },
        toggleStateUp: function(e) {
            var o = a.byId("downloadTiles"),
                i = a.byId("downloadFeatures"),
                t = a.byId("clearButton"),
                r = [o, i, t],
                s = offlineWidget.offlineTiles.tileLayer;
            e ? (s.goOnline(), offlineWidget.clearMap(null, function(e) {
                offlineWidget.displayMap(), n.forEach(r, function(e) {
                    l.contains(e, "disabled") === !0 && l.remove(e, "disabled")
                })
            })) : (s.goOffline(), offlineWidget.clearMap(null, function(e) {
                n.forEach(r, function(e) {
                    l.contains(e, "disabled") === !1 && l.add(e, "disabled")
                })
            }))
        },
        validateOnline: function(e) {
            ! function(n) {
                Offline.check();
                var o = new XMLHttpRequest,
                    i = 1e5,
                    t = setTimeout(function() {
                        o.abort(), e("failed")
                    }, i);
                if ("up" === Offline.state) {
                    o.open("GET", offlineWidget.onlineTest, !1), o.onreadystatechange = function() {
                        o.status;
                        4 == this.readyState && (4 == this.readyState && 200 == this.status ? (clearTimeout(t), o.onload = function() {
                            o = null, e(!0)
                        }) : (console.log("verifyOffline failed"), o = null, e("failed")))
                    }, o.onerror = function(n) {
                        console.log("verifyOnline failed: " + n), e("failed")
                    };
                    try {
                        o.send(null)
                    } catch (a) {
                        console.log(a)
                    }
                } else e("failed")
            }()
        },
        goOnlineOffline: function() {
            var e = document.getElementById("state-span");
            " Up" == e.innerHTML ? (toggleStateUp(!1), console.log("Map is offline")) : (toggleStateUp(!0), console.log("Map is online"))
        },
        downloadTiles: function(e) {
            this.offlineMap.showLoading();
            var n = this.offlineTiles.tileLayer,
                o = this.offlineTiles.minZoomAdjust,
                i = this.offlineTiles.maxZoomAdjust,
                t = this.offlineTiles.EXTENT_BUFFER,
                a = this.map;
            n.deleteAllTiles(function(e, l) {
                new s;
                if (e === !1) alert("There was a problem deleting the tile cache");
                else {
                    console.log("success deleting tile cache");
                    this.data;
                    if ("downloading" == offlineWidget.downloadState) console.log("cancel!"), _wantToCancel = !0;
                    else {
                        var r = n.getMinMaxLOD(o, i),
                            f = n.getExtentBuffer(t, a.extent);
                        _wantToCancel = !1;
                        var d = "<span id='message' style='z-index: 100; position: absolute; top: 0px; right: 5px; font: black; arial; text-shadow: 1px 1px 3px white'>downloading tiles...</span>";
                        $("#navbar").append(d), n.prepareForOffline(r.min, r.max, f, offlineWidget.reportProgress.bind(this)), offlineWidget.downloadState = "downloading"
                    }
                }
            }.bind(this))
        },
        reportProgress: function(e) {
            if (e.hasOwnProperty("countNow"), e.finishedDownloading) {
                var n = offlineWidget.offlineMap;
                $("#navbar > span").remove(), e.cancelRequested ? (offlineWidget.downloadState = "cancelled", alert("Tile download was cancelled"), n.hideLoading()) : (offlineWidget.downloadState = "downloaded", alert("Tile download complete"), n.hideLoading(), offlineWidget.offlineTiles.tileLayer.saveToFile("myOfflineTilesLayer.csv", function(e, n) {
                    console.log(e), console.log(n)
                }))
            }
            return _wantToCancel
        },
        clearMap: function(e, n) {
            var o = this.map,
                t = o.graphicsLayerIds,
                a = o.layerIds,
                l = a.concat(t);
            if (l.length > 1)
                for (i = 1; i < l.length; i++) {
                    var r = o.getLayer(l[i]);
                    o.removeLayer(r)
                }
            0 === o.graphicsLayerIds.length && (console.log("All graphic layers removed from Map"), n()), offlineWidget.hasOwnProperty("toc") && (offlineWidget.layers = null)
        },
        displayMap: function() {
            var e = this.map,
                n = {};
            n.operationalLayers = this.mapService;
            var o = e.on("layer-add-result", function(e) {
                console.log("Map Service Added back to Map"), o.remove(), offlineWidget.offlineMap.hideLoading()
            });
            offlineWidget.toc.layers = n, offlineWidget.toc.refresh(), e.addLayer(layer)
        },
        updateLocalStorage: function() {
            var e = offlineWidget.map,
                n = e.getZoom(),
                o = JSON.stringify(e.extent);
            "undefined" != typeof Storage ? (localStorage.offlineZoom = n, localStorage.offlineExtent = o, console.log("Done updating zoom and extent to localStorage.")) : alert("The offline library is not supported on this browser.")
        },
        initOfflineDatabase: function(e) {
            offlineWidget.buildDatabase(e, function(e) {
                console.log(e);
                var n = a.byId("clearButton"),
                    o = a.byId("downloadTiles"),
                    i = a.byId("downloadFeatures");
                if (_isOnline === !0) {
                    var t = 1;
                    0 === t ? offlineWidget.clearMap(null, function(e) {
                        offlineWidget.displayMap(), l.remove(o, "disabled"), l.remove(n, "disabled"), l.remove(i, "disabled")
                    }) : offlineWidget.clearMap(null, function(e) {
                        offlineWidget.loadOffline()
                    })
                } else offlineWidget.clearMap(null, function(e) {
                    offlineWidget.loadOffline(), l.add(o, "disabled"), l.add(n, "disabled"), l.add(i, "disabled")
                })
            })
        },
        initPanZoomListeners: function() {
            var e = offlineWidget.map;
            e.on("zoom-end", function(e) {
                offlineWidget.updateLocalStorage(), offlineWidget.validate(function(e) {
                    Offline.check()
                })
            }), e.on("pan-end", function(e) {
                offlineWidget.updateLocalStorage(), Offline.check(), "up" === Offline.state ? (_isOnline = !0, _isOffline = !1) : (_isOnline = !1, _isOffline = !0), offlineWidget.validate(function(e) {
                    console.log(_isOnline + " :ArcServer machine accessible")
                })
            })
        },
        getFeatureLayerJSONDataStore: function(e, n) {
            var o, i = offlineWidget.getFeatureLayerJSON(e);
            o = "object" == typeof i ? !0 : !1, n(o, i)
        },
        loadOffline: function() {
            this.offlineMap.showLoading();
            var e = (offlineWidget.map, []);
            offlineWidget.initDB(function(n) {
                var o = offlineWidget.editStore,
                    t = indexedDB.open(o.DB_NAME, 11);
                t.onsuccess = function(n) {
                    var t = offlineWidget.map,
                        a = n.target.result,
                        l = a.transaction([o.DB_STORE_NAME], "readonly"),
                        r = l.objectStore(o.DB_STORE_NAME),
                        s = r.index("by_id"),
                        f = s.openCursor(null, "next");
                    f.onsuccess = function(n) {
                        var o = n.target.result;
                        if (o) {
                            var i, t = o.value,
                                a = new L(JSON.parse(t.featureLayerCollection)),
                                l = [],
                                r = a.fields;
                            for (i = 0; i < r.length; i++) {
                                var s = r.shift(),
                                    f = {
                                        fieldName: s.name,
                                        label: s.alias,
                                        visible: !0
                                    };
                                l.push(f)
                            }
                            var d = new O({
                                title: a.name,
                                fieldInfos: l
                            });
                            null === a.url && (a.url = t.featureLayerUrl), a.infoTemplate = d, a.visible = !0, e.push(a), o["continue"]()
                        }
                    }, l.oncomplete = function(n) {
                        console.log("transaction completed collecting layers from store"), promises = [];
                        var o = [];
                        for (i = 0; i < e.length; i += 1) o.push({
                            layer: e[i]
                        });
                        var a = t.on("layers-add-result", function(e) {
                            a.remove(), offlineWidget.toc.layers = o, offlineWidget.toc.refresh(), offlineWidget.offlineMap.hideLoading()
                        });
                        offlineWidget.map.addLayers(e)
                    }
                }, t.onerror = function() {
                    alert("There was a problem retrieving feature layer options object. " + dataStore), callback(!1)
                }
            })
        },
        initDB: function(e) {
            var n = offlineWidget.editStore;
            if (!n._isDBInit) {
                var o = indexedDB.open(n.DB_NAME, 11);
                o.onupgradeneeded = function() {
                    var e = o.result,
                        i = e.objectStoreNames;
                    if (i.contains(n.DB_STORE_NAME)) e.close();
                    else {
                        var t = e.createObjectStore(n.DB_STORE_NAME, {
                            keyPath: "id"
                        });
                        t.createIndex("by_id", "id", {
                            unique: !0
                        });
                        e.close()
                    }
                }, o.onsuccess = function() {
                    var e = o.result;
                    e.close()
                }, n._isDBInit = !0
            }
            e()
        },
        buildDatabase: function(e, o) {
            var i = offlineWidget.editStore;
            i._featureLayers = [], offlineWidget.initDB(function(t) {
                var a, l = new s,
                    r = indexedDB.open(i.DB_NAME, 11);
                r.onsuccess = function(o) {
                    a = o.target.result;
                    var t = function(e) {
                            var n = offlineWidget.getFeatureLayerJSON(e);
                            n.id = e.name;
                            e.name + "_collection";
                            e.offlineExtended = !0, e.objectIdField = i.DB_UID;
                            var o = null;
                            return e.url && (o = e.url, i._featureLayers[e.url] = e), n
                        },
                        r = [];
                    n.forEach(e, function(e) {
                        var n = new s,
                            o = t(e);
                        n.resolve(o), r.push(n)
                    });
                    var d = a.transaction(i.DB_STORE_NAME, "readwrite"),
                        c = d.objectStore(i.DB_STORE_NAME),
                        u = f(r);
                    u.then(function(e) {
                        n.forEach(e, function(e) {
                            console.log(e), c.put(e), console.log("entry put")
                        })
                    }), d.oncomplete = function() {
                        l.resolve("all features loaded into indexedDB")
                    }, d.onabort = function() {
                        console.log(d.errorCode), l.resolve("error")
                    }
                }, r.onerror = function(e) {
                    console.log(e.target.errorCode), l.resolve("error")
                }, l.then(function(e) {
                    o(e)
                })
            })
        },
        getFeatureLayerJSON: function(e) {
            var n = offlineWidget.map;
            return {
                featureLayerCollection: JSON.stringify(e.toJson()),
                zoomLevel: n.getZoom(),
                centerPt: n.extent.getCenter().toJson(),
                featureLayerUrl: e.url
            }
        },
        updateFeatureLayerJSON: function() {
            var e = offlineWidget.testLayers;
            n.forEach(e, function(e) {
                var n = offlineWidget.getFeatureLayerJSON(e);
                e.setFeatureLayerJSONDataStore(n, function(e, n) {
                    console.log("updateFeatureLayerJSON - Result: " + e + ", error: " + n)
                })
            })
        }
    })
}), define(["dojo/_base/declare", "dojo/parser", "dojo/mouse", "dojo/dom", "dojo/dom-style", "dojo/dom-class", "dojo/dom-attr", "esri/geometry/Polygon", "dojo/ready", "dojo/on", "utils/debouncer", "dijit/_WidgetBase", "esri/dijit/util/busyIndicator"], function(e, n, o, i, t, a, l, r, s, f, d, c, u) {
    return e("OfflineMap", [c], {
        startup: function() {
            console.log("OfflineMapStartup Function fired");
            var e = i.byId("loadingImg"),
                n = (offlineWidget.map, u.create({
                    backgroundOpacity: .01,
                    target: e,
                    imageUrl: "images/loading-throb.gif",
                    zIndex: 100
                }));
            n.hide(), this.handle = n, t.set(e, "visibility", "hidden")
        },
        showLoading: function() {
            var e = (i.byId("loadingImg"), offlineWidget.map);
            this.handle.show(), e.disableMapNavigation(), e.disablePan()
        },
        hideLoading: function() {
            var e = (i.byId("loadingImg"), offlineWidget.map);
            this.handle.hide(), e.enableMapNavigation(), e.enablePan()
        },
        initEvents: function() {
            var e = offlineWidget.map;
            e.on("zoom-end", function(e) {
                _currentExtent = e.extent, offlineWidget.updateLocalStorage(), Offline.check()
            }), e.on("pan-end", function(e) {
                _currentExtent = e.extent, offlineWidget.updateLocalStorage(), Offline.check()
            }), e.on("pan", function(e) {
                var n = offlineWidget.offlineMap;
                n.hideLoading()
            }), e.on("zoom-start", function(e) {
                var n = offlineWidget.offlineMap;
                n.showLoading()
            }), e.on("zoom-end", function(e) {
                var n = offlineWidget.offlineMap;
                n.hideLoading()
            }), d.setOrientationListener(250, function() {
                console.log("orientation"), orientationChange = !0
            }), document.addEventListener("touchmove", function(e) {
                $(e.target).parents().hasClass("touch-moveable") || (e.preventDefault(), e.stopPropagation())
            }, !1);
            var n = i.byId("rightPanel"),
                a = i.byId("infoPanel"),
                l = i.byId("panels");
            t.get(a, "width"), f(n, o.enter, function(e) {
                e.preventDefault(), e.stopPropagation(), t.set(a, {
                    width: "250px"
                }), t.set(l, {
                    opacity: 1
                });
                f(l, o.leave, function(e) {
                    e.preventDefault(), e.stopPropagation(), t.set(a, {
                        width: "20px"
                    }), t.set(l, {
                        opacity: 0
                    })
                })
            })
        }
    })
});
