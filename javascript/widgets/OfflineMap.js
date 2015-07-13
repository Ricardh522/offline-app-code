define(["dojo/_base/declare", "dojo/parser", "esri/geometry/Polygon", "dojo/ready",  "dojo/on", "utils/debouncer",
    "dijit/_WidgetBase", "javascript/dist/offline-tiles-advanced-min.js", "javascript/dist/offline-edit-min.js" ], function (declare,
    parser, Polygon, ready, on,  debouncer, _WidgetBase) { 

     return declare("OfflineMap", [_WidgetBase], {   
    
     
        startup: function() {
           console.log("OfflineMapStartup Function fired");
        },

         initEvents: function() {
                    var map = offlineWidget.map;
    
                     // Keep latest extent and zoom level available in case of an offline browser restart
                    
                     map.on("zoom-end", function (evt) {
                       _currentExtent = evt.extent;
                       offlineWidget.updateLocalStorage();
                     
                    });

                    map.on("pan-end", function (evt) {
                        var _currentExtent = evt.extent;
                        offlineWidget.updateLocalStorage();
                    });

                    map.on('load', function(evt) {
                    });

                    debouncer.setOrientationListener(250,function(){
                        console.log("orientation"); orientationChange = true;
                    });

                    document.body.addEventListener('touchmove', function(event) {
                      event.preventDefault();
                    }, false); 
                }
            });
    });
 