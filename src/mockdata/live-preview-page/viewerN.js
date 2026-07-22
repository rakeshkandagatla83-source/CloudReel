/* =========================================================
   CONFIG
========================================================= */

const SDK_APP_ID = 20006310; // MUST be number
const SECRET_KEY = "b4e9bcf94efe8e3d5546fcd17f60024e75f18b1b44564b85b28ee96aa14241a3";
const WS_URL = "wss://ws-htmlgfx-test.janya.video";
//const WS_URL = "ws://localhost:9705";
// const WS_URL = "ws://43.156.76.5:9705";
//const WS_URL = "http://183.82.45.28:3004/";
const DEFAULT_VIDEO_URL = "loading-vod.webm"; // default video url or file
let USER_ID;
let ROOM_ID;
let USER_SIG;
let trtc;
let SLDPS;


/* =========================================================
   DOM REFERENCES (must exist)
========================================================= */

const stage = document.getElementById("stage");
const bgLayer = document.getElementById("background");
//const lband = document.getElementById("lband");
const videoRoot = document.getElementById("video-root");

/* =========================================================
   STATE
========================================================= */

const slots = new Map();
const captionTimers = new Map();
const externalVideos = new Map();
const sldpsVideos = new Map();
const audioMuteMap = new Map();
// cropRegistry holds state for virtual duplicate slots that canvas-render a cropped region
// of a real TRTC source video. Keyed by virtualUserId.
const cropRegistry = new Map();
let tickerRafId = null;
let standbySyncTimer = null;


/* variables for gfx one*/
let lbandVal = {};
let lband;
let lband_on;
let lbandDetails;
let layoutData;
let webSocketData;
let upd_display;
let headerNews;
let headerTickerTimer;
let headerTickerIndex = 0;
let bottomTickerTimer;
let bottomTickerIndex = 0;
let bottomNews;
let LayoutDesg;
let LocUpdate;
let upcoming;
let headerCordinates;
let bottomCordinates;
let locationCordinates;
let VodLogo;
let VodLogoDetails;
let clockDetails;
let dateDetails;
let tickerUpdate;
let DateTimeDetails;
let bottomTickerNews;
let pollData;
let bTickerCordinates;
let pollAlignment;
let TimeFormat = "12hour";
let tickerSpeedPxPerSecond = 160;
let tickerNews;
let breakingNews;
let breakingNewsCordinates;
var breakingNewsInterval;

let ChannelName = '';
let AlignmnetDesg;

let isController = false;
let isGlobalMute = false;

let gfxStatusContext;
let heartBeatInterval;

const Mute_Icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume-off-icon lucide-volume-off"><path d="M16 9a5 5 0 0 1 .95 2.293"/><path d="M19.364 5.636a9 9 0 0 1 1.889 9.96"/><path d="m2 2 20 20"/><path d="m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11"/><path d="M9.828 4.172A.686.686 0 0 1 11 4.657v.686"/></svg>'
const Volume_Icon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume2-icon lucide-volume-2"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>'

/* variables */

/* defalut has to hide all gfx*/
displayProperty(false, "lband-div");
displayProperty(false, "top-news-grid");
displayProperty(false, "bottom-news-grid");
displayVisibility(false, "ticker-img");
displayVisibility(false, "ticker-news-grid");
displayProperty(false, "date-img");
displayProperty(false, "date-txt");
displayProperty(false, "time-txt");
// displayProperty(false, "time-img");
displayProperty(false, "time-div");
displayProperty(false, "bottom-ticker");
displayProperty(false, "breaking-news-div");
displayProperty(false, "vod-logo-div");
displayProperty(false, "loc-div");

let animationClasses = [
    "slide-up",
    "typed-out",
    "light-speed-in-bottom",
    "flip-in-x",
    "rotate-horizontal",
];
const bandMap = {
    l_band: ["lband-div"],
    top_band: ["top-news-grid"],
    bottom_ticker_band: ["bottom-news-grid", "bottom-ticker"],
    ticker_band: ["ticker-band", "ticker-news-grid"],//"ticker-img"
    date_band: ["date-img", "date-txt", "date-div"],
    clock_band: ["time-img", "time-txt", "time-div"],
    breaking_news_band: ["breaking-news-div"],
    logo_band: ["vod-logo-div"],
    location_band: ["loc-div"],
    lower_band: ["bottom-news-grid"]
};
function toBool(val) {
    return val === true || val === "True" || val === "true";
}

function hasActiveBackgroundMedia() {
    try {
        const media = bgLayer.querySelector("img, video");
        if (!media) return false;
        return media.dataset.standbyVideo !== "true";
    } catch (error) {
        console.error("Error in hasActiveBackgroundMedia:", error);
        return false;
    }
}

function hasActiveStageMedia() {
    try {
        if (stage.querySelector(".video video, .video canvas")) return true;

        for (const { bg } of slots.values()) {
            if (bg?.style?.backgroundImage && bg.style.backgroundImage !== "none" && bg.style.display !== "none") {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error("Error in hasActiveStageMedia:", error);
        return false;
    }
}

function clearStandbyVideo() {
    try {
        const standby = bgLayer.querySelector('[data-standby-video="true"]');
        if (!standby) return;
        standby.pause?.();
        standby.remove();
    } catch (error) {
        console.error("Error in clearStandbyVideo:", error);
    }
}

function syncStandbyVideo() {
    try {
        if (!DEFAULT_VIDEO_URL) return;

        const shouldShowStandby = !hasActiveBackgroundMedia() && !hasActiveStageMedia();
        const standby = bgLayer.querySelector('[data-standby-video="true"]');

        if (!shouldShowStandby) {
            clearStandbyVideo();
            return;
        }

        if (standby) {
            standby.play?.().catch(() => { });
            return;
        }

        bgLayer.innerHTML = "";
        const video = document.createElement("video");
        video.dataset.standbyVideo = "true";
        Object.assign(video, {
            src: DEFAULT_VIDEO_URL,
            autoplay: true,
            loop: true,
            muted: true,
            playsInline: true
        });
        bgLayer.appendChild(video);
        video.play?.().catch(() => { });
    } catch (error) {
        console.error("Error in syncStandbyVideo:", error);
    }
}

function requestStandbySync(delay = 150) {
    try {
        if (standbySyncTimer) clearTimeout(standbySyncTimer);
        standbySyncTimer = setTimeout(() => {
            standbySyncTimer = null;
            syncStandbyVideo();
        }, delay);
    } catch (error) {
        console.error("Error in requestStandbySync:", error);
    }
}

async function gfxAlignmentNdLayouts() {
    const url = "https://capidev.janya.video/api/get_gfx_setup_Data/getalignment/" + ChannelName + "/-1";
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();
        if (isValidData(result)) return;
        await GfxApiData(result);
        await gfxStatus();
    } catch (error) {
        console.error(error.message);
    }
}


async function gfxStatus() {
    const url = "https://capidev.janya.video/api/get_gfx_setup_Data/getstatus/" + ChannelName + "/-1";
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();
        if (isValidData(result)) return;
        const statusType = result.data[0].statusType;
        // convert string flags to real booleans before storing
        gfxStatusContext = Object.entries(statusType).reduce((acc, [k, v]) => {
            acc[k] = toBool(v);
            return acc;
        }, {});
        await gfxKeyPassing(statusType);
        await applyBandVisibility(gfxStatusContext);

    } catch (error) {
        console.error(error.message);
    }
}



async function applyBandVisibility(statusType) {
    try {
        Object.entries(bandMap).forEach(([bandKey, elementIds]) => {
            const isVisible = statusType[bandKey];
            elementIds.forEach(id => {
                displayProperty(isVisible, id);
            });
        });
    } catch (error) {
        console.error("Error applying band visibility:", error);
    }
}
async function gfxKeyPassing(obj) {
    // let trueKeys = Object.keys(obj).filter(key => obj[key] == "True");
    // if (trueKeys.length > 0) {
    //     await Promise.all(
    //         trueKeys.map((band) => gfxDetails(band)))
    // }
    try {
        const _bands = Object.keys(obj);
        if (_bands.length > 0) {
            await Promise.all(
                _bands.map((band) => gfxDetails(band)))
        }
    } catch (error) {
        console.error("Error in gfxKeyPassing:", error);
    }
}


async function gfxDetails(BandName) {
    const url = "https://capidev.janya.video/api/get_gfx_setup_Data/getvalue/" + ChannelName + "/" + BandName;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const result = await response.json();
        if (isValidData(result)) return;
        if (BandName == 'top_band') {
            result.headerNews = result;
            result.Type = 'p_headerNews',
                gfxTextNdBandsShow(result);
        }
        else if (BandName == 'logo_band') {
            result.VODLogo = result;
            result.Type = 'p_VODLogo',
                gfxTextNdBandsShow(result);
        }
        else if (BandName == 'lower_band') {
            result.bottomNews = result;
            result.Type = 'p_bottomNews',
                gfxTextNdBandsShow(result);
        }
        else if (BandName == 'l_band') {
            let lBandStructure = [];
            lBandStructure.push(result[0]);
            result.Type = 'p_Lband',
                result.lband = lBandStructure;
            gfxTextNdBandsShow(result);
        }
        else if (BandName == 'breaking_news_band') {
            result.breakingNews = result,
                result.Type = 'p_breakingNews'
            gfxTextNdBandsShow(result);

        }
        else if (BandName == 'ticker_band') {
            result.tickerNews = result;
            result.Type = 'p_tickerNews';
            gfxTextNdBandsShow(result);
        } 
        else if (BandName == 'location_band') {
            let locData = {
                Type: 'p_location',
                locNews: result
            };
            locUpdate(locData);
        }
    } catch (error) {
        console.error(error.message);
    }
}

async function gfxTextNdBandsShow(m) {
    try {
        if (m?.Type == "p_headerNews") {
            if (headerNews == undefined) {
                create_header_news(m);
                headerNews = m;
            } else if (JSON.stringify(headerNews) == JSON.stringify(m)) {
            } else {
                create_header_news(m);
                headerNews = m;
            }
        }
        else if (m?.Type == "p_VODLogo") {
            if (VodLogo == undefined) {
                VodLogoUpdate(m);
                VodLogo = m;
            }
        }
        else if (m?.Type == "p_bottomNews") {
            if (bottomNews == undefined) {
                create_bottom_news(m);
                bottomNews = m;
            }
        }
        else if (m?.Type == "p_Lband") {
            lBandUpdate(m);
        }
        else if (m?.Type == "p_breakingNews") {
            create_breaking_news(m);
            breakingNews = m;
        }
        else if (m?.Type == 'p_tickerNews') {
            if (tickerNews == undefined) {
                create_ticker(m);
                tickerNews = m;
            }
        }
    } catch (error) {
        console.error("Error in gfxTextNdBandsShow:", error);
    }

}




async function GfxApiData(Data) {
    try {
        if (isValidData(Data)) return;
        let filteredData = Data.data.filter(
            (item) => item.templatetype === 'template1'
        );
        if (filteredData.length > 0) {
            let alignment = filteredData[0].alignment;
            layout = filteredData[0].layout;
            if (alignment) {
                updateAlignment(alignment);
            }
            if (layout) {
                updateLayout(layout);
            }
        }
    } catch (error) {
        console.error("Error in GfxApiData:", error);
    }
}


function updateAlignment(alignment) {
    try {
        if (!alignment) { return; }
        if (alignment.l_band) {
            lBandPositioning(alignment.l_band);
        }
        if (alignment.top_band) {
            headerCordinate(alignment.top_band, gfxStatusContext?.["top_band"] || false);
        }
        if (alignment?.lower_band) {
            bottomPositioning(alignment.lower_band, gfxStatusContext?.["lower_band"] || false);
        }
        if (alignment.ticker_band) {
            updateTicker(alignment.ticker_band, gfxStatusContext?.["ticker_band"] || false);
        }
        if (alignment.clock_band) {
            updateClock(alignment.clock_band, gfxStatusContext?.["clock_band"] || false);
        }
        if (alignment.date_band) {
            updateDate(alignment.date_band, gfxStatusContext?.["date_band"] || false);
        }
        if (alignment.location_band) {
            locationPositioning(alignment.location_band, gfxStatusContext?.["location_band"] || false);
        }
        if (alignment.logo_band) {
            vodLogoPositioning(alignment.logo_band, gfxStatusContext?.["logo_band"] || false);
        }
        if (alignment.breaking_news_band) {
            updateBreakingNewsBand(alignment.breaking_news_band);
        }
    } catch (error) {
        console.error("Error in updateAlignment:", error);
    }
}


/* =========================================================
   SLOT MANAGEMENT
========================================================= */

function getSlot(id) {
    try {
        if (slots.has(id)) return slots.get(id);
        const slot = document.createElement("div");
        slot.className = "slot";

        const bg = document.createElement("div");
        bg.className = "bg-image";

        const video = document.createElement("div");
        video.className = "video";
        video.id = "video_" + id;

        const caption = document.createElement("div");
        caption.className = "caption";

        const captionText = document.createElement("div");
        captionText.className = "caption-text";
        caption.appendChild(captionText);

        slot.append(bg, video, caption);
        stage.appendChild(slot);

        const obj = { slot, bg, video, caption, captionText };
        slots.set(id, obj);
        return obj;
    } catch (error) {
        console.error("Error in getSlot:", error);
    }
}

/* =========================================================
   TRTC
========================================================= */
async function initTRTC() {
    try {
        if (!USER_SIG || typeof USER_SIG !== "string") {
            throw new Error("USER_SIG missing or not a string");
        }

        trtc = TRTC.create({
            sdkAppId: SDK_APP_ID,
            userId: USER_ID,
            userSig: USER_SIG
        });


        trtc.on(TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, ({ userId, streamType }) => {
            // clearStandbyVideo();
            if (streamType == TRTC.TYPE.STREAM_TYPE_MAIN) {
                const { video } = getSlot(userId);
                trtc.startRemoteVideo({ userId, streamType, view: video });
            }
            if (streamType == 'sub') {
                const { video } = getSlot(userId);
                trtc.startRemoteVideo({ userId, streamType, view: video });
            }
        });

        trtc.on(TRTC.EVENT.REMOTE_AUDIO_AVAILABLE, ({ userId }) => {
            const data = { userId, source: "TRTC", mute: false, type: 'AUDIO_CONTROL' }
            handleAudioMuteMap(data)
            muteTRTC(userId, isGlobalMute)
        })


        trtc.on(TRTC.EVENT.REMOTE_VIDEO_UNAVAILABLE, ({ userId }) => {
            const { bg } = getSlot(userId);
            if (bg.style.backgroundImage) bg.style.display = "block";
            requestStandbySync();
        });

        await trtc.enterRoom({
            sdkAppId: SDK_APP_ID,
            strRoomId: ROOM_ID,
            userSig: USER_SIG, // ✅ string only
            userId: USER_ID,
            role: "audience",
            autoReceiveAudio: false
        });

        console.log("[TRTC] Entered room:", ROOM_ID);

    } catch (error) {
        console.error("Error in initTRTC:", error);
    }
}
/* =========================================================
   LAYOUT
========================================================= */

/* ── Virtual duplicate crop slot ──────────────────────────────────────────────
   Called when a LAYOUT item has item.sourceUserId set, meaning this slot is a
   canvas-rendered crop of a real TRTC source rather than its own stream.
   No TRTC video is expected for item.userId — we draw from sourceUserId's video.
────────────────────────────────────────────────────────────────────────────── */
function applyDuplicateCropSlot(item) {
    try {
        // Reuse or create the slot div at the correct position
        const { slot } = getSlot(item.userId);
        Object.assign(slot.style, {
            left: item.x + 'px',
            top: item.y + 'px',
            width: item.w + 'px',
            height: item.h + 'px',
            border: item.border ? `${item.border.width}px solid ${item.border.color}` : '',
            borderRadius: item.border ? item.border.radius + 'px' : ''
        });

        // Hide: cancel rAF loop and clear registry entry
        if (item.w === 0 && item.h === 0) {
            const existing = cropRegistry.get(item.userId);
            if (existing?.rafId) cancelAnimationFrame(existing.rafId);
            cropRegistry.delete(item.userId);
            return;
        }

        // Cancel any previous rAF loop for this slot before starting a new one
        const existing = cropRegistry.get(item.userId);
        if (existing?.rafId) cancelAnimationFrame(existing.rafId);

        // Reuse existing canvas or create a new one inside the .video div
        const videoDiv = slot.querySelector('.video');
        let canvas = existing?.canvas ?? null;
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
            if (videoDiv) videoDiv.appendChild(canvas);
        }

        const entry = { sourceUserId: item.sourceUserId, crop: item.crop, rafId: null, canvas };
        cropRegistry.set(item.userId, entry);

        function drawLoop() {
            const sourceSlot = slots.get(entry.sourceUserId);
            const sourceVideo = sourceSlot?.video?.querySelector('video');

            if (sourceVideo && sourceVideo.readyState >= 2 && sourceVideo.videoWidth > 0) {
                const vw = sourceVideo.videoWidth;
                const vh = sourceVideo.videoHeight;
                const cropX = Math.round((entry.crop.x / 100) * vw);
                const cropY = Math.round((entry.crop.y / 100) * vh);
                const cropW = Math.min(Math.round((entry.crop.w / 100) * vw), vw - cropX);
                const cropH = Math.min(Math.round((entry.crop.h / 100) * vh), vh - cropY);

                // Resize canvas to match slot dimensions when they change
                const slotW = slot.offsetWidth;
                const slotH = slot.offsetHeight;
                if (canvas.width !== slotW || canvas.height !== slotH) {
                    canvas.width = slotW || 1;
                    canvas.height = slotH || 1;
                }

                if (cropW > 0 && cropH > 0 && canvas.width > 0 && canvas.height > 0) {
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(sourceVideo, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
                }
            }

            entry.rafId = requestAnimationFrame(drawLoop);
        }

        drawLoop();
    } catch (error) {
        console.error('Error in applyDuplicateCropSlot:', error);
    }
}

function applyLayout(item) {
    try {
        // Virtual duplicate slots are canvas-rendered — route to separate handler.
        // Existing code below is never reached for these items.
        if (item.sourceUserId) {
            applyDuplicateCropSlot(item);
            return;
        }

        const { slot } = getSlot(item.userId);
        Object.assign(slot.style, {
            left: item.x + "px",
            top: item.y + "px",
            width: item.w + "px",
            height: item.h + "px",
            border: item.border
                ? `${item.border.width}px solid ${item.border.color}`
                : "",
            borderRadius: item.border ? item.border.radius + "px" : ""
        });
    } catch (error) {
        console.error("Error in applyLayout:", error);
    }
}

/* =========================================================
   BACKGROUND
========================================================= */

function setBG(mode, url) {
    // bgLayer.innerHTML = "";
    const lastEl = bgLayer.firstChild;
    try {
        if (mode === "image") {
            const img = document.createElement("img");
            img.src = url;

            img.onload = () => {
                if (lastEl) {
                    bgLayer.replaceChild(img, lastEl)
                } else {
                    bgLayer.appendChild(img);
                }
            }
        }

        if (mode === "video") {
            const v = document.createElement("video");
            Object.assign(v, {
                src: url,
                autoplay: true,
                loop: true,
                muted: true
            });
            v.onloadeddata = () => {
                setTimeout(() => {
                    v.currentTime = 0.1;
                    if (lastEl) {
                        bgLayer.replaceChild(lastEl, v)
                    } else {
                        bgLayer.appendChild(v);
                    }
                }, 100);
            }
            // bgLayer.appendChild(v);
        }
    } catch (error) {
        console.error("Error in setBG:", error);
    }
}

/* =========================================================
   WEBSOCKET
========================================================= */

function initWebSocket() {
    try {
        const typePrams = new URLSearchParams(window.location.search);
        const type = typePrams.get("type");
        const ws = new WebSocket(WS_URL);
        ws.addEventListener("open", () => {
            let getContext = {
                type: "CONTEXT_REQUEST",
                channel: ChannelName,
                methodType: type
            };
            ws.send(JSON.stringify(getContext));

            let heartbeat = {
                Type: 'Heartbeat',
                channel: this.channelName,
                methodType: 'preview'
            }
            if (heartBeatInterval) clearInterval(heartBeatInterval);

            heartBeatInterval = setInterval(() => {
                ws.send(JSON.stringify(heartbeat));
            }, 40_000);
            // let settings_obj = {
            //     Type: "p_get_settings",
            //     channel: ChannelName,
            //     methodType: type
            // };
            // ws.send(JSON.stringify(settings_obj));
        })
        ws.onmessage = e => {
            let m = JSON.parse(e.data);
            // if (m.channel != ChannelName) {
            //     console.warn('channel name is mis matched')
            //     return;
            // }
            // if (m.methodType != 'master') {
            //     console.warn('not coming for master one');
            //     return;
            // }
            if (m.Type == 'Heartbeat') return;
            if (m.ApplicationType == 'MeetingEndNotify' && m.Command == 'MeetingEnded' && m.Status == 'success' && m.ChannelName == ChannelName) {
                console.log('Meeting Ended!');
                location.reload();
            }
            if (m.channel != ChannelName || m.methodType != type) {
                // console.warn('channel/page type name is mis matched')
                return;
            }
            // if (m.methodType == "master" && type == "master" && m.Type == "goLive" && !gfxStatusContext) gfxAlignmentNdLayouts();
            //if (!gfxStatusContext) gfxAlignmentNdLayouts();
            if (m.type === "LAYOUT") {
                clearStandbyVideo();
                m.layout.items.forEach(applyLayout);
            }
            // if (m.type === "CAPTION_ROTATE") captionRotate(m.userId, m);
            if (m.type === "CAPTION_ROTATE") m.users.forEach(user => { captionRotate(user.userId, user) });
            if (m.type === "BACKGROUND") setBG(m.mode, m.url);
            if (m.type === "EXTERNAL_VIDEO") playExternal(m.userId, m.url, m.loop);
            if (m.type === 'EXTERNAL_VIDEO_SEEK') seekExternalVideo(m)
            if (m.type === "SLDP") playSldp(m.userId, m.url);
            if (m.type === "FALLBACK_IMAGE") {
                setFallbackImage(m.userId, m.url, m.fit);
            }

            if (m.type === "EXTERNAL_BG_IMAGE") {
                setFallbackImage(m.userId, m.url, m.fit);
            }

            if (m.type === "REMOVE_FALLBACK_IMAGE") {
                hideFallbackImage(m.userId);
            }

            if (m.type === "AUDIO_CONTROL") {
                handleAudioControl(m)
            }

            if (m.type === "AUDIO_VOLUME") {

                if (m.source === "TRTC") {
                    setTRTCVolume(m.userId, m.volume);
                }

                if (m.source === "EXTERNAL_VIDEO") {
                    setExternalVideoVolume(m.userId, m.volume);
                }

                if (m.source === "EXTERNAL_AUDIO") {
                    setExternalAudioVolume(m.audioId, m.volume);
                }

                if (m.source === "SLDP_VIDEO") {
                    setSLDPVideoVolume(m.userId, m.volume);
                }

            }

            if (m.type === "VIDEO_TRANSFORM") {
                if (m.action === "reset") {
                    resetVideoTransform(m.userId);
                } else {
                    applyVideoTransform(m.userId, m.transform || {});
                }
            }


            // if(m.type==="LBAND"){
            //   if(m.action==="show")showLBand(m);
            //   if(m.action==="hide")hideLBand();
            // }
            if (m.Type) {
                if (m.channel != ChannelName) {
                    // console.warn('channel name is mismatched');
                    return;
                }
                // if (m.Type == "p_put_settings") {
                //     GfxData(m);
                // }
                //L band 
                if (m?.Type == "p_Lband") {
                    lBandUpdate(m);
                }
                if (m?.Type == "upd_display") {

                    if (
                        JSON.stringify(upd_display) == JSON.stringify(m)
                    ) {
                    }
                    else {
                        webSocketData = JSON.parse(e.data);
                        bandsVisibility(m);
                        upd_display = m;
                    }
                }
                //header news for top band
                if (m?.Type == "p_headerNews") {
                    if (headerNews == undefined) {
                        m = JSON.parse(e.data);
                        create_header_news(m);
                        headerNews = m;
                    } else if (JSON.stringify(headerNews) == JSON.stringify(m)) {
                    } else {
                        m = JSON.parse(e.data);
                        create_header_news(m);
                        headerNews = m;
                    }
                }
                //lower band for news
                if (m?.Type == "p_bottomNews") {
                    if (bottomNews == undefined) {
                        m = JSON.parse(e.data);
                        create_bottom_news(m);
                        bottomNews = m;
                    } else if (JSON.stringify(bottomNews) == JSON.stringify(m)) {
                    } else {
                        m = JSON.parse(e.data);
                        create_bottom_news(m);
                        bottomNews = m;
                    }
                }
                /* To add the text in bottom ticker*/
                if (m?.Type == "p_tickerNews") {
                    if (tickerNews == undefined) {
                        webSocketData = JSON.parse(e.data);
                        create_ticker(webSocketData);
                        tickerNews = m;
                    } else if (JSON.stringify(tickerNews) == JSON.stringify(m)) {
                    } else {
                        webSocketData = JSON.parse(e.data);
                        create_ticker(webSocketData);
                        tickerNews = m;
                    }
                }
                //time related
                if (m?.Type == "p_DateTime") {
                    if (DateTimeDetails == undefined) {
                        webSocketData = JSON.parse(e.data);

                        insertDateTime(m);
                        DateTimeDetails = m;
                    } else if (
                        JSON.stringify(DateTimeDetails) == JSON.stringify(m)
                    ) {
                    } else {
                        webSocketData = JSON.parse(e.data);

                        insertDateTime(m);

                        DateTimeDetails = m;
                    }
                }
                if (m?.Type == "p_VODLogo") {
                    if (VodLogo == undefined) {
                        webSocketData = JSON.parse(e.data);

                        VodLogoUpdate(m);
                        VodLogo = m;
                    } else if (JSON.stringify(VodLogo) == JSON.stringify(m)) {
                    } else {
                        webSocketData = JSON.parse(e.data);
                        VodLogoUpdate(m);
                        VodLogo = m;
                    }
                }
                /* Breaking news*/
                if (m?.Type == "p_breakingNews") {
                    if (
                        JSON.stringify(breakingNews) == JSON.stringify(m)
                    ) {
                    }
                    // else if (breakingNews == undefined) {
                    //     webSocketData = JSON.parse(e.data);
                    //     create_breaking_news(webSocketData);
                    //     breakingNews = m;
                    // }
                    else {
                        webSocketData = JSON.parse(e.data);
                        create_breaking_news(webSocketData);
                        breakingNews = m;
                    }
                }
                /* Breaking news cordinates*/
                if (m?.Type == "p_breakingNewsCordinates") {
                    if (breakingNewsCordinates == undefined) {
                        webSocketData = JSON.parse(e.data);
                        updateBreakingNewsBand(webSocketData.BreakingNewsVal);
                        breakingNewsCordinates = m;
                    } else if (
                        JSON.stringify(breakingNewsCordinates) == JSON.stringify(m)
                    ) {
                    } else {
                        webSocketData = JSON.parse(e.data);
                        updateBreakingNewsBand(webSocketData.BreakingNewsVal);
                        breakingNewsCordinates = m;
                    }
                }
                // Location
                if (m.Type == "p_location") {
                    if (LocUpdate == undefined) {
                        webSocketData = JSON.parse(e.data);
                        locUpdate(m);
                        LocUpdate = m;
                    } else if (JSON.stringify(LocUpdate) == JSON.stringify(m)) {
                    } else {
                        webSocketData = JSON.parse(e.data);
                        locUpdate(m);
                        LocUpdate = m;
                    }
                }
                /* header cordinates again change that may be bgimage*/
                if (m.Type == "p_headerCordinates") {
                    if (!gfxStatusContext?.["top_band"]) return;
                    if (headerCordinates == undefined) {
                        webSocketData = JSON.parse(e.data);
                        headerCordinate(m.HeaderVal);
                        headerCordinates = m;
                    } else if (
                        JSON.stringify(headerCordinates) == JSON.stringify(m)
                    ) {
                    } else {
                        webSocketData = JSON.parse(e.data);

                        headerCordinate(m.HeaderVal);

                        headerCordinates = m;
                    }
                }
                /* Layout Data getting updated*/
                if (m?.Type == "p_Layout") {
                    if (LayoutDesg == undefined) {
                        webSocketData = JSON.parse(e.data);
                        updateLayout(m.LayoutDesg);
                        LayoutDesg = m;
                    } else if (JSON.stringify(LayoutDesg) == JSON.stringify(m)) {
                    } else {
                        webSocketData = JSON.parse(e.data);
                        updateLayout(m.LayoutDesg);
                        LayoutDesg = m;
                    }
                }
                /* update alignment*/
                if (m?.Type == "p_settings_alignment") {
                    if (AlignmnetDesg == undefined) {
                        webSocketData = JSON.parse(e.data);
                        updateAlignment(m.alignment);
                        AlignmnetDesg = m;
                    } else if (JSON.stringify(AlignmnetDesg) == JSON.stringify(m)) {
                    } else {
                        webSocketData = JSON.parse(e.data);
                        updateAlignment(m.alignment);
                        AlignmnetDesg = m;
                    }
                }
                /* update alignment end*/
            }
            /* Bottom cordinates Data*/
            if (m?.Type == "p_bottomCordinates") {
                if (!gfxStatusContext?.["lower_band"]) return;
                if (bottomCordinates == undefined) {
                    webSocketData = JSON.parse(e.data);
                    bottomPositioning(m.bottomVal);
                    bottomCordinates = m;
                } else if (
                    JSON.stringify(bottomCordinates) == JSON.stringify(m)
                ) {
                } else {
                    webSocketData = JSON.parse(e.data);
                    bottomPositioning(m.bottomVal);
                    bottomCordinates = m;
                }
            }
            /* L band*/
            if (m?.Type == "p_lBandCoordinates") {
                if (!gfxStatusContext?.["l_band"]) return;
                if (lbandDetails == undefined) {
                    webSocketData = JSON.parse(e.data);
                    lBandPositioning(m);
                    lbandDetails = m;
                } else if (
                    JSON.stringify(lbandDetails) == JSON.stringify(m)
                ) {
                } else {
                    webSocketData = JSON.parse(e.data);
                    lBandPositioning(m);
                    lbandDetails = m;
                }
            }
            /* Location cordinates*/
            if (m.Type == "p_locationCordinates") {
                if (!gfxStatusContext?.["location_band"]) return;
                if (locationCordinates == undefined) {
                    webSocketData = JSON.parse(e.data);

                    locationPositioning(m.locationVal);

                    locationCordinates = m;
                } else if (
                    JSON.stringify(locationCordinates) == JSON.stringify(m)
                ) {
                } else {
                    webSocketData = JSON.parse(e.data);

                    locationPositioning(m.locationVal);

                    locationCordinates = m;
                }
            }
            /* ticker band*/
            if (m.Type == "p_tickerBand") {
                if (!gfxStatusContext?.["ticker_band"]) return;
                if (tickerUpdate == undefined) {
                    webSocketData = JSON.parse(e.data);
                    updateTicker(m.tickerDetails);
                    tickerUpdate = m;
                } else if (
                    JSON.stringify(tickerUpdate) == JSON.stringify(m)
                ) {
                } else {
                    webSocketData = JSON.parse(e.data);

                    updateTicker(m.tickerDetails);

                    tickerUpdate = m;
                }
            }
            /*Vod logo cordinates*/
            if (m.Type == "p_voDLogoCoordinates") {
                if (!gfxStatusContext?.["logo_band"]) return;
                if (VodLogoDetails == undefined) {
                    webSocketData = JSON.parse(e.data);
                    vodLogoPositioning(m.VODLogoVal);
                    VodLogoDetails = m;
                } else if (
                    JSON.stringify(VodLogoDetails) == JSON.stringify(m)
                ) {
                } else {
                    webSocketData = JSON.parse(e.data);
                    vodLogoPositioning(m.VODLogoVal);
                    VodLogoDetails = m;
                }
            }

            if (m.Type == 'frameMute') {
                // if (isController) handleGlobalMute(m.mute);
            }
            // Clock
            if (m.Type == "p_clockBand") {
                if (!gfxStatusContext?.["clock_band"]) return;
                if (clockDetails == undefined) {
                    webSocketData = JSON.parse(e.data);
                    updateClock(m.clockDetails);
                    clockDetails = m;
                } else if (
                    JSON.stringify(clockDetails) == JSON.stringify(m)
                ) {
                } else {
                    webSocketData = JSON.parse(e.data);
                    updateClock(m.clockDetails);
                    clockDetails = m;
                }
            }
            // Date
            if (m.Type == "p_dateBand") {
                if (!gfxStatusContext?.["date_band"]) return;
                if (dateDetails == undefined) {
                    webSocketData = JSON.parse(e.data);
                    updateDate(m.dateDetails);
                    dateDetails = m;
                } else if (
                    JSON.stringify(dateDetails) == JSON.stringify(m)
                ) {
                } else {
                    webSocketData = JSON.parse(e.data);
                    updateDate(m.dateDetails);
                    dateDetails = m;
                }
            }




            //gfx 
        };
        ws.onclose = () => {
            // alert('Websocket connection closed!. Reconnecting...')
            console.log('Websocket connection closed!. Reconnecting...');
            initWebSocket();
        }
        ws.onerror = () => {
            // alert('Websocket connection error!. Reconnecting...')
            console.log('Websocket connection error!. Reconnecting...');
            initWebSocket();
        }
    } catch (error) {
        console.error("Error in initWebSocket:", error);
    }
}









/* CAPTION ROTATE */
function captionRotate(id, cfg) {
    try {
        const { caption, captionText } = getSlot(id);

        // Clear previous rotation
        clearInterval(captionTimers.get(id));

        // Apply position
        Object.assign(caption.style, {
            left: cfg.position.x + "px",
            top: cfg.position.y + "px",
            width: cfg.position.w + "px",
            height: cfg.position.h + "px",
            display: (cfg.position.x || cfg.position.y || cfg.position.w || cfg.position.h) ? "block" : "none"
        });

        // Apply style (NEW)
        if (cfg.style) {
            caption.style.background = cfg.style.background || "rgba(0,0,0,0.65)";
            caption.style.color = cfg.style.color || "#ffffff";
            caption.style.fontSize = (cfg.style.fontSize || 18) + "px";
            caption.style.borderRadius = (cfg.style.radius || 0) + "px";
            caption.style.fontFamily = cfg.style.fontFamily || "Arial";
            caption.style.fontStyle = cfg.style.fontStyle || "normal";
            caption.style.fontWeight = cfg.style.fontWeight || "normal";
        }

        // let i = 0;
        let items = Array.isArray(cfg.items) ? cfg.items : [cfg.items];
        items = items.filter(item => item);


        // Initial text
        captionText.innerText = cfg.items[0];
        captionText.className = "caption-text fade-in";
        // i = 1;
        if (items.length > 1) {
            let i = 1;

            // Rotation
            captionTimers.set(id, setInterval(() => {
                captionText.className = "caption-text fade-out";

                setTimeout(() => {
                    captionText.innerText = cfg.items[i];
                    captionText.className = "caption-text fade-in";
                    i = (i + 1) % cfg.items.length;
                }, 300);

            }, cfg.animation.interval));
        }
    } catch (error) {
        console.error("Error in captionRotate:", error);
    }
}


/* BACKGROUND */
function setBG(mode, url) {
    try {
        if (!url) {
            bgLayer.innerHTML = "";
            requestStandbySync(0);
            return;
        }

        if (bgLayer.querySelector('img')?.src == url || bgLayer.querySelector('video')?.src == url) return;
        // clearStandbyVideo();
        bgLayer.innerHTML = "";
        if (mode === "image") {
            const i = document.createElement("img"); i.src = url; bgLayer.appendChild(i);
        }
        if (mode === "video") {
            const v = document.createElement("video");
            Object.assign(v, { src: url, autoplay: true, loop: true, muted: true });
            bgLayer.appendChild(v);
        }
    } catch (error) {
        console.error("Error in setBG:", error);
    }
}

/* EXTERNAL VIDEO (WITH COORDINATES) */
function playExternal(id, url, loop = true) {
    try {
        // clearStandbyVideo();

        const { video, bg } = getSlot(id);

        // background stays visible (letterbox / fallback)
        let v = externalVideos.get(id);

        if (!v) {
            v = document.createElement("video");
            Object.assign(v, {
                autoplay: true,
                muted: true,
                playsInline: true,
                controls: false,
                loop: loop
            });

            v.style.width = "100%";
            v.style.height = "100%";
            v.style.objectFit = "contain";

            video.appendChild(v);
            externalVideos.set(id, v);
        }


        // Cleanup old players
        if (v._hls) {
            v._hls.destroy();
            v._hls = null;
        }
        if (v._dash) {
            v._dash.reset();
            v._dash = null;
        }

        // --- HLS ---
        if (url.endsWith(".m3u8")) {

            if (v.canPlayType("application/vnd.apple.mpegurl")) {
                // Safari native LL-HLS
                v.src = url;
            } else if (window.Hls) {
                const hls = attachHLS(v, url);
                setupHLSErrorRecovery(hls, v, url);
                v._hls = hls;
            }

        }

        // --- DASH ---
        else if (url.endsWith(".mpd")) {
            if (window.dashjs) {
                const player = dashjs.MediaPlayer().create();
                player.updateSettings({
                    streaming: {
                        lowLatencyEnabled: true,
                        liveDelay: 2
                    }
                });
                player.initialize(v, url, true);
                v._dash = player;
            }
        }

        // --- MP4 ---
        else {
            v.src = url;
            v.loop = loop;
        }

        v.play().catch(() => { });
    } catch (error) {
        console.error("Error in playExternal:", error);
    }
}

function setupHLSErrorRecovery(hls, videoEl, url) {
    try {
        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                console.warn("HLS fatal error:", data.type);

                switch (data.type) {

                    // Network issue ? retry load
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.warn("HLS network error ? retrying");
                        hls.startLoad();
                        break;

                    // Media decode issue ? recover
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.warn("HLS media error ? recovering");
                        hls.recoverMediaError();
                        break;

                    // Anything else ? full reattach
                    default:
                        console.warn("HLS unrecoverable ? reinitializing");
                        hls.destroy();

                        const newHls = attachHLS(videoEl, url);
                        setupHLSErrorRecovery(newHls, videoEl, url);
                        videoEl._hls = newHls;
                        break;
                }
            }
        });
    } catch (error) {
        console.error("Error in setupHLSErrorRecovery:", error);
    }
}

function applyVideoTransform(userId, transform) {
    try {
        const { video } = getSlot(userId);
        if (!video) return;

        const media = video.querySelector("video, canvas");
        if (!media) return;

        const scale = transform.zoom ?? 1;
        const x = transform.panX ?? 0;
        const y = transform.panY ?? 0;
        const rotate = transform.rotate ?? 0;

        media.style.transform = `
    translate(${x}px, ${y}px)
    scale(${scale})
    rotate(${rotate}deg)
  `;

        // Optional crop using clip-path
        if (transform.crop) {
            const { top = 0, right = 0, bottom = 0, left = 0 } = transform.crop;
            media.style.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
        } else {
            media.style.clipPath = "none";
        }
    } catch (error) {
        console.error("Error in applyVideoTransform:", error);
    }
}

function resetVideoTransform(userId) {
    try {
        const { video } = getSlot(userId);
        if (!video) return;

        const media = video.querySelector("video, canvas");
        if (!media) return;

        media.style.transform = "none";
        media.style.clipPath = "none";
    } catch (error) {
        console.error("Error in resetVideoTransform:", error);
    }
}


/* L-BAND */
let lbTimer = null;
function showLBand(cfg) {
    try {
        clearTimeout(lbTimer);
        lband.innerHTML = "";
        lband.style.display = "block";

        const s = cfg.size || 300;

        if (cfg.position === "left") {
            Object.assign(lband.style, { left: 0, top: 0, width: s + "px", height: "100%" });
            videoRoot.style.left = s + "px";
        }
        if (cfg.position === "right") {
            Object.assign(lband.style, { right: 0, top: 0, width: s + "px", height: "100%" });
            videoRoot.style.right = s + "px";
        }
        if (cfg.position === "top") {
            Object.assign(lband.style, { left: 0, top: 0, width: "100%", height: s + "px" });
            videoRoot.style.top = s + "px";
        }
        if (cfg.position === "bottom") {
            Object.assign(lband.style, { left: 0, bottom: 0, width: "100%", height: s + "px" });
            videoRoot.style.bottom = s + "px";
        }

        if (cfg.mode === "image") {
            const i = document.createElement("img"); i.src = cfg.url; lband.appendChild(i);
        }
        if (cfg.mode === "video") {
            const v = document.createElement("video");
            Object.assign(v, { src: cfg.url, autoplay: true, loop: true, muted: true });
            lband.appendChild(v);
        }

        if (cfg.duration) {
            lbTimer = setTimeout(hideLBand, cfg.duration);
        }
    } catch (error) {
        console.error("Error in showLBand:", error);
    }
}
function hideLBand() {
    try {
        lband.style.display = "none";
        lband.innerHTML = "";
        videoRoot.style.left = videoRoot.style.right =
            videoRoot.style.top = videoRoot.style.bottom = "0";
    } catch (error) {
        console.error("Error in hideLBand:", error);
    }
}

function setFallbackImage(userId, url, fit = "cover") {
    try {
        const { bg } = getSlot(userId);
        bg.style.backgroundImage = `url(${url})`;
        bg.style.backgroundSize = fit;
        bg.style.backgroundPosition = "center";
        bg.style.display = "block";
        // clearStandbyVideo();
    } catch (error) {
        console.error("Error in setFallbackImage:", error);
    }
}

function hideFallbackImage(userId) {
    try {
        const { bg } = getSlot(userId);
        bg.style.display = "none";
        requestStandbySync();
    } catch (error) {
        console.error("Error in hideFallbackImage:", error);
    }
}

function muteTRTC(userId, mute) {
    try {
        trtc.muteRemoteAudio(userId, mute);

    } catch (error) {
        console.error("Error in muteTRTC:", error);
    }
}

function muteExternalVideo(userId, mute) {
    const video = externalVideos.get(userId);
    try {
        if (!video) return;
        if (video.muted != mute) {
            video.muted = mute;
        }
        if (video.paused) {
            video.play().catch(err => {
                console.log("Play prevented:", err);
            });
        }
    }
    catch (error) {
        console.error("Error in muteExternalVideo:", error);
    }
}
function muteExternalAudio(audioId, mute) {
    try {
        const record = externalAudios.get(audioId);
        if (record && record.audioEl) {
            record.audioEl.muted = mute;
        }
    } catch (error) {
        console.error("Error in muteExternalAudio:", error);
    }
}

function clampVolume(v) {
    try {
        return Math.max(0, Math.min(100, v));
    } catch (error) {
        console.error("Error in clampVolume:", error);
        return 0;
    }
}

function setTRTCVolume(userId, volume) {
    try {
        const v = clampVolume(volume);
        trtc.setRemoteAudioVolume(userId, v);
    } catch (error) {
        console.error("Error in setTRTCVolume:", error);
    }

}

function setExternalVideoVolume(userId, volume) {
    try {
        const v = externalVideos.get(userId);
        if (!v) return;
        v.volume = clampVolume(volume) / 100;
    } catch (error) {
        console.error("Error in setExternalVideoVolume:", error);
    }
}


function setExternalAudioVolume(audioId, volume) {
    try {
        const record = externalAudios.get(audioId);
        if (!record || !record.audioEl) return;
        record.audioEl.volume = clampVolume(volume) / 100;
    } catch (error) {
        console.error("Error in setExternalAudioVolume:", error);
    }
}


/* SLDP Video */
function playSldp(id, url) {
    try {
        // clearStandbyVideo();
        const { video, bg } = getSlot(id);
        bg.style.display = "none";

        const _id = "video_" + id;

        if (!video.id) {
            video.id = _id;
        }

        if (sldpsVideos.has(id)) {
            const oldPlayer = sldpsVideos.get(id);
            oldPlayer?.destroy?.();
            sldpsVideos.delete(id);
        }

        const player = SLDP.init({
            container: video.id,
            stream_url: url,
            adaptive_bitrate: {
                initial_rendition: '240p'
            },
            buffering: 10,
            autoplay: true,
            muted: true,
            controls: false,
            width: "parent"
            // height: "parent"
        });

        sldpsVideos.set(id, player);

        setTimeout(() => {
            const vid =
                player?.el?.querySelector("video") ||
                document.querySelector(`#${video.id} video`);

            if (vid) {
                player._video = vid;

                vid.muted = true;
                vid.volume = 0;

                vid.style.width = "100%";
                vid.style.height = "100%";
                vid.style.objectFit = "contain";
            }

            const container = document.getElementById(video.id);
            if (container) {
                container.style.width = "100%";
                container.style.height = "100%";
            }

        }, 100);
    } catch (error) {
        console.error("Error in playSldp:", error);
    }
}

/* Mute an Unmute the sldp one */
function muteSldpVideo(userId, mute) {
    try {
        const player = sldpsVideos.get(userId);
        if (!player) return;

        const container = document.getElementById("video_" + userId);
        if (!container) return;

        const vid = container.querySelector("video");
        if (!vid) return;

        vid.muted = mute;
        vid.volume = mute ? 0 : 1;
        if (!mute) {
            vid.play().catch(() => { });
        }
    } catch (error) {
        console.error("Error in muteSldpVideo:", error);
    }
}

/* Volume control for the sldp videos */
function setSLDPVideoVolume(userId, volume) {
    try {
        const v = sldpsVideos.get(userId);
        if (!v || !v._video) return;
        const vol = clampVolume(volume) / 100;
        v._video.volume = vol;
    } catch (error) {
        console.error("Error in setSLDPVideoVolume:", error);
    }
}

/* =========================================================
   BOOTSTRAP
========================================================= */

async function bootstrap() {
    try {


        const params = new URLSearchParams(window.location.search);
        ChannelName = params.get("channel");
        const type = params.get("type");
        requestStandbySync(0);

        const uid = Date.now().toString(36) + Math.random().toString(36).slice(2);
        USER_ID = "rtmp_" + ChannelName + '_' + type + "_" + uid;

        isController = params.get("controller") == "1";
        isGlobalMute = isController;
        if (isController) appendMuteIcon(isGlobalMute);
        ROOM_ID = ChannelName;

        const result = genTestUserSig({
            sdkAppId: SDK_APP_ID, // ⚠️ MUST be this exact key
            userId: USER_ID,
            secretKey: SECRET_KEY
        });

        if (!result || typeof result.userSig !== "string") {
            throw new Error("genTestUserSig failed");
        }

        USER_SIG = result.userSig;

        console.log("[INIT] UserSig OK");

        await initTRTC();

        // if (type == "preview")
        await gfxAlignmentNdLayouts();
        initWebSocket();
        requestStandbySync();


    } catch (err) {
        console.error("[BOOTSTRAP FAILED]", err);
    }
}

window.addEventListener("load", bootstrap);

function lBandUpdate(data) {
    try {
        BasedOnUrlType(data?.lband[0]?.url, "lbandimg", "lbandvod");
    } catch (error) {
        console.error("Error in lBandUpdate:", error);
    }
}

//the url is of type image or vod type based dispaly
function BasedOnUrlType(url, ImageId, VideoId) {
    try {
        const urlType = getUrlType(url);
        // Helper to fade in element
        function fadeIn(el) {
            if (!el) return;
            el.style.transition = "opacity 0.4s";
            el.style.opacity = 0;
            setTimeout(() => {
                el.style.opacity = 1;
            }, 10);
        }
        // Helper to fade out element
        function fadeOut(el, cb) {
            if (!el) return;
            el.style.transition = "opacity 0.4s";
            el.style.opacity = 1;
            setTimeout(() => {
                el.style.opacity = 0;
                setTimeout(() => { if (cb) cb(); }, 400);
            }, 10);
        }
        switch (urlType) {
            case "video": {
                const videoEl = document.getElementById(VideoId);
                if (videoEl && videoEl.src !== url) {
                    fadeOut(videoEl, () => {
                        videoLoad(VideoId, url);
                        fadeIn(videoEl);
                    });
                } else if (videoEl) {
                    fadeIn(videoEl);
                }
                displayProperty(false, ImageId);
                displayProperty(true, VideoId);
                break;
            }
            case "image": {
                const imgEl = document.getElementById(ImageId);
                if (imgEl && imgEl.getAttribute("src") !== url) {
                    fadeOut(imgEl, () => {
                        imageLoad(ImageId, url);
                        fadeIn(imgEl);
                    });
                } else if (imgEl) {
                    fadeIn(imgEl);
                }
                displayProperty(false, VideoId);
                displayProperty(true, ImageId);
                break;
            }
            case "unknown": {
                const imgEl = document.getElementById(ImageId);
                fadeOut(imgEl);
                imageLoad(ImageId, "");
                displayProperty(false, VideoId);
                displayProperty(false, ImageId);
                break;
            }
            default:
                break;
        }
    } catch (error) {
        console.error("Error in BasedOnUrlType:", error);
    }

}

//url type return 
function getUrlType(url) {
    try {
        if (!url) return "unknown";
        const cleanUrl = url.toLowerCase().split("?")[0];
        if (cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".webm")) {
            return "video";
        }
        if (cleanUrl.endsWith(".png") || cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg")) {
            return "image";
        }
        return "unknown";
    } catch (error) {
        console.error("Error in getUrlType:", error);
    }
}

//video bind as src to the element
function videoLoad(id, value) {
    try {
        let el = document.getElementById(id);
        el.src = value;
        el.load();
    } catch (error) {
        console.error("Error in videoLoad:", error);
    }
}

//image load to the src element
function imageLoad(id, value) {
    try {
        let el = document.getElementById(id);
        el.setAttribute("src", value);
    } catch (error) {
        console.error("Error in imageLoad:", error);
    }
}

function displayProperty(hastoDisplayOrNot, id) {
    try {
        if (layoutData != undefined) updateLayout(layoutData);
        let div = document.getElementById(id);
        if (!div) return;

        if (id == "breaking-news-div") {
            if (breakingNewsInterval) clearInterval(breakingNewsInterval)
            if (hastoDisplayOrNot) {
                let currentIndex = 1;
                breakingNewsInterval = setInterval(() => {
                    let arr = document.querySelectorAll(".breaking-news-desg")
                    arr.forEach((el, index) => {
                        if (index === currentIndex) {
                            el.classList.add("show");
                            el.classList.remove("hide");
                        } else {
                            el.classList.add("hide");
                            el.classList.remove("show");
                        }
                    });
                    currentIndex = (currentIndex + 1) % arr.length;
                }, 5000);
            }
        }
        if (id === "lband-div") {
            let wrapper = document.getElementById("scaleWrapper");
            let parent_wrap = document.getElementById("img-background");
            if (hastoDisplayOrNot === false) {
                lband_switch = true;
                parent_wrap.style.left = "0px";
                parent_wrap.style.top = "0px";
                parent_wrap.style.width = "1920px";
                parent_wrap.style.height = "1080px";
                parent_wrap.style.transform = "scale(1)";
                wrapper.style.zIndex = "999999";
                div.style.zIndex = 0;

                parent_wrap.ontransitionend = () => {
                    div.style.display = "none";
                }
                lband_on = false;
            }
            else if (hastoDisplayOrNot === true) {
                parent_wrap.ontransitionend = () => {
                    div.style.zIndex = 10;
                }
                div.style.display = "";
                lband_on = true;
                lBandPositioning(lbandVal);
                wrapper.style.zIndex = "99999";
            }
            return;
        }
        if (id !== "lband-div") {
            div.style.display = hastoDisplayOrNot == true ? "" : "none";
        }
    } catch (error) {
        console.error("Error in displayProperty:", error);
    }
}

function lBandPositioning(item) {
    try {
        lbandVal = item;
        if (lband_on === true) {
            if (item.Type === "p_lBandCoordinates") {
                if (item.l_BandVal.left != null) {
                    let scaleX = (1920 - item.l_BandVal.left) / 1920;
                    applyScale("img-background", scaleX, null); // pass only scaleX
                }
                if (item.l_BandVal.top != null) {
                    let scaleY = 1 - (1080 - item.l_BandVal.top) / 1080;
                    applyScale("img-background", null, scaleY); // pass only scaleY
                }
            } else {
                if (item.left != null) {
                    let scaleX = (1920 - item.left) / 1920;
                    applyScale("img-background", scaleX, null);
                }
                if (item.top != null) {
                    let scaleY = 1 - (1080 - item.top) / 1080;
                    applyScale("img-background", null, scaleY);
                }
            }
        }
    } catch (error) {
        console.error("Error in lBandPositioning:", error);
    }
}

function applyScale(id, scaleX, scaleY) {
    try {
        const element = document.getElementById(id);
        const currentTransform = element.style.transform || "scale(1, 1)";
        const match = currentTransform.match(/scale\(([^,]+),\s*([^)]+)\)/);
        let currentX = 1,
            currentY = 1;

        if (match) {
            currentX = parseFloat(match[1]);
            currentY = parseFloat(match[2]);
        }

        const newX = scaleX !== null ? scaleX : currentX;
        const newY = scaleY !== null ? scaleY : currentY;

        element.style.transform = `scale(${newX}, ${newY})`;
        element.style.transformOrigin = "right top";
        scaleX = null;
        scaleY = null;
    } catch (error) {
        console.error("Error in applyScale:", error);
    }
}

function GfxData(Data) {
    try {
        let filteredData = Data.data.filter(
            (item) => item.templatetype === 'template1'
        );
        if (filteredData.length > 0) {
            let alignment = filteredData[0].alignment;
            layout = filteredData[0].layout;
            if (alignment) {
                if (alignment.l_band) {
                    lBandPositioning(alignment.l_band);
                }
                if (alignment.top_band) {
                    headerCordinate(alignment.top_band);
                }
                if (alignment?.lower_band) {
                    bottomPositioning(alignment.lower_band);
                }
                if (alignment.ticker_band) {
                    updateTicker(alignment.ticker_band);
                }
                if (alignment.clock_band) {
                    updateClock(alignment.clock_band);
                }
                if (alignment.date_band) {
                    updateDate(alignment.date_band);
                }
                if (alignment.location_band) {
                    locationPositioning(alignment.location_band);
                }
                if (alignment.logo_band) {
                    vodLogoPositioning(alignment.logo_band);
                }
                if (alignment.breaking_news_band) {
                    updateBreakingNewsBand(alignment.breaking_news_band);
                }

            }
            if (layout) {
                updateLayout(layout);
            }
        }
    } catch (error) {
        console.error("Error in GfxData:", error);
    }
}



function bandsVisibility(data) {
    try {
        switch (data.tempType) {
            case "l_band":
                displayProperty(data.displayType, "lband-div");
                gfxStatusContext["l_band"] = data.displayType;
                break;
            case "breaking_news_band":
                displayProperty(data.displayType, "breaking-news-div");
                gfxStatusContext["breaking_news_band"] = data.displayType;
                break;
            case "top_band":
                displayProperty(data.displayType, "top-news-grid");
                gfxStatusContext["top_band"] = data.displayType;
                break;
            case "lower_band":
                displayProperty(data.displayType, "bottom-news-grid");
                gfxStatusContext["lower_band"] = data.displayType;
                break;
            case "ticker_band":
                // displayVisibility(data.displayType, "ticker-news-grid");
                // displayVisibility(data.displayType, "ticker-img");
                // displayVisibility(data.displayType, "lower-new-ticker");
                const tickerVisible = toBool(data.displayType);
                displayProperty(tickerVisible, 'ticker-band');
                displayProperty(tickerVisible, 'ticker-news-grid');
                displayVisibility(tickerVisible, "ticker-band");
                gfxStatusContext["ticker_band"] = tickerVisible;

                // Recreate ticker animation on every ON toggle to avoid stale/paused RAF state.
                if (!tickerVisible) {
                    if (tickerRafId) {
                        cancelAnimationFrame(tickerRafId);
                        tickerRafId = null;
                    }
                } else if (tickerNews) {
                    setTimeout(() => {
                        create_ticker(tickerNews);
                    }, 80);
                }
                break;
            case "location_band":
                displayProperty(data.displayType, "loc-div");
                gfxStatusContext["location_band"] = data.displayType;
                break;
            case "date_band":
                displayProperty(data.displayType, "date-img");
                displayProperty(data.displayType, "date-txt");
                displayProperty(data.displayType, "date-div");
                gfxStatusContext["date_band"] = data.displayType;
                break;
            case "clock_band":
                displayProperty(data.displayType, "time-txt");
                displayProperty(data.displayType, "time-img");
                displayProperty(data.displayType, "time-div");
                gfxStatusContext["clock_band"] = data.displayType;
                break;
            case "logo_band":
                displayProperty(data.displayType, "vod-logo-div");
                gfxStatusContext["logo_band"] = data.displayType;
                break;
            case "bottom_ticker_band":
                displayProperty(data.displayType, "bottom-ticker");
                gfxStatusContext["bottom_ticker_band"] = data.displayType;
                break;
            default:
                "none";

        }
    } catch (error) {
        console.error("Error in bandsVisibility:", error);
    }
}

function create_header_news(Data) {
    try {
        let newsArr = Data.headerNews;
        removeNews("header-news");

        let NewDataFilter = newsArr.filter(item => item.disabled == true)
        newsArr = NewDataFilter;
        for (let i = 0; i < newsArr.length; i++) {
            let headElement = document.createElement("h2");

            i == 0
                ? headElement.setAttribute("class", "show top-desg")
                : headElement.setAttribute("class", "hide top-desg");
            headElement.setAttribute("id", `top_news-${newsArr[i].id}`);

            let newsContainer = document.getElementById("header-news");
            newsContainer.appendChild(headElement);
            let newsVal = document.getElementById(`top_news-${newsArr[i].id}`);
            newsVal.innerHTML = newsArr[i].news_value;
        }
        checkLayout();
        startHeaderTicker();
    } catch (error) {
        console.error("Error in create_header_news:", error);
    }
}

function removeNews(id) {
    try {
        let newsDiv = document.getElementById(id);
        if (newsDiv) {
            newsDiv.innerHTML = "";
        }
    } catch (error) {
        console.error("Error in removeNews:", error);
    }
}

function checkLayout() {
    if (layoutData != undefined) {
        updateLayout(layoutData);
    }
}

function updateLayout(data) {
    try {
        layoutData = data;
        let header = data.top_band;
        let bottom = data.lower_band;
        let ticker = data.ticker_band;
        let comingUp = data.coming_up_band;
        let time = data.clock_band;
        let date = data.date_band;
        let bottom_ticker = data.bottom_ticker_band;
        let poll_options = data.poll_options;
        let poll_question = data.poll_question;
        let breaking_news = data.breaking_news_band;
        let location = data.location_band;


        const top_desg = document.querySelectorAll(".top-desg");

        const bottom_desg = document.querySelectorAll(".bottom-desg");

        const ticker_desg = document.querySelectorAll(".ticker__item");

        const comingUp_desg = document.querySelectorAll(".coming_up_Text");

        const time_desg = document.querySelectorAll(".time-tag");
        const date_desg = document.querySelectorAll(".est-date");

        const bottom_ticker_desg = document.querySelectorAll(
            ".bottom-ticker-news>span"
        );
        const breaking_news_desg = document.querySelectorAll(".breaking-news-desg");

        ticker_desg != undefined ? updateContentLayout(ticker_desg, ticker) : "";
        top_desg != undefined ? updateContentLayout(top_desg, header) : "";
        bottom_desg != undefined ? updateContentLayout(bottom_desg, bottom) : "";
        time_desg != undefined ? updateContentLayout(time_desg, time) : "";
        date_desg != undefined ? updateContentLayout(date_desg, date) : "";
        bottom_ticker_desg != undefined
            ? updateContentLayout(bottom_ticker_desg, bottom_ticker)
            : "";
        breaking_news_desg != undefined
            ? updateContentLayout(breaking_news_desg, breaking_news)
            : "";
        // location band extension
        const location_news = document.querySelectorAll("#loc-news");
        location_news != undefined ? updateContentLayout(location_news, location) : "";
    } catch (error) {
        console.error("Error in updateLayout:", error);
    }

}

function updateContentLayout(arr, method) {
    try {

        arr.forEach((val) => {
            if (method && method.font_color !== undefined) {
                val.style.color = method.font_color;
            }
            if (method && method.font_size !== undefined) {
                val.style.fontSize = method.font_size;
            }
            if (method && method.font_family !== undefined) {
                val.style.fontFamily = method.font_family;
            }
            if (method && method.hasOwnProperty("animation")) {
                const parentElement = val.parentElement;
                if (parentElement) {
                    animationClasses.forEach((animationClass) => {
                        if (parentElement.classList.contains(animationClass)) {
                            parentElement.classList.remove(animationClass);
                        }
                    });
                    if (method.animation && method.animation.trim() !== "") {
                        parentElement.classList.add(method.animation);
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error in updateContentLayout:", error);
    }
}

function headerCordinate(item, display) {
    try {
        document.getElementById("top-news-grid").style.display = display ?? true ? "" : 'none';
        item.left != null ? Left("top-news-grid", item.left + "px") : "";
        item.top != null ? Top("top-news-grid", item.top + "px") : "";
        // Only update bgVideo if changed
        if (!window._prevHeaderBgVideo) window._prevHeaderBgVideo = null;
        if (item.bgVideo !== window._prevHeaderBgVideo) {
            BasedOnUrlType(item.bgVideo, "header-bg-png", "header-video");
            window._prevHeaderBgVideo = item.bgVideo;
        }
        if (item.width != null) {
            WidthAdjust("header-video", item.width + "%");
        }
        item.textLeft != null
            ? Left("header-news", item.textLeft + "px")
            : Left("header-news", "auto");
        item.textTop != null ? Top("header-news", item.textTop + "px") : "";
    } catch (error) {
        console.error("Error in headerCordinate:", error);
    }
}

function Left(id, value) {
    let el = document.getElementById(id);
    if (!el) return;
    el.style.left = value;
}
function Top(id, value) {
    let el = document.getElementById(id);
    if (!el) return;
    el.style.top = value;
}
function Right(id, value) {
    let el = document.getElementById(id);
    if (!el) return;
    el.style.right = value;
}
function Bottom(id, value) {
    let el = document.getElementById(id);
    if (!el) return;
    el.style.bottom = value;
}
function WidthAdjust(id, value) {
    let el = document.getElementById(id);
    if (!el) return;
    el.style.width = value;
}
function zIndexAdjust(id, value) {
    let el = document.getElementById(id);
    if (!el) return;
    el.style.zIndex = value;
}
function startHeaderTicker() {
    try {
        clearInterval(headerTickerTimer);
        headerTickerIndex = 0;
        headerTickerTimer = setInterval(() => {
            const items = Array.from(document.querySelectorAll("#header-news .top-desg"));
            if (items.length <= 1) return;
            const activeIdx = headerTickerIndex % items.length;
            items.forEach((n, idx) => {
                const show = idx === activeIdx;
                n.classList.toggle("show", show);
                n.classList.toggle("hide", !show);
                n.style.opacity = show ? 1 : 0;
            });
            headerTickerIndex++;
        }, 4000);
    } catch (error) {
        console.error("Error in startHeaderTicker:", error);
    }
}
function bottomPositioning(item, display) {
    try {
        const bottomNewsEl = document.getElementById("bottom-news");
        item.left != null ? Left("bottom-news-grid", item.left + "px") : "";
        item.bottom != null ? Bottom("bottom-news-grid", item.bottom + "px") : "";
        displayProperty(display ?? true, "bottom-news-grid")
        // Only update bgVideo if changed
        if (!window._prevBottomBgVideo) window._prevBottomBgVideo = null;
        if (item.bgVideo !== window._prevBottomBgVideo) {
            BasedOnUrlType(item.bgVideo, "bottom-bg-png", "bottom-video");
            window._prevBottomBgVideo = item.bgVideo;
        }
        item.width != null ? WidthAdjust("bottom-video", item.width + "%") : "";
        item.textWidth != null
            ? WidthAdjust("bottom-news", item.textWidth + "%")
            : "";
        item.textLeft != null
            ? Left("bottom-news", item.textLeft + "px")
            : Left("bottom-news", "auto");

        // Support both textTop and textBottom directly from payload.
        if (item.textTop != null) {
            Top("bottom-news", item.textTop + "px");
            if (bottomNewsEl) bottomNewsEl.style.bottom = "auto";
        } else {
            if (bottomNewsEl) bottomNewsEl.style.top = "auto";

            if (item.textBottom != null) {
                Bottom("bottom-news", item.textBottom + "px");
            } else {
                Bottom("bottom-news", "0px");
            }
        }
    } catch (error) {
        console.error("Error in bottomPositioning:", error);
    }
}

function normalizeBandNewsMarkup(markup) {
    try {
        if (typeof markup !== "string" || !markup.trim()) return "";

        const wrapper = document.createElement("div");
        wrapper.innerHTML = markup;

        wrapper.querySelectorAll("div.svg-div").forEach((node) => {
            const inlineNode = document.createElement("span");

            Array.from(node.attributes).forEach((attr) => {
                inlineNode.setAttribute(attr.name, attr.value);
            });

            inlineNode.innerHTML = node.innerHTML;
            node.replaceWith(inlineNode);
        });

        return wrapper.innerHTML;
    } catch (error) {
        console.error("Error in normalizeBandNewsMarkup:", error);
        return markup;
    }
}

function create_bottom_news(Data) {
    try {
        let newsArr = Data.bottomNews;
        removeNews("bottom-news");
        let NewDataFilter = newsArr.filter(item => item.disabled == true)
        newsArr = NewDataFilter;
        for (let i = 0; i < newsArr.length; i++) {
            let headElement = document.createElement("h2");
            i == 0
                ? headElement.setAttribute("class", "show bottom-desg")
                : headElement.setAttribute("class", "hide bottom-desg");
            headElement.setAttribute("id", `bottom_news-${newsArr[i].id}`);
            let newsContainer = document.getElementById("bottom-news");
            newsContainer.appendChild(headElement);
            let newsVal = document.getElementById(`bottom_news-${newsArr[i].id}`);
            /* let newsVal = document.getElementById`bottomnews-${newsArr[i].id}`*/
            newsVal.innerHTML = normalizeBandNewsMarkup(newsArr[i].news_value);
        }
        checkLayout();
        startBottomTicker();
        if (Data.Type == "p_bottomNews" && (Data.displayStyle == true || Data.displayStyle == false)) {
            Data.tempType = "lower_band";
            Data.displayType = Data.displayStyle;
            bandsVisibility(Data)
        }
    } catch (error) {
        console.error("Error in create_bottom_news:", error);
    }
}
/* Bottom news */
function startBottomTicker() {
    try {
        clearInterval(bottomTickerTimer);
        bottomTickerIndex = 0;
        bottomTickerTimer = setInterval(() => {
            const items = Array.from(document.querySelectorAll("#bottom-news .bottom-desg"));
            if (items.length <= 1) return;
            const activeIdx = bottomTickerIndex % items.length;
            items.forEach((n, idx) => {
                const show = idx === activeIdx;
                n.classList.toggle("show", show);
                n.classList.toggle("hide", !show);
                n.style.opacity = show ? 1 : 0;
            });
            bottomTickerIndex++;
        }, 4000);
    } catch (error) {
        console.error("Error in startBottomTicker:", error);
    }
}
/* Bottom Ticker */
function updateTicker(item, display) {
    try {
        displayProperty(display ?? true, 'ticker-band')
        item.left != null ? Left("ticker-img", item.left + "px") : "";
        item.bottom != null ? Bottom("ticker-img", item.bottom + "px") : "";
        item.left != null ? Left("ticker-band", item.left + "px") : "";
        item.bottom != null ? Bottom("ticker-band", item.bottom + "px") : "";
        displayVisibility(true, "ticker-news-grid");
        const urlType = getUrlType(item.bgImage);
        switch (urlType) {
            case "unknown":
                displayVisibility(false, "ticker-img");
                displayVisibility(false, "lower-new-ticker");
                break;
            case "video":
                displayVisibility(false, "ticker-img");
                displayVisibility(true, "lower-new-ticker");
                break;
            case "image":
                displayVisibility(true, "ticker-img");
                displayVisibility(false, "lower-new-ticker");
                break;
        }

        BasedOnUrlType(
            item.bgImage,
            "ticker-img",
            "lower-new-ticker"
        );

        item.width != null ? WidthAdjust("ticker-img", item.width + "%") : "";
        item.textWidth != null
            ? WidthAdjust("ticker-news-grid", item.textWidth + "%")
            : "";
        item.textLeft != null ? Left("ticker-news-grid", item.textLeft + "px") : "";
        item.textBottom != null ? Bottom("ticker-news-grid", item.textBottom + "px") : Bottom("ticker-news-grid", "0px");
    } catch (error) {
        console.error("Error in updateTicker:", error);
    }
}
/* To display the gfx*/
function displayVisibility(displayStyle, id) {
    try {
        if (layoutData != undefined) updateLayout(layoutData);
        let div = document.getElementById(id);
        displayStyle == true ? (div.style.opacity = 1) : (div.style.opacity = 0);
    } catch (error) {
        console.error("Error in displayVisibility:", error);
    }
}

/* To add a text in bottom ticker one*/
function create_ticker(Data) {
    try {
        const tickerVal = document.getElementById("marquee-val");
        const tickerWrap = document.querySelector("#ticker-news-grid .ticker-wrap");
        const tickerGrid = document.getElementById("ticker-news-grid");
        if (!tickerVal || !tickerWrap || !tickerGrid) return;

        let rawNews = Data?.tickerNews;

        let newsText = Array.isArray(rawNews)
            ? rawNews
                .filter(item => item.disabled === true)
                .map(item => item.news_value)
                .join(" | ")
            : typeof rawNews === "string"
                ? rawNews
                : "";

        const finalText = newsText || "";
        tickerVal.textContent = finalText;

        // Remove old duplicate node if present from previous implementation.
        const oldClone = document.getElementById("marquee-val-clone");
        if (oldClone) oldClone.remove();

        // Disable CSS keyframe ticker animation; JS controls transform smoothly.
        tickerVal.style.animation = "none";
        tickerVal.style.paddingLeft = "0px";
        tickerWrap.style.display = "block";
        tickerWrap.style.willChange = "auto";
        tickerVal.style.willChange = "transform";
        tickerVal.style.display = "inline-block";

        if (tickerRafId) {
            cancelAnimationFrame(tickerRafId);
            tickerRafId = null;
        }

        // Wait until layout is measurable, then animate.
        let measureAttempts = 0;
        const maxMeasureAttempts = 20;

        const startTicker = () => {
            try {
                const containerWidth = tickerGrid.offsetWidth;
                const textWidth = Math.ceil(
                    Math.max(tickerVal.scrollWidth, tickerVal.getBoundingClientRect().width)
                );

                if (!containerWidth || !textWidth) {
                    measureAttempts++;
                    if (measureAttempts < maxMeasureAttempts) {
                        requestAnimationFrame(startTicker);
                    }
                    return;
                }

                const pxPerSecond = tickerSpeedPxPerSecond;
                let x = containerWidth;
                let lastTs = performance.now();
                let restartOnNextFrame = false;

                const animate = (ts) => {
                    if (restartOnNextFrame) {
                        x = containerWidth;
                        lastTs = ts;
                        restartOnNextFrame = false;
                        tickerVal.style.transform = `translateX(${x}px)`;
                        tickerRafId = requestAnimationFrame(animate);
                        return;
                    }

                    const dt = (ts - lastTs) / 1000;
                    lastTs = ts;
                    x -= pxPerSecond * dt;

                    // Clamp to the exact left-edge exit point first, then restart on the next frame.
                    if (x <= -textWidth) {
                        x = -textWidth;
                        restartOnNextFrame = true;
                    }

                    tickerVal.style.transform = `translateX(${x}px)`;
                    tickerRafId = requestAnimationFrame(animate);
                };

                tickerVal.style.transform = `translateX(${containerWidth}px)`;
                tickerRafId = requestAnimationFrame(animate);
            } catch (e) {
                console.error("Error starting ticker animation:", e);
            }
        };

        requestAnimationFrame(startTicker);
    } catch (error) {
        console.error("Error in create_ticker:", error);
    }
}

/* To show the clock band in bottom news section*/
function updateClock(item, display) {
    try {
        displayProperty(display ?? true, "time-div");
        BasedOnUrlType(item.bgImage, "time-img", "time-bg-vid");
        displayProperty(true, "time-txt")
        if (item.width != null) {
            WidthAdjust("time-img", item.width + "%");
            displayProperty(true, "time-img")
        }
        item.left != null ? Left("time-img", item.left + "px") : "";
        item.top != null ? Top("time-img", item.top + "px") : "";

        // For text Adjustments
        if (item.textWidth != null) {
            WidthAdjust("time-txt", item.textWidth + "%")
            displayProperty(true, "time-txt")
        }
        item.textLeft != null ? Left("time-txt", item.textLeft + "px") : "";
        item.textTop != null ? Top("time-txt", item.textTop + "px") : "";
    } catch (error) {
        console.error("Error in updateClock:", error);
    }
}
/* Date format  showing in clock band*/
function updateDate(item, display) {
    try {
        displayProperty(display ?? true, "date-div")
        BasedOnUrlType(item.bgImage, "date-img", "date-bg-vid");
        if (item.width != null) {
            displayProperty(true, "date-img")
            WidthAdjust("date-img", item.width + "%");
        }
        item.left != null ? Left("date-img", item.left + "px") : "";
        item.top != null ? Top("date-img", item.top + "px") : "";
        if (item.textWidth != null) {
            WidthAdjust("date-txt", item.textWidth + "%")
            displayProperty(true, "date-txt")
        };
        item.textLeft != null ? Left("date-txt", item.textLeft + "px") : "";
        item.textTop != null ? Top("date-txt", item.textTop + "px") : "";
    } catch (error) {
        console.error("Error in updateDate:", error);
    }
}

function insertDateTime(data) {
    displayProperty(data.TimeToggle, "Time-div");
    displayProperty(data.DateToggle, "Date-div");
}

/* To show the month and the day in clock band*/
setInterval(() => {
    clockFormat(TimeFormat);
    let currentDate = new Date();
    let day = currentDate.getDate();
    let monthIndex = currentDate.getMonth();
    let months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    let formattedDate = day + " " + months[monthIndex];
    document.querySelector(".date-details").innerHTML = formattedDate;
}, 1000);

/* To  show the clock time  in clock band*/
function clockFormat(type) {
    try {
        if (type == "12hour") {
            let hours = new Date().getHours();
            let minutes = new Date().getMinutes();
            let ampm = hours >= 12 ? "PM" : "AM";
            hours = hours % 12;
            hours = hours ? hours : 12;
            // the hour '0' should be '12'
            minutes = minutes < 10 ? "0" + minutes : minutes;
            let strTime = hours + ":" + minutes + " " + ampm;
            document.querySelector(".time-details").innerHTML = strTime;
        } else if (type == "24hour") {
            let hours = new Date().getHours();
            let minutes = new Date().getMinutes();
            hours = hours < 10 ? "0" + hours : hours;
            minutes = minutes < 10 ? "0" + minutes : minutes;
            let strTime = hours + ":" + minutes;
            document.querySelector(".time-details").innerHTML = strTime;
        }
    } catch (error) {
        console.error("Error in clockFormat:", error);
    }
}

/* Loaction ie live with place*/
function locationPositioning(item, display) {
    if (!item) return;
    try {
        const locDiv = document.getElementById("loc-div");

        locDiv.style.display = display ?? true ? "block" : "none";
        locDiv.style.visibility = "visible";
        locDiv.style.opacity = "1";
        // locDiv.style.width = (item.width ?? 100) + "%";
        if (item.width != null) {
            const urlType = getUrlType(item.bgVideo);
            if (urlType === "video")
                WidthAdjust("location-video", item.width + "%");
            else if (urlType === "image")
                WidthAdjust("location-bg-png", item.width + "%");
        }

        if (item.left != null) Left("loc-div", item.left + "px");
        if (item.top != null) Top("loc-div", item.top + "px");

        // Only update bgVideo if changed
        if (!window._prevLocationBgVideo) window._prevLocationBgVideo = null;
        if (item.bgVideo !== window._prevLocationBgVideo) {
            BasedOnUrlType(
                item.bgVideo,
                "location-bg-png",
                "location-video"
            );
            window._prevLocationBgVideo = item.bgVideo;
        }

        if (item.textLeft != null) Left("loc-news", item.textLeft + "px");
        if (item.textTop != null) Top("loc-news", item.textTop + "px");
    } catch (error) {
        console.error("Error in locationPositioning:", error);
    }
}

/* logo to apply as band*/
function VodLogoUpdate(data) {
    try {
        displayProperty(data.VODLogoToggle, "vod-logo-div");
        BasedOnUrlType(
            data?.VODLogo[0].url,
            "logo-bg-png",
            "Vod-logo"
        );

        checkLayout();
    } catch (error) {
        console.error("Error in VodLogoUpdate:", error);
    }
}
/* vod logo pistonsing*/
function vodLogoPositioning(item) {
    try {
        item.right != null ? Right("vod-logo-div", item.right + "px") : "";
        item.top != null ? Top("vod-logo-div", item.top + "px") : "";
        item.width != null ? WidthAdjust("Vod-logo", item.width + "%") : "";
    } catch (error) {
        console.error("Error in vodLogoPositioning:", error);
    }
}

/* Breaking news*/
function updateBreakingNewsBand(item) {
    try {
        item.left != null ? Left("breaking-news-grid", item.left + "px") : "";
        item.top != null ? Top("breaking-news-grid", item.top + "px") : "";
        BasedOnUrlType(
            item.bgVideo,
            "breaking-news-png",
            "video-grid-breaking"
        );

        item.width != null
            ? WidthAdjust("breaking-news-grid", item.width + "%")
            : "";

        item.width != null
            ? WidthAdjust("video-grid-breaking", item.width + "%")
            : "";
        item.zIndex != null
            ? zIndexAdjust("breaking-news-grid", item.zIndex == true ? "99" : "0")
            : "";
        item.textLeft != null
            ? Left("breaking-news-data", item.textLeft + "px")
            : Left("breaking-news-data", "auto");
        item.textTop != null ? Top("breaking-news-data", item.textTop + "px") : "";
    } catch (error) {
        console.error("Error in updateBreakingNewsBand:", error);
    }
}


//Breaking News gfx
function create_breaking_news(Data) {
    try {
        let newsArr = Data.breakingNews;
        if (!Array.isArray(newsArr)) {
            //  removeNews("breaking-news-data");
            return;
        }
        newsArr = newsArr.filter(news => news.disabled == true);
        removeNews("breaking-news-data");
        for (let i = 0; i < newsArr.length; i++) {
            let headElement = document.createElement("h2");
            i == 0 ? headElement.setAttribute("class", "show breaking-news-desg") : headElement.setAttribute("class", "hide breaking-news-desg");
            headElement.setAttribute("id", `breaking_news-${newsArr[i].id}`);
            let newsContainer = document.getElementById("breaking-news-data");
            newsContainer.appendChild(headElement);
            let newsVal = document.getElementById(`breaking_news-${newsArr[i].id}`);
            newsVal.innerHTML = newsArr[i].news_value;
        }

        let breaking_news_des = document.querySelectorAll(".breaking-news-desg")
        let method = layout.breaking_news_band;
        breaking_news_des.forEach((val) => {
            if (method && method.font_color !== undefined) {
                val.style.color = method.font_color;
            }

            if (method && method.font_size !== undefined) {
                val.style.fontSize = method.font_size;
            }

            if (method && method.font_family !== undefined) {
                val.style.fontFamily = method.font_family;
            }
            if (method && method.hasOwnProperty("animation")) {
                const parentElement = val.parentElement;
                if (parentElement) {
                    animationClasses.forEach((animationClass) => {
                        if (parentElement.classList.contains(animationClass)) {
                            parentElement.classList.remove(animationClass);
                        }
                    });
                    if (method.animation.trim() !== "") {
                        parentElement.classList.add(method.animation);
                    }
                }
            }
        });
        //  checkLayout();
    } catch (error) {
        console.error("Error in create_breaking_news:", error);
    }
}

function updateBreakingNewsBand(item) {
    try {
        item.left != null ? Left("breaking-news-grid", item.left + "px") : "";
        item.top != null ? Top("breaking-news-grid", item.top + "px") : "";
        BasedOnUrlType(
            item.bgVideo,
            "breaking-news-png",
            "video-grid-breaking"
        );

        item.width != null
            ? WidthAdjust("breaking-news-grid", item.width + "%")
            : "";

        item.width != null
            ? WidthAdjust("video-grid-breaking", item.width + "%")
            : "";
        item.zIndex != null
            ? zIndexAdjust("breaking-news-grid", item.zIndex == true ? "99" : "0")
            : "";
        item.textLeft != null
            ? Left("breaking-news-data", item.textLeft + "px")
            : Left("breaking-news-data", "auto");
        item.textTop != null ? Top("breaking-news-data", item.textTop + "px") : "";
    } catch (error) {
        console.error("Error in updateBreakingNewsBand:", error);
    }
}

/* To update or add the location in live bug*/
function locUpdate(data) {
    try {
        let newsArr = data.locNews;
        removeNews("loc-news");
        let newsContainer = document.getElementById("loc-news");
        if (!newsContainer) {
            console.warn("loc-news element not found");
            return;
        }
        let locElement = document.createElement("h2");
        locElement.setAttribute("class", "location_h2");
        locElement.setAttribute("id", "loc-h2");
        newsContainer.appendChild(locElement);
        locElement.innerHTML = newsArr || "";
        checkLayout();
    } catch (error) {
        console.error("Error in locUpdate:", error);
    }
}

function autoScale() {
    try {
        const wrapper = document.getElementById("scaleWrapper");
        const scaleX = window.innerWidth / 1920;
        const scaleY = window.innerHeight / 1080;
        const scale = Math.min(scaleX, scaleY);
        wrapper.style.transform = `scale(${scale})`;
        wrapper.style.transformOrigin = "left top";
        wrapper.style.zIndex = "999999";
    } catch (error) {
        console.error("Error in autoScale:", error);
    }
}

window.addEventListener("resize", autoScale);
window.addEventListener("load", autoScale);

function handleAudioMuteMap(data) {
    try {
        const type = data.type || data.Type;
        if (!type || type != 'AUDIO_CONTROL') return;
        const source = data.source;
        if (!source) return;

        if (!audioMuteMap.get(source)) {
            audioMuteMap.set(source, new Map());
        }
        audioMuteMap.get(source).set(data.userId, data);
    } catch (error) {
        console.error("Error in handleAudioMuteMap:", error);
    }
}

async function handleGlobalMute(mute) {
    try {
        // isGlobalMute = mute == "true";
        if (mute == "true") {
            const videos = document.querySelectorAll('video');
            const audios = document.querySelectorAll('audio');

            videos.forEach(video => video.muted = true);
            audios.forEach(audio => audio.muted = true);

            const trtcUsers = trtc._remoteAudioMuteMap;
            if (trtcUsers instanceof Map) {
                trtcUsers.forEach((isMuted, userId) => {
                    if (!isMuted) {
                        muteTRTC(userId, true);
                    }
                })
            }
        } else {
            audioMuteMap.forEach(source => {
                source.forEach(handleAudioControl)
            })
        }
    } catch (error) {
        console.error("Error in handleGlobalMute:", error);
    }

}

function handleAudioControl(data) {
    try {
        handleAudioMuteMap(data)
        if (isGlobalMute) return;

        // TRTC PARTICIPANT
        if (data.source === "TRTC") {
            muteTRTC(data.userId, data.mute);
        }

        // EXTERNAL VIDEO
        if (data.source === "EXTERNAL_VIDEO") {
            muteExternalVideo(data.userId, data.mute);
        }

        // EXTERNAL AUDIO ONLY
        if (data.source === "EXTERNAL_AUDIO") {
            muteExternalAudio(data.audioId, data.mute);
        }
        //SLDP video mute and unmute
        if (data.source === "SLDP_VIDEO") {
            setTimeout(() => {
                muteSldpVideo(data.userId, data.mute);
            }, 650)
        }
    } catch (error) {
        console.error("Error in handleAudioControl:", error);
    }
}

function appendMuteIcon(isMuted = true) {
    try {
        if (document.getElementById("global-mute-icon")) return;

        const icon = document.createElement("div");
        icon.id = "global-mute-icon";
        icon.innerHTML = isMuted ? Mute_Icon : Volume_Icon;

        Object.assign(icon.style, {
            position: "fixed",
            bottom: "2%",
            left: "2%",
            zIndex: "999999",

            width: "clamp(40px, 6vw, 70px)",
            aspectRatio: "1",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            fontSize: "clamp(18px, 2vw, 28px)",
            padding: "clamp(8px, 1vw, 14px)",

            cursor: "pointer",
            color: "white",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            borderRadius: "50%",
            boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
            backdropFilter: "blur(6px)",
            userSelect: "none"
        });

        icon.addEventListener("click", () => {
            isGlobalMute = !isGlobalMute;
            icon.innerHTML = isGlobalMute ? Mute_Icon : Volume_Icon;
            handleGlobalMute(isGlobalMute ? "true" : "false");
        });

        document.body.appendChild(icon);
    } catch (error) {
        console.error("Error in appendMuteIcon:", error);
    }
}

function seekExternalVideo(data) {
    if (!data || !data.userId) return;
    let seekTime = Number(data.seekTime);

    if (!Number.isFinite(seekTime)) return;

    const video = externalVideos.get(data.userId);
    if (!video || video.readyState === 0) return;

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    if (seekTime < 0 || seekTime >= duration) seekTime = 0;
    if (Math.abs(video.currentTime - seekTime) < 0.3) return;

    try {
        video.currentTime = seekTime;
        if (video.paused) video.play();
    } catch (err) {
        console.warn(`Seek failed for ${data.type || data.Type} - ${data.userId}:`, err);
    }
}

//To handle empty object or empty arrray and null/undefined values
function isValidData(data) {
    if (data == null || data == undefined) {
        return true;
    }
    if (Array.isArray(data) && data.length === 0) return true;
    if (typeof data === "object" && Object.keys(data).length === 0) return true;
    return false;
}