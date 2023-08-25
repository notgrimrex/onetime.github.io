"use strict";
window.DOMHandler = class e {
    constructor(e, t) {
        this._iRuntime = e, this._componentId = t, this._hasTickCallback = !1, this._tickCallback = () => this.Tick()
    }
    Attach() {}
    PostToRuntime(e, t, i, s) {
        this._iRuntime.PostToRuntimeComponent(this._componentId, e, t, i, s)
    }
    PostToRuntimeAsync(e, t, i, s) {
        return this._iRuntime.PostToRuntimeComponentAsync(this._componentId, e, t, i, s)
    }
    _PostToRuntimeMaybeSync(e, t, i) {
        this._iRuntime.UsesWorker() ? this.PostToRuntime(e, t, i) : this._iRuntime._GetLocalRuntime()._OnMessageFromDOM({
            type: "event",
            component: this._componentId,
            handler: e,
            dispatchOpts: i || null,
            data: t,
            responseId: null
        })
    }
    AddRuntimeMessageHandler(e, t) {
        this._iRuntime.AddRuntimeComponentMessageHandler(this._componentId, e, t)
    }
    AddRuntimeMessageHandlers(e) {
        for (let [t, i] of e) this.AddRuntimeMessageHandler(t, i)
    }
    GetRuntimeInterface() {
        return this._iRuntime
    }
    GetComponentID() {
        return this._componentId
    }
    _StartTicking() {
        this._hasTickCallback || (this._iRuntime._AddRAFCallback(this._tickCallback), this._hasTickCallback = !0)
    }
    _StopTicking() {
        this._hasTickCallback && (this._iRuntime._RemoveRAFCallback(this._tickCallback), this._hasTickCallback = !1)
    }
    Tick() {}
}, window.RateLimiter = class e {
    constructor(e, t) {
        this._callback = e, this._interval = t, this._timerId = -1, this._lastCallTime = -1 / 0, this._timerCallFunc = () => this._OnTimer(), this._ignoreReset = !1, this._canRunImmediate = !1
    }
    SetCanRunImmediate(e) {
        this._canRunImmediate = !!e
    }
    Call() {
        if (-1 !== this._timerId) return;
        let e = Date.now(),
            t = e - this._lastCallTime,
            i = this._interval;
        t >= i && this._canRunImmediate ? (this._lastCallTime = e, this._RunCallback()) : this._timerId = self.setTimeout(this._timerCallFunc, Math.max(i - t, 4))
    }
    _RunCallback() {
        this._ignoreReset = !0, this._callback(), this._ignoreReset = !1
    }
    Reset() {
        this._ignoreReset || (this._CancelTimer(), this._lastCallTime = Date.now())
    }
    _OnTimer() {
        this._timerId = -1, this._lastCallTime = Date.now(), this._RunCallback()
    }
    _CancelTimer() {
        -1 !== this._timerId && (self.clearTimeout(this._timerId), this._timerId = -1)
    }
    Release() {
        this._CancelTimer(), this._callback = null, this._timerCallFunc = null
    }
}, window.DOMElementHandler = class e extends self.DOMHandler {
    constructor(e, t) {
        super(e, t), this._elementMap = new Map, this._autoAttach = !0, this.AddRuntimeMessageHandlers([
            ["create", e => this._OnCreate(e)],
            ["destroy", e => this._OnDestroy(e)],
            ["set-visible", e => this._OnSetVisible(e)],
            ["update-position", e => this._OnUpdatePosition(e)],
            ["update-state", e => this._OnUpdateState(e)],
            ["focus", e => this._OnSetFocus(e)],
            ["set-css-style", e => this._OnSetCssStyle(e)],
            ["set-attribute", e => this._OnSetAttribute(e)],
            ["remove-attribute", e => this._OnRemoveAttribute(e)]
        ]), this.AddDOMElementMessageHandler("get-element", e => e)
    }
    SetAutoAttach(e) {
        this._autoAttach = !!e
    }
    AddDOMElementMessageHandler(e, t) {
        this.AddRuntimeMessageHandler(e, e => {
            let i = e.elementId,
                s = this._elementMap.get(i);
            return t(s, e)
        })
    }
    _OnCreate(e) {
        let t = e.elementId,
            i = this.CreateElement(t, e);
        this._elementMap.set(t, i), e.isVisible || (i.style.display = "none");
        let s = this._GetFocusElement(i);
        s.addEventListener("focus", e => this._OnFocus(t)), s.addEventListener("blur", e => this._OnBlur(t)), this._autoAttach && document.body.appendChild(i)
    }
    CreateElement(e, t) {
        throw Error("required override")
    }
    DestroyElement(e) {}
    _OnDestroy(e) {
        let t = e.elementId,
            i = this._elementMap.get(t);
        this.DestroyElement(i), this._autoAttach && i.parentElement.removeChild(i), this._elementMap.delete(t)
    }
    PostToRuntimeElement(e, t, i) {
        i || (i = {}), i.elementId = t, this.PostToRuntime(e, i)
    }
    _PostToRuntimeElementMaybeSync(e, t, i) {
        i || (i = {}), i.elementId = t, this._PostToRuntimeMaybeSync(e, i)
    }
    _OnSetVisible(e) {
        if (!this._autoAttach) return;
        let t = this._elementMap.get(e.elementId);
        t.style.display = e.isVisible ? "" : "none"
    }
    _OnUpdatePosition(e) {
        if (!this._autoAttach) return;
        let t = this._elementMap.get(e.elementId);
        t.style.left = e.left + "px", t.style.top = e.top + "px", t.style.width = e.width + "px", t.style.height = e.height + "px";
        let i = e.fontSize;
        null !== i && (t.style.fontSize = i + "em")
    }
    _OnUpdateState(e) {
        let t = this._elementMap.get(e.elementId);
        this.UpdateState(t, e)
    }
    UpdateState(e, t) {
        throw Error("required override")
    }
    _GetFocusElement(e) {
        return e
    }
    _OnFocus(e) {
        this.PostToRuntimeElement("elem-focused", e)
    }
    _OnBlur(e) {
        this.PostToRuntimeElement("elem-blurred", e)
    }
    _OnSetFocus(e) {
        let t = this._GetFocusElement(this._elementMap.get(e.elementId));
        e.focus ? t.focus() : t.blur()
    }
    _OnSetCssStyle(e) {
        let t = this._elementMap.get(e.elementId);
        t.style[e.prop] = e.val
    }
    _OnSetAttribute(e) {
        let t = this._elementMap.get(e.elementId);
        t.setAttribute(e.name, e.val)
    }
    _OnRemoveAttribute(e) {
        let t = this._elementMap.get(e.elementId);
        t.removeAttribute(e.name)
    }
    GetElementById(e) {
        return this._elementMap.get(e)
    }
};
{
    let e = /(iphone|ipod|ipad|macos|macintosh|mac os x)/i.test(navigator.userAgent),
        t = 0;

    function i(e) {
        let i = document.createElement("script");
        return new Promise((i.async = !1, i.type = "module", e.isStringSrc) ? s => {
            let n = "c3_resolve_" + t;
            ++t, self[n] = s, i.textContent = e.str + `

self["${n}"]();`, document.head.appendChild(i)
        } : (t, s) => {
            i.onload = t, i.onerror = s, i.src = e, document.head.appendChild(i)
        })
    }
    let s = !1,
        n = !1;

    function a() {
        if (!s) {
            try {
                new Worker("blob://", {
                    get type() {
                        n = !0
                    }
                })
            } catch (e) {}
            s = !0
        }
        return n
    }
    let o = new Audio,
        r = {
            "audio/webm; codecs=opus": !!o.canPlayType("audio/webm; codecs=opus"),
            "audio/ogg; codecs=opus": !!o.canPlayType("audio/ogg; codecs=opus"),
            "audio/webm; codecs=vorbis": !!o.canPlayType("audio/webm; codecs=vorbis"),
            "audio/ogg; codecs=vorbis": !!o.canPlayType("audio/ogg; codecs=vorbis"),
            "audio/mp4": !!o.canPlayType("audio/mp4"),
            "audio/mpeg": !!o.canPlayType("audio/mpeg")
        };
    async function d(e) {
        let t = await l(e),
            i = new TextDecoder("utf-8");
        return i.decode(t)
    }

    function l(e) {
        return new Promise((t, i) => {
            let s = new FileReader;
            s.onload = e => t(e.target.result), s.onerror = e => i(e), s.readAsArrayBuffer(e)
        })
    }
    o = null;
    let h = [],
        u = 0;
    window.RealFile = window.File;
    let c = [],
        p = new Map,
        m = new Map,
        f = 0,
        g = [];
    self.runOnStartup = function e(t) {
        if ("function" != typeof t) throw Error("runOnStartup called without a function");
        g.push(t)
    };
    let y = new Set(["cordova", "playable-ad", "instant-games"]);

    function S(e) {
        return y.has(e)
    }
    let b = !1;
    window.RuntimeInterface = class t {
        constructor(e) {
            this._useWorker = e.useWorker, this._messageChannelPort = null, this._baseUrl = "", this._scriptFolder = e.scriptFolder, this._workerScriptURLs = {}, this._worker = null, this._localRuntime = null, this._domHandlers = [], this._runtimeDomHandler = null, this._canvas = null, this._jobScheduler = null, this._rafId = -1, this._rafFunc = () => this._OnRAFCallback(), this._rafCallbacks = [], this._exportType = e.exportType, !this._useWorker || "undefined" != typeof OffscreenCanvas && navigator.userActivation && a() || (this._useWorker = !1), S(this._exportType) && this._useWorker && (console.warn("[C3 runtime] Worker mode is enabled and supported, but is currently disabled in WebViews. Reverting to DOM mode."), this._useWorker = !1), this._localFileBlobs = null, this._localFileStrings = null, ("html5" === this._exportType || "playable-ad" === this._exportType) && "file" === location.protocol.substr(0, 4) && alert("Exported games won't work until you upload them. (When running on the file: protocol, browsers block many features from working for security reasons.)"), this.AddRuntimeComponentMessageHandler("runtime", "cordova-fetch-local-file", e => this._OnCordovaFetchLocalFile(e)), this.AddRuntimeComponentMessageHandler("runtime", "create-job-worker", e => this._OnCreateJobWorker(e)), "cordova" === this._exportType ? document.addEventListener("deviceready", () => this._Init(e)) : this._Init(e)
        }
        Release() {
            this._CancelAnimationFrame(), this._messageChannelPort && (this._messageChannelPort.onmessage = null, this._messageChannelPort = null), this._worker && (this._worker.terminate(), this._worker = null), this._localRuntime && (this._localRuntime.Release(), this._localRuntime = null), this._canvas && (this._canvas.parentElement.removeChild(this._canvas), this._canvas = null)
        }
        GetCanvas() {
            return this._canvas
        }
        GetBaseURL() {
            return this._baseUrl
        }
        UsesWorker() {
            return this._useWorker
        }
        GetExportType() {
            return this._exportType
        }
        GetScriptFolder() {
            return this._scriptFolder
        }
        IsiOSCordova() {
            return e && "cordova" === this._exportType
        }
        IsiOSWebView() {
            return e && S(this._exportType) || navigator.standalone
        }
        async _Init(e) {
            if ("macos-wkwebview" === this._exportType && this._SendWrapperMessage({
                    type: "ready"
                }), "playable-ad" === this._exportType) {
                this._localFileBlobs = self.c3_base64files, this._localFileStrings = {}, await this._ConvertDataUrisToBlobs();
                for (let t = 0, i = e.engineScripts.length; t < i; ++t) {
                    let s = e.engineScripts[t].toLowerCase();
                    this._localFileStrings.hasOwnProperty(s) ? e.engineScripts[t] = {
                        isStringSrc: !0,
                        str: this._localFileStrings[s]
                    } : this._localFileBlobs.hasOwnProperty(s) && (e.engineScripts[t] = URL.createObjectURL(this._localFileBlobs[s]))
                }
            }
            if (e.baseUrl) this._baseUrl = e.baseUrl;
            else {
                let n = location.origin;
                this._baseUrl = ("null" === n ? "file:///" : n) + location.pathname;
                let a = this._baseUrl.lastIndexOf("/"); - 1 !== a && (this._baseUrl = this._baseUrl.substr(0, a + 1))
            }
            e.workerScripts && (this._workerScriptURLs = e.workerScripts);
            let o = new MessageChannel;
            this._messageChannelPort = o.port1, this._messageChannelPort.onmessage = e => this._OnMessageFromRuntime(e.data), window.c3_addPortMessageHandler && window.c3_addPortMessageHandler(e => this._OnMessageFromDebugger(e)), this._jobScheduler = new self.JobSchedulerDOM(this), await this._jobScheduler.Init(), "object" == typeof window.StatusBar && window.StatusBar.hide(), "object" == typeof window.AndroidFullScreen && window.AndroidFullScreen.immersiveMode(), this._useWorker ? await this._InitWorker(e, o.port2) : await this._InitDOM(e, o.port2)
        }
        _GetWorkerURL(e) {
            let t;
            return (t = this._workerScriptURLs.hasOwnProperty(e) ? this._workerScriptURLs[e] : e.endsWith("/workermain.js") && this._workerScriptURLs.hasOwnProperty("workermain.js") ? this._workerScriptURLs["workermain.js"] : "playable-ad" === this._exportType && this._localFileBlobs.hasOwnProperty(e.toLowerCase()) ? this._localFileBlobs[e.toLowerCase()] : e) instanceof Blob && (t = URL.createObjectURL(t)), t
        }
        async CreateWorker(e, t, i) {
            if (e.startsWith("blob:")) return new Worker(e, i);
            if (this.IsiOSCordova() && "file:" === location.protocol) {
                let s = await this.CordovaFetchLocalFileAsArrayBuffer(this._scriptFolder + e),
                    n = new Blob([s], {
                        type: "application/javascript"
                    });
                return new Worker(URL.createObjectURL(n), i)
            }
            let a = new URL(e, t),
                o = location.origin !== a.origin;
            if (!o) return new Worker(a, i);
            {
                let r = await fetch(a);
                if (!r.ok) throw Error("failed to fetch worker script");
                let d = await r.blob();
                return new Worker(URL.createObjectURL(d), i)
            }
        }
        _GetWindowInnerWidth() {
            return Math.max(window.innerWidth, 1)
        }
        _GetWindowInnerHeight() {
            return Math.max(window.innerHeight, 1)
        }
        _GetCommonRuntimeOptions(e) {
            return {
                baseUrl: this._baseUrl,
                windowInnerWidth: this._GetWindowInnerWidth(),
                windowInnerHeight: this._GetWindowInnerHeight(),
                devicePixelRatio: window.devicePixelRatio,
                isFullscreen: t.IsDocumentFullscreen(),
                projectData: e.projectData,
                previewImageBlobs: window.cr_previewImageBlobs || this._localFileBlobs,
                previewProjectFileBlobs: window.cr_previewProjectFileBlobs,
                previewProjectFileSWUrls: window.cr_previewProjectFiles,
                swClientId: window.cr_swClientId || "",
                exportType: e.exportType,
                isDebug: self.location.search.indexOf("debug") > -1,
                ife: !!self.ife,
                jobScheduler: this._jobScheduler.GetPortData(),
                supportedAudioFormats: r,
                opusWasmScriptUrl: window.cr_opusWasmScriptUrl || this._scriptFolder + "opus.wasm.js",
                opusWasmBinaryUrl: window.cr_opusWasmBinaryUrl || this._scriptFolder + "opus.wasm.wasm",
                isiOSCordova: this.IsiOSCordova(),
                isiOSWebView: this.IsiOSWebView(),
                isFBInstantAvailable: void 0 !== self.FBInstant
            }
        }
        async _InitWorker(e, t) {
            let i = this._GetWorkerURL(e.workerMainUrl);
            this._worker = await this.CreateWorker(i, this._baseUrl, {
                type: "module",
                name: "Runtime"
            }), this._canvas = document.createElement("canvas"), this._canvas.style.display = "none";
            let s = this._canvas.transferControlToOffscreen();
            document.body.appendChild(this._canvas), window.c3canvas = this._canvas, this._worker.postMessage(Object.assign(this._GetCommonRuntimeOptions(e), {
                type: "init-runtime",
                isInWorker: !0,
                messagePort: t,
                canvas: s,
                workerDependencyScripts: e.workerDependencyScripts || [],
                engineScripts: e.engineScripts,
                projectScripts: e.projectScripts,
                mainProjectScript: e.mainProjectScript,
                projectScriptsStatus: self.C3_ProjectScriptsStatus
            }), [t, s, ...this._jobScheduler.GetPortTransferables()]), this._domHandlers = c.map(e => new e(this)), this._FindRuntimeDOMHandler(), self.c3_callFunction = (e, t) => this._runtimeDomHandler._InvokeFunctionFromJS(e, t), "preview" === this._exportType && (self.goToLastErrorScript = () => this.PostToRuntimeComponent("runtime", "go-to-last-error-script"))
        }
        async _InitDOM(e, t) {
            this._canvas = document.createElement("canvas"), this._canvas.style.display = "none", document.body.appendChild(this._canvas), window.c3canvas = this._canvas, this._domHandlers = c.map(e => new e(this)), this._FindRuntimeDOMHandler();
            let s = e.engineScripts.map(e => "string" == typeof e ? new URL(e, this._baseUrl).toString() : e);
            Array.isArray(e.workerDependencyScripts) && s.unshift(...e.workerDependencyScripts), await Promise.all((s = await Promise.all(s.map(e => this._MaybeGetCordovaScriptURL(e)))).map(e => i(e)));
            let n = self.C3_ProjectScriptsStatus,
                a = e.mainProjectScript,
                o = e.projectScripts;
            for (let [r, d] of o)
                if (d || (d = r), r === a) try {
                    await i(d = await this._MaybeGetCordovaScriptURL(d)), "preview" !== this._exportType || n[r] || this._ReportProjectMainScriptError(r, "main script did not run to completion")
                } catch (l) {
                    this._ReportProjectMainScriptError(r, l)
                } else("scriptsInEvents.js" === r || r.endsWith("/scriptsInEvents.js")) && await i(d = await this._MaybeGetCordovaScriptURL(d));
            if ("preview" === this._exportType && "object" != typeof self.C3.ScriptsInEvents) {
                this._RemoveLoadingMessage();
                let h = "Failed to load JavaScript code used in events. Check all your JavaScript code has valid syntax.";
                console.error("[C3 runtime] " + h), alert(h);
                return
            }
            let u = Object.assign(this._GetCommonRuntimeOptions(e), {
                isInWorker: !1,
                messagePort: t,
                canvas: this._canvas,
                runOnStartupFunctions: g
            });
            this._OnBeforeCreateRuntime(), this._localRuntime = self.C3_CreateRuntime(u), await self.C3_InitRuntime(this._localRuntime, u)
        }
        _ReportProjectMainScriptError(e, t) {
            this._RemoveLoadingMessage(), console.error(`[Preview] Failed to load project main script (${e}): `, t), alert(`Failed to load project main script (${e}). Check all your JavaScript code has valid syntax. Press F12 and check the console for error details.`)
        }
        _OnBeforeCreateRuntime() {
            this._RemoveLoadingMessage()
        }
        _RemoveLoadingMessage() {
            let e = window.cr_previewLoadingElem;
            e && (e.parentElement.removeChild(e), window.cr_previewLoadingElem = null)
        }
        async _OnCreateJobWorker(e) {
            let t = await this._jobScheduler._CreateJobWorker();
            return {
                outputPort: t,
                transferables: [t]
            }
        }
        _GetLocalRuntime() {
            if (this._useWorker) throw Error("not available in worker mode");
            return this._localRuntime
        }
        PostToRuntimeComponent(e, t, i, s, n) {
            this._messageChannelPort.postMessage({
                type: "event",
                component: e,
                handler: t,
                dispatchOpts: s || null,
                data: i,
                responseId: null
            }, n)
        }
        PostToRuntimeComponentAsync(e, t, i, s, n) {
            let a = f++,
                o = new Promise((e, t) => {
                    m.set(a, {
                        resolve: e,
                        reject: t
                    })
                });
            return this._messageChannelPort.postMessage({
                type: "event",
                component: e,
                handler: t,
                dispatchOpts: s || null,
                data: i,
                responseId: a
            }, n), o
        }
        _OnMessageFromRuntime(e) {
            let t = e.type;
            if ("event" === t) return this._OnEventFromRuntime(e);
            if ("result" === t) this._OnResultFromRuntime(e);
            else if ("runtime-ready" === t) this._OnRuntimeReady();
            else if ("alert-error" === t) this._RemoveLoadingMessage(), alert(e.message);
            else if ("creating-runtime" === t) this._OnBeforeCreateRuntime();
            else throw Error(`unknown message '${t}'`)
        }
        _OnEventFromRuntime(e) {
            let t = e.component,
                i = e.handler,
                s = e.data,
                n = e.responseId,
                a = p.get(t);
            if (!a) {
                console.warn(`[DOM] No event handlers for component '${t}'`);
                return
            }
            let o = a.get(i);
            if (!o) {
                console.warn(`[DOM] No handler '${i}' for component '${t}'`);
                return
            }
            let r = null;
            try {
                r = o(s)
            } catch (d) {
                console.error(`Exception in '${t}' handler '${i}':`, d), null !== n && this._PostResultToRuntime(n, !1, "" + d);
                return
            }
            if (null === n) return r;
            r && r.then ? r.then(e => this._PostResultToRuntime(n, !0, e)).catch(e => {
                console.error(`Rejection from '${t}' handler '${i}':`, e), this._PostResultToRuntime(n, !1, "" + e)
            }) : this._PostResultToRuntime(n, !0, r)
        }
        _PostResultToRuntime(e, t, i) {
            let s;
            i && i.transferables && (s = i.transferables), this._messageChannelPort.postMessage({
                type: "result",
                responseId: e,
                isOk: t,
                result: i
            }, s)
        }
        _OnResultFromRuntime(e) {
            let t = e.responseId,
                i = e.isOk,
                s = e.result,
                n = m.get(t);
            i ? n.resolve(s) : n.reject(s), m.delete(t)
        }
        AddRuntimeComponentMessageHandler(e, t, i) {
            let s = p.get(e);
            if (s || (s = new Map, p.set(e, s)), s.has(t)) throw Error(`[DOM] Component '${e}' already has handler '${t}'`);
            s.set(t, i)
        }
        static AddDOMHandlerClass(e) {
            if (c.includes(e)) throw Error("DOM handler already added");
            c.push(e)
        }
        _FindRuntimeDOMHandler() {
            for (let e of this._domHandlers)
                if ("runtime" === e.GetComponentID()) {
                    this._runtimeDomHandler = e;
                    return
                } throw Error("cannot find runtime DOM handler")
        }
        _OnMessageFromDebugger(e) {
            this.PostToRuntimeComponent("debugger", "message", e)
        }
        _OnRuntimeReady() {
            for (let e of this._domHandlers) e.Attach()
        }
        static IsDocumentFullscreen() {
            return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || b)
        }
        static _SetWrapperIsFullscreenFlag(e) {
            b = !!e
        }
        async GetRemotePreviewStatusInfo() {
            return await this.PostToRuntimeComponentAsync("runtime", "get-remote-preview-status-info")
        }
        _AddRAFCallback(e) {
            this._rafCallbacks.push(e), this._RequestAnimationFrame()
        }
        _RemoveRAFCallback(e) {
            let t = this._rafCallbacks.indexOf(e);
            if (-1 === t) throw Error("invalid callback");
            this._rafCallbacks.splice(t, 1), this._rafCallbacks.length || this._CancelAnimationFrame()
        }
        _RequestAnimationFrame() {
            -1 === this._rafId && this._rafCallbacks.length && (this._rafId = requestAnimationFrame(this._rafFunc))
        }
        _CancelAnimationFrame() {
            -1 !== this._rafId && (cancelAnimationFrame(this._rafId), this._rafId = -1)
        }
        _OnRAFCallback() {
            for (let e of (this._rafId = -1, this._rafCallbacks)) e();
            this._RequestAnimationFrame()
        }
        TryPlayMedia(e) {
            this._runtimeDomHandler.TryPlayMedia(e)
        }
        RemovePendingPlay(e) {
            this._runtimeDomHandler.RemovePendingPlay(e)
        }
        _PlayPendingMedia() {
            this._runtimeDomHandler._PlayPendingMedia()
        }
        SetSilent(e) {
            this._runtimeDomHandler.SetSilent(e)
        }
        IsAudioFormatSupported(e) {
            return !!r[e]
        }
        async _WasmDecodeWebMOpus(e) {
            let t = await this.PostToRuntimeComponentAsync("runtime", "opus-decode", {
                arrayBuffer: e
            }, null, [e]);
            return new Float32Array(t)
        }
        IsAbsoluteURL(e) {
            return /^(?:[a-z\-]+:)?\/\//.test(e) || "data:" === e.substr(0, 5) || "blob:" === e.substr(0, 5)
        }
        IsRelativeURL(e) {
            return !this.IsAbsoluteURL(e)
        }
        async _MaybeGetCordovaScriptURL(e) {
            if (!("cordova" === this._exportType && (e.startsWith("file:") || "file:" === location.protocol && this.IsRelativeURL(e)))) return e;
            {
                let t = e;
                t.startsWith(this._baseUrl) && (t = t.substr(this._baseUrl.length));
                let i = await this.CordovaFetchLocalFileAsArrayBuffer(t),
                    s = new Blob([i], {
                        type: "application/javascript"
                    });
                return URL.createObjectURL(s)
            }
        }
        async _OnCordovaFetchLocalFile(e) {
            let t = e.filename;
            switch (e.as) {
                case "text":
                    return await this.CordovaFetchLocalFileAsText(t);
                case "buffer":
                    return await this.CordovaFetchLocalFileAsArrayBuffer(t);
                default:
                    throw Error("unsupported type")
            }
        }
        _GetPermissionAPI() {
            let e = window.cordova && window.cordova.plugins && window.cordova.plugins.permissions;
            if ("object" != typeof e) throw Error("Permission API is not loaded");
            return e
        }
        _MapPermissionID(e, t) {
            let i = e[t];
            if ("string" != typeof i) throw Error("Invalid permission name");
            return i
        }
        _HasPermission(e) {
            let t = this._GetPermissionAPI();
            return new Promise((i, s) => t.checkPermission(this._MapPermissionID(t, e), e => i(!!e.hasPermission), s))
        }
        _RequestPermission(e) {
            let t = this._GetPermissionAPI();
            return new Promise((i, s) => t.requestPermission(this._MapPermissionID(t, e), e => i(!!e.hasPermission), s))
        }
        async RequestPermissions(e) {
            if ("cordova" !== this.GetExportType() || this.IsiOSCordova()) return !0;
            for (let t of e) {
                let i = await this._HasPermission(t);
                if (i) continue;
                let s = await this._RequestPermission(t);
                if (!1 === s) return !1
            }
            return !0
        }
        async RequirePermissions(...e) {
            if (await this.RequestPermissions(e) === !1) throw Error("Permission not granted")
        }
        CordovaFetchLocalFile(e) {
            let t = window.cordova.file.applicationDirectory + "www/" + e.toLowerCase();
            return new Promise((e, i) => {
                window.resolveLocalFileSystemURL(t, t => {
                    t.file(e, i)
                }, i)
            })
        }
        async CordovaFetchLocalFileAsText(e) {
            let t = await this.CordovaFetchLocalFile(e);
            return await d(t)
        }
        _CordovaMaybeStartNextArrayBufferRead() {
            if (!h.length || u >= 8) return;
            u++;
            let e = h.shift();
            this._CordovaDoFetchLocalFileAsAsArrayBuffer(e.filename, e.successCallback, e.errorCallback)
        }
        CordovaFetchLocalFileAsArrayBuffer(e) {
            return new Promise((t, i) => {
                h.push({
                    filename: e,
                    successCallback: e => {
                        u--, this._CordovaMaybeStartNextArrayBufferRead(), t(e)
                    },
                    errorCallback: e => {
                        u--, this._CordovaMaybeStartNextArrayBufferRead(), i(e)
                    }
                }), this._CordovaMaybeStartNextArrayBufferRead()
            })
        }
        async _CordovaDoFetchLocalFileAsAsArrayBuffer(e, t, i) {
            try {
                let s = await this.CordovaFetchLocalFile(e),
                    n = await l(s);
                t(n)
            } catch (a) {
                i(a)
            }
        }
        _SendWrapperMessage(e) {
            if ("windows-webview2" === this._exportType) window.chrome.webview.postMessage(JSON.stringify(e));
            else if ("macos-wkwebview" === this._exportType) window.webkit.messageHandlers.C3Wrapper.postMessage(JSON.stringify(e));
            else throw Error("cannot send wrapper message")
        }
        async _ConvertDataUrisToBlobs() {
            let e = [];
            for (let [t, i] of Object.entries(this._localFileBlobs)) e.push(this._ConvertDataUriToBlobs(t, i));
            await Promise.all(e)
        }
        async _ConvertDataUriToBlobs(e, t) {
            if ("object" == typeof t) this._localFileBlobs[e] = new Blob([t.str], {
                type: t.type
            }), this._localFileStrings[e] = t.str;
            else {
                let i = await this._FetchDataUri(t);
                i || (i = this._DataURIToBinaryBlobSync(t)), this._localFileBlobs[e] = i
            }
        }
        async _FetchDataUri(e) {
            try {
                let t = await fetch(e);
                return await t.blob()
            } catch (i) {
                return console.warn("Failed to fetch a data: URI. Falling back to a slower workaround. This is probably because the Content Security Policy unnecessarily blocked it. Allow data: URIs in your CSP to avoid this.", i), null
            }
        }
        _DataURIToBinaryBlobSync(e) {
            let t = this._ParseDataURI(e);
            return this._BinaryStringToBlob(t.data, t.mime_type)
        }
        _ParseDataURI(e) {
            let t = e.indexOf(",");
            if (t < 0) throw URIError("expected comma in data: uri");
            let i = e.substring(5, t),
                s = e.substring(t + 1),
                n = i.split(";"),
                a = n[0] || "",
                o = n[1],
                r = n[2],
                d;
            return {
                mime_type: a,
                data: d = "base64" === o || "base64" === r ? atob(s) : decodeURIComponent(s)
            }
        }
        _BinaryStringToBlob(e, t) {
            let i = e.length,
                s = i >> 2,
                n = new Uint8Array(i),
                a = new Uint32Array(n.buffer, 0, s),
                o, r;
            for (o = 0, r = 0; o < s; ++o) a[o] = e.charCodeAt(r++) | e.charCodeAt(r++) << 8 | e.charCodeAt(r++) << 16 | e.charCodeAt(r++) << 24;
            let d = 3 & i;
            for (; d--;) n[r] = e.charCodeAt(r), ++r;
            return new Blob([n], {
                type: t
            })
        }
    }
} {
    let v = self.RuntimeInterface;

    function w(e) {
        return e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents || e.originalEvent && e.originalEvent.sourceCapabilities && e.originalEvent.sourceCapabilities.firesTouchEvents
    }
    let C = new Map([
            ["OSLeft", "MetaLeft"],
            ["OSRight", "MetaRight"]
        ]),
        R = {
            dispatchRuntimeEvent: !0,
            dispatchUserScriptEvent: !0
        },
        P = {
            dispatchUserScriptEvent: !0
        },
        A = {
            dispatchRuntimeEvent: !0
        };

    function k(e) {
        return new Promise((t, i) => {
            let s = document.createElement("link");
            s.onload = () => t(s), s.onerror = e => i(e), s.rel = "stylesheet", s.href = e, document.head.appendChild(s)
        })
    }

    function O(e) {
        return new Promise((t, i) => {
            let s = new Image;
            s.onload = () => t(s), s.onerror = e => i(e), s.src = e
        })
    }
    async function T(e) {
        let t = URL.createObjectURL(e);
        try {
            return await O(t)
        } finally {
            URL.revokeObjectURL(t)
        }
    }

    function N(e) {
        return new Promise((t, i) => {
            let s = new FileReader;
            s.onload = e => t(e.target.result), s.onerror = e => i(e), s.readAsText(e)
        })
    }
    async function I(e, t, i) {
        if (!/firefox/i.test(navigator.userAgent)) return await T(e);
        let s = await N(e),
            n = new DOMParser,
            a = n.parseFromString(s, "image/svg+xml"),
            o = a.documentElement;
        if (o.hasAttribute("width") && o.hasAttribute("height")) {
            let r = o.getAttribute("width"),
                d = o.getAttribute("height");
            if (!r.includes("%") && !d.includes("%")) return await T(e)
        }
        o.setAttribute("width", t + "px"), o.setAttribute("height", i + "px");
        let l = new XMLSerializer;
        return await T(e = new Blob([s = l.serializeToString(a)], {
            type: "image/svg+xml"
        }))
    }

    function E(e) {
        do {
            if (e.parentNode && e.hasAttribute("contenteditable")) return !0;
            e = e.parentNode
        } while (e);
        return !1
    }
    let G = new Set(["input", "textarea", "datalist", "select"]);

    function M(e) {
        return G.has(e.tagName.toLowerCase()) || E(e)
    }
    let $ = new Set(["canvas", "body", "html"]);

    function F(e) {
        let t = e.target.tagName.toLowerCase();
        $.has(t) && e.preventDefault()
    }

    function D(e) {
        (e.metaKey || e.ctrlKey) && e.preventDefault()
    }
    self.C3_GetSvgImageSize = async function(e) {
        let t = await T(e);
        if (t.width > 0 && t.height > 0) return [t.width, t.height];
        {
            t.style.position = "absolute", t.style.left = "0px", t.style.top = "0px", t.style.visibility = "hidden", document.body.appendChild(t);
            let i = t.getBoundingClientRect();
            return document.body.removeChild(t), [i.width, i.height]
        }
    }, self.C3_RasterSvgImageBlob = async function(e, t, i, s, n) {
        let a = await I(e, t, i),
            o = document.createElement("canvas");
        o.width = s, o.height = n;
        let r = o.getContext("2d");
        return r.drawImage(a, 0, 0, t, i), o
    };
    let L = !1;

    function x() {
        try {
            return window.parent && window.parent.document.hasFocus()
        } catch (e) {
            return !1
        }
    }

    function _() {
        let e = document.activeElement;
        if (!e) return !1;
        let t = e.tagName.toLowerCase(),
            i = new Set(["email", "number", "password", "search", "tel", "text", "url"]);
        return "textarea" === t || ("input" === t ? i.has(e.type.toLowerCase() || "text") : E(e))
    }
    document.addEventListener("pause", () => L = !0), document.addEventListener("resume", () => L = !1);
    let U = class e extends self.DOMHandler {
        constructor(e) {
            super(e, "runtime"), this._isFirstSizeUpdate = !0, this._simulatedResizeTimerId = -1, this._targetOrientation = "any", this._attachedDeviceOrientationEvent = !1, this._attachedDeviceMotionEvent = !1, this._debugHighlightElem = null, this._pointerRawUpdateRateLimiter = null, this._lastPointerRawUpdateEvent = null, e.AddRuntimeComponentMessageHandler("canvas", "update-size", e => this._OnUpdateCanvasSize(e)), e.AddRuntimeComponentMessageHandler("runtime", "invoke-download", e => this._OnInvokeDownload(e)), e.AddRuntimeComponentMessageHandler("runtime", "raster-svg-image", e => this._OnRasterSvgImage(e)), e.AddRuntimeComponentMessageHandler("runtime", "get-svg-image-size", e => this._OnGetSvgImageSize(e)), e.AddRuntimeComponentMessageHandler("runtime", "set-target-orientation", e => this._OnSetTargetOrientation(e)), e.AddRuntimeComponentMessageHandler("runtime", "register-sw", () => this._OnRegisterSW()), e.AddRuntimeComponentMessageHandler("runtime", "post-to-debugger", e => this._OnPostToDebugger(e)), e.AddRuntimeComponentMessageHandler("runtime", "go-to-script", e => this._OnPostToDebugger(e)), e.AddRuntimeComponentMessageHandler("runtime", "before-start-ticking", () => this._OnBeforeStartTicking()), e.AddRuntimeComponentMessageHandler("runtime", "debug-highlight", e => this._OnDebugHighlight(e)), e.AddRuntimeComponentMessageHandler("runtime", "enable-device-orientation", () => this._AttachDeviceOrientationEvent()), e.AddRuntimeComponentMessageHandler("runtime", "enable-device-motion", () => this._AttachDeviceMotionEvent()), e.AddRuntimeComponentMessageHandler("runtime", "add-stylesheet", e => this._OnAddStylesheet(e)), e.AddRuntimeComponentMessageHandler("runtime", "alert", e => this._OnAlert(e)), e.AddRuntimeComponentMessageHandler("runtime", "hide-cordova-splash", () => this._OnHideCordovaSplash());
            let t = new Set(["input", "textarea", "datalist"]);
            window.addEventListener("contextmenu", e => {
                let i = e.target,
                    s = i.tagName.toLowerCase();
                t.has(s) || E(i) || e.preventDefault()
            });
            let i = e.GetCanvas();
            window.addEventListener("selectstart", F), window.addEventListener("gesturehold", F), i.addEventListener("selectstart", F), i.addEventListener("gesturehold", F), window.addEventListener("touchstart", F, {
                passive: !1
            }), "undefined" != typeof PointerEvent ? (window.addEventListener("pointerdown", F, {
                passive: !1
            }), i.addEventListener("pointerdown", F)) : i.addEventListener("touchstart", F), this._mousePointerLastButtons = 0, window.addEventListener("mousedown", e => {
                1 === e.button && e.preventDefault()
            }), window.addEventListener("mousewheel", D, {
                passive: !1
            }), window.addEventListener("wheel", D, {
                passive: !1
            }), window.addEventListener("resize", () => this._OnWindowResize()), window.addEventListener("fullscreenchange", () => this._OnFullscreenChange()), window.addEventListener("webkitfullscreenchange", () => this._OnFullscreenChange()), window.addEventListener("mozfullscreenchange", () => this._OnFullscreenChange()), window.addEventListener("fullscreenerror", e => this._OnFullscreenError(e)), window.addEventListener("webkitfullscreenerror", e => this._OnFullscreenError(e)), window.addEventListener("mozfullscreenerror", e => this._OnFullscreenError(e)), e.IsiOSWebView() && window.addEventListener("focusout", () => {
                _() || (document.scrollingElement.scrollTop = 0)
            }), self.C3WrapperOnMessage = e => this._OnWrapperMessage(e), this._mediaPendingPlay = new Set, this._mediaRemovedPendingPlay = new WeakSet, this._isSilent = !1
        }
        _OnBeforeStartTicking() {
            return "cordova" === this._iRuntime.GetExportType() ? (document.addEventListener("pause", () => this._OnVisibilityChange(!0)), document.addEventListener("resume", () => this._OnVisibilityChange(!1))) : document.addEventListener("visibilitychange", () => this._OnVisibilityChange(document.hidden)), {
                isSuspended: !!(document.hidden || L)
            }
        }
        Attach() {
            window.addEventListener("focus", () => this._PostRuntimeEvent("window-focus")), window.addEventListener("blur", () => {
                this._PostRuntimeEvent("window-blur", {
                    parentHasFocus: x()
                }), this._mousePointerLastButtons = 0
            }), window.addEventListener("focusin", e => {
                M(e.target) && this._PostRuntimeEvent("keyboard-blur")
            }), window.addEventListener("keydown", e => this._OnKeyEvent("keydown", e)), window.addEventListener("keyup", e => this._OnKeyEvent("keyup", e)), window.addEventListener("dblclick", e => this._OnMouseEvent("dblclick", e, R)), window.addEventListener("wheel", e => this._OnMouseWheelEvent("wheel", e)), "undefined" != typeof PointerEvent ? (window.addEventListener("pointerdown", e => {
                this._HandlePointerDownFocus(e), this._OnPointerEvent("pointerdown", e)
            }), this._iRuntime.UsesWorker() && void 0 !== window.onpointerrawupdate && self === self.top ? (this._pointerRawUpdateRateLimiter = new self.RateLimiter(() => this._DoSendPointerRawUpdate(), 5), this._pointerRawUpdateRateLimiter.SetCanRunImmediate(!0), window.addEventListener("pointerrawupdate", e => this._OnPointerRawUpdate(e))) : window.addEventListener("pointermove", e => this._OnPointerEvent("pointermove", e)), window.addEventListener("pointerup", e => this._OnPointerEvent("pointerup", e)), window.addEventListener("pointercancel", e => this._OnPointerEvent("pointercancel", e))) : (window.addEventListener("mousedown", e => {
                this._HandlePointerDownFocus(e), this._OnMouseEventAsPointer("pointerdown", e)
            }), window.addEventListener("mousemove", e => this._OnMouseEventAsPointer("pointermove", e)), window.addEventListener("mouseup", e => this._OnMouseEventAsPointer("pointerup", e)), window.addEventListener("touchstart", e => {
                this._HandlePointerDownFocus(e), this._OnTouchEvent("pointerdown", e)
            }), window.addEventListener("touchmove", e => this._OnTouchEvent("pointermove", e)), window.addEventListener("touchend", e => this._OnTouchEvent("pointerup", e)), window.addEventListener("touchcancel", e => this._OnTouchEvent("pointercancel", e)));
            let e = () => this._PlayPendingMedia();
            window.addEventListener("pointerup", e, !0), window.addEventListener("touchend", e, !0), window.addEventListener("click", e, !0), window.addEventListener("keydown", e, !0), window.addEventListener("gamepadconnected", e, !0)
        }
        _PostRuntimeEvent(e, t) {
            this.PostToRuntime(e, t || null, A)
        }
        _GetWindowInnerWidth() {
            return this._iRuntime._GetWindowInnerWidth()
        }
        _GetWindowInnerHeight() {
            return this._iRuntime._GetWindowInnerHeight()
        }
        _OnWindowResize() {
            let e = this._GetWindowInnerWidth(),
                t = this._GetWindowInnerHeight();
            this._PostRuntimeEvent("window-resize", {
                innerWidth: e,
                innerHeight: t,
                devicePixelRatio: window.devicePixelRatio,
                isFullscreen: v.IsDocumentFullscreen()
            }), this._iRuntime.IsiOSWebView() && (-1 !== this._simulatedResizeTimerId && clearTimeout(this._simulatedResizeTimerId), this._OnSimulatedResize(e, t, 0))
        }
        _ScheduleSimulatedResize(e, t, i) {
            -1 !== this._simulatedResizeTimerId && clearTimeout(this._simulatedResizeTimerId), this._simulatedResizeTimerId = setTimeout(() => this._OnSimulatedResize(e, t, i), 48)
        }
        _OnSimulatedResize(e, t, i) {
            let s = this._GetWindowInnerWidth(),
                n = this._GetWindowInnerHeight();
            this._simulatedResizeTimerId = -1, s != e || n != t ? this._PostRuntimeEvent("window-resize", {
                innerWidth: s,
                innerHeight: n,
                devicePixelRatio: window.devicePixelRatio,
                isFullscreen: v.IsDocumentFullscreen()
            }) : i < 10 && this._ScheduleSimulatedResize(s, n, i + 1)
        }
        _OnSetTargetOrientation(e) {
            this._targetOrientation = e.targetOrientation
        }
        _TrySetTargetOrientation() {
            let e = this._targetOrientation;
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock(e).catch(e => console.warn("[Construct 3] Failed to lock orientation: ", e));
            else try {
                let t = !1;
                screen.lockOrientation ? t = screen.lockOrientation(e) : screen.webkitLockOrientation ? t = screen.webkitLockOrientation(e) : screen.mozLockOrientation ? t = screen.mozLockOrientation(e) : screen.msLockOrientation && (t = screen.msLockOrientation(e)), t || console.warn("[Construct 3] Failed to lock orientation")
            } catch (i) {
                console.warn("[Construct 3] Failed to lock orientation: ", i)
            }
        }
        _OnFullscreenChange() {
            let e = v.IsDocumentFullscreen();
            e && "any" !== this._targetOrientation && this._TrySetTargetOrientation(), this.PostToRuntime("fullscreenchange", {
                isFullscreen: e,
                innerWidth: this._GetWindowInnerWidth(),
                innerHeight: this._GetWindowInnerHeight()
            })
        }
        _OnFullscreenError(e) {
            console.warn("[Construct 3] Fullscreen request failed: ", e), this.PostToRuntime("fullscreenerror", {
                isFullscreen: v.IsDocumentFullscreen(),
                innerWidth: this._GetWindowInnerWidth(),
                innerHeight: this._GetWindowInnerHeight()
            })
        }
        _OnVisibilityChange(e) {
            e ? this._iRuntime._CancelAnimationFrame() : this._iRuntime._RequestAnimationFrame(), this.PostToRuntime("visibilitychange", {
                hidden: e
            })
        }
        _OnKeyEvent(e, t) {
            "Backspace" === t.key && F(t);
            let i = C.get(t.code) || t.code;
            this._PostToRuntimeMaybeSync(e, {
                code: i,
                key: t.key,
                which: t.which,
                repeat: t.repeat,
                altKey: t.altKey,
                ctrlKey: t.ctrlKey,
                metaKey: t.metaKey,
                shiftKey: t.shiftKey,
                timeStamp: t.timeStamp
            }, R)
        }
        _OnMouseWheelEvent(e, t) {
            this.PostToRuntime(e, {
                clientX: t.clientX,
                clientY: t.clientY,
                pageX: t.pageX,
                pageY: t.pageY,
                deltaX: t.deltaX,
                deltaY: t.deltaY,
                deltaZ: t.deltaZ,
                deltaMode: t.deltaMode,
                timeStamp: t.timeStamp
            }, R)
        }
        _OnMouseEvent(e, t, i) {
            w(t) || this._PostToRuntimeMaybeSync(e, {
                button: t.button,
                buttons: t.buttons,
                clientX: t.clientX,
                clientY: t.clientY,
                pageX: t.pageX,
                pageY: t.pageY,
                timeStamp: t.timeStamp
            }, i)
        }
        _OnMouseEventAsPointer(e, t) {
            if (w(t)) return;
            let i = this._mousePointerLastButtons;
            "pointerdown" === e && 0 !== i ? e = "pointermove" : "pointerup" === e && 0 !== t.buttons && (e = "pointermove"), this._PostToRuntimeMaybeSync(e, {
                pointerId: 1,
                pointerType: "mouse",
                button: t.button,
                buttons: t.buttons,
                lastButtons: i,
                clientX: t.clientX,
                clientY: t.clientY,
                pageX: t.pageX,
                pageY: t.pageY,
                width: 0,
                height: 0,
                pressure: 0,
                tangentialPressure: 0,
                tiltX: 0,
                tiltY: 0,
                twist: 0,
                timeStamp: t.timeStamp
            }, R), this._mousePointerLastButtons = t.buttons, this._OnMouseEvent(t.type, t, P)
        }
        _OnPointerEvent(e, t) {
            this._pointerRawUpdateRateLimiter && "pointermove" !== e && this._pointerRawUpdateRateLimiter.Reset();
            let i = 0;
            if ("mouse" === t.pointerType && (i = this._mousePointerLastButtons), this._PostToRuntimeMaybeSync(e, {
                    pointerId: t.pointerId,
                    pointerType: t.pointerType,
                    button: t.button,
                    buttons: t.buttons,
                    lastButtons: i,
                    clientX: t.clientX,
                    clientY: t.clientY,
                    pageX: t.pageX,
                    pageY: t.pageY,
                    width: t.width || 0,
                    height: t.height || 0,
                    pressure: t.pressure || 0,
                    tangentialPressure: t.tangentialPressure || 0,
                    tiltX: t.tiltX || 0,
                    tiltY: t.tiltY || 0,
                    twist: t.twist || 0,
                    timeStamp: t.timeStamp
                }, R), "mouse" === t.pointerType) {
                let s = "mousemove";
                "pointerdown" === e ? s = "mousedown" : "pointerup" === e && (s = "mouseup"), this._OnMouseEvent(s, t, P), this._mousePointerLastButtons = t.buttons
            }
        }
        _OnPointerRawUpdate(e) {
            this._lastPointerRawUpdateEvent = e, this._pointerRawUpdateRateLimiter.Call()
        }
        _DoSendPointerRawUpdate() {
            this._OnPointerEvent("pointermove", this._lastPointerRawUpdateEvent), this._lastPointerRawUpdateEvent = null
        }
        _OnTouchEvent(e, t) {
            for (let i = 0, s = t.changedTouches.length; i < s; ++i) {
                let n = t.changedTouches[i];
                this._PostToRuntimeMaybeSync(e, {
                    pointerId: n.identifier,
                    pointerType: "touch",
                    button: 0,
                    buttons: 0,
                    lastButtons: 0,
                    clientX: n.clientX,
                    clientY: n.clientY,
                    pageX: n.pageX,
                    pageY: n.pageY,
                    width: 2 * (n.radiusX || n.webkitRadiusX || 0),
                    height: 2 * (n.radiusY || n.webkitRadiusY || 0),
                    pressure: n.force || n.webkitForce || 0,
                    tangentialPressure: 0,
                    tiltX: 0,
                    tiltY: 0,
                    twist: n.rotationAngle || 0,
                    timeStamp: t.timeStamp
                }, R)
            }
        }
        _HandlePointerDownFocus(e) {
            window !== window.top && window.focus(), this._IsElementCanvasOrDocument(e.target) && document.activeElement && !this._IsElementCanvasOrDocument(document.activeElement) && document.activeElement.blur()
        }
        _IsElementCanvasOrDocument(e) {
            return !e || e === document || e === window || e === document.body || "canvas" === e.tagName.toLowerCase()
        }
        _AttachDeviceOrientationEvent() {
            this._attachedDeviceOrientationEvent || (this._attachedDeviceOrientationEvent = !0, window.addEventListener("deviceorientation", e => this._OnDeviceOrientation(e)), window.addEventListener("deviceorientationabsolute", e => this._OnDeviceOrientationAbsolute(e)))
        }
        _AttachDeviceMotionEvent() {
            this._attachedDeviceMotionEvent || (this._attachedDeviceMotionEvent = !0, window.addEventListener("devicemotion", e => this._OnDeviceMotion(e)))
        }
        _OnDeviceOrientation(e) {
            this.PostToRuntime("deviceorientation", {
                absolute: !!e.absolute,
                alpha: e.alpha || 0,
                beta: e.beta || 0,
                gamma: e.gamma || 0,
                timeStamp: e.timeStamp,
                webkitCompassHeading: e.webkitCompassHeading,
                webkitCompassAccuracy: e.webkitCompassAccuracy
            }, R)
        }
        _OnDeviceOrientationAbsolute(e) {
            this.PostToRuntime("deviceorientationabsolute", {
                absolute: !!e.absolute,
                alpha: e.alpha || 0,
                beta: e.beta || 0,
                gamma: e.gamma || 0,
                timeStamp: e.timeStamp
            }, R)
        }
        _OnDeviceMotion(e) {
            let t = null,
                i = e.acceleration;
            i && (t = {
                x: i.x || 0,
                y: i.y || 0,
                z: i.z || 0
            });
            let s = null,
                n = e.accelerationIncludingGravity;
            n && (s = {
                x: n.x || 0,
                y: n.y || 0,
                z: n.z || 0
            });
            let a = null,
                o = e.rotationRate;
            o && (a = {
                alpha: o.alpha || 0,
                beta: o.beta || 0,
                gamma: o.gamma || 0
            }), this.PostToRuntime("devicemotion", {
                acceleration: t,
                accelerationIncludingGravity: s,
                rotationRate: a,
                interval: e.interval,
                timeStamp: e.timeStamp
            }, R)
        }
        _OnUpdateCanvasSize(e) {
            let t = this.GetRuntimeInterface(),
                i = t.GetCanvas();
            i.style.width = e.styleWidth + "px", i.style.height = e.styleHeight + "px", i.style.marginLeft = e.marginLeft + "px", i.style.marginTop = e.marginTop + "px", this._isFirstSizeUpdate && (i.style.display = "", this._isFirstSizeUpdate = !1)
        }
        _OnInvokeDownload(e) {
            let t = e.url,
                i = e.filename,
                s = document.createElement("a"),
                n = document.body;
            s.textContent = i, s.href = t, s.download = i, n.appendChild(s), s.click(), n.removeChild(s)
        }
        async _OnRasterSvgImage(e) {
            let t = e.blob,
                i = e.imageWidth,
                s = e.imageHeight,
                n = e.surfaceWidth,
                a = e.surfaceHeight,
                o = e.imageBitmapOpts,
                r = await self.C3_RasterSvgImageBlob(t, i, s, n, a),
                d;
            return {
                imageBitmap: d = o ? await createImageBitmap(r, o) : await createImageBitmap(r),
                transferables: [d]
            }
        }
        async _OnGetSvgImageSize(e) {
            return await self.C3_GetSvgImageSize(e.blob)
        }
        async _OnAddStylesheet(e) {
            await k(e.url)
        }
        _PlayPendingMedia() {
            let e = [...this._mediaPendingPlay];
            if (this._mediaPendingPlay.clear(), !this._isSilent)
                for (let t of e) {
                    let i = t.play();
                    i && i.catch(e => {
                        this._mediaRemovedPendingPlay.has(t) || this._mediaPendingPlay.add(t)
                    })
                }
        }
        TryPlayMedia(e) {
            if ("function" != typeof e.play) throw Error("missing play function");
            this._mediaRemovedPendingPlay.delete(e);
            let t;
            try {
                t = e.play()
            } catch (i) {
                this._mediaPendingPlay.add(e);
                return
            }
            t && t.catch(t => {
                this._mediaRemovedPendingPlay.has(e) || this._mediaPendingPlay.add(e)
            })
        }
        RemovePendingPlay(e) {
            this._mediaPendingPlay.delete(e), this._mediaRemovedPendingPlay.add(e)
        }
        SetSilent(e) {
            this._isSilent = !!e
        }
        _OnHideCordovaSplash() {
            navigator.splashscreen && navigator.splashscreen.hide && navigator.splashscreen.hide()
        }
        _OnDebugHighlight(e) {
            let t = e.show;
            if (!t) {
                this._debugHighlightElem && (this._debugHighlightElem.style.display = "none");
                return
            }
            this._debugHighlightElem || (this._debugHighlightElem = document.createElement("div"), this._debugHighlightElem.id = "inspectOutline", document.body.appendChild(this._debugHighlightElem));
            let i = this._debugHighlightElem;
            i.style.display = "", i.style.left = e.left - 1 + "px", i.style.top = e.top - 1 + "px", i.style.width = e.width + 2 + "px", i.style.height = e.height + 2 + "px", i.textContent = e.name
        }
        _OnRegisterSW() {
            window.C3_RegisterSW && window.C3_RegisterSW()
        }
        _OnPostToDebugger(e) {
            window.c3_postToMessagePort && (e.from = "runtime", window.c3_postToMessagePort(e))
        }
        _InvokeFunctionFromJS(e, t) {
            return this.PostToRuntimeAsync("js-invoke-function", {
                name: e,
                params: t
            })
        }
        _OnAlert(e) {
            alert(e.message)
        }
        _OnWrapperMessage(e) {
            "entered-fullscreen" === e ? (v._SetWrapperIsFullscreenFlag(!0), this._OnFullscreenChange()) : "exited-fullscreen" === e ? (v._SetWrapperIsFullscreenFlag(!1), this._OnFullscreenChange()) : console.warn("Unknown wrapper message: ", e)
        }
    };
    v.AddDOMHandlerClass(U)
}
self.JobSchedulerDOM = class e {
    constructor(e) {
        this._runtimeInterface = e, this._baseUrl = e.GetBaseURL(), "preview" === e.GetExportType() ? this._baseUrl += "c3/workers/" : this._baseUrl += e.GetScriptFolder(), this._maxNumWorkers = Math.min(navigator.hardwareConcurrency || 2, 16), this._dispatchWorker = null, this._jobWorkers = [], this._inputPort = null, this._outputPort = null
    }
    async Init() {
        if (this._hasInitialised) throw Error("already initialised");
        this._hasInitialised = !0;
        let e = this._runtimeInterface._GetWorkerURL("dispatchworker.js");
        this._dispatchWorker = await this._runtimeInterface.CreateWorker(e, this._baseUrl, {
            name: "DispatchWorker"
        });
        let t = new MessageChannel;
        this._inputPort = t.port1, this._dispatchWorker.postMessage({
            type: "_init",
            "in-port": t.port2
        }, [t.port2]), this._outputPort = await this._CreateJobWorker()
    }
    async _CreateJobWorker() {
        let e = this._jobWorkers.length,
            t = this._runtimeInterface._GetWorkerURL("jobworker.js"),
            i = await this._runtimeInterface.CreateWorker(t, this._baseUrl, {
                name: "JobWorker" + e
            }),
            s = new MessageChannel,
            n = new MessageChannel;
        return this._dispatchWorker.postMessage({
            type: "_addJobWorker",
            port: s.port1
        }, [s.port1]), i.postMessage({
            type: "init",
            number: e,
            "dispatch-port": s.port2,
            "output-port": n.port2
        }, [s.port2, n.port2]), this._jobWorkers.push(i), n.port1
    }
    GetPortData() {
        return {
            inputPort: this._inputPort,
            outputPort: this._outputPort,
            maxNumWorkers: this._maxNumWorkers
        }
    }
    GetPortTransferables() {
        return [this._inputPort, this._outputPort]
    }
}, window.C3_IsSupported && (window.c3_runtimeInterface = new self.RuntimeInterface({
    useWorker: !0,
    workerMainUrl: "workermain.js",
    engineScripts: ["scripts/c3runtime.js"],
    projectScripts: [],
    mainProjectScript: "",
    scriptFolder: "scripts/",
    workerDependencyScripts: [],
    exportType: "html5"
}));
{
    let H = class e extends self.DOMHandler {
        constructor(e) {
            super(e, "mouse"), this.AddRuntimeMessageHandler("cursor", e => this._OnChangeCursorStyle(e))
        }
        _OnChangeCursorStyle(e) {
            document.documentElement.style.cursor = e
        }
    };
    self.RuntimeInterface.AddDOMHandlerClass(H)
} {
    let B = class e extends self.DOMHandler {
        constructor(e) {
            super(e, "touch"), this.AddRuntimeMessageHandler("request-permission", e => this._OnRequestPermission(e))
        }
        async _OnRequestPermission(e) {
            let t = e.type,
                i = !0;
            0 === t ? i = await this._RequestOrientationPermission() : 1 === t && (i = await this._RequestMotionPermission()), this.PostToRuntime("permission-result", {
                type: t,
                result: i
            })
        }
        async _RequestOrientationPermission() {
            if (!self.DeviceOrientationEvent || !self.DeviceOrientationEvent.requestPermission) return !0;
            try {
                let e = await self.DeviceOrientationEvent.requestPermission();
                return "granted" === e
            } catch (t) {
                return console.warn("[Touch] Failed to request orientation permission: ", t), !1
            }
        }
        async _RequestMotionPermission() {
            if (!self.DeviceMotionEvent || !self.DeviceMotionEvent.requestPermission) return !0;
            try {
                let e = await self.DeviceMotionEvent.requestPermission();
                return "granted" === e
            } catch (t) {
                return console.warn("[Touch] Failed to request motion permission: ", t), !1
            }
        }
    };
    self.RuntimeInterface.AddDOMHandlerClass(B)
} {
    let W = 180 / Math.PI;
    self.AudioDOMHandler = class e extends self.DOMHandler {
        constructor(e) {
            super(e, "audio"), this._audioContext = null, this._destinationNode = null, this._hasUnblocked = !1, this._hasAttachedUnblockEvents = !1, this._unblockFunc = () => this._UnblockAudioContext(), this._audioBuffers = [], this._audioInstances = [], this._lastAudioInstance = null, this._lastPlayedTag = "", this._lastTickCount = -1, this._pendingTags = new Map, this._masterVolume = 1, this._isSilent = !1, this._timeScaleMode = 0, this._timeScale = 1, this._gameTime = 0, this._panningModel = "HRTF", this._distanceModel = "inverse", this._refDistance = 600, this._maxDistance = 1e4, this._rolloffFactor = 1, this._playMusicAsSound = !1, this._hasAnySoftwareDecodedMusic = !1, this._supportsWebMOpus = this._iRuntime.IsAudioFormatSupported("audio/webm; codecs=opus"), this._effects = new Map, this._analysers = new Set, this._isPendingPostFxState = !1, this._microphoneTag = "", this._microphoneSource = null, self.C3Audio_OnMicrophoneStream = (e, t) => this._OnMicrophoneStream(e, t), this._destMediaStreamNode = null, self.C3Audio_GetOutputStream = () => this._OnGetOutputStream(), self.C3Audio_DOMInterface = this, this.AddRuntimeMessageHandlers([
                ["create-audio-context", e => this._CreateAudioContext(e)],
                ["play", e => this._Play(e)],
                ["stop", e => this._Stop(e)],
                ["stop-all", () => this._StopAll()],
                ["set-paused", e => this._SetPaused(e)],
                ["set-volume", e => this._SetVolume(e)],
                ["fade-volume", e => this._FadeVolume(e)],
                ["set-master-volume", e => this._SetMasterVolume(e)],
                ["set-muted", e => this._SetMuted(e)],
                ["set-silent", e => this._SetSilent(e)],
                ["set-looping", e => this._SetLooping(e)],
                ["set-playback-rate", e => this._SetPlaybackRate(e)],
                ["seek", e => this._Seek(e)],
                ["preload", e => this._Preload(e)],
                ["unload", e => this._Unload(e)],
                ["unload-all", () => this._UnloadAll()],
                ["set-suspended", e => this._SetSuspended(e)],
                ["add-effect", e => this._AddEffect(e)],
                ["set-effect-param", e => this._SetEffectParam(e)],
                ["remove-effects", e => this._RemoveEffects(e)],
                ["tick", e => this._OnTick(e)],
                ["load-state", e => this._OnLoadState(e)]
            ])
        }
        async _CreateAudioContext(e) {
            e.isiOSCordova && (this._playMusicAsSound = !0), this._timeScaleMode = e.timeScaleMode, this._panningModel = ["equalpower", "HRTF", "soundfield"][e.panningModel], this._distanceModel = ["linear", "inverse", "exponential"][e.distanceModel], this._refDistance = e.refDistance, this._maxDistance = e.maxDistance, this._rolloffFactor = e.rolloffFactor;
            let t = {
                latencyHint: e.latencyHint
            };
            if (this.SupportsWebMOpus() || (t.sampleRate = 48e3), "undefined" != typeof AudioContext) this._audioContext = new AudioContext(t);
            else if ("undefined" != typeof webkitAudioContext) this._audioContext = new webkitAudioContext(t);
            else throw Error("Web Audio API not supported");
            this._AttachUnblockEvents(), this._audioContext.onstatechange = () => {
                "running" !== this._audioContext.state && this._AttachUnblockEvents()
            }, this._destinationNode = this._audioContext.createGain(), this._destinationNode.connect(this._audioContext.destination);
            let i = e.listenerPos;
            this._audioContext.listener.setPosition(i[0], i[1], i[2]), this._audioContext.listener.setOrientation(0, 0, 1, 0, -1, 0), self.C3_GetAudioContextCurrentTime = () => this.GetAudioCurrentTime();
            try {
                await Promise.all(e.preloadList.map(e => this._GetAudioBuffer(e.originalUrl, e.url, e.type, !1)))
            } catch (s) {
                console.error("[Construct 3] Preloading sounds failed: ", s)
            }
            return {
                sampleRate: this._audioContext.sampleRate
            }
        }
        _AttachUnblockEvents() {
            this._hasAttachedUnblockEvents || (this._hasUnblocked = !1, window.addEventListener("pointerup", this._unblockFunc, !0), window.addEventListener("touchend", this._unblockFunc, !0), window.addEventListener("click", this._unblockFunc, !0), window.addEventListener("keydown", this._unblockFunc, !0), this._hasAttachedUnblockEvents = !0)
        }
        _DetachUnblockEvents() {
            this._hasAttachedUnblockEvents && (this._hasUnblocked = !0, window.removeEventListener("pointerup", this._unblockFunc, !0), window.removeEventListener("touchend", this._unblockFunc, !0), window.removeEventListener("click", this._unblockFunc, !0), window.removeEventListener("keydown", this._unblockFunc, !0), this._hasAttachedUnblockEvents = !1)
        }
        _UnblockAudioContext() {
            if (this._hasUnblocked) return;
            let e = this._audioContext;
            "suspended" === e.state && e.resume && e.resume();
            let t = e.createBuffer(1, 220, 22050),
                i = e.createBufferSource();
            i.buffer = t, i.connect(e.destination), i.start(0), "running" === e.state && this._DetachUnblockEvents()
        }
        GetAudioContext() {
            return this._audioContext
        }
        GetAudioCurrentTime() {
            return this._audioContext.currentTime
        }
        GetDestinationNode() {
            return this._destinationNode
        }
        GetDestinationForTag(e) {
            let t = this._effects.get(e.toLowerCase());
            return t ? t[0].GetInputNode() : this.GetDestinationNode()
        }
        AddEffectForTag(e, t) {
            e = e.toLowerCase();
            let i = this._effects.get(e);
            i || (i = [], this._effects.set(e, i)), t._SetIndex(i.length), t._SetTag(e), i.push(t), this._ReconnectEffects(e)
        }
        _ReconnectEffects(e) {
            let t = this.GetDestinationNode(),
                i = this._effects.get(e);
            if (i && i.length) {
                t = i[0].GetInputNode();
                for (let s = 0, n = i.length; s < n; ++s) {
                    let a = i[s];
                    s + 1 === n ? a.ConnectTo(this.GetDestinationNode()) : a.ConnectTo(i[s + 1].GetInputNode())
                }
            }
            for (let o of this.audioInstancesByTag(e)) o.Reconnect(t);
            this._microphoneSource && this._microphoneTag === e && (this._microphoneSource.disconnect(), this._microphoneSource.connect(t))
        }
        GetMasterVolume() {
            return this._masterVolume
        }
        IsSilent() {
            return this._isSilent
        }
        GetTimeScaleMode() {
            return this._timeScaleMode
        }
        GetTimeScale() {
            return this._timeScale
        }
        GetGameTime() {
            return this._gameTime
        }
        IsPlayMusicAsSound() {
            return this._playMusicAsSound
        }
        SupportsWebMOpus() {
            return this._supportsWebMOpus
        }
        _SetHasAnySoftwareDecodedMusic() {
            this._hasAnySoftwareDecodedMusic = !0
        }
        GetPanningModel() {
            return this._panningModel
        }
        GetDistanceModel() {
            return this._distanceModel
        }
        GetReferenceDistance() {
            return this._refDistance
        }
        GetMaxDistance() {
            return this._maxDistance
        }
        GetRolloffFactor() {
            return this._rolloffFactor
        }
        DecodeAudioData(e, t) {
            return t ? this._iRuntime._WasmDecodeWebMOpus(e).then(e => {
                let t = this._audioContext.createBuffer(1, e.length, 48e3),
                    i = t.getChannelData(0);
                return i.set(e), t
            }) : new Promise((t, i) => {
                this._audioContext.decodeAudioData(e, t, i)
            })
        }
        TryPlayMedia(e) {
            this._iRuntime.TryPlayMedia(e)
        }
        RemovePendingPlay(e) {
            this._iRuntime.RemovePendingPlay(e)
        }
        ReleaseInstancesForBuffer(e) {
            let t = 0;
            for (let i = 0, s = this._audioInstances.length; i < s; ++i) {
                let n = this._audioInstances[i];
                this._audioInstances[t] = n, n.GetBuffer() === e ? n.Release() : ++t
            }
            this._audioInstances.length = t
        }
        ReleaseAllMusicBuffers() {
            let e = 0;
            for (let t = 0, i = this._audioBuffers.length; t < i; ++t) {
                let s = this._audioBuffers[t];
                this._audioBuffers[e] = s, s.IsMusic() ? s.Release() : ++e
            }
            this._audioBuffers.length = e
        }* audioInstancesByTag(e) {
            if (e)
                for (let t of this._audioInstances) self.AudioDOMHandler.EqualsNoCase(t.GetTag(), e) && (yield t);
            else this._lastAudioInstance && !this._lastAudioInstance.HasEnded() && (yield this._lastAudioInstance)
        }
        async _GetAudioBuffer(e, t, i, s, n) {
            for (let a of this._audioBuffers)
                if (a.GetUrl() === t) return await a.Load(), a;
            if (n) return null;
            s && (this._playMusicAsSound || this._hasAnySoftwareDecodedMusic) && this.ReleaseAllMusicBuffers();
            let o = self.C3AudioBuffer.Create(this, e, t, i, s);
            return this._audioBuffers.push(o), await o.Load(), o
        }
        async _GetAudioInstance(e, t, i, s, n) {
            for (let a of this._audioInstances)
                if (a.GetUrl() === t && (a.CanBeRecycled() || n)) return a.SetTag(s), a;
            let o = await this._GetAudioBuffer(e, t, i, n),
                r = o.CreateInstance(s);
            return this._audioInstances.push(r), r
        }
        _AddPendingTag(e) {
            let t = this._pendingTags.get(e);
            if (!t) {
                let i = null,
                    s = new Promise(e => i = e);
                t = {
                    pendingCount: 0,
                    promise: s,
                    resolve: i
                }, this._pendingTags.set(e, t)
            }
            t.pendingCount++
        }
        _RemovePendingTag(e) {
            let t = this._pendingTags.get(e);
            if (!t) throw Error("expected pending tag");
            t.pendingCount--, 0 === t.pendingCount && (t.resolve(), this._pendingTags.delete(e))
        }
        TagReady(e) {
            e || (e = this._lastPlayedTag);
            let t = this._pendingTags.get(e);
            return t ? t.promise : Promise.resolve()
        }
        _MaybeStartTicking() {
            if (this._analysers.size > 0) {
                this._StartTicking();
                return
            }
            for (let e of this._audioInstances)
                if (e.IsActive()) {
                    this._StartTicking();
                    return
                }
        }
        Tick() {
            for (let e of this._analysers) e.Tick();
            let t = this.GetAudioCurrentTime();
            for (let i of this._audioInstances) i.Tick(t);
            let s = this._audioInstances.filter(e => e.IsActive()).map(e => e.GetState());
            this.PostToRuntime("state", {
                tickCount: this._lastTickCount,
                audioInstances: s,
                analysers: [...this._analysers].map(e => e.GetData())
            }), 0 === s.length && 0 === this._analysers.size && this._StopTicking()
        }
        PostTrigger(e, t, i) {
            this.PostToRuntime("trigger", {
                type: e,
                tag: t,
                aiid: i
            })
        }
        async _Play(e) {
            let t = e.originalUrl,
                i = e.url,
                s = e.type,
                n = e.isMusic,
                a = e.tag,
                o = e.isLooping,
                r = e.vol,
                d = e.pos,
                l = e.panning,
                h = e.off;
            if (h > 0 && !e.trueClock) {
                if (this._audioContext.getOutputTimestamp) {
                    let u = this._audioContext.getOutputTimestamp();
                    h = h - u.performanceTime / 1e3 + u.contextTime
                } else h = h - performance.now() / 1e3 + this._audioContext.currentTime
            }
            this._lastPlayedTag = a, this._AddPendingTag(a);
            try {
                this._lastAudioInstance = await this._GetAudioInstance(t, i, s, a, n), l ? (this._lastAudioInstance.SetPannerEnabled(!0), this._lastAudioInstance.SetPan(l.x, l.y, l.angle, l.innerAngle, l.outerAngle, l.outerGain), l.hasOwnProperty("uid") && this._lastAudioInstance.SetUID(l.uid)) : this._lastAudioInstance.SetPannerEnabled(!1), this._lastAudioInstance.Play(o, r, d, h)
            } catch (c) {
                console.error("[Construct 3] Audio: error starting playback: ", c);
                return
            } finally {
                this._RemovePendingTag(a)
            }
            this._StartTicking()
        }
        _Stop(e) {
            let t = e.tag;
            for (let i of this.audioInstancesByTag(t)) i.Stop()
        }
        _StopAll() {
            for (let e of this._audioInstances) e.Stop()
        }
        _SetPaused(e) {
            let t = e.tag,
                i = e.paused;
            for (let s of this.audioInstancesByTag(t)) i ? s.Pause() : s.Resume();
            this._MaybeStartTicking()
        }
        _SetVolume(e) {
            let t = e.tag,
                i = e.vol;
            for (let s of this.audioInstancesByTag(t)) s.SetVolume(i)
        }
        async _FadeVolume(e) {
            let t = e.tag,
                i = e.vol,
                s = e.duration,
                n = e.stopOnEnd;
            for (let a of (await this.TagReady(t), this.audioInstancesByTag(t))) a.FadeVolume(i, s, n);
            this._MaybeStartTicking()
        }
        _SetMasterVolume(e) {
            for (let t of (this._masterVolume = e.vol, this._audioInstances)) t._UpdateVolume()
        }
        _SetMuted(e) {
            let t = e.tag,
                i = e.isMuted;
            for (let s of this.audioInstancesByTag(t)) s.SetMuted(i)
        }
        _SetSilent(e) {
            for (let t of (this._isSilent = e.isSilent, this._iRuntime.SetSilent(this._isSilent), this._audioInstances)) t._UpdateMuted()
        }
        _SetLooping(e) {
            let t = e.tag,
                i = e.isLooping;
            for (let s of this.audioInstancesByTag(t)) s.SetLooping(i)
        }
        async _SetPlaybackRate(e) {
            let t = e.tag,
                i = e.rate;
            for (let s of (await this.TagReady(t), this.audioInstancesByTag(t))) s.SetPlaybackRate(i)
        }
        async _Seek(e) {
            let t = e.tag,
                i = e.pos;
            for (let s of (await this.TagReady(t), this.audioInstancesByTag(t))) s.Seek(i)
        }
        async _Preload(e) {
            let t = e.originalUrl,
                i = e.url,
                s = e.type,
                n = e.isMusic;
            try {
                await this._GetAudioInstance(t, i, s, "", n)
            } catch (a) {
                console.error("[Construct 3] Audio: error preloading: ", a)
            }
        }
        async _Unload(e) {
            let t = e.url,
                i = e.type,
                s = e.isMusic,
                n = await this._GetAudioBuffer("", t, i, s, !0);
            if (!n) return;
            n.Release();
            let a = this._audioBuffers.indexOf(n); - 1 !== a && this._audioBuffers.splice(a, 1)
        }
        _UnloadAll() {
            for (let e of this._audioBuffers) e.Release();
            this._audioBuffers.length = 0
        }
        _SetSuspended(e) {
            let t = e.isSuspended;
            for (let i of (!t && this._audioContext.resume && this._audioContext.resume(), this._audioInstances)) i.SetSuspended(t);
            t && this._audioContext.suspend && this._audioContext.suspend()
        }
        _OnTick(e) {
            if (this._timeScale = e.timeScale, this._gameTime = e.gameTime, this._lastTickCount = e.tickCount, 0 !== this._timeScaleMode)
                for (let t of this._audioInstances) t._UpdatePlaybackRate();
            let i = e.listenerPos;
            for (let s of (i && this._audioContext.listener.setPosition(i[0], i[1], i[2]), e.instPans)) {
                let n = s.uid;
                for (let a of this._audioInstances) a.GetUID() === n && a.SetPanXYA(s.x, s.y, s.angle)
            }
        }
        async _AddEffect(e) {
            let t = e.type,
                i = e.tag,
                s = e.params,
                n;
            if ("filter" === t) n = new self.C3AudioFilterFX(this, ...s);
            else if ("delay" === t) n = new self.C3AudioDelayFX(this, ...s);
            else if ("convolution" === t) {
                let a = null;
                try {
                    a = await this._GetAudioBuffer(e.bufferOriginalUrl, e.bufferUrl, e.bufferType, !1)
                } catch (o) {
                    console.log("[Construct 3] Audio: error loading convolution: ", o);
                    return
                }(n = new self.C3AudioConvolveFX(this, a.GetAudioBuffer(), ...s))._SetBufferInfo(e.bufferOriginalUrl, e.bufferUrl, e.bufferType)
            } else if ("flanger" === t) n = new self.C3AudioFlangerFX(this, ...s);
            else if ("phaser" === t) n = new self.C3AudioPhaserFX(this, ...s);
            else if ("gain" === t) n = new self.C3AudioGainFX(this, ...s);
            else if ("tremolo" === t) n = new self.C3AudioTremoloFX(this, ...s);
            else if ("ringmod" === t) n = new self.C3AudioRingModFX(this, ...s);
            else if ("distortion" === t) n = new self.C3AudioDistortionFX(this, ...s);
            else if ("compressor" === t) n = new self.C3AudioCompressorFX(this, ...s);
            else if ("analyser" === t) n = new self.C3AudioAnalyserFX(this, ...s);
            else throw Error("invalid effect type");
            this.AddEffectForTag(i, n), this._PostUpdatedFxState()
        }
        _SetEffectParam(e) {
            let t = e.tag,
                i = e.index,
                s = e.param,
                n = e.value,
                a = e.ramp,
                o = e.time,
                r = this._effects.get(t);
            !r || i < 0 || i >= r.length || (r[i].SetParam(s, n, a, o), this._PostUpdatedFxState())
        }
        _RemoveEffects(e) {
            let t = e.tag.toLowerCase(),
                i = this._effects.get(t);
            if (i && i.length) {
                for (let s of i) s.Release();
                this._effects.delete(t), this._ReconnectEffects(t)
            }
        }
        _AddAnalyser(e) {
            this._analysers.add(e), this._MaybeStartTicking()
        }
        _RemoveAnalyser(e) {
            this._analysers.delete(e)
        }
        _PostUpdatedFxState() {
            this._isPendingPostFxState || (this._isPendingPostFxState = !0, Promise.resolve().then(() => this._DoPostUpdatedFxState()))
        }
        _DoPostUpdatedFxState() {
            let e = {};
            for (let [t, i] of this._effects) e[t] = i.map(e => e.GetState());
            this.PostToRuntime("fxstate", {
                fxstate: e
            }), this._isPendingPostFxState = !1
        }
        async _OnLoadState(e) {
            let t = e.saveLoadMode;
            if (3 !== t)
                for (let i of this._audioInstances)(!i.IsMusic() || 1 !== t) && (i.IsMusic() || 2 !== t) && i.Stop();
            for (let s of this._effects.values())
                for (let n of s) n.Release();
            this._effects.clear(), this._timeScale = e.timeScale, this._gameTime = e.gameTime;
            let a = e.listenerPos;
            this._audioContext.listener.setPosition(a[0], a[1], a[2]), this._isSilent = e.isSilent, this._iRuntime.SetSilent(this._isSilent), this._masterVolume = e.masterVolume;
            let o = [];
            for (let r of Object.values(e.effects)) o.push(Promise.all(r.map(e => this._AddEffect(e))));
            await Promise.all(o), await Promise.all(e.playing.map(e => this._LoadAudioInstance(e, t))), this._MaybeStartTicking()
        }
        async _LoadAudioInstance(e, t) {
            if (3 === t) return;
            let i = e.bufferOriginalUrl,
                s = e.bufferUrl,
                n = e.bufferType,
                a = e.isMusic,
                o = e.tag,
                r = e.isLooping,
                d = e.volume,
                l = e.playbackTime;
            if (a && 1 === t || !a && 2 === t) return;
            let h = null;
            try {
                h = await this._GetAudioInstance(i, s, n, o, a)
            } catch (u) {
                console.error("[Construct 3] Audio: error loading audio state: ", u);
                return
            }
            h.LoadPanState(e.pan), h.Play(r, d, l, 0), e.isPlaying || h.Pause(), h._LoadAdditionalState(e)
        }
        _OnMicrophoneStream(e, t) {
            this._microphoneSource && this._microphoneSource.disconnect(), this._microphoneTag = t.toLowerCase(), this._microphoneSource = this._audioContext.createMediaStreamSource(e), this._microphoneSource.connect(this.GetDestinationForTag(this._microphoneTag))
        }
        _OnGetOutputStream() {
            return this._destMediaStreamNode || (this._destMediaStreamNode = this._audioContext.createMediaStreamDestination(), this._destinationNode.connect(this._destMediaStreamNode)), this._destMediaStreamNode.stream
        }
        static EqualsNoCase(e, t) {
            return e.length === t.length && (e === t || e.toLowerCase() === t.toLowerCase())
        }
        static ToDegrees(e) {
            return e * W
        }
        static DbToLinearNoCap(e) {
            return Math.pow(10, e / 20)
        }
        static DbToLinear(e) {
            return Math.max(Math.min(self.AudioDOMHandler.DbToLinearNoCap(e), 1), 0)
        }
        static LinearToDbNoCap(e) {
            return Math.log(e) / Math.log(10) * 20
        }
        static LinearToDb(e) {
            return self.AudioDOMHandler.LinearToDbNoCap(Math.max(Math.min(e, 1), 0))
        }
        static e4(e, t) {
            return 1 - Math.exp(-t * e)
        }
    }, self.RuntimeInterface.AddDOMHandlerClass(self.AudioDOMHandler)
}
self.C3AudioBuffer = class e {
    constructor(e, t, i, s, n) {
        this._audioDomHandler = e, this._originalUrl = t, this._url = i, this._type = s, this._isMusic = n, this._api = "", this._loadState = "not-loaded", this._loadPromise = null
    }
    Release() {
        this._loadState = "not-loaded", this._audioDomHandler = null, this._loadPromise = null
    }
    static Create(e, t, i, s, n) {
        let a = "audio/webm; codecs=opus" === s && !e.SupportsWebMOpus();
        return (n && a && e._SetHasAnySoftwareDecodedMusic(), !n || e.IsPlayMusicAsSound() || a) ? new self.C3WebAudioBuffer(e, t, i, s, n, a) : new self.C3Html5AudioBuffer(e, t, i, s, n)
    }
    CreateInstance(e) {
        return "html5" === this._api ? new self.C3Html5AudioInstance(this._audioDomHandler, this, e) : new self.C3WebAudioInstance(this._audioDomHandler, this, e)
    }
    _Load() {}
    Load() {
        return this._loadPromise || (this._loadPromise = this._Load()), this._loadPromise
    }
    IsLoaded() {}
    IsLoadedAndDecoded() {}
    HasFailedToLoad() {
        return "failed" === this._loadState
    }
    GetAudioContext() {
        return this._audioDomHandler.GetAudioContext()
    }
    GetApi() {
        return this._api
    }
    GetOriginalUrl() {
        return this._originalUrl
    }
    GetUrl() {
        return this._url
    }
    GetContentType() {
        return this._type
    }
    IsMusic() {
        return this._isMusic
    }
    GetDuration() {}
}, self.C3Html5AudioBuffer = class e extends self.C3AudioBuffer {
    constructor(e, t, i, s, n) {
        super(e, t, i, s, n), this._api = "html5", this._audioElem = new Audio, this._audioElem.crossOrigin = "anonymous", this._audioElem.autoplay = !1, this._audioElem.preload = "auto", this._loadResolve = null, this._loadReject = null, this._reachedCanPlayThrough = !1, this._audioElem.addEventListener("canplaythrough", () => this._reachedCanPlayThrough = !0), this._outNode = this.GetAudioContext().createGain(), this._mediaSourceNode = null, this._audioElem.addEventListener("canplay", () => {
            this._loadResolve && (this._loadState = "loaded", this._loadResolve(), this._loadResolve = null, this._loadReject = null), !this._mediaSourceNode && this._audioElem && (this._mediaSourceNode = this.GetAudioContext().createMediaElementSource(this._audioElem), this._mediaSourceNode.connect(this._outNode))
        }), this.onended = null, this._audioElem.addEventListener("ended", () => {
            this.onended && this.onended()
        }), this._audioElem.addEventListener("error", e => this._OnError(e))
    }
    Release() {
        this._audioDomHandler.ReleaseInstancesForBuffer(this), this._outNode.disconnect(), this._outNode = null, this._mediaSourceNode.disconnect(), this._mediaSourceNode = null, this._audioElem && !this._audioElem.paused && this._audioElem.pause(), this.onended = null, this._audioElem = null, super.Release()
    }
    _Load() {
        return this._loadState = "loading", new Promise((e, t) => {
            this._loadResolve = e, this._loadReject = t, this._audioElem.src = this._url
        })
    }
    _OnError(e) {
        console.error(`[Construct 3] Audio '${this._url}' error: `, e), this._loadReject && (this._loadState = "failed", this._loadReject(e), this._loadResolve = null, this._loadReject = null)
    }
    IsLoaded() {
        let e = this._audioElem.readyState >= 4;
        return e && (this._reachedCanPlayThrough = !0), e || this._reachedCanPlayThrough
    }
    IsLoadedAndDecoded() {
        return this.IsLoaded()
    }
    GetAudioElement() {
        return this._audioElem
    }
    GetOutputNode() {
        return this._outNode
    }
    GetDuration() {
        return this._audioElem.duration
    }
}, self.C3WebAudioBuffer = class e extends self.C3AudioBuffer {
    constructor(e, t, i, s, n, a) {
        super(e, t, i, s, n), this._api = "webaudio", this._audioData = null, this._audioBuffer = null, this._needsSoftwareDecode = !!a
    }
    Release() {
        this._audioDomHandler.ReleaseInstancesForBuffer(this), this._audioData = null, this._audioBuffer = null, super.Release()
    }
    async _Fetch() {
        if (this._audioData) return this._audioData;
        let e = this._audioDomHandler.GetRuntimeInterface();
        if ("cordova" === e.GetExportType() && e.IsRelativeURL(this._url) && "file:" === location.protocol) this._audioData = await e.CordovaFetchLocalFileAsArrayBuffer(this._url);
        else {
            let t = await fetch(this._url);
            if (!t.ok) throw Error(`error fetching audio data: ${t.status} ${t.statusText}`);
            this._audioData = await t.arrayBuffer()
        }
    }
    async _Decode() {
        if (this._audioBuffer) return this._audioBuffer;
        this._audioBuffer = await this._audioDomHandler.DecodeAudioData(this._audioData, this._needsSoftwareDecode), this._audioData = null
    }
    async _Load() {
        try {
            this._loadState = "loading", await this._Fetch(), await this._Decode(), this._loadState = "loaded"
        } catch (e) {
            this._loadState = "failed", console.error(`[Construct 3] Failed to load audio '${this._url}': `, e)
        }
    }
    IsLoaded() {
        return !!(this._audioData || this._audioBuffer)
    }
    IsLoadedAndDecoded() {
        return !!this._audioBuffer
    }
    GetAudioBuffer() {
        return this._audioBuffer
    }
    GetDuration() {
        return this._audioBuffer ? this._audioBuffer.duration : 0
    }
};
{
    let j = 0;
    self.C3AudioInstance = class e {
        constructor(e, t, i) {
            this._audioDomHandler = e, this._buffer = t, this._tag = i, this._aiId = j++, this._gainNode = this.GetAudioContext().createGain(), this._gainNode.connect(this.GetDestinationNode()), this._pannerNode = null, this._isPannerEnabled = !1, this._pannerPosition = [0, 0, 0], this._pannerOrientation = [0, 0, 0], this._isStopped = !0, this._isPaused = !1, this._resumeMe = !1, this._isLooping = !1, this._volume = 1, this._isMuted = !1, this._playbackRate = 1;
            let s = this._audioDomHandler.GetTimeScaleMode();
            this._isTimescaled = 1 === s && !this.IsMusic() || 2 === s, this._instUid = -1, this._fadeEndTime = -1, this._stopOnFadeEnd = !1
        }
        Release() {
            this._audioDomHandler = null, this._buffer = null, this._pannerNode && (this._pannerNode.disconnect(), this._pannerNode = null), this._gainNode.disconnect(), this._gainNode = null
        }
        GetAudioContext() {
            return this._audioDomHandler.GetAudioContext()
        }
        GetDestinationNode() {
            return this._audioDomHandler.GetDestinationForTag(this._tag)
        }
        GetMasterVolume() {
            return this._audioDomHandler.GetMasterVolume()
        }
        GetCurrentTime() {
            return this._isTimescaled ? this._audioDomHandler.GetGameTime() : performance.now() / 1e3
        }
        GetOriginalUrl() {
            return this._buffer.GetOriginalUrl()
        }
        GetUrl() {
            return this._buffer.GetUrl()
        }
        GetContentType() {
            return this._buffer.GetContentType()
        }
        GetBuffer() {
            return this._buffer
        }
        IsMusic() {
            return this._buffer.IsMusic()
        }
        SetTag(e) {
            this._tag = e
        }
        GetTag() {
            return this._tag
        }
        GetAiId() {
            return this._aiId
        }
        HasEnded() {}
        CanBeRecycled() {}
        IsPlaying() {
            return !this._isStopped && !this._isPaused && !this.HasEnded()
        }
        IsActive() {
            return !this._isStopped && !this.HasEnded()
        }
        GetPlaybackTime(e) {}
        GetDuration(e) {
            let t = this._buffer.GetDuration();
            return e && (t /= this._playbackRate || .001), t
        }
        Play(e, t, i, s) {}
        Stop() {}
        Pause() {}
        IsPaused() {
            return this._isPaused
        }
        Resume() {}
        SetVolume(e) {
            this._volume = e, this._gainNode.gain.cancelScheduledValues(0), this._fadeEndTime = -1, this._gainNode.gain.value = this.GetOverallVolume()
        }
        FadeVolume(e, t, i) {
            if (this.IsMuted()) return;
            e *= this.GetMasterVolume();
            let s = this._gainNode.gain;
            s.cancelScheduledValues(0);
            let n = this._audioDomHandler.GetAudioCurrentTime(),
                a = n + t;
            s.setValueAtTime(s.value, n), s.linearRampToValueAtTime(e, a), this._volume = e, this._fadeEndTime = a, this._stopOnFadeEnd = i
        }
        _UpdateVolume() {
            this.SetVolume(this._volume)
        }
        Tick(e) {
            -1 !== this._fadeEndTime && e >= this._fadeEndTime && (this._fadeEndTime = -1, this._stopOnFadeEnd && this.Stop(), this._audioDomHandler.PostTrigger("fade-ended", this._tag, this._aiId))
        }
        GetOverallVolume() {
            let e = this._volume * this.GetMasterVolume();
            return isFinite(e) ? e : 0
        }
        SetMuted(e) {
            e = !!e, this._isMuted !== e && (this._isMuted = e, this._UpdateMuted())
        }
        IsMuted() {
            return this._isMuted
        }
        IsSilent() {
            return this._audioDomHandler.IsSilent()
        }
        _UpdateMuted() {}
        SetLooping(e) {}
        IsLooping() {
            return this._isLooping
        }
        SetPlaybackRate(e) {
            this._playbackRate !== e && (this._playbackRate = e, this._UpdatePlaybackRate())
        }
        _UpdatePlaybackRate() {}
        GetPlaybackRate() {
            return this._playbackRate
        }
        Seek(e) {}
        SetSuspended(e) {}
        SetPannerEnabled(e) {
            e = !!e, this._isPannerEnabled !== e && (this._isPannerEnabled = e, this._isPannerEnabled ? (this._pannerNode || (this._pannerNode = this.GetAudioContext().createPanner(), this._pannerNode.panningModel = this._audioDomHandler.GetPanningModel(), this._pannerNode.distanceModel = this._audioDomHandler.GetDistanceModel(), this._pannerNode.refDistance = this._audioDomHandler.GetReferenceDistance(), this._pannerNode.maxDistance = this._audioDomHandler.GetMaxDistance(), this._pannerNode.rolloffFactor = this._audioDomHandler.GetRolloffFactor()), this._gainNode.disconnect(), this._gainNode.connect(this._pannerNode), this._pannerNode.connect(this.GetDestinationNode())) : (this._pannerNode.disconnect(), this._gainNode.disconnect(), this._gainNode.connect(this.GetDestinationNode())))
        }
        SetPan(e, t, i, s, n, a) {
            if (!this._isPannerEnabled) return;
            this.SetPanXYA(e, t, i);
            let o = self.AudioDOMHandler.ToDegrees;
            this._pannerNode.coneInnerAngle = o(s), this._pannerNode.coneOuterAngle = o(n), this._pannerNode.coneOuterGain = a
        }
        SetPanXYA(e, t, i) {
            this._isPannerEnabled && (this._pannerPosition[0] = e, this._pannerPosition[1] = t, this._pannerPosition[2] = 0, this._pannerOrientation[0] = Math.cos(i), this._pannerOrientation[1] = Math.sin(i), this._pannerOrientation[2] = 0, this._pannerNode.setPosition(...this._pannerPosition), this._pannerNode.setOrientation(...this._pannerOrientation))
        }
        SetUID(e) {
            this._instUid = e
        }
        GetUID() {
            return this._instUid
        }
        GetResumePosition() {}
        Reconnect(e) {
            let t = this._pannerNode || this._gainNode;
            t.disconnect(), t.connect(e)
        }
        GetState() {
            return {
                aiid: this.GetAiId(),
                tag: this._tag,
                duration: this.GetDuration(),
                volume: this._volume,
                isPlaying: this.IsPlaying(),
                playbackTime: this.GetPlaybackTime(),
                playbackRate: this.GetPlaybackRate(),
                uid: this._instUid,
                bufferOriginalUrl: this.GetOriginalUrl(),
                bufferUrl: "",
                bufferType: this.GetContentType(),
                isMusic: this.IsMusic(),
                isLooping: this.IsLooping(),
                isMuted: this.IsMuted(),
                resumePosition: this.GetResumePosition(),
                pan: this.GetPanState()
            }
        }
        _LoadAdditionalState(e) {
            this.SetPlaybackRate(e.playbackRate), this.SetMuted(e.isMuted)
        }
        GetPanState() {
            if (!this._pannerNode) return null;
            let e = this._pannerNode;
            return {
                pos: this._pannerPosition,
                orient: this._pannerOrientation,
                cia: e.coneInnerAngle,
                coa: e.coneOuterAngle,
                cog: e.coneOuterGain,
                uid: this._instUid
            }
        }
        LoadPanState(e) {
            if (!e) {
                this.SetPannerEnabled(!1);
                return
            }
            this.SetPannerEnabled(!0);
            let t = this._pannerNode,
                i = t.pos;
            this._pannerPosition[0] = i[0], this._pannerPosition[1] = i[1], this._pannerPosition[2] = i[2];
            let s = t.orient;
            this._pannerOrientation[0] = s[0], this._pannerOrientation[1] = s[1], this._pannerOrientation[2] = s[2], t.setPosition(...this._pannerPosition), t.setOrientation(...this._pannerOrientation), t.coneInnerAngle = t.cia, t.coneOuterAngle = t.coa, t.coneOuterGain = t.cog, this._instUid = t.uid
        }
    }
}
self.C3Html5AudioInstance = class e extends self.C3AudioInstance {
    constructor(e, t, i) {
        super(e, t, i), this._buffer.GetOutputNode().connect(this._gainNode), this._buffer.onended = () => this._OnEnded()
    }
    Release() {
        this.Stop(), this._buffer.GetOutputNode().disconnect(), super.Release()
    }
    GetAudioElement() {
        return this._buffer.GetAudioElement()
    }
    _OnEnded() {
        this._isStopped = !0, this._instUid = -1, this._audioDomHandler.PostTrigger("ended", this._tag, this._aiId)
    }
    HasEnded() {
        return this.GetAudioElement().ended
    }
    CanBeRecycled() {
        return !!this._isStopped || this.HasEnded()
    }
    GetPlaybackTime(e) {
        let t = this.GetAudioElement().currentTime;
        return e && (t *= this._playbackRate), this._isLooping || (t = Math.min(t, this.GetDuration())), t
    }
    Play(e, t, i, s) {
        let n = this.GetAudioElement();
        if (1 !== n.playbackRate && (n.playbackRate = 1), n.loop !== e && (n.loop = e), this.SetVolume(t), n.muted && (n.muted = !1), n.currentTime !== i) try {
            n.currentTime = i
        } catch (a) {
            console.warn(`[Construct 3] Exception seeking audio '${this._buffer.GetUrl()}' to position '${i}': `, a)
        }
        this._audioDomHandler.TryPlayMedia(n), this._isStopped = !1, this._isPaused = !1, this._isLooping = e, this._playbackRate = 1
    }
    Stop() {
        let e = this.GetAudioElement();
        e.paused || e.pause(), this._audioDomHandler.RemovePendingPlay(e), this._isStopped = !0, this._isPaused = !1, this._instUid = -1
    }
    Pause() {
        if (this._isPaused || this._isStopped || this.HasEnded()) return;
        let e = this.GetAudioElement();
        e.paused || e.pause(), this._audioDomHandler.RemovePendingPlay(e), this._isPaused = !0
    }
    Resume() {
        !this._isPaused || this._isStopped || this.HasEnded() || (this._audioDomHandler.TryPlayMedia(this.GetAudioElement()), this._isPaused = !1)
    }
    _UpdateMuted() {
        this.GetAudioElement().muted = this._isMuted || this.IsSilent()
    }
    SetLooping(e) {
        e = !!e, this._isLooping !== e && (this._isLooping = e, this.GetAudioElement().loop = e)
    }
    _UpdatePlaybackRate() {
        let e = this._playbackRate;
        this._isTimescaled && (e *= this._audioDomHandler.GetTimeScale());
        try {
            this.GetAudioElement().playbackRate = e
        } catch (t) {
            console.warn(`[Construct 3] Unable to set playback rate '${e}':`, t)
        }
    }
    Seek(e) {
        if (!(this._isStopped || this.HasEnded())) try {
            this.GetAudioElement().currentTime = e
        } catch (t) {
            console.warn(`[Construct 3] Error seeking audio to '${e}': `, t)
        }
    }
    GetResumePosition() {
        return this.GetPlaybackTime()
    }
    SetSuspended(e) {
        e ? this.IsPlaying() ? (this.GetAudioElement().pause(), this._resumeMe = !0) : this._resumeMe = !1 : this._resumeMe && (this._audioDomHandler.TryPlayMedia(this.GetAudioElement()), this._resumeMe = !1)
    }
}, self.C3WebAudioInstance = class e extends self.C3AudioInstance {
    constructor(e, t, i) {
        super(e, t, i), this._bufferSource = null, this._onended_handler = e => this._OnEnded(e), this._hasPlaybackEnded = !0, this._activeSource = null, this._startTime = 0, this._resumePosition = 0, this._muteVol = 1
    }
    Release() {
        this.Stop(), this._ReleaseBufferSource(), this._onended_handler = null, super.Release()
    }
    _ReleaseBufferSource() {
        this._bufferSource && this._bufferSource.disconnect(), this._bufferSource = null, this._activeSource = null
    }
    _OnEnded(e) {
        !this._isPaused && !this._resumeMe && e.target === this._activeSource && (this._hasPlaybackEnded = !0, this._isStopped = !0, this._instUid = -1, this._ReleaseBufferSource(), this._audioDomHandler.PostTrigger("ended", this._tag, this._aiId))
    }
    HasEnded() {
        return (!!this._isStopped || !this._bufferSource || !this._bufferSource.loop) && !this._isPaused && this._hasPlaybackEnded
    }
    CanBeRecycled() {
        return !this._bufferSource || !!this._isStopped || this.HasEnded()
    }
    GetPlaybackTime(e) {
        let t = 0;
        return t = this._isPaused ? this._resumePosition : this.GetCurrentTime() - this._startTime, e && (t *= this._playbackRate), this._isLooping || (t = Math.min(t, this.GetDuration())), t
    }
    Play(e, t, i, s) {
        this._muteVol = 1, this.SetVolume(t), this._ReleaseBufferSource(), this._bufferSource = this.GetAudioContext().createBufferSource(), this._bufferSource.buffer = this._buffer.GetAudioBuffer(), this._bufferSource.connect(this._gainNode), this._activeSource = this._bufferSource, this._bufferSource.onended = this._onended_handler, this._bufferSource.loop = e, this._bufferSource.start(s, i), this._hasPlaybackEnded = !1, this._isStopped = !1, this._isPaused = !1, this._isLooping = e, this._playbackRate = 1, this._startTime = this.GetCurrentTime() - i
    }
    Stop() {
        if (this._bufferSource) try {
            this._bufferSource.stop(0)
        } catch (e) {}
        this._isStopped = !0, this._isPaused = !1, this._instUid = -1
    }
    Pause() {
        this._isPaused || this._isStopped || this.HasEnded() || (this._resumePosition = this.GetPlaybackTime(!0), this._isLooping && (this._resumePosition %= this.GetDuration()), this._isPaused = !0, this._bufferSource.stop(0))
    }
    Resume() {
        !this._isPaused || this._isStopped || this.HasEnded() || (this._ReleaseBufferSource(), this._bufferSource = this.GetAudioContext().createBufferSource(), this._bufferSource.buffer = this._buffer.GetAudioBuffer(), this._bufferSource.connect(this._gainNode), this._activeSource = this._bufferSource, this._bufferSource.onended = this._onended_handler, this._bufferSource.loop = this._isLooping, this._UpdateVolume(), this._UpdatePlaybackRate(), this._startTime = this.GetCurrentTime() - this._resumePosition / (this._playbackRate || .001), this._bufferSource.start(0, this._resumePosition), this._isPaused = !1)
    }
    GetOverallVolume() {
        return super.GetOverallVolume() * this._muteVol
    }
    _UpdateMuted() {
        this._muteVol = this._isMuted || this.IsSilent() ? 0 : 1, this._UpdateVolume()
    }
    SetLooping(e) {
        e = !!e, this._isLooping !== e && (this._isLooping = e, this._bufferSource && (this._bufferSource.loop = e))
    }
    _UpdatePlaybackRate() {
        let e = this._playbackRate;
        this._isTimescaled && (e *= this._audioDomHandler.GetTimeScale()), this._bufferSource && (this._bufferSource.playbackRate.value = e)
    }
    Seek(e) {
        this._isStopped || this.HasEnded() || (this._isPaused ? this._resumePosition = e : (this.Pause(), this._resumePosition = e, this.Resume()))
    }
    GetResumePosition() {
        return this._resumePosition
    }
    SetSuspended(e) {
        e ? this.IsPlaying() ? (this._resumeMe = !0, this._resumePosition = this.GetPlaybackTime(!0), this._isLooping && (this._resumePosition %= this.GetDuration()), this._bufferSource.stop(0)) : this._resumeMe = !1 : this._resumeMe && (this._ReleaseBufferSource(), this._bufferSource = this.GetAudioContext().createBufferSource(), this._bufferSource.buffer = this._buffer.GetAudioBuffer(), this._bufferSource.connect(this._gainNode), this._activeSource = this._bufferSource, this._bufferSource.onended = this._onended_handler, this._bufferSource.loop = this._isLooping, this._UpdateVolume(), this._UpdatePlaybackRate(), this._startTime = this.GetCurrentTime() - this._resumePosition / (this._playbackRate || .001), this._bufferSource.start(0, this._resumePosition), this._resumeMe = !1)
    }
    _LoadAdditionalState(e) {
        super._LoadAdditionalState(e), this._resumePosition = e.resumePosition
    }
};
{
    class q {
        constructor(e) {
            this._audioDomHandler = e, this._audioContext = e.GetAudioContext(), this._index = -1, this._tag = "", this._type = "", this._params = null
        }
        Release() {
            this._audioContext = null
        }
        _SetIndex(e) {
            this._index = e
        }
        GetIndex() {
            return this._index
        }
        _SetTag(e) {
            this._tag = e
        }
        GetTag() {
            return this._tag
        }
        CreateGain() {
            return this._audioContext.createGain()
        }
        GetInputNode() {}
        ConnectTo(e) {}
        SetAudioParam(e, t, i, s) {
            if (e.cancelScheduledValues(0), 0 === s) {
                e.value = t;
                return
            }
            let n = this._audioContext.currentTime;
            switch (s += n, i) {
                case 0:
                    e.setValueAtTime(t, s);
                    break;
                case 1:
                    e.setValueAtTime(e.value, n), e.linearRampToValueAtTime(t, s);
                    break;
                case 2:
                    e.setValueAtTime(e.value, n), e.exponentialRampToValueAtTime(t, s)
            }
        }
        GetState() {
            return {
                type: this._type,
                tag: this._tag,
                params: this._params
            }
        }
    }
    self.C3AudioFilterFX = class e extends q {
        constructor(e, t, i, s, n, a, o) {
            super(e), this._type = "filter", this._params = [t, i, s, n, a, o], this._inputNode = this.CreateGain(), this._wetNode = this.CreateGain(), this._wetNode.gain.value = o, this._dryNode = this.CreateGain(), this._dryNode.gain.value = 1 - o, this._filterNode = this._audioContext.createBiquadFilter(), this._filterNode.type = t, this._filterNode.frequency.value = i, this._filterNode.detune.value = s, this._filterNode.Q.value = n, this._filterNode.gain.vlaue = a, this._inputNode.connect(this._filterNode), this._inputNode.connect(this._dryNode), this._filterNode.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect(), this._filterNode.disconnect(), this._wetNode.disconnect(), this._dryNode.disconnect(), super.Release()
        }
        ConnectTo(e) {
            this._wetNode.disconnect(), this._wetNode.connect(e), this._dryNode.disconnect(), this._dryNode.connect(e)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(e, t, i, s) {
            switch (e) {
                case 0:
                    t = Math.max(Math.min(t / 100, 1), 0), this._params[5] = t, this.SetAudioParam(this._wetNode.gain, t, i, s), this.SetAudioParam(this._dryNode.gain, 1 - t, i, s);
                    break;
                case 1:
                    this._params[1] = t, this.SetAudioParam(this._filterNode.frequency, t, i, s);
                    break;
                case 2:
                    this._params[2] = t, this.SetAudioParam(this._filterNode.detune, t, i, s);
                    break;
                case 3:
                    this._params[3] = t, this.SetAudioParam(this._filterNode.Q, t, i, s);
                    break;
                case 4:
                    this._params[4] = t, this.SetAudioParam(this._filterNode.gain, t, i, s)
            }
        }
    }, self.C3AudioDelayFX = class e extends q {
        constructor(e, t, i, s) {
            super(e), this._type = "delay", this._params = [t, i, s], this._inputNode = this.CreateGain(), this._wetNode = this.CreateGain(), this._wetNode.gain.value = s, this._dryNode = this.CreateGain(), this._dryNode.gain.value = 1 - s, this._mainNode = this.CreateGain(), this._delayNode = this._audioContext.createDelay(t), this._delayNode.delayTime.value = t, this._delayGainNode = this.CreateGain(), this._delayGainNode.gain.value = i, this._inputNode.connect(this._mainNode), this._inputNode.connect(this._dryNode), this._mainNode.connect(this._wetNode), this._mainNode.connect(this._delayNode), this._delayNode.connect(this._delayGainNode), this._delayGainNode.connect(this._mainNode)
        }
        Release() {
            this._inputNode.disconnect(), this._wetNode.disconnect(), this._dryNode.disconnect(), this._mainNode.disconnect(), this._delayNode.disconnect(), this._delayGainNode.disconnect(), super.Release()
        }
        ConnectTo(e) {
            this._wetNode.disconnect(), this._wetNode.connect(e), this._dryNode.disconnect(), this._dryNode.connect(e)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(e, t, i, s) {
            let n = self.AudioDOMHandler.DbToLinear;
            switch (e) {
                case 0:
                    t = Math.max(Math.min(t / 100, 1), 0), this._params[2] = t, this.SetAudioParam(this._wetNode.gain, t, i, s), this.SetAudioParam(this._dryNode.gain, 1 - t, i, s);
                    break;
                case 4:
                    this._params[1] = n(t), this.SetAudioParam(this._delayGainNode.gain, n(t), i, s);
                    break;
                case 5:
                    this._params[0] = t, this.SetAudioParam(this._delayNode.delayTime, t, i, s)
            }
        }
    }, self.C3AudioConvolveFX = class e extends q {
        constructor(e, t, i, s) {
            super(e), this._type = "convolution", this._params = [i, s], this._bufferOriginalUrl = "", this._bufferUrl = "", this._bufferType = "", this._inputNode = this.CreateGain(), this._wetNode = this.CreateGain(), this._wetNode.gain.value = s, this._dryNode = this.CreateGain(), this._dryNode.gain.value = 1 - s, this._convolveNode = this._audioContext.createConvolver(), this._convolveNode.normalize = i, this._convolveNode.buffer = t, this._inputNode.connect(this._convolveNode), this._inputNode.connect(this._dryNode), this._convolveNode.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect(), this._convolveNode.disconnect(), this._wetNode.disconnect(), this._dryNode.disconnect(), super.Release()
        }
        ConnectTo(e) {
            this._wetNode.disconnect(), this._wetNode.connect(e), this._dryNode.disconnect(), this._dryNode.connect(e)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(e, t, i, s) {
            0 === e && (t = Math.max(Math.min(t / 100, 1), 0), this._params[1] = t, this.SetAudioParam(this._wetNode.gain, t, i, s), this.SetAudioParam(this._dryNode.gain, 1 - t, i, s))
        }
        _SetBufferInfo(e, t, i) {
            this._bufferOriginalUrl = e, this._bufferUrl = t, this._bufferType = i
        }
        GetState() {
            let e = super.GetState();
            return e.bufferOriginalUrl = this._bufferOriginalUrl, e.bufferUrl = "", e.bufferType = this._bufferType, e
        }
    }, self.C3AudioFlangerFX = class e extends q {
        constructor(e, t, i, s, n, a) {
            super(e), this._type = "flanger", this._params = [t, i, s, n, a], this._inputNode = this.CreateGain(), this._dryNode = this.CreateGain(), this._dryNode.gain.value = 1 - a / 2, this._wetNode = this.CreateGain(), this._wetNode.gain.value = a / 2, this._feedbackNode = this.CreateGain(), this._feedbackNode.gain.value = n, this._delayNode = this._audioContext.createDelay(t + i), this._delayNode.delayTime.value = t, this._oscNode = this._audioContext.createOscillator(), this._oscNode.frequency.value = s, this._oscGainNode = this.CreateGain(), this._oscGainNode.gain.value = i, this._inputNode.connect(this._delayNode), this._inputNode.connect(this._dryNode), this._delayNode.connect(this._wetNode), this._delayNode.connect(this._feedbackNode), this._feedbackNode.connect(this._delayNode), this._oscNode.connect(this._oscGainNode), this._oscGainNode.connect(this._delayNode.delayTime), this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0), this._inputNode.disconnect(), this._delayNode.disconnect(), this._oscNode.disconnect(), this._oscGainNode.disconnect(), this._dryNode.disconnect(), this._wetNode.disconnect(), this._feedbackNode.disconnect(), super.Release()
        }
        ConnectTo(e) {
            this._wetNode.disconnect(), this._wetNode.connect(e), this._dryNode.disconnect(), this._dryNode.connect(e)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(e, t, i, s) {
            switch (e) {
                case 0:
                    t = Math.max(Math.min(t / 100, 1), 0), this._params[4] = t, this.SetAudioParam(this._wetNode.gain, t / 2, i, s), this.SetAudioParam(this._dryNode.gain, 1 - t / 2, i, s);
                    break;
                case 6:
                    this._params[1] = t / 1e3, this.SetAudioParam(this._oscGainNode.gain, t / 1e3, i, s);
                    break;
                case 7:
                    this._params[2] = t, this.SetAudioParam(this._oscNode.frequency, t, i, s);
                    break;
                case 8:
                    this._params[3] = t / 100, this.SetAudioParam(this._feedbackNode.gain, t / 100, i, s)
            }
        }
    }, self.C3AudioPhaserFX = class e extends q {
        constructor(e, t, i, s, n, a, o) {
            super(e), this._type = "phaser", this._params = [t, i, s, n, a, o], this._inputNode = this.CreateGain(), this._dryNode = this.CreateGain(), this._dryNode.gain.value = 1 - o / 2, this._wetNode = this.CreateGain(), this._wetNode.gain.value = o / 2, this._filterNode = this._audioContext.createBiquadFilter(), this._filterNode.type = "allpass", this._filterNode.frequency.value = t, this._filterNode.detune.value = i, this._filterNode.Q.value = s, this._oscNode = this._audioContext.createOscillator(), this._oscNode.frequency.value = a, this._oscGainNode = this.CreateGain(), this._oscGainNode.gain.value = n, this._inputNode.connect(this._filterNode), this._inputNode.connect(this._dryNode), this._filterNode.connect(this._wetNode), this._oscNode.connect(this._oscGainNode), this._oscGainNode.connect(this._filterNode.frequency), this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0), this._inputNode.disconnect(), this._filterNode.disconnect(), this._oscNode.disconnect(), this._oscGainNode.disconnect(), this._dryNode.disconnect(), this._wetNode.disconnect(), super.Release()
        }
        ConnectTo(e) {
            this._wetNode.disconnect(), this._wetNode.connect(e), this._dryNode.disconnect(), this._dryNode.connect(e)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(e, t, i, s) {
            switch (e) {
                case 0:
                    t = Math.max(Math.min(t / 100, 1), 0), this._params[5] = t, this.SetAudioParam(this._wetNode.gain, t / 2, i, s), this.SetAudioParam(this._dryNode.gain, 1 - t / 2, i, s);
                    break;
                case 1:
                    this._params[0] = t, this.SetAudioParam(this._filterNode.frequency, t, i, s);
                    break;
                case 2:
                    this._params[1] = t, this.SetAudioParam(this._filterNode.detune, t, i, s);
                    break;
                case 3:
                    this._params[2] = t, this.SetAudioParam(this._filterNode.Q, t, i, s);
                    break;
                case 6:
                    this._params[3] = t, this.SetAudioParam(this._oscGainNode.gain, t, i, s);
                    break;
                case 7:
                    this._params[4] = t, this.SetAudioParam(this._oscNode.frequency, t, i, s)
            }
        }
    }, self.C3AudioGainFX = class e extends q {
        constructor(e, t) {
            super(e), this._type = "gain", this._params = [t], this._node = this.CreateGain(), this._node.gain.value = t
        }
        Release() {
            this._node.disconnect(), super.Release()
        }
        ConnectTo(e) {
            this._node.disconnect(), this._node.connect(e)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(e, t, i, s) {
            let n = self.AudioDOMHandler.DbToLinear;
            4 === e && (this._params[0] = n(t), this.SetAudioParam(this._node.gain, n(t), i, s))
        }
    }, self.C3AudioTremoloFX = class e extends q {
        constructor(e, t, i) {
            super(e), this._type = "tremolo", this._params = [t, i], this._node = this.CreateGain(), this._node.gain.value = 1 - i / 2, this._oscNode = this._audioContext.createOscillator(), this._oscNode.frequency.value = t, this._oscGainNode = this.CreateGain(), this._oscGainNode.gain.value = i / 2, this._oscNode.connect(this._oscGainNode), this._oscGainNode.connect(this._node.gain), this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0), this._oscNode.disconnect(), this._oscGainNode.disconnect(), this._node.disconnect(), super.Release()
        }
        ConnectTo(e) {
            this._node.disconnect(), this._node.connect(e)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(e, t, i, s) {
            switch (e) {
                case 0:
                    t = Math.max(Math.min(t / 100, 1), 0), this._params[1] = t, this.SetAudioParam(this._node.gain, 1 - t / 2, i, s), this.SetAudioParam(this._oscGainNode.gain, t / 2, i, s);
                    break;
                case 7:
                    this._params[0] = t, this.SetAudioParam(this._oscNode.frequency, t, i, s)
            }
        }
    }, self.C3AudioRingModFX = class e extends q {
        constructor(e, t, i) {
            super(e), this._type = "ringmod", this._params = [t, i], this._inputNode = this.CreateGain(), this._wetNode = this.CreateGain(), this._wetNode.gain.value = i, this._dryNode = this.CreateGain(), this._dryNode.gain.value = 1 - i, this._ringNode = this.CreateGain(), this._ringNode.gain.value = 0, this._oscNode = this._audioContext.createOscillator(), this._oscNode.frequency.value = t, this._oscNode.connect(this._ringNode.gain), this._oscNode.start(0), this._inputNode.connect(this._ringNode), this._inputNode.connect(this._dryNode), this._ringNode.connect(this._wetNode)
        }
        Release() {
            this._oscNode.stop(0), this._oscNode.disconnect(), this._ringNode.disconnect(), this._inputNode.disconnect(), this._wetNode.disconnect(), this._dryNode.disconnect(), super.Release()
        }
        ConnectTo(e) {
            this._wetNode.disconnect(), this._wetNode.connect(e), this._dryNode.disconnect(), this._dryNode.connect(e)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(e, t, i, s) {
            switch (e) {
                case 0:
                    t = Math.max(Math.min(t / 100, 1), 0), this._params[1] = t, this.SetAudioParam(this._wetNode.gain, t, i, s), this.SetAudioParam(this._dryNode.gain, 1 - t, i, s);
                    break;
                case 7:
                    this._params[0] = t, this.SetAudioParam(this._oscNode.frequency, t, i, s)
            }
        }
    }, self.C3AudioDistortionFX = class e extends q {
        constructor(e, t, i, s, n, a) {
            super(e), this._type = "distortion", this._params = [t, i, s, n, a], this._inputNode = this.CreateGain(), this._preGain = this.CreateGain(), this._postGain = this.CreateGain(), this._SetDrive(s, n), this._wetNode = this.CreateGain(), this._wetNode.gain.value = a, this._dryNode = this.CreateGain(), this._dryNode.gain.value = 1 - a, this._waveShaper = this._audioContext.createWaveShaper(), this._curve = new Float32Array(65536), this._GenerateColortouchCurve(t, i), this._waveShaper.curve = this._curve, this._inputNode.connect(this._preGain), this._inputNode.connect(this._dryNode), this._preGain.connect(this._waveShaper), this._waveShaper.connect(this._postGain), this._postGain.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect(), this._preGain.disconnect(), this._waveShaper.disconnect(), this._postGain.disconnect(), this._wetNode.disconnect(), this._dryNode.disconnect(), super.Release()
        }
        _SetDrive(e, t) {
            e < .01 && (e = .01), this._preGain.gain.value = e, this._postGain.gain.value = Math.pow(1 / e, .6) * t
        }
        _GenerateColortouchCurve(e, t) {
            for (let i = 0; i < 32768; ++i) {
                let s = i / 32768;
                s = this._Shape(s, e, t), this._curve[32768 + i] = s, this._curve[32768 - i - 1] = -s
            }
        }
        _Shape(e, t, i) {
            let s = 1.05 * i * t - t,
                n = e < 0 ? -e : e,
                a = n < t ? n : t + s * self.AudioDOMHandler.e4(n - t, 1 / s);
            return a * (e < 0 ? -1 : 1)
        }
        ConnectTo(e) {
            this._wetNode.disconnect(), this._wetNode.connect(e), this._dryNode.disconnect(), this._dryNode.connect(e)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(e, t, i, s) {
            0 === e && (t = Math.max(Math.min(t / 100, 1), 0), this._params[4] = t, this.SetAudioParam(this._wetNode.gain, t, i, s), this.SetAudioParam(this._dryNode.gain, 1 - t, i, s))
        }
    }, self.C3AudioCompressorFX = class e extends q {
        constructor(e, t, i, s, n, a) {
            super(e), this._type = "compressor", this._params = [t, i, s, n, a], this._node = this._audioContext.createDynamicsCompressor(), this._node.threshold.value = t, this._node.knee.value = i, this._node.ratio.value = s, this._node.attack.value = n, this._node.release.value = a
        }
        Release() {
            this._node.disconnect(), super.Release()
        }
        ConnectTo(e) {
            this._node.disconnect(), this._node.connect(e)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(e, t, i, s) {}
    }, self.C3AudioAnalyserFX = class e extends q {
        constructor(e, t, i) {
            super(e), this._type = "analyser", this._params = [t, i], this._node = this._audioContext.createAnalyser(), this._node.fftSize = t, this._node.smoothingTimeConstant = i, this._freqBins = new Float32Array(this._node.frequencyBinCount), this._signal = new Uint8Array(t), this._peak = 0, this._rms = 0, this._audioDomHandler._AddAnalyser(this)
        }
        Release() {
            this._audioDomHandler._RemoveAnalyser(this), this._node.disconnect(), super.Release()
        }
        Tick() {
            this._node.getFloatFrequencyData(this._freqBins), this._node.getByteTimeDomainData(this._signal);
            let e = this._node.fftSize;
            this._peak = 0;
            let t = 0;
            for (let i = 0; i < e; ++i) {
                let s = (this._signal[i] - 128) / 128;
                s < 0 && (s = -s), this._peak < s && (this._peak = s), t += s * s
            }
            let n = self.AudioDOMHandler.LinearToDb;
            this._peak = n(this._peak), this._rms = n(Math.sqrt(t / e))
        }
        ConnectTo(e) {
            this._node.disconnect(), this._node.connect(e)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(e, t, i, s) {}
        GetData() {
            return {
                tag: this.GetTag(),
                index: this.GetIndex(),
                peak: this._peak,
                rms: this._rms,
                binCount: this._node.frequencyBinCount,
                freqBins: this._freqBins
            }
        }
    }
} {
    let V = class e extends self.DOMHandler {
        constructor(e) {
            super(e, "browser"), this._exportType = "", this.AddRuntimeMessageHandlers([
                ["get-initial-state", e => this._OnGetInitialState(e)],
                ["ready-for-sw-messages", () => this._OnReadyForSWMessages()],
                ["alert", e => this._OnAlert(e)],
                ["close", () => this._OnClose()],
                ["set-focus", e => this._OnSetFocus(e)],
                ["vibrate", e => this._OnVibrate(e)],
                ["lock-orientation", e => this._OnLockOrientation(e)],
                ["unlock-orientation", () => this._OnUnlockOrientation()],
                ["navigate", e => this._OnNavigate(e)],
                ["request-fullscreen", e => this._OnRequestFullscreen(e)],
                ["exit-fullscreen", () => this._OnExitFullscreen()],
                ["set-hash", e => this._OnSetHash(e)]
            ]), window.addEventListener("online", () => this._OnOnlineStateChanged(!0)), window.addEventListener("offline", () => this._OnOnlineStateChanged(!1)), window.addEventListener("hashchange", () => this._OnHashChange()), document.addEventListener("backbutton", () => this._OnCordovaBackButton()), "undefined" != typeof Windows && Windows.UI.Core.SystemNavigationManager.getForCurrentView().addEventListener("backrequested", e => this._OnWin10BackRequested(e))
        }
        _OnGetInitialState(e) {
            return this._exportType = e.exportType, {
                location: location.toString(),
                isOnline: !!navigator.onLine,
                referrer: document.referrer,
                title: document.title,
                isCookieEnabled: !!navigator.cookieEnabled,
                screenWidth: screen.width,
                screenHeight: screen.height,
                windowOuterWidth: window.outerWidth,
                windowOuterHeight: window.outerHeight,
                isScirraArcade: void 0 !== window.is_scirra_arcade
            }
        }
        _OnReadyForSWMessages() {
            window.C3_RegisterSW && window.OfflineClientInfo && window.OfflineClientInfo.SetMessageCallback(e => this.PostToRuntime("sw-message", e.data))
        }
        _OnOnlineStateChanged(e) {
            this.PostToRuntime("online-state", {
                isOnline: e
            })
        }
        _OnCordovaBackButton() {
            this.PostToRuntime("backbutton")
        }
        _OnWin10BackRequested(e) {
            e.handled = !0, this.PostToRuntime("backbutton")
        }
        GetNWjsWindow() {
            return "nwjs" === this._exportType ? nw.Window.get() : null
        }
        _OnAlert(e) {
            alert(e.message)
        }
        _OnClose() {
            navigator.app && navigator.app.exitApp ? navigator.app.exitApp() : navigator.device && navigator.device.exitApp ? navigator.device.exitApp() : window.close()
        }
        _OnSetFocus(e) {
            let t = e.isFocus;
            if ("nwjs" === this._exportType) {
                let i = this.GetNWjsWindow();
                t ? i.focus() : i.blur()
            } else t ? window.focus() : window.blur()
        }
        _OnVibrate(e) {
            navigator.vibrate && navigator.vibrate(e.pattern)
        }
        _OnLockOrientation(e) {
            let t = e.orientation;
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock(t).catch(e => console.warn("[Construct 3] Failed to lock orientation: ", e));
            else try {
                let i = !1;
                screen.lockOrientation ? i = screen.lockOrientation(t) : screen.webkitLockOrientation ? i = screen.webkitLockOrientation(t) : screen.mozLockOrientation ? i = screen.mozLockOrientation(t) : screen.msLockOrientation && (i = screen.msLockOrientation(t)), i || console.warn("[Construct 3] Failed to lock orientation")
            } catch (s) {
                console.warn("[Construct 3] Failed to lock orientation: ", s)
            }
        }
        _OnUnlockOrientation() {
            try {
                screen.orientation && screen.orientation.unlock ? screen.orientation.unlock() : screen.unlockOrientation ? screen.unlockOrientation() : screen.webkitUnlockOrientation ? screen.webkitUnlockOrientation() : screen.mozUnlockOrientation ? screen.mozUnlockOrientation() : screen.msUnlockOrientation && screen.msUnlockOrientation()
            } catch (e) {}
        }
        _OnNavigate(e) {
            let t = e.type;
            if ("back" === t) navigator.app && navigator.app.backHistory ? navigator.app.backHistory() : window.history.back();
            else if ("forward" === t) window.history.forward();
            else if ("reload" === t) location.reload();
            else if ("url" === t) {
                let i = e.url,
                    s = e.target,
                    n = e.exportType;
                "windows-uwp" === n && "undefined" != typeof Windows ? Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(i)) : self.cordova && self.cordova.InAppBrowser ? self.cordova.InAppBrowser.open(i, "_system") : "preview" === n || "windows-webview2" === n ? window.open(i, "_blank") : this._isScirraArcade || (2 === s ? window.top.location = i : 1 === s ? window.parent.location = i : window.location = i)
            } else if ("new-window" === t) {
                let a = e.url,
                    o = e.tag,
                    r = e.exportType;
                "windows-uwp" === r && "undefined" != typeof Windows ? Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(a)) : self.cordova && self.cordova.InAppBrowser ? self.cordova.InAppBrowser.open(a, "_system") : window.open(a, o)
            }
        }
        _OnRequestFullscreen(e) {
            if ("windows-webview2" === this._exportType || "macos-wkwebview" === this._exportType) self.RuntimeInterface._SetWrapperIsFullscreenFlag(!0), this._iRuntime._SendWrapperMessage({
                type: "set-fullscreen",
                fullscreen: !0
            });
            else {
                let t = {
                        navigationUI: "auto"
                    },
                    i = e.navUI;
                1 === i ? t.navigationUI = "hide" : 2 === i && (t.navigationUI = "show");
                let s = document.documentElement;
                s.requestFullscreen ? s.requestFullscreen(t) : s.mozRequestFullScreen ? s.mozRequestFullScreen(t) : s.msRequestFullscreen ? s.msRequestFullscreen(t) : s.webkitRequestFullScreen && (void 0 !== Element.ALLOW_KEYBOARD_INPUT ? s.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT) : s.webkitRequestFullScreen())
            }
        }
        _OnExitFullscreen() {
            "windows-webview2" === this._exportType || "macos-wkwebview" === this._exportType ? (self.RuntimeInterface._SetWrapperIsFullscreenFlag(!1), this._iRuntime._SendWrapperMessage({
                type: "set-fullscreen",
                fullscreen: !1
            })) : document.exitFullscreen ? document.exitFullscreen() : document.mozCancelFullScreen ? document.mozCancelFullScreen() : document.msExitFullscreen ? document.msExitFullscreen() : document.webkitCancelFullScreen && document.webkitCancelFullScreen()
        }
        _OnSetHash(e) {
            location.hash = e.hash
        }
        _OnHashChange() {
            this.PostToRuntime("hashchange", {
                location: location.toString()
            })
        }
    };
    self.RuntimeInterface.AddDOMHandlerClass(V)
}