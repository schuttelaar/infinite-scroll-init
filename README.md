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
let segmentParam = qs.get('segment');
let segment = segmentParam && !isNaN(segmentParam)? parseInt(segmentParam) : 1;

// Initialize InfiniteScroll obj
const infiniteScroll = new InfiniteScroll({
    segment: segment,
    container: '#cards.container',
    autoScroll: true,
    ajaxRoute: '/cards/data',
    ajaxDataType: 'html',
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
## Constructor Configuration
### Required
The essential configuration that need to be passed to the constructor in order to have a functional infinite scroll, assuming the requested data in `json` format and no need to preserve the infinite scroll state after page reload.
| Config        | Type      | Description                                                                                                 |
| ------------- | :-------: | ----------------------------------------------------------------------------------------------------------- |
| container     | `string`  | The selector string of the container, eg. `'#containerId > .items'`.                                        |
| ajaxRoute     | `string`  | The url-route to be used in the fetch request.                                                              |
| onSuccess     | `function`| Callback function to handle the response result when the fetch is succeed. The 1st arg is the retrieved result.   |

### Optiona
| Config              | Type       | Default     | Description                                                       |
| ------------------- | :--------: |  :--------: | ----------------------------------------------------------------- |
| segment             | `int`      |   `1`         | The number of the segment to start with. This option is used when you restore infinite scroll state after page reloading, so you pass the number of the restored segment on the initialization. |
| segmentParam        | `string`   | `'segment'`   | The name of the segment parameter other than `segment`, like `page`. |
| lockInfiniteScroll  | `boolean`  |   `false`     | Lock infinite scroll, so scrolling down won't trigger the fetch function. |
| autoFill            | `boolean`  |   `true`      | Keep fetching data until the page is filled (ie. scrollbar appear) |
| fetchOnInitiate     | `boolean`  |   `false`     | Trigger a fetch call directly on initiate with `initial=1` param send in the initial request, so the API endpoint differentiate the initial fetch from normal segment fetch. |
| ajaxDataType        | `string`   |   `json`      | The type of retrieved data from fetch request. |
| getAjaxData         | `function` |   window's query-string | Function return the data (query string or js object) to be used in the fetch request. The default is the current window's query-string: </br> `() => window.location.search.substr(1)`|
| onError             | `function` |   `() => {}`  | Callback function when the fetch request failed.  |
| updateParam         | `function` |   `() => {}`  | Callback function to update the segment state externally (ie. by query-string or session storage). The 1st arg should be the parameter name, and the 2nd arg is the value, `updateParam(segmentParam, segment)`.|
| loadingIndicator    | `object`   |   inactive    | Please check the configuration of the loading indicator bellow.. |

### Loading indicator
The configuration in the table is set under loadingIndicator object.
| Config              | Type       | Default     | Description                                                              |
| ------------------- | :--------: |  :--------: | ------------------------------------------------------------------------ |
| active              | `boolean`  |   `false`   | If set to true, a loading indicator will show up during fetch request.   |
| container           | `string`   |   parent element of infinite-scroll container  | The selector string of the container. |
| color               | `string`   |`'lightgray'`| The name or hash of the indicator color. |
| size                | `string`   |   `'0.7em'` | The size of the loading indicator. |
| type                | `int`      |   1         | <li> 0 => custom indicator, check `html` option bellow </li> <li> 1 => circle spinning dots</li> <li>2 => horizontal animated dots</li> |
| html                | `string`   |   `''` | The HTML of a custom loading indicator (the class of the outer `<div>` need to be `inf-loading-indicator`). To use this custom indicator the type should be set to 0 |

## API
### InfiniteScroll
By default, the package exposes the `InfiniteScroll` class. Here you can find the functions/methods that can be used on the initialized instance of this class.
```js
import InfiniteScroll from 'infinite-scroll-init';

let config = {
    container: '#cards.container',
    ajaxRoute: '/cards/data',
    onSuccess: appendCards,
    loadingIndicator: {
        active: true,
        type: 2,
        color: '#3B9E98',
    }
};

// Initialize InfiniteScroll obj
const infiniteScroll = new InfiniteScroll(config);

// dynamically change some configuration
config.loadingIndicator.type = 1;
config.updateParam = (key, value) => sessionStorage.setItem(key, value);

/**
 * Update the configuration of this instance of InfiniteScroll.
 */
infiniteScroll.editConfig(config);

/**
 * Empty the items container, reset segment to 1, and unlock infinite scroll.
 */
infiniteScroll.reset();

/**
 * Reset segment to 1, and unlock infinite scroll.
 */
infiniteScroll.reset(false);

/**
 * Fetch the next segment of data.
 */
infiniteScroll.fetch();

// The fetch function return a promise that resolve
// to true, if the is more data to fetch.
// Otherwise it resolve to false.
infiniteScroll.fetch()
              .then((moreContent) => {
                if (moreContent)
                  //do something
                else
                  //do something else
               });
              .catch((error) => { ... });

/**
 * Make consecutive fetches until the page is filled, ie. the scrollbar appear.
 */
infiniteScroll.autoFill();

/**
 * lock the infinite scroll.
 */
infiniteScroll.setLockInfiniteScroll(true)

/**
 * Change segment number
 */
infiniteScroll.setSegment(2)

/**
 * Explicitly add/remove scroll listener that trigger the fetch call.
 * Normally, you don't need to call these functions, as they are utilized internally.
 */
infiniteScroll.addScrollLsn()
infiniteScroll.removeScrollLsn();

/**
 * Scroll down to the last three element in the container.
 * If the autoScroll option is set to true, this will be called internally on initiate.
 */
infiniteScroll.scrollDown();
```

### initLoadingIndicator
In case you need to use the loading indicator without initializing an infinite scroll. The package exposes the function for initializing it separately. The initialized indicator has the class `inf-loading-indicator`, so it can be hidden/shown by changing the css `display: none | block` externally. The loading configuration are the same. Please find all configuration in previous section.
```js
import { initLoadingIndicator } from 'infinite-scroll-init';

// Initialize loading indicator
initLoadingIndicator({
    container: '#containerId',
    color: '#3B9E98',
    type: 2
});

// Hide the loading indicator
$('inf-loading-indicator').css("display", "none");
```

## Changes history
#### TBD
 - `autoFill` should be integrated in `fetch()` function. It works now on initiate with exposed `autoFill()` function, 
   which is the same as `fetch()`, but keep fetching till the page is filled.

#### v3.2
 - `initLoadingIndicator()` function accepts selector string as container in constructor configuration.
 - Add constructor / API documentation

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