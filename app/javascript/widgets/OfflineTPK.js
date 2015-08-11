define(["dojo/_base/declare", "dojo/parser", "dojo/ready",  "dojo/on", 
    "dijit/_WidgetBase", "javascript/dist/offline-tpk-src.js"], function (declare, parser, ready, on,  _WidgetBase) {

     return declare("OfflineTPK", [_WidgetBase], {   

            startup: function() {
                 // Retrieve the TPK file via an HTTP request
                    var tpk = null;
                    var xhrRequest = new XMLHttpRequest();
                    xhrRequest.open("GET", "../data/Utilities_Local.zip", true);
                    xhrRequest.responseType = "blob";
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
                    if(tpk !== null){
                        map.removeLayer(tpk);
                        //map.destroy();
                        tpk = null;
                    }

                    tpk = new O.esri.TPK.TPKLayer();
                    tpk.on("progress", function (evt) {
                        console.log(evt);
                    });
                     
                    tpk.extend(entries);
                        
                    offlineWidget.map.addLayer(tpk);
                }
            
        }
    });
});