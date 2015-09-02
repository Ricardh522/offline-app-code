define(["dojo/_base/declare","dojo/parser","dojo/mouse","dojo/dom","dojo/dom-style","dojo/dom-class","dojo/dom-attr","esri/geometry/Polygon","dojo/ready","dojo/on","utils/debouncer","dijit/_WidgetBase","esri/dijit/util/busyIndicator"],function(e,n,o,t,i,a,d,f,l,r,g,s,c){return e("OfflineMap",[s],{startup:function(){console.log("OfflineMapStartup Function fired");var e=t.byId("loadingImg"),n=(offlineWidget.map,c.create({backgroundOpacity:.01,target:e,imageUrl:"images/loading-throb.gif",zIndex:100}));n.hide(),this.handle=n,i.set(e,"visibility","hidden")},showLoading:function(){var e=(t.byId("loadingImg"),offlineWidget.map);this.handle.show(),e.disableMapNavigation(),e.disablePan()},hideLoading:function(){var e=(t.byId("loadingImg"),offlineWidget.map);this.handle.hide(),e.enableMapNavigation(),e.enablePan()},initEvents:function(){var e=offlineWidget.map;e.on("zoom-end",function(e){_currentExtent=e.extent,offlineWidget.updateLocalStorage(),Offline.check()}),e.on("pan-end",function(e){_currentExtent=e.extent,offlineWidget.updateLocalStorage(),Offline.check()}),e.on("pan",function(e){var n=offlineWidget.offlineMap;n.hideLoading()}),e.on("zoom-start",function(e){var n=offlineWidget.offlineMap;n.showLoading()}),e.on("zoom-end",function(e){var n=offlineWidget.offlineMap;n.hideLoading()}),g.setOrientationListener(250,function(){console.log("orientation"),orientationChange=!0}),document.addEventListener("touchmove",function(e){$(e.target).parents().hasClass("touch-moveable")||(e.preventDefault(),e.stopPropagation())},!1);var n=t.byId("rightPanel"),a=t.byId("infoPanel"),d=t.byId("panels");i.get(a,"width"),r(n,o.enter,function(e){e.preventDefault(),e.stopPropagation(),i.set(a,{width:"250px"}),i.set(d,{opacity:1});r(d,o.leave,function(e){e.preventDefault(),e.stopPropagation(),i.set(a,{width:"20px"}),i.set(d,{opacity:0})})})}})});