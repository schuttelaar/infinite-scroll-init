/**
 * @version 3.2
 * @author Mahmoud Al-Refaai <Schuttelaar & Partners>
 */

export default class InfiniteScroll {

    /**
     * Constructor of InfiniteScroll object
     * @param {int} config.segment              the number of segment to start on
     * @param {String} config.segmentPara       override the default param name 'segment'
     * @param {String} config.container         string selector of the container (eg: "#containerId" or ".containerClass")
     * @param {Bool} config.lockInfiniteScroll  if set to true, scrolling down won't trigger the fetch function
     * @param {Bool} config.autoFill            boolean weather to keep fetching data until the page is filled (ie. scrollbar appear)
     * @param {Bool} config.fetchOnInitiate     boolean to fetch all data till the specified segment on infinite scroll initiate      
     * @param {String} config.ajaxRoute         the url-route to be used in AJAX
     * @param {String} config.ajaxDataType      the data-type of the response of the AJAX request
     * @param {function} config.getAjaxData     function return the data (query string or object) used in AJAX request
     * @param {function} config.onSuccess       callback function when AJAX request succeed
     * @param {function} config.onError         callback function when AJAX request failed
     * @param {function} config.updateParam     callback function to update the segment param in query string
     * 
     * @param {Bool} config.loadingIndicator.active         boolean whether to use loading indicator while fetching, default = false
     * @param {String} config.loadingIndicator.container    string for query selector of container, default is the parent of config.container passed above
     * @param {String} config.loadingIndicator.color        string indicate the color hash or color name
     * @param {String} config.loadingIndicator.size         string with number + unit (eg. '20px', '0.7em')
     * @param {int} config.loadingIndicator.type            type of indicator [0 => custom, 1 => circle spinning dots, 2 => horizontal dots], default set to 1
     * @param {String} config.loadingIndicator.html         string with HTML of custom loading indicator (class of outer div need to be 'inf-loading-indicator'), 
     *                                                      to use this custom indicator the type should be set to 0.
     */
    constructor(config) {
        this.config = {
            segment: 1,
            segmentParam: 'segment',
            container: '',
            lockInfiniteScroll: false,
            autoFill: true,
            autoScroll: false,
            fetchOnInitiate: false,
            ajaxRoute: '/',
            ajaxDataType: 'json',
            getAjaxData: () => window.location.search.substr(1),
            onSuccess: () => {},
            onError: () => {},
            updateParam: () => {},

            loadingIndicator: {
                active: false,
                container: document.querySelector(config.container).parentNode,
                color: 'lightgray',
                size: '0.7em',
                type: 1,
                html: '', //if type == 0, this html will be used as custom indicator and no style will be applied.
            },
        };

        this.editConfig(config);
        this.addScrollLsn();
        this.$container = document.querySelector(this.config.container);
        this.currAjax = null;

        this.config.loadingIndicator.active &&
            initLoadingIndicator(this.config.loadingIndicator);

        this.$loadingIndicator = document.querySelector('.inf-loading-indicator');

        // fetch initial data;
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

            this.config.autoFill && this.autoFill();
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
     * To handle scroll event on window
     */
    scrollHandler() {
        const { scrollHeight, scrollTop, clientHeight } = document.documentElement;
        if (!this.config.lockInfiniteScroll && (scrollTop + clientHeight > scrollHeight - 5))
            this.fetch();
    }

    /**
     * Add the scroll event listener to this container
     */
    addScrollLsn() {
        window.addEventListener('scroll', () => this.scrollHandler());
    }

    /**
     * Remover the scroll listener from this container
     */
    removeScrollLsn() {
        window.removeEventListener('scroll', () => this.scrollHandler());
    }

    /**
     * Repeat fetching data until the page is filled (ie. scrollbar is shown).
     */
    autoFill() {
        if (document.body.clientHeight <= document.documentElement.clientHeight) {
            this.fetch()
                .then((moreContent) => {
                    //in case there is still more content to fetch, check again if the page is not filled.
                    moreContent && this.autoFill();
                })
                .catch(() => {}); //in case of error (rejected promise), ignore it!
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
     * preform ajax request through the given route in constructor
     */
    async fetch() {
        if (this.config.lockInfiniteScroll) return;
        this.config.lockInfiniteScroll = true;

        if (this.config.loadingIndicator.active)
            this.$loadingIndicator.style.display = 'inherit';

        let dataParams = this.config.getAjaxData() || {};

        //In case getAjaxData return a query string, convert it to object
        if (typeof dataParams === "string") {
            let temp = {};
            dataParams.split('&').forEach(e => {
                let param = e.split('=');
                param[0] = decodeURI(param[0]);

                if (param[0].slice(-2) === "[]") {
                    if (!temp[param[0]]) temp[param[0]] = [];
                    temp[param[0]].push(decodeURI(param[1]));
                } else {
                    temp[param[0]] = decodeURI(param[1]);
                }
            });
            dataParams = temp;
        }

        //Add initial param if this an initial fetch (on page load)
        if (this.config.fetchOnInitiate) {
            this.config.fetchOnInitiate = !this.config.fetchOnInitiate;
            dataParams.initial = 1;

            // Since this is an initial fetch, we don't need segment to increase,
            // so decrease here to cancel out with the increase in response callback.
            this.config.segment--;
        }

        // fetch next segment
        dataParams[this.config.segmentParam] = this.config.segment + 1;

        return fetch(this.config.ajaxRoute + '?' + new URLSearchParams(dataParams), {
                method: 'GET',
                headers: {
                    'Content-Type': this.ajaxDataType == 'html' ? 'text/html' : 'application/json',
                },
            })
            .then(async(response) => {
                if (response.status != 200)
                    throw new Error(response.status);

                let res = {};
                if (this.config.ajaxDataType == 'html')
                    res = await response.text();
                else if (this.config.ajaxDataType == 'json')
                    res = await response.json();

                return { res, noMoreContent: !!response.headers.get('NoMoreContent') };
            })
            .then(({ res, noMoreContent }) => {
                if (this.config.loadingIndicator.active)
                    this.$loadingIndicator.style.display = 'none';

                if (this.config.ajaxDataType == 'html')
                    res = res.trim();

                if (res.length) {
                    this.config.segment++;
                    this.config.updateParam(this.config.segmentParam, this.config.segment);

                    // in case the field 'noMoreContent' doesn't exist, the fallback is falsy value
                    this.config.lockInfiniteScroll = noMoreContent;
                    this.config.onSuccess(res);
                    return !noMoreContent;
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
    async fetchData() { return this.fetch(); }

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
        }

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

    let parser = new DOMParser();
    let doc = '';
    switch (type) {
        case 0: //custom indicator, just append html to container, hence no need to override html value
            break;
            //case 1: same as default
        case 2:
            html = `<div style="display: flex; justify-content: center; align-items: center">
                        <div class="inf-loading-indicator"><div></div><div></div><div></div><div></div></div>
                    </div> 
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
                    </style>`;
            break;
        default:
            html = `<div style="display: flex; justify-content: center; align-items: center">
                        <div class="inf-loading-indicator"></div>
                    </div>
                    <style>
                        .inf-loading-indicator {
                            color: ${color};
                            font-size: ${size};
                            margin: calc(${size} * 10);
                            width: calc(${size} * 1.428);
                            height: calc(${size} * 1.428);
                            border-radius: 50%;
                            position: relative;
                            -webkit-animation: load4 1.3s infinite linear;
                            animation: load4 1.3s infinite linear;
                            -webkit-transform: translateZ(0);
                            -ms-transform: translateZ(0);
                            transform: translateZ(0);
                        }
                        @-webkit-keyframes load4 {
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
                    </style>`;
    }
    doc = parser.parseFromString(html, 'text/html');
    container.appendChild(doc.body);
}