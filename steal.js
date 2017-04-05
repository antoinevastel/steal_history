"use strict";

const NEVER_VISITED =
  "http://address-you-must-have-never-visited-before:100000";
const NEVER_VISITED2 =
  "http://address-you-must-have-never-visited-before:200000";
const LINKS = [
  location.href,
  "https://www.google.com",
  "https://www.facebook.com",
  "https://twitter.com",
  "https://twitter.com/upsuperx",
  "https://bugzilla.mozilla.org",
  "https://hg.mozilla.org/releases/mozilla-aurora/rev/2a94d540599e",
];

const test_area = document.getElementById('test-area');
const test_links = test_area.children;

function initTestArea() {
  var count = 500 / Math.pow(window.devicePixelRatio, 2);
  // We create count links
  for (var i = 0; i < count; i++) {
    var a = document.createElement('a');
    a.appendChild(document.createTextNode(' ### ### ###'));
    test_area.appendChild(a);
  }
}

function setTestAreaLink(link) {
  for (var i = 0; i < test_links.length; i++) {
    test_links[i].href = link;
  }
}

function requestAnimationFrames(callbacks) {
  if (callbacks.length > 0) {
    requestAnimationFrame(function(t){
      callbacks.shift()(t);
      requestAnimationFrames(callbacks);
    });
  }
}

function EMPTY_LOOP(){}
function checkOnePass(link, calibrate) {
  return new Promise(function(resolve, reject){
    var timestamps = [];
    function getCallback(link, log_time) {
      return function(t){
        if (log_time){
          timestamps.push(t);
        }
        setTestAreaLink(link);
      };
    }
    var callbacks;
    if(calibrate){
      callbacks = [
        getCallback(NEVER_VISITED, true), EMPTY_LOOP,
        getCallback(NEVER_VISITED2, true), EMPTY_LOOP,
        getCallback(NEVER_VISITED, true), EMPTY_LOOP,
        function(t){
          timestamps.push(t);
          resolve({
            base: [timestamps[1] - timestamps[0],
                  timestamps[2] - timestamps[1]]
          });
        }
      ];
    } else{
      callbacks = [
        getCallback(NEVER_VISITED, false),
        getCallback(link, true), EMPTY_LOOP,
        getCallback(NEVER_VISITED, true), EMPTY_LOOP,
        function(t){
            timestamps.push(t);
            resolve({
              test: [timestamps[1] - timestamps[0],
                    timestamps[2] - timestamps[1]],
            });
          }
        ];
    }

    requestAnimationFrames(callbacks);
  });
}
function computeMedian(series) {
  var sorted = series.slice(0);
  sorted.sort();
  var median_index = Math.floor(sorted.length / 2);
  if (median_index * 2 != sorted.length) {
    return sorted[median_index];
  } else {
    return (sorted[median_index - 1] + sorted[median_index]) / 2;
  }
}
function examineTimeSeries(test_series, base_series) {
  var test_median = computeMedian(test_series);
  var base_median = computeMedian(base_series);
  return test_median > base_median * 1.1;
}

// TODO: improve speed by doing base serie only once for all ?
function checkIsLinkVisited(link, calibrate, base_series) {
  return new Promise(function(resolve, reject){
    var test_series = [];
    var promise = Promise.resolve();
    for (var i = 0; i < 2; i++) {
      promise = promise
        .then(function(){
          return checkOnePass(link, calibrate);
        })
        .then(function(times){
            if(!calibrate){
              test_series.push(...times.test);
            } else{
              base_series.push(...times.base);
            }
        });
    }
    promise.then(function(){
      if(calibrate){
        resolve(base_series);
      } else{
        var visited = examineTimeSeries(test_series, base_series);
        resolve({ visited, test_series, base_series });
      }
    });
  });
}

function listTimes(time_series) {
  return time_series.map(t => Math.round(t)).join(', ');
}
function generateDetails(result) {
  var ul = document.createElement('ul');
  ul.className = 'details';
  var test = document.createElement('li');
  var base = document.createElement('li');
  test.appendChild(document.createTextNode(`test: ${listTimes(result.test_series)}`));
  base.appendChild(document.createTextNode(`base: ${listTimes(result.base_series)}`));
  ul.appendChild(test);
  ul.appendChild(base);
  return ul;
}

const links = document.getElementById('links');
window.onload = () => {
  initTestArea();
  var promise = Promise.resolve();
  var calibrate = true;
  var base_series = [];
  // We do the non visited first
  promise = promise
    .then(function(){
      return checkIsLinkVisited(NEVER_VISITED, calibrate, base_series);
    })
    .then(function(result){
      base_series = result;
      var li = document.createElement('li');
      li.className = result.visited ? 'visited' : 'unvisited';
      calibrate = false;
      return Promise.resolve();
    }).then(function(){
      LINKS.forEach(function(link){
        promise = promise
          .then(function(){
            return checkIsLinkVisited(link, calibrate, base_series);
          })
          .then(function(result){
            var li = document.createElement('li');
            li.className = result.visited ? 'visited' : 'unvisited';
            var a = document.createElement('a');
            a.href = link;
            a.appendChild(document.createTextNode(link));
            li.appendChild(a);
            li.appendChild(generateDetails(result));
            links.appendChild(li);
          });
      });
    })
};