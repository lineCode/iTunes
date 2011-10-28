/*
 * 
 * iTunes interface for Node.js
 * Author: Garrett Wilkin 
 * Date  : 2011/1/7 
 * 
 * 
 */
var http = require('http');
var iResults= require('./iresults').iResults;
var Timer = require('./util/timer').Timer;
var querystring = require('querystring');
var iError = require('./ierror').iError;

/*
 * 
 * Seperate object for parameters to facilitate use with query string. 
 * Specific to iTunes. This is the full set of searchable fields.
 * 
 */

function iParameters() {

    this.term = '';
    this.country = 'us';
    this.media = 'all';
    this.entity = 'musicTrack';
    this.attribute = 'all';
    this.limit = '1';
    this.lang = 'en_us';
    this.version = '2';
    this.explicit = 'Yes';

};

/*
 * 
 * Object to hold iTunes specific attributes.
 * 
 */

function iTunes() {
    this.params = new iParameters();
    this.basePath = '/WebObjects/MZStoreServices.woa/wa/wsSearch?';
    this.server = 'ax.itunes.apple.com';
};
exports.iTunes = iTunes;

// Converts class' parameters JSON to a query string.
iTunes.prototype.getQuery = function() {
    var query = querystring.stringify(this.params);
    return query;
};

/*
 This function fires off the http request to iTunes.
 The type of data object to be returned must be specified.
 A callback must now be provided. This callback will be given two parameters:
    - error - a boolean indicating whether or not there was an error
    - data - an object encapsulating the information relevant to the request. 
 */

iTunes.prototype.request = function(dataType, callback) {
    var self = this;
    var results = new iResults();
    var clock = new Timer(self.params.term);
    var apple = http.createClient(80,self.server);
    var query = self.getQuery();
    var path = self.basePath + query;
    var request = apple.request('GET',path,{host:self.server});
    apple.request('GET',path);
    request.end();
    clock.set();
    request.on('response', function(response) {
        response.setEncoding('utf8');
        response.on('data', function(chunk) {
            clock.elapsed('data');
            results.capture(chunk);
        });
        response.on('end',function() {
            clock.elapsed('end');
            self.responseEnd(dataType,results,callback);
        });
    });
};

iTunes.prototype.processAlbum = function(results, callback) {
    var error = null;
    var data = null;
    var album = new Album();
    if (results.hits > 1) {
        error = new iError(0);
        console.log(error);
    } else if ( results.hits == 0)  {
        error = new iError(1);
        console.log(error);
    } else if ( results == null)  {
        error = new iError(3);
        console.log(error);
    } else {
        data = results.getAlbum();
        if (data == null) {
            error = new iError(4);
            console.log(error);
        } else if (data.error == null) {
            album = data.album;
            console.log('pulled album from data'+ album);
        } else if (data.error != null) {
            error = data.error;
        }
    };
    if (error != null) {
        console.log(error);
    }
    console.log('+++++++++++\n'+ album +'\n++++++++++');
    callback(error,album);
};

iTunes.prototype.processArtist = function(results, callback) {
    var error = 0;
    var data = null;
    callback(error, data);
};

iTunes.prototype.processTrack = function(results, callback) {
    var error = null;
    var data = null;
    if (results.hits > 1) {
        error = new iError(0);
        console.log(error);
    } else if ( results.hits == 0)  {
        error = new iError(1);
        console.log(error);
    } else {
        data = results.getTrack();
        if (data == null) {
            error = new iError(7);
            console.log(error);
        } else if (data.error == null) {
            track = data.track;
        } else if (data.error != null) {
            error = data.error;
        }
    };
    callback(error, track);
};
/*
 As the request to the iTunes store completes, this function is called to process that response.  It passes the job of parsing the results off to the iResults class.  It then determines what type of object should be passed to the callback function based on the dataType requested by they user. The idea here is that in the future, additional objects other than albums will be supported.  That future planning makes dataType necessary.
 */

iTunes.prototype.responseEnd = function(dataType, results, callback) {
    var self = this;
    var error = null;
    var data = null;
    if (results.parse()) {
        switch(dataType)
        {
        case 'album':
            console.log(results);
            self.processAlbum(results,callback);
            break;
        case 'artist':
            if (results.hits > 1) {
                error = 1;
            } else if ( results.hits == 0)  {
                error = 1;
            } else {
                data = results.getArtist();
            };
            break;
        case 'track':
            self.processTrack(results,callback);
            break;
        case 'raw':
            data = results.data; // returns JSON for full results
        default:
            error = 1;
            callback(error,data);
        }
    } else {
        error = 1;
        callback(error,data);
    };
    callback(error,data);
};

/*
 This function: 1 - sets the parameters required for looking up an album.
                2 - requests that an Album data type be passed to the callback.
 */

iTunes.prototype.lookupAlbum = function(params, callback) {
    var self = this;
    var artist = params.artist;
    var album = params.album;
    self.params.media='music';
    self.params.entity='album';
    self.params.attribute='albumTerm';
    self.params.term=album;
    self.request('album',callback);
};

iTunes.prototype.lookupArtist = function(params, callback) {
    var self = this;
    var artist = params.artist;
    self.params.media='music';
    self.params.entity='musicArtist';
    self.params.attribute='artistTerm';
    self.params.term=artist;
    self.request('artist',callback);
};

iTunes.prototype.lookupTrack = function(params, callback) {
    var self = this;
    var artist = params.artist;
    var track = params.track;
    self.params.media='music';
    self.params.entity='musicTrack';
    self.params.attribute='musicTrackTerm';
    self.params.term = track;
    self.request('track',callback);
}
