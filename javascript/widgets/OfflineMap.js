define(["dojo/_base/declare", "dojo/parser", "esri/geometry/Polygon", "dojo/ready",  "dojo/on", "utils/debouncer",
    "dijit/_WidgetBase"], function (declare,
    parser, Polygon, ready, on,  debouncer, _WidgetBase) { 

     return declare("OfflineMap", [_WidgetBase], {   
    
     
        startup: function() {
           console.log("OfflineMapStartup Function fired");
        },

         initEvents: function() {
                  
                    var map = offlineWidget.map;
                    map.on("zoom-end",function(evt) {
                        _currentExtent = evt.extent;
                        offlineWidget.updateLocalStorage();
                        Offline.check();
                    });

                    map.on("pan-end",function(evt) {
                        _currentExtent = evt.extent;
                        offlineWidget.updateLocalStorage();
                        Offline.check();
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
 