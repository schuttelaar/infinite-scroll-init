[![npm](https://img.shields.io/npm/v/infinite-scroll-init)](https://www.npmjs.com/package/infinite-scroll-init)
![npm bundle size](https://img.shields.io/bundlephobia/min/infinite-scroll-init?color=green)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/infinite-scroll-init?color=green)
![npm](https://img.shields.io/npm/dm/infinite-scroll-init?color=yellow)
![NPM](https://img.shields.io/npm/l/infinite-scroll-init)

# Infinite Scroll Init
Initiate infinite scrolling container `<div>` that consumes content from an API with option for a cool loading indicator 😎.
The package expose the `InfiniteScroll` class by default, which is used to instantiate the infinite scroll object with the desired configurations. Further, you can use this object to make reset/fetch call (for example when filter is applied), or change the state such as the segment number of other configurations.

The package also expose `initLoadingIndicator` function as a component, that can be used to initiate loading indicator on given container, without having to initiate the infinite scroll. This is used on pages that doesn't require infinite scroll, but a loading indicator is needed.

## Installation

```
npm i --save infinite-scroll-init
```

Then.. 
Typical use case with [`query-string-modifier`](https://github.com/schuttelaar/query-string-modifier) package..

```js
import InfiniteScroll from 'infinite-scroll-init';
import QueryString from 'query-string-modifier';

// Initialize QueryString obj with default behavior
const qs = new QueryString(); 

// Get segment parameter from query string
let segmentParam = qs.get('page');
let segment = segmentParam && !isNaN(segmentParam)? parseInt(segmentParam) : 1;

// Initialize InfiniteScroll obj
const infiniteScroll = new InfiniteScroll({
    segment: segment,
    container: '#cards.container',
    autoScroll: true,
    ajaxRoute: '/cards/data',
    ajaxDataType: 'json',
    getAjaxData: qs.getAllParams,
    onSuccess: appendCards,
    updateParam: qs.updateParam,
    loadingIndicator: {
        active: true,
        color: '#3B9E98',
    }
});

/**
 * Handle the result retrieved from Ajax request corresponds to each segment
 */ 
function appendCards(res) { 
    ...
 }
```


## Changes history
#### TBD
 - `autoFill` should be integrated in `fetch()` function. It works now on initiate with exposed `autoFill()` function, 
   which is the same as `fetch()`, but keep fetching till the page is filled.

#### v3.1
 - Lock infinite scroll when the server return 404 response (indication of no more content to fetch)
 - Abort running Ajax request when another fetch is called meanwhile
 - add removeContents argument to `reset( [true|false] )` function, which is set to true by default,
   such that it empties the container and display the loadingIndicator in case it's activated. 
 - `autoFill` is set to true by default

#### v3.0
 - Add loadingIndicator, which can be configured by passing the value to config 
   as an object with these keys `{ active, container, color, size, type, html }`
 - Expose `initLoadingIndicator()` function for separate use without infinite scroll

#### v2.3
 - Better handling for auto scroll using vanilla js
 - `scrollDown()` function that scroll to the last three element of container

#### v2.2
 - Add `segmentParam` to config, so this override the default param name 'segment'.
 - Change `updateSegmentParam` in config back to `updateParam`, as the segment param name is given now.

#### v2.1
 - Add autoScroll to config which let the view scroll down to last segment on initiate
 - Add `reset()` function that reset value (normally used on filter change)
 - Support list-param, ie key with multiple values and end with "[]" or its encoded value "%5B%5D"
   when converting query string to object as dataParams in fetch call
 - Alias: `fetch()` => `fetchData()`

#### v2.0
 - Add `getAjaxData()` to config, which returns the data need to be used in AJAX request,
   instead of hard-coding the data in fetch function. The default value is current window query string.
 - `getAjaxData()` config should now return an object with `{ key: value }` list,
   However, a normal query string can be used, and a conversion to object will happen on fetch.  
 - Check 'NoMoreContent' in response header. In case it is set to true, the infinityScroll will be locked accordingly.
   The fallback of not having 'NoMoreContent' in response header is the same as previous 
   version behaviour, ie. lock infinityScroll after first request with no results.
 - Change `updateParam()` in config to `updateSegmentParam()`, which takes only the segment number to update queryString
   This changes enable specifying the parameter name (page, segment.. etc), as shown in this example: 
   `config = { updateSegmentParam: seg => queryString.updateParam('PARAM_NAME', seg) }`. [Deprecated in v2.2]
 - Add fetchOnInitiate to config, which allow for initial fetch with "initial" param set to retrieve 
   all data till the specified segment on page load.

#### v1.1
 - [Fix] Bind all class' functions to "this" keyword in the constructor
 - Add ajaxDataType to config param in constructor
 - remove the use of setter "set attributeName()" syntax because of binding issue
   It is now a normal function, ie. `setLockInfiniteScroll()`, `setSegment()`
 - Use "segment" param instead of "page" in url query string