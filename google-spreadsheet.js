var request = require('request');
var blockspring = require('blockspring');

var getJsonFromJsonP = function (url, callback) {
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var jsonpData = body;
        var json;
        try {
           json = JSON.parse(jsonpData);
        } catch(e) {
            // Find the string locations of the JSON, and extract it.
            var startPos = jsonpData.indexOf('({');
            var jsonString = jsonpData.substring(startPos+1, jsonpData.length-2);
            json = JSON.parse(jsonString);
        }
        callback(null, json);
      } else {
        callback(error);
      }
    })
}

blockspring.define(function(request, response){
    var originalUrl = request.params["url"];
    var pathArray = originalUrl.split('/');
    var gDocID = pathArray[5];
    var gid = originalUrl.split('gid=')[1];
    
    var url = "https://docs.google.com/spreadsheets/d/" 
    	+ gDocID
    	+ "/gviz/tq"
    	+ "?gid=" + gid
    	+ "&tq=" + encodeURIComponent(request.params["query"]);
    
    getJsonFromJsonP(url, function(err, rawData){
		try {
            var headers = rawData.table.cols.map(function(column){ 
                return column.label 
            });
            
            var uniq_headers = getUnique(headers);
            if (uniq_headers.length == 1 && uniq_headers[0] == ''){
                response.addErrorOutput("Weird bug with Google Sheets.", "You first row of data (ie not the headers) needs to have at least 1 number.");
            }

            
            var data = [];
            
            // Google Docs returns its data in a wonky JSON array. Convert it to key: value pairs.
            rawData.table.rows.map(function(row, j){                
                var outputRow = {};
                
                row.c.map(function(item, i){ 
                    if (item) {
                    	outputRow[headers[i]] = item.v;
                    } else {
                      	outputRow[headers[i]] = null;   
                    }
                });
                data.push(outputRow);
            });
        } catch(err){
            response.addErrorOutput("Could not parse your data");
            response.end();
            return;
        }
        
        if (data.length == 0){
            response.addErrorOutput("No matches found. Here are the column names that came back with your query:", JSON.stringify(headers));
        }
        
        response.addOutput('data', data);
        response.end();
    });
});


function getUnique(my_array) {
    var o = {}, i, l = my_array.length, r = [];
    for(i=0; i<l;i+=1) o[my_array[i]] = my_array[i];
    for(i in o) r.push(o[i]);
    return r;
}
