define(["dojo/_base/declare", "dojo/parser", "dojo/ready",  "dojo/on", 
    "dijit/_WidgetBase", "../javascript/offline-tiles-advanced-src.js"], function (declare, parser, ready, on,  _WidgetBase) {

     return declare("OfflineTiles", [_WidgetBase], {   

        startup: function() {

            if (Offline.state === 'up') {
                _isOnline = true;
            }
            
            var tileLayer = O.esri.Tiles.OfflineTileEnablerLayer(
                // "http://52.0.46.248:6080/arcgis/rest/services/RSW/RSW_Airfield_TS/MapServer",
                "http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
                function (evt) {
                    console.log("Offline tile lib enabled. App is: " + Offline.state);
                },_isOnline);
      
            tileLayer._minZoom = 14;
            tileLayer._maxZoom = 19;
            this.tileLayer = tileLayer;
        },

        // Set up min and max boundaries for retrieving tiles
        minZoomAdjust: -1,
        maxZoomAdjust: 4,
        resetZoom: 15,
        _currentZoom: null,
        // Important settings for determining which tile layers gets stored for offline use.
        EXTENT_BUFFER: 0, //buffers the map extent in meters
        _currentExtent: null,
        // For cancelling the download of tiles
        _wantToCancel: false,
        _downloadState: "downloaded",
        
        initOffline: function()
        {
            console.log("extending");  
            Offline.on('up', this.goOnline );
            Offline.on('down', this.goOffline );
        },

        updateTileCountEstimation: function()
        {
            console.log('updating');
            var tileLayer = this.tileLayer;
            var map = offlineWidget.map;
            var totalEstimation = { tileCount:0, sizeBytes:0 };
            var minLevel = 14;
            var maxLevel = 19;
            this.tileLayer.estimateTileSize(function(tileSize)
            {
                var totalMem = [];
                for(var level=minLevel; level<=maxLevel; level++)
                {
                    var levelEstimation = tileLayer.getLevelEstimation(map.extent,level,tileSize);

                    totalEstimation.tileCount += levelEstimation.tileCount;
                    totalEstimation.sizeBytes += levelEstimation.sizeBytes;

                    if( levelEstimation.tileCount > 0)
                    {
                       
                        console.log(rowContent);
                        totalMem.push(newstring);
                    }

                    if( totalEstimation.tileCount > 5000 )
                    {
                      break;
                    }
                }
             
            });
        },

       
        cancel: function()
        {
            cancelRequested = true;
        }
        
    });
});



