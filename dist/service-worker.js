/**
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// This generated service worker JavaScript will precache your site's resources.
// The code needs to be saved in a .js file at the top-level of your site, and registered
// from your pages in order to be used. See
// https://github.com/googlechrome/sw-precache/blob/master/demo/app/js/service-worker-registration.js
// for an example of how you can register this script and handle various service worker events.

'use strict';



var PrecacheConfig = [["dist/fonts/glyphicons-halflings-regular.woff","fa2772327f55d8198301fdb8bcfc8158"],["dist/images/ArcReader128.png","164987354c946221ffc6b93be4d083ef"],["dist/images/ArcReader16.png","a24cd533d822200cb538a72b8ddea52a"],["dist/images/ArcReader64.png","1010f3b154ab8f371c79cd9ba4dbbd1c"],["dist/images/LayerBasemap32.png","08a408dfedfd04337d8192a38985f2b0"],["dist/images/Runway.PNG","fcb3ad4352f63cd581032fecaaff8ccd"],["dist/images/apple-touch-icon-114x114.png","df7a8eb50b1ba553cebb4f4c7c86306e"],["dist/images/apple-touch-icon-120x120.png","6c458111e07235ecb241efcec70dce51"],["dist/images/apple-touch-icon-144x144.png","b20cd1405433147502da48dc43c3d6fa"],["dist/images/apple-touch-icon-152x152.png","8bef34413e8106162deff93fea53959a"],["dist/images/apple-touch-icon-57x57.png","1fcc7269f4cd6e7d38c7718ea76d4cc8"],["dist/images/apple-touch-icon-60x60.png","e0a69bbe6bc6b96c5c16e1ef9afd2006"],["dist/images/apple-touch-icon-72x72.png","b27f34052d598f550aef82a8e63b0831"],["dist/images/apple-touch-icon-76x76.png","863392f38a436c0ef9ed57b7ff1b3633"],["dist/images/blank_map_tile.png","62de3b51405f3426376d0b6e313ba143"],["dist/images/blue-pin.png","e9c66789440c15d2eab03b4e0a4236c7"],["dist/images/code.txt","eebb453803092450b0d6471aa91be26d"],["dist/images/favicomatic.zip","7d1f7caddcb08f84071088c17bda634a"],["dist/images/favicon-128.png","cc5508ccd3c0e3322a73ad1820b6fa44"],["dist/images/favicon-16x16.png","0497f26c4870c15a3faef83437aeaaa4"],["dist/images/favicon-196x196.png","a621c4526b3d9de942ec85dce07745b2"],["dist/images/favicon-32x32.png","7f169a100015b6159812b3ae9d763489"],["dist/images/favicon-96x96.png","f67696f7ac7bf883cd93c43316602c28"],["dist/images/favicon.ico","be85d9b15c9824203f11003c8472c0b0"],["dist/images/launcher-icon-1x.png","abbe13bab8aa19725eb8e3799883e43f"],["dist/images/loading-throb.gif","b6244f45960bfcd79e31fef4adc59a61"],["dist/images/loading.gif","275e632d1e3ebffa3069db40cfb6aca7"],["dist/images/logo-rsw.png","1b7468f1625fa666672bdc49b78a6b59"],["dist/images/mstile-150x150.png","aa6bc37392cf090cd82672ca76004be3"],["dist/images/mstile-310x150.png","b770e70e3a075e0c7e042df928054485"],["dist/images/mstile-310x310.png","5f760e7503dd2961c7e62d7a1dda76be"],["dist/images/notile.png","bf14a327f371407f84410c07140a532c"],["dist/images/notile.psd","d6b136acb8906947aa3d50b2f3ebaba2"],["dist/images/red-pin.png","42e8c5f7341444e9d15861a5fd16f445"],["dist/images/sdk_gps_location.png","737a296f491514be56c499131dd01377"],["dist/images/tiny-image.png","5cce6f43089d9a5c3ace4e17338ebec4"],["dist/index.html","412218dc26f0f528a3a6f3de58ed05f5"]];
var CacheNamePrefix = 'sw-precache-v1-web-starter-kit-' + (self.registration ? self.registration.scope : '') + '-';


var IgnoreUrlParametersMatching = [/^utm_/];



var addDirectoryIndex = function (originalUrl, index) {
    var url = new URL(originalUrl);
    if (url.pathname.slice(-1) === '/') {
      url.pathname += index;
    }
    return url.toString();
  };

var populateCurrentCacheNames = function (precacheConfig, cacheNamePrefix, baseUrl) {
    var absoluteUrlToCacheName = {};
    var currentCacheNamesToAbsoluteUrl = {};

    precacheConfig.forEach(function(cacheOption) {
      var absoluteUrl = new URL(cacheOption[0], baseUrl).toString();
      var cacheName = cacheNamePrefix + absoluteUrl + '-' + cacheOption[1];
      currentCacheNamesToAbsoluteUrl[cacheName] = absoluteUrl;
      absoluteUrlToCacheName[absoluteUrl] = cacheName;
    });

    return {
      absoluteUrlToCacheName: absoluteUrlToCacheName,
      currentCacheNamesToAbsoluteUrl: currentCacheNamesToAbsoluteUrl
    };
  };

var stripIgnoredUrlParameters = function (originalUrl, ignoreUrlParametersMatching) {
    var url = new URL(originalUrl);

    url.search = url.search.slice(1) // Exclude initial '?'
      .split('&') // Split into an array of 'key=value' strings
      .map(function(kv) {
        return kv.split('='); // Split each 'key=value' string into a [key, value] array
      })
      .filter(function(kv) {
        return ignoreUrlParametersMatching.every(function(ignoredRegex) {
          return !ignoredRegex.test(kv[0]); // Return true iff the key doesn't match any of the regexes.
        });
      })
      .map(function(kv) {
        return kv.join('='); // Join each [key, value] array into a 'key=value' string
      })
      .join('&'); // Join the array of 'key=value' strings into a string with '&' in between each

    return url.toString();
  };


var mappings = populateCurrentCacheNames(PrecacheConfig, CacheNamePrefix, self.location);
var AbsoluteUrlToCacheName = mappings.absoluteUrlToCacheName;
var CurrentCacheNamesToAbsoluteUrl = mappings.currentCacheNamesToAbsoluteUrl;

function deleteAllCaches() {
  return caches.keys().then(function(cacheNames) {
    return Promise.all(
      cacheNames.map(function(cacheName) {
        return caches.delete(cacheName);
      })
    );
  });
}

self.addEventListener('install', function(event) {
  var now = Date.now();

  event.waitUntil(
    caches.keys().then(function(allCacheNames) {
      return Promise.all(
        Object.keys(CurrentCacheNamesToAbsoluteUrl).filter(function(cacheName) {
          return allCacheNames.indexOf(cacheName) == -1;
        }).map(function(cacheName) {
          var url = new URL(CurrentCacheNamesToAbsoluteUrl[cacheName]);
          // Put in a cache-busting parameter to ensure we're caching a fresh response.
          if (url.search) {
            url.search += '&';
          }
          url.search += 'sw-precache=' + now;
          var urlWithCacheBusting = url.toString();

          console.log('Adding URL "%s" to cache named "%s"', urlWithCacheBusting, cacheName);
          return caches.open(cacheName).then(function(cache) {
            var request = new Request(urlWithCacheBusting, {credentials: 'same-origin'});
            return fetch(request.clone()).then(function(response) {
              if (response.status == 200) {
                return cache.put(request, response);
              } else {
                console.error('Request for %s returned a response with status %d, so not attempting to cache it.',
                  urlWithCacheBusting, response.status);
                // Get rid of the empty cache if we can't add a successful response to it.
                return caches.delete(cacheName);
              }
            });
          });
        })
      ).then(function() {
        return Promise.all(
          allCacheNames.filter(function(cacheName) {
            return cacheName.indexOf(CacheNamePrefix) == 0 &&
                   !(cacheName in CurrentCacheNamesToAbsoluteUrl);
          }).map(function(cacheName) {
            console.log('Deleting out-of-date cache "%s"', cacheName);
            return caches.delete(cacheName);
          })
        )
      });
    }).then(function() {
      if (typeof self.skipWaiting == 'function') {
        // Force the SW to transition from installing -> active state
        self.skipWaiting();
      }
    })
  );
});

if (self.clients && (typeof self.clients.claim == 'function')) {
  self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
  });
}

self.addEventListener('message', function(event) {
  if (event.data.command == 'delete_all') {
    console.log('About to delete all caches...');
    deleteAllCaches().then(function() {
      console.log('Caches deleted.');
      event.ports[0].postMessage({
        error: null
      });
    }).catch(function(error) {
      console.log('Caches not deleted:', error);
      event.ports[0].postMessage({
        error: error
      });
    });
  }
});


self.addEventListener('fetch', function(event) {
  if (event.request.method == 'GET') {
    var urlWithoutIgnoredParameters = stripIgnoredUrlParameters(event.request.url,
      IgnoreUrlParametersMatching);

    var cacheName = AbsoluteUrlToCacheName[urlWithoutIgnoredParameters];
    var directoryIndex = 'index.html';
    if (!cacheName && directoryIndex) {
      urlWithoutIgnoredParameters = addDirectoryIndex(urlWithoutIgnoredParameters, directoryIndex);
      cacheName = AbsoluteUrlToCacheName[urlWithoutIgnoredParameters];
    }

    if (cacheName) {
      event.respondWith(
        // We can't call cache.match(event.request) since the entry in the cache will contain the
        // cache-busting parameter. Instead, rely on the fact that each cache should only have one
        // entry, and return that.
        caches.open(cacheName).then(function(cache) {
          return cache.keys().then(function(keys) {
            return cache.match(keys[0]).then(function(response) {
              return response || fetch(event.request).catch(function(e) {
                console.error('Fetch for "%s" failed: %O', urlWithoutIgnoredParameters, e);
              });
            });
          });
        }).catch(function(e) {
          console.error('Couldn\'t serve response for "%s" from cache: %O', urlWithoutIgnoredParameters, e);
          return fetch(event.request);
        })
      );
    }
  }
});

