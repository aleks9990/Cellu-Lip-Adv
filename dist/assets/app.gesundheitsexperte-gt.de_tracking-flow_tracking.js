/* GTM container */
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TVNN5QK');

/* Axon (AppLovin) Pixel Initialization */
var AXON_EVENT_KEY="5c3bf167-ed47-496d-96c3-bade406102b9";
!function(e,r){var t=["https://s.axon.ai/pixel.js","https://res4.applovin.com/p/l/loader.iife.js"];if(!e.axon){var a=e.axon=function(){a.performOperation?a.performOperation.apply(a,arguments):a.operationQueue.push(arguments)};a.operationQueue=[],a.ts=Date.now(),a.eventKey=AXON_EVENT_KEY;for(var n=r.getElementsByTagName("script")[0],o=0;o<t.length;o++){var i=r.createElement("script");i.async=!0,i.src=t[o],n.parentNode.insertBefore(i,n)}}}(window,document);
axon("init");
console.log('[Axon] Pixel initialized with key:', AXON_EVENT_KEY);

/* Send page_view event immediately after init */
(function() {
    setTimeout(function() {
        const pageViewEvent = {};
        const userId = window.axonUserId || null;
        if (userId && userId.length >= 6) {
            pageViewEvent.user_id = userId;
        }
        if (window.axon && typeof window.axon === 'function') {
            axon('track', 'page_view', pageViewEvent);
            console.log('[Axon] page_view event sent:', pageViewEvent);
        }
    }, 1000);
})();

    /* MGID Sensor */
    (function() {
        var d = document, w = window;
        w.MgSensorData = w.MgSensorData || [];
        w.MgSensorData.push({
            cid:968323,
            project: "a.mgid.com"
        });
        var l = "a.mgid.com";
        var n = d.getElementsByTagName("script")[0];
        var s = d.createElement("script");
        s.type = "text/javascript";
        s.async = true;
        var dt = !Date.now?new Date().valueOf():Date.now();
        s.src = "https://" + l + "/mgsensor.js?d=" + dt;
        n.parentNode.insertBefore(s, n);
    })();
/* Scroll Depth Config (must run before tracker) */
/**
 * Scroll Depth Config Builder
 *
 * Builds window.scrollDepthConfig from URL parameters for WP-hosted prelanders.
 * Must run BEFORE scroll-engage.js which reads the config.
 *
 * Skips if config is already set (Laravel blade pages set it via inline <script>).
 *
 * Path A (ab + sf_session in URL): Laravel created the row, config built from sf_* params.
 * Path B (last_seen_funnel, no ab): generates wp-* session, sets config.
 *         Row creation is handled server-side by the WP plugin where active.
 */
(function () {
    'use strict';

    if (window.scrollDepthConfig) return;

    var params = new URLSearchParams(window.location.search);
    var parts = window.location.hostname.split('.');
    var base = parts.slice(-2).join('.');
    var tld = parts[parts.length - 1];
    var country = tld === 'com' ? 'gb' : tld;
    var endpoint = 'https://app.' + base + '/api/v1/page-engage';

    /* Path A: Laravel-originated traffic (ab + sf_session in URL) */
    var sfSession = params.get('sf_session');
    if (sfSession) {
        window.scrollDepthConfig = {
            sessionId: sfSession,
            flowId: parseInt(params.get('last_seen_funnel')) || 0,
            flowSlug: params.get('sf_flow') || '',
            stepPosition: parseInt(params.get('sf_step')) || 1,
            stepType: params.get('sf_step_type') || 'prelander',
            countryId: params.get('sf_country') || country,
            endpoint: endpoint
        };
        return;
    }

    /* Path B: Direct visit (last_seen_funnel present, no ab) */
    var funnelId = params.get('last_seen_funnel');
    if (!funnelId || params.get('ab')) return;

    /* Session ID: read from cookie or generate new */
    var ck = 'gt_vs_' + funnelId;
    var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + ck + '=([^;]*)'));
    var sid;
    if (m) {
        sid = decodeURIComponent(m[1]);
    } else {
        sid = 'wp-' + ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
            return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
        });
        document.cookie = ck + '=' + sid + '; path=/; max-age=172800; SameSite=Lax';
    }

    /* Flow slug: try localStorage cache */
    var slugKey = 'gt_fs_' + country + '_' + funnelId;
    var flowSlug = '';
    try { flowSlug = localStorage.getItem(slugKey) || ''; } catch (e) { }

    window.scrollDepthConfig = {
        sessionId: sid,
        flowId: parseInt(funnelId),
        flowSlug: flowSlug || ('wp-' + funnelId),
        stepPosition: 1,
        stepType: 'prelander',
        countryId: country,
        endpoint: endpoint
    };
})();

/* Scroll Depth Tracker */
(function () {
    'use strict';

    var config = window.scrollDepthConfig;
    if (!config || !config.endpoint) return;

    var THRESHOLDS = [5, 10, 15, 33, 50, 66, 80, 90, 100];
    var MILESTONES = ['ump', 'ums', 'lead', 'product-reveal', 'closing-sales'];
    var storageKey = 'sdt_' + (config.flowSlug || '') + '_' + (config.stepPosition || 0);
    var milestoneStorageKey = 'sdm_' + (config.flowSlug || '') + '_' + (config.stepPosition || 0);
    var firedThresholds = {};
    var firedMilestones = {};
    var maxDepth = 0;
    var ticking = false;

    try {
        var stored = sessionStorage.getItem(storageKey);
        if (stored) firedThresholds = JSON.parse(stored);
    } catch (e) {}

    try {
        var storedMilestones = sessionStorage.getItem(milestoneStorageKey);
        if (storedMilestones) firedMilestones = JSON.parse(storedMilestones);
    } catch (e) {}

    function getSessionId() {
        if (config.sessionId) return config.sessionId;

        if (config.flowId) {
            try {
                var name = 'sales_funnel_' + config.flowId;
                var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
                if (match) {
                    var data = JSON.parse(decodeURIComponent(match[1]));
                    return data.session_id || null;
                }
            } catch (e) {}
        }

        return null;
    }

    function getScrollPercent() {
        var docHeight = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        var scrollable = docHeight - viewportHeight;

        if (scrollable <= 0) return 100;

        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return Math.min(100, Math.round((scrollTop / scrollable) * 100));
    }

    function postEngagement(payload) {
        try {
            fetch(config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(function () {});
        } catch (e) {}
    }

    function basePayload() {
        return {
            session_id: getSessionId(),
            flow_slug: config.flowSlug || '',
            step_position: config.stepPosition || 0,
            step_type: config.stepType || '',
            country_id: config.countryId || ''
        };
    }

    function sendScrollDepth(threshold) {
        var sessionId = getSessionId();
        if (!sessionId) return;

        var payload = basePayload();
        payload.max_scroll_depth = threshold;
        postEngagement(payload);
    }

    function sendMilestone(name) {
        var sessionId = getSessionId();
        if (!sessionId) return;

        var payload = basePayload();
        payload.milestone = name;
        postEngagement(payload);
    }

    function checkThresholds() {
        var percent = getScrollPercent();

        for (var i = 0; i < THRESHOLDS.length; i++) {
            var t = THRESHOLDS[i];
            if (percent >= t && !firedThresholds[t]) {
                firedThresholds[t] = true;
                maxDepth = t;

                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: 'scroll_depth',
                    scroll_threshold: t,
                    flow_slug: config.flowSlug || '',
                    step_position: config.stepPosition || 0
                });

                try {
                    window.dispatchEvent(new CustomEvent('gtn:scroll_depth', {
                        detail: { threshold: t, flowSlug: config.flowSlug, stepPosition: config.stepPosition },
                        bubbles: true
                    }));
                } catch (e) {}

                sendScrollDepth(t);
            }
        }

        if (maxDepth > 0) {
            try { sessionStorage.setItem(storageKey, JSON.stringify(firedThresholds)); } catch (e) {}
        }
    }

    function onScroll() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(function () {
                checkThresholds();
                ticking = false;
            });
        }
    }

    function setupMilestoneObservers() {
        if (!('IntersectionObserver' in window)) return;

        var pending = MILESTONES.filter(function (name) { return !firedMilestones[name]; });
        if (pending.length === 0) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var name = entry.target.getAttribute('data-scroll-milestone');
                if (!name || firedMilestones[name]) return;

                firedMilestones[name] = true;
                try { sessionStorage.setItem(milestoneStorageKey, JSON.stringify(firedMilestones)); } catch (e) {}

                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: 'scroll_milestone',
                    milestone: name,
                    flow_slug: config.flowSlug || '',
                    step_position: config.stepPosition || 0
                });

                try {
                    window.dispatchEvent(new CustomEvent('gtn:scroll_milestone', {
                        detail: { milestone: name, flowSlug: config.flowSlug, stepPosition: config.stepPosition },
                        bubbles: true
                    }));
                } catch (e) {}

                sendMilestone(name);
                observer.unobserve(entry.target);
            });
        }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

        pending.forEach(function (name) {
            var el = document.querySelector('.scroll-depth-' + name + ', #scroll-depth-' + name);
            if (el) {
                el.setAttribute('data-scroll-milestone', name);
                observer.observe(el);
            }
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    checkThresholds();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupMilestoneObservers);
    } else {
        setupMilestoneObservers();
    }
})();
