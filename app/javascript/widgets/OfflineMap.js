define(["dojo/_base/declare", "dojo/parser", "dojo/mouse", "dojo/dom", "dojo/dom-style", "dojo/dom-class", "dojo/dom-attr", "esri/geometry/Polygon", "dojo/ready",  "dojo/on", "utils/debouncer",
    "dijit/_WidgetBase", "esri/dijit/util/busyIndicator"], function (declare,
    parser, mouse, dom, domStyle, domClass, domAttr, Polygon, ready, on,  debouncer, _WidgetBase, busyIndicator) { 

     return declare("OfflineMap", [_WidgetBase], {   
    
 
    startup: function() {
       console.log("OfflineMapStartup Function fired");
        var img = dom.byId('loadingImg');
        var map = offlineWidget.map;
        var handle = busyIndicator.create({
                backgroundOpacity: 0.01,
                target: img,
                imageUrl: "images/loading-throb.gif",
                zIndex: 100
            });
        handle.hide();
        this.handle = handle;
        domStyle.set(img, 'visibility', "hidden");
    },

    showLoading: function() {
        var img = dom.byId('loadingImg');
        var map = offlineWidget.map;
        this.handle.show();
        map.disableMapNavigation();
        map.disablePan();
      },

      hideLoading: function() {
        var img = dom.byId('loadingImg');
        var map = offlineWidget.map;
        this.handle.hide();
        map.enableMapNavigation();
        map.enablePan();
      },

     initEvents: function() {
    
            var map = offlineWidget.map;
            map.on("zoom-end",function(evt) {
                _currentExtent = evt.extent;
                offlineWidget.updateLocalStorage();
                Offline.check();
            });

            // map.on("update-start", function(evt) {
            //     var that = offlineWidget;
            //     that.offlineMap.showLoading();
            // });

            // map.on("update-end", function(evt) {
            //     var that = offlineWidget;
            //     that.offlineMap.hideLoading();
            // });

            map.on("pan-end",function(evt) {
                _currentExtent = evt.extent;
                offlineWidget.updateLocalStorage();
                Offline.check();
            });


            map.on("pan", function(evt) {
                var that = offlineWidget.offlineMap;
                that.hideLoading();
            });

            map.on("zoom-start", function(evt) {
                var that = offlineWidget.offlineMap;
                that.showLoading();
            });

            map.on("zoom-end", function(evt) {
                var that = offlineWidget.offlineMap;
                that.hideLoading();
            });

            debouncer.setOrientationListener(250,function(){
                console.log("orientation"); orientationChange = true;
            });


            document.addEventListener('touchmove', function(event) {
              if (!$(event.target).parents().hasClass("touch-moveable"))
                  {
                    event.preventDefault();
                    event.stopPropagation();
                }
            } , false); 

            var rightPanel = dom.byId("rightPanel");
            var infoPanel = dom.byId("infoPanel");
            var panels = dom.byId("panels");
            var width = domStyle.get(infoPanel, 'width');
            var _panelHoverGrow = on(rightPanel, mouse.enter, function(evt) {
                evt.preventDefault();
                evt.stopPropagation();
                domStyle.set(infoPanel, {
                    width: "250px"
                });
                domStyle.set(panels, {
                    opacity: 1
                });
                 var _panelHoverShrink = on(panels, mouse.leave, function(evt) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    domStyle.set(infoPanel, {
                        width: "20px"
                    });
                     domStyle.set(panels, {
                        opacity: 0
                     });
                    
                });
            });
        }
    });
});
