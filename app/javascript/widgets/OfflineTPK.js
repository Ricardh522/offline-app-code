define(["dojo/_base/declare", "dojo/parser", "dojo/ready",  "dojo/on", 
    "dijit/_WidgetBase", "javascript/dist/offline-tpk-src.js"], function (declare, parser, ready, on,  _WidgetBase) {

     return declare("OfflineTPK", [_WidgetBase], {   

            startup: function() {
                 // Retrieve the TPK file via an HTTP request
                    var tpkLayer = null;
                    var xhrRequest = new XMLHttpRequest();
                    xhrRequest.open("GET", "/data/Utilities_Local.zip", true);
                    xhrRequest.responseType = "blob";
                    xhrRequest.setRequestHeader("Content-type", "application/octet-stream");
                    xhrRequest.onprogress = function(evt){
                        var percent;
                        if(evt.hasOwnProperty("total")){
                            percent = (parseFloat(evt.loaded / evt.total) * 100).toFixed(0);
                        }
                        else{
                            percent = (parseFloat(evt.loaded / evt.totalSize) * 100).toFixed(0);
                        }
                        console.log("Begin downloading remote tpk file...");
                    };

                    xhrRequest.error = function(err){
                        console.log("ERROR retrieving TPK file: " + err.toString());
                        alert("There was a problem retrieve the file.");
                    };

                    xhrRequest.onload = function(oEvent) {
                        if(this.status == 200) {
                            console.log("Remote tpk download finished.");
                            zipParser(this.response);
                        }
                        else{
                            alert("There was a problem loading the file. " + this.status + ": " + this.statusText );
                        }
                    };

                    xhrRequest.send();
                

                // Parse the zip file contents into a zip.Entries object
                function zipParser(blob){

                    O.esri.zip.createReader(new O.esri.zip.BlobReader(blob), function (zipReader) {
                        zipReader.getEntries(function (entries) {
                            initMap(entries);
                            //if(entries)alert("TPK downloaded and unzipped!");
                            zipReader.close(function(evt){
                                console.log("Done reading zip file.");
                            });
                        }, function (err) {
                            alert("There was a problem reading the file!: " + err);
                        });
                    });
                }

                // Initialize the Map and the TPKLayer
                function initMap(entries){
                    var map = offlineWidget.map;
                    //Destroy the old map so we can reload a new map
                    if(tpkLayer !== null){
                        map.removeLayer(tpkLayer);
                        //map.destroy();
                        tpkLayer = null;
                    }

                    tpkLayer = new O.esri.TPK.TPKLayer();
                    tpkLayer.on("progress", function (evt) {
                        console.log(evt);
                    });
                     
                    tpkLayer.extend(entries);
                        
                    offlineWidget.map.addLayer(tpkLayer);

                    tpkLayer.on("validationEvent", function(evt){
                        console.log(evt.msg);
                        console.log(evt.err); 
                        if(evt.msg == tpkLayer.NO_SUPPORT_ERROR){
                            //Let the user know the library isn't supported.
                            alert("NO_SUPPRT_ERROR");
                        }
                    });

                    tpkLayer.on("databaseErrorEvent", function(evt){
                        console.log(evt.msg);
                        console.log(evt.err);
                        if(evt.msg == tpkLayer.DB_INIT_ERROR){
                            //Let the user know there was a db problem.
                            alert("DB_INIT_ERROR");
                        }
                    });
                }
        }
    });
});