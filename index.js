/**
 * @version 5.2.0
 * @author Mahmoud Al-Refaai <Schuttelaar & Partners>
 */

export default class InfiniteScroll {

    /**
     * Constructor of the InfiniteScroll object
     * @param {Object} config                               the configuration of this InfiniteScroll instance
     * @param {1} [config.segment]                          the segment number on initiate. Default is the value of segment param in window query-string or `1` if this param doesn't exist.
     * @param {"segment"} [config.segmentParam]             override the default param name 'segment'
     * @param {string} config.container                     string selector of the content container (eg: "#containerId" or ".containerClass")
     * @param {false} [config.lockInfiniteScroll]           boolean weather to prevent scroll-event from trigger the fetch function
     * @param {true} [config.autoFill]                      boolean weather to keep fetching data on first load until the page is filled (ie. scrollbar appear) 
     * @param {false} [config.autoScroll]                   boolean weather to scroll down to last segment on page load, in case the segment > 1.
     * @param {false} [config.fetchOnInitiate]              boolean weather to fetch all data till the specified segment on infinite scroll initiate      
     * @param {number} [config.offset]                      number in pixels such that fetch is triggered on reaching this offset before the end of the content list
     * @param {string} config.dataRoute                     the url-route to fetch the data from
     * @param {'html'|'json'} [config.dataType]             the data-type of the response, ['html' | (default) 'json']
     * @param {()=>string|JSON} [config.getDataParams]      function return the data (query string or object) to be used in fetch request
     * @param {(res: string|JSON)=>void} config.onSuccess   callback function when fetch request succeed
     * @param {(err: Error)=>void} [config.onError]         callback function when fetch request failed
     * @param {string} [config.noResultsSelector]           Selector string of HTML element to show if there are no results at all (ie. no results in the first segment or `fetchOnInitiate`).
     * @param {string} [config.noResultsMessage]            HTML string for message when no results to show (ie. no results in the first segment or `fetchOnInitiate`).
     * @param {(res: string|JSON)=>void} [config.onNoResults]            callback function when there is no results at all (ie. no results in the first segment or `fetchOnInitiate`).
     * 
     * @param {(value: number)=>void} [config.updateContentCounter]      callback function to update the total number of items. The value is passed directly from `ContentCounter` header.
     * @param {(key: string, value: string)=>void} [config.updateParam]  callback function to update the segment param in query string
     * 
     * @param {boolean} config.loadingIndicator.active      boolean whether to use loading indicator while fetching, default = false
     * @param {string} config.loadingIndicator.container    string for query selector of container, default is the parent of config.container passed above
     * @param {string} config.loadingIndicator.color        string indicate the color hash or color name
     * @param {string} config.loadingIndicator.size         string with number + unit (eg. '20px', '0.7em')
     * @param {number} config.loadingIndicator.type         type of indicator [0 => custom, 1 => circle spinning dots, 2 => horizontal dots], default set to 1
     * @param {string} config.loadingIndicator.html         HTML string for custom loading indicator (Note: class of outer div need to be 'inf-loading-indicator'), 
     *                                                      to use this custom indicator the type should be set to 0.
     * 
     * @param {boolean} config.loadMoreIndicator.active     boolean whether to use load more indicator when there is more content to fetch, default = false
     * @param {string} config.loadMoreIndicator.container   string for query selector of container, default is the parent of config.container passed above
     * @param {string} config.loadMoreIndicator.color       string indicate the color hash or color name
     * @param {string} config.loadMoreIndicator.scale       integer to specify the scale of the indicator icon, default = 5
     * @param {boolean} config.loadMoreIndicator.animated   boolean weather to animate load-more indicator, default = true
     * @param {function} config.loadMoreIndicator.onHover   function that fire on 'mouseover' over load-more-indicator, default = this.autoFill()
     * @param {string} config.loadMoreIndicator.html        string with HTML of custom load-more indicator (Note: class of outer div need to be 'inf-load-more-indicator'), 
     *                                                      if this not used, the default load-more icon will be used.
     */
    constructor(config) {
        this.config = {
            segment: undefined, //this will be override below
            segmentParam: 'segment',
            container: '',
            lockInfiniteScroll: false,
            autoFill: true,
            autoScroll: false,
            fetchOnInitiate: false,
            scrollLsn: true,
            offset: document.documentElement.clientHeight / 2,
            dataRoute: '',
            dataType: 'json',
            getDataParams: () => window.location.search.substr(1),
            onSuccess: () => {},
            onError: () => {},
            noResultsSelector: "",
            noResultsMessage: document.querySelector(config.container).dataset.noResultsMessage,
            onNoResults: () => {},
            updateContentCounter: () => {},
            updateParam: (key, value) => {
                const dataParams = new URLSearchParams(window.location.search);
                dataParams.set(key, value);
                history.pushState({}, document.title, window.location.href.split('?')[0] +
                    '?' + decodeURI(dataParams.toString()) + window.location.hash);
            },
            loadingIndicator: {
                active: false,
                container: document.querySelector(config.container).parentNode,
                color: 'lightgray',
                size: '0.7em',
                type: 1,
                html: '', //if type == 0, this html will be used as custom indicator and no style will be applied.
            },
            loadMoreIndicator: {
                active: false,
                container: document.querySelector(config.container).parentNode,
                color: 'lightgray',
                scale: 5,
                html: '',
                animated: true,
                onHover: () => this.fetch(),
            },
        };

        this.editConfig(config);

        //in case this hasn't been override by config argument
        if (this.config.segment === undefined) {

            // Get segment parameter from query string
            const urlParams = new URLSearchParams(window.location.search);
            const segmentParam = urlParams.get(this.config.segmentParam);
            this.config.segment = segmentParam && !isNaN(segmentParam) ? parseInt(segmentParam) : 1;
        }

        //store onScroll function in a local variable so it can be used later on removed
        this.onScroll = function() {
            const { scrollHeight, scrollTop, clientHeight } = document.documentElement;
            if (!this.config.lockInfiniteScroll && (scrollTop + clientHeight > scrollHeight - this.config.offset))
                this.fetch();
        }
        this.scrollHandler = this.onScroll.bind(this);
        this.abortController = new AbortController();

        this.config.scrollLsn && this.addScrollLsn();
        this.$container = document.querySelector(this.config.container);

        this.config.loadingIndicator.active &&
            initLoadingIndicator(this.config.loadingIndicator);
        this.$loadingIndicator = document.querySelector('.inf-loading-indicator');

        this.config.loadMoreIndicator.active &&
            initLoadMoreIndicator(this.config.loadMoreIndicator);
        this.$loadMoreIndicator = document.querySelector('.inf-load-more-indicator');

        this.noResultsHandler = (res) => {
            if(this.config.noResultsMessage) {
                let parser = new DOMParser();
                let doc = parser.parseFromString(this.config.noResultsMessage, 'text/html');
                document.querySelector(this.config.container).append(doc.body.firstChild);
            }

            if(this.config.noResultsSelector)
                document.querySelector(this.config.noResultsSelector).style.display = '';

            this.config.onNoResults(res);
        }

        // fetch initial data; 
        // Since fetchOnInitiate is true, the first segment will be cached before rendering in fetch function!
        if (this.config.fetchOnInitiate) {
            this.fetch().then((moreContent) => {

                //scroll down to last segment after initial fetch is done
                if (this.config.autoScroll && this.config.segment > 1)
                    this.scrollDown();

                //if autoFill is enabled, keep fetching next segments to fill the page
                moreContent && this.config.autoFill && this.autoFill();
            }).catch(() => {}); //in case of error (rejected promise), ignore it!
        } else {
            if (this.config.autoScroll && this.config.segment > 1)
                this.scrollDown();

            //cache first segment, then proceed to autoFill
            this.config.lockInfiniteScroll = true;
            this.cacheNextSegment().then(() => {
                this.config.lockInfiniteScroll = false;
                this.config.autoFill && this.autoFill();
            });
        }

        // Bind all class' functions to "this"
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
        methods
            .filter(method => (method !== 'constructor'))
            .forEach((method) => { this[method] = this[method].bind(this); });
    }

    editConfig(config) {
        for (let key in config)
            if (typeof this.config[key] === 'object')
                Object.assign(this.config[key], config[key]);
            else
                this.config[key] = config[key];
    }

    /**
     * Add the scroll event listener to this container
     */
    addScrollLsn() {
        window.addEventListener('scroll', this.scrollHandler, true);
    }

    /**
     * Remover the scroll listener from this container
     */
    removeScrollLsn() {
        window.removeEventListener('scroll', this.scrollHandler, true);
    }

    /**
     * Repeat fetching data until the page is filled (ie. scrollbar is shown).
     */
    autoFill() {
        if (document.body.clientHeight <= document.documentElement.clientHeight + this.config.offset) {
            this.fetch()
                .then((moreContent) => {
                    //in case there is still more content to fetch, check again if the page is not filled.
                    moreContent && this.autoFill();
                })
                .catch((e) => {
                    console.log(e);
                }); //in case of error (rejected promise), ignore it!
        }
    }

    /**
     * Scroll down to the last three element in the container.
     */
    scrollDown() {
        let container = document.querySelector(this.config.container);
        container.children &&
            container.children.length > 3 &&
            container.children[container.children.length - 3].scrollIntoView({ behavior: "smooth" });
    }

    /**
     * preform fetch request to the given route and with dataParams given in constructor's config
     */
    async fetch() {
        if (this.config.lockInfiniteScroll) return;
        this.config.lockInfiniteScroll = true;

        if(this.config.noResultsSelector)
            document.querySelector(this.config.noResultsSelector).style.display = 'none';

        if (this.config.loadMoreIndicator.active)
            this.$loadMoreIndicator.style.display = 'none';

        if (this.config.loadingIndicator.active)
            this.$loadingIndicator.style.display = 'inherit';


        if (this.config.fetchOnInitiate) {

            //cache first segment before rendering
            let resFirst = await this.cacheNextSegment();

            //check if there is no results
            // if another request comes in before this request is over, then this will be aborted and `lockInfiniteScroll` will be false!
            if (!resFirst.length && this.config.lockInfiniteScroll)
                    this.noResultsHandler(resFirst);

            if (!resFirst.length) return;
        }

        //increase and update segment state
        this.config.segment++;
        this.config.updateParam(this.config.segmentParam, this.config.segment);

        //render cached data
        let res = sessionStorage.getItem('infiniteScrollData');
        if (this.config.dataType == 'json')
            res = JSON.parse(res);

        this.config.onSuccess(res);

        //check if there is no results, ie. first segment has no results
        if(res.length === 0 && this.config.segment <= 2 && this.config.lockInfiniteScroll)
            this.noResultsHandler(res);

        //look up and cache the next segment, return weather there is moreContent or not
        return this.cacheNextSegment()
            .then(res => {
                if (res.length) {
                    this.config.lockInfiniteScroll = false;

                    if (this.config.loadMoreIndicator.active)
                        this.$loadMoreIndicator.style.display = 'flex';

                    return true;
                } else {
                    this.config.lockInfiniteScroll = true;
                    return false;
                }
            })
            .catch(err => {
                if (this.config.loadingIndicator.active)
                    this.$loadingIndicator.style.display = 'none';

                if (err.message == 404)
                    this.config.lockInfiniteScroll = true;

                this.config.onError(err);
                return false;
            });
    }

    /**
     * look up the next segment and store it in cache (session storage)
     */
    async cacheNextSegment() {
        this.abortController.abort();
        this.abortController = new AbortController();
        const dataParams = new URLSearchParams(this.config.getDataParams());

        //Add initial param if this an initial fetch (on page load)
        if (this.config.fetchOnInitiate) {
            this.config.fetchOnInitiate = false;
            dataParams.set('initial', 1);

            // Since this is an initial fetch, we don't need segment to increase,
            // so decrease here to cancel out with the increase in response callback.
            this.config.segment--;
        }

        // fetch next segment
        dataParams.set(this.config.segmentParam, this.config.segment + 1);

        return fetch(this.config.dataRoute + '?' + dataParams.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': this.config.dataType == 'html' ? 'text/html' : 'application/json',
                },
                signal: this.abortController.signal
            })
            .then(async(response) => {
                if (response.status != 200)
                    throw new Error(response.status);

                let res = {};
                if (this.config.dataType == 'html') {
                    res = await response.text();
                    res = res.trim();
                    sessionStorage.setItem('infiniteScrollData', res);
                } else if (this.config.dataType == 'json') {
                    res = await response.json();
                    sessionStorage.setItem('infiniteScrollData', JSON.stringify(res));
                }

                if (this.config.loadingIndicator.active)
                    this.$loadingIndicator.style.display = 'none';

                if (response.headers.get('No-Content'))
                    res = [];

                if (response.headers.get('Content-Counter') !== null)
                    this.config.updateContentCounter(response.headers.get('Content-Counter'))

                return res;
            })
            .catch(err => {
                if (err.name === "AbortError") {
                    return [];
                }

                if (this.config.loadingIndicator.active)
                    this.$loadingIndicator.style.display = 'none';

                if (err.message == 404)
                    this.config.lockInfiniteScroll = true;

                this.config.onError(err);
                return [];
            });
    }

    /**
     * @param {boolean} lock set to false to unlock the infinite scroll.
     */
    setLockInfiniteScroll(lock) {
        this.config.lockInfiniteScroll = lock;
    }

    /**
     * @param {int} segmentNo the new segment number to be set on.
     */
    setSegment(segmentNo = 1) {
        this.config.segment = segmentNo;
    }

    /**
     * Reset the segment to 0, and unlock the infinite scroll.
     */
    reset(removeContents = true) {
        if (removeContents) {
            while (this.$container.firstChild)
                this.$container.removeChild(this.$container.firstChild);

            if (this.config.loadingIndicator.active)
                this.$loadingIndicator.style.display = 'inherit';

            if (this.config.loadMoreIndicator.active)
                this.$loadMoreIndicator.style.display = 'none';

            if(this.config.noResultsSelector)
                document.querySelector(this.config.noResultsSelector).style.display = 'none';
        }

        this.abortController.abort();
        this.config.fetchOnInitiate = true;
        this.config.lockInfiniteScroll = false;
        this.config.segment = 1;
    }
}

/**
 * Initiate loading indicator through injecting the required HTML with 
 * the corresponding CSS as a <style> tag to the specified container.
 * @param {Bool} config.active         boolean whether to use loading indicator while fetching, default = false
 * @param {String} config.container    string for query selector of container, default is the parent of config.container passed above
 * @param {String} config.color        string indicate the color hash or color name
 * @param {String} config.size         string with number + unit (eg. '20px', '0.7em')
 * @param {int} config.type            type of indicator [0 => custom, 1 => circle spinning dots, 2 => horizontal dots], default set to 1
 * @param {String} config.html         string with HTML of custom loading indicator (class of outer div need to be 'inf-loading-indicator'),                                                       to use this custom indicator the type should be set to 0.
 */
export function initLoadingIndicator(config) {
    let { container, color = 'lightgray', size = '0.7em', type, html } = config;

    if (typeof container === 'string')
        container = document.querySelector(container);

    switch (type) {
        case 0: //custom indicator, just append html to container, hence no need to override html value
            break;
            //case 1: same as default
        case 2:
            html = `<div style="display: flex; justify-content: center; align-items: center">
                        <div class="inf-loading-indicator"><div></div><div></div><div></div><div></div></div> 
                        <style>
                            .inf-loading-indicator {
                                display: inline-block;
                                position: relative;
                                width: calc(${size} * 4.7);
                                height: calc(${size} * 5);
                            }
                            .inf-loading-indicator div {
                                position: absolute;
                                top: calc(${size} * 2);
                                width: ${size};
                                height: ${size};
                                border-radius: 50%;
                                background: ${color};
                                animation-timing-function: cubic-bezier(0, 1, 1, 0);
                            }
                            .inf-loading-indicator div:nth-child(1) {
                                left: calc(${size} *  0.44);
                                animation: inf-loading-indicator1 0.6s infinite;
                            }
                            .inf-loading-indicator div:nth-child(2) {
                                left: calc(${size} *  0.44);
                                animation: inf-loading-indicator2 0.6s infinite;
                            }
                            .inf-loading-indicator div:nth-child(3) {
                                left: calc(${size} *  1.77);
                                animation: inf-loading-indicator2 0.6s infinite;
                            }
                            .inf-loading-indicator div:nth-child(4) {
                                left: calc(${size} *  3.11);
                                animation: inf-loading-indicator3 0.6s infinite;
                            }
                            @keyframes inf-loading-indicator1 {
                                0% {
                                transform: scale(0);
                                }
                                100% {
                                transform: scale(1);
                                }
                            }
                            @keyframes inf-loading-indicator3 {
                                0% {
                                transform: scale(1);
                                }
                                100% {
                                transform: scale(0);
                                }
                            }
                            @keyframes inf-loading-indicator2 {
                                0% {
                                transform: translate(0, 0);
                                }
                                100% {
                                transform: translate(calc(${size} *  1.33), 0);
                                }
                            }      
                        </style>
                    </div>`;
            break;
        default:
            html = `<div style="display: flex; justify-content: center; align-items: center">
                        <div class="inf-loading-indicator" style="display: none;"></div>
                        <style>
                            .inf-loading-indicator {
                                color: ${color};
                                font-size: ${size};
                                margin: calc(${size} * 10);
                                width: calc(${size} * 1.428);
                                height: calc(${size} * 1.428);
                                border-radius: 50%;
                                position: relative;
                                animation: load4 1.3s infinite linear;
                                transform: translateZ(0);
                            }
                            @keyframes load4 {
                                0%,
                                100% {
                                box-shadow: 0 -3em 0 0.2em, 2em -2em 0 0em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 0;
                                }
                                12.5% {
                                box-shadow: 0 -3em 0 0, 2em -2em 0 0.2em, 3em 0 0 0, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 -1em;
                                }
                                25% {
                                box-shadow: 0 -3em 0 -0.5em, 2em -2em 0 0, 3em 0 0 0.2em, 2em 2em 0 0, 0 3em 0 -1em, -2em 2em 0 -1em, -3em 0 0 -1em, -2em -2em 0 -1em;
                                }
                                37.5% {
                                box-shadow: 0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0em 0 0, 2em 2em 0 0.2em, 0 3em 0 0em, -2em 2em 0 -1em, -3em 0em 0 -1em, -2em -2em 0 -1em;
                                }
                                50% {
                                box-shadow: 0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 0em, 0 3em 0 0.2em, -2em 2em 0 0, -3em 0em 0 -1em, -2em -2em 0 -1em;
                                }
                                62.5% {
                                box-shadow: 0 -3em 0 -1em, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 0, -2em 2em 0 0.2em, -3em 0 0 0, -2em -2em 0 -1em;
                                }
                                75% {
                                box-shadow: 0em -3em 0 -1em, 2em -2em 0 -1em, 3em 0em 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 0, -3em 0em 0 0.2em, -2em -2em 0 0;
                                }
                                87.5% {
                                box-shadow: 0em -3em 0 0, 2em -2em 0 -1em, 3em 0 0 -1em, 2em 2em 0 -1em, 0 3em 0 -1em, -2em 2em 0 0, -3em 0em 0 0, -2em -2em 0 0.2em;
                                }
                            }      
                        </style>
                    </div>`;
    }
    let parser = new DOMParser();
    let doc = parser.parseFromString(html, 'text/html');
    container.append(doc.body.firstChild);
}

/**
 * Initiate load-more indicator through injecting the required HTML with the corresponding CSS as a <style> tag to the specified container.
 * @param {boolean} config.active     boolean whether to use load more indicator when there is more content to fetch, default = false
 * @param {string} config.container   string for query selector of container, default is the parent of config.container passed above
 * @param {string} config.color       string indicate the color hash or color name
 * @param {string} config.scale       integer to specify the scale of the indicator icon, default = 5
 * @param {boolean} config.animated   boolean weather to animate load-more indicator, default = true
 * @param {function} config.onHover   function that fire on 'mouseover' over load-more-indicator, default = this.autoFill()
 * @param {string} config.html        string with HTML of custom load-more indicator (Note: class of outer div need to be 'inf-load-more-indicator'), 
 *                                    if this not used, the default load-more icon will be used.                                                    to use this custom indicator the type should be set to 0.
 */
export function initLoadMoreIndicator(config) {
    let { container, color = 'lightgray', scale = 5, html, animated = true, onHover = () => {} } = config;

    if (typeof container === 'string')
        container = document.querySelector(container);

    if (!html) {
        html = `<div class="inf-load-more-indicator" style="display: flex; justify-content: center; align-items: center; padding: 50px;">
                    <svg width="${13.415 * scale}" height="${14 * scale}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                        <defs>
                            <polygon id="a" points="12,        0
                                                    13.414214, 1.4142136 
                                                    6.707107,  8.1213204 
                                                    0,         1.4142136 
                                                    1.414214,  0 
                                                    6.707107,  5.2928932"></polygon>
                        </defs>
                        <use id="inf-load-more-upper-arrow" x="0" y="0" xlink:href="#a" fill="${color}" transform="scale(${scale})"/>
                        <use id="inf-load-more-lower-arrow" x="0" y="5" xlink:href="#a" fill="${color}" transform="scale(${scale})"/>
                    </svg>`;
        html += animated ?
            `<style>
                    @keyframes down1 {
                        from {y: 0;}
                        to {y: 1.15;}
                    }

                    @keyframes down2 {
                        from {y: 5;}
                        to {y: 5.6;}
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-${scale * 3}px); }
                        to { opacity: 1; transform: translateY(0); } 
                    }

                    @keyframes fadeOut {
                        to { opacity: 0; transform: translateY(${scale * 10}px); visibility: hidden; } 
                    }
                    
                    /* The element to apply the animation to */
                    #inf-load-more-upper-arrow {
                        animation: down1 1.5s ease-in-out .5s infinite alternate;
                    }
                    #inf-load-more-lower-arrow {
                        animation: down2 1.5s ease-in-out .5s infinite alternate;
                    }

                    .inf-load-more-indicator {
                        animation: fadeIn .5s ease-in 0s;
                        animation-fill-mode: forwards;
                    }
                </style>` : '';
        html += `</div>`;
    }
    let parser = new DOMParser();
    let doc = parser.parseFromString(html, 'text/html');
    doc.body.firstChild.addEventListener('mouseover', (e) => {
        if (animated) e.currentTarget.style.animation = 'fadeOut .5s ease-out 0s';

        setTimeout((el, onHover, animated) => {
            if (animated) el.style.animation = 'fadeIn .5s ease 0s';
            onHover();
        }, 350, e.currentTarget, onHover, animated);
    })
    container.append(doc.body.firstChild);
}