const startTs = Date.now();
let voices = window.speechSynthesis.getVoices();
let orientationEventCounter = 0, orientationEventLimit = 0, orientationEvents = [];
let motionEventCounter = 0, motionEventLimit = 0, combinedMotionEvents = "";
let mouseMoveDataString = "", mouseMoveEventCount = 0, mouseClickCount = 0, checkSum = 0, globalMouseEventCounter = 0, maxMouseMoveEvents = 100, eventThreshold = 100;
let keyboardData = "", sensitiveKeyboardData = "", keyEventCounter = 0;

function captureMouseEvent(event) {
    const eventTypes = { 'mousemove': 1, 'click': 2 };
    const eventType = eventTypes[event.type] || 0;
    const result = {
        ts: 0,
        eventLimitBiometricAutopost: false,
        mmeCnt: mouseMoveEventCount
    };

    if (eventType !== 1 && mouseClickCount >= eventThreshold) {
        result.eventLimitBiometricAutopost = true;
        return result;
    }

    if (eventType === 1 && mouseMoveEventCount < maxMouseMoveEvents ||
        eventType !== 1 && mouseClickCount < eventThreshold) {

        const mouseEvent = event || window.event;
        let coordinateX = -1;
        let coordinateY = -1;

        if (mouseEvent && mouseEvent.pageX && mouseEvent.pageY) {
            coordinateX = mouseEvent.pageX;
            coordinateY = mouseEvent.pageY;
        } else if (mouseEvent && mouseEvent.clientX && mouseEvent.clientY) {
            coordinateX = mouseEvent.clientX;
            coordinateY = mouseEvent.clientY;
        }

        const timestamp = Date.now() - startTs;
        result.ts = timestamp;

        let dataString = `${globalMouseEventCounter},${eventType},${timestamp},${coordinateX},${coordinateY}`;

        if (typeof mouseEvent.isTrusted !== "undefined" &&
            mouseEvent.isTrusted === false) {
            dataString += ",0";  // Mark as untrusted
        }

        dataString += ";";

        checkSum += globalMouseEventCounter + eventType + timestamp + coordinateX + coordinateY;
        mouseMoveDataString += dataString;
    }

    if (eventType === 1) {
        mouseMoveEventCount++;
    } else {
        mouseClickCount++;
    }

    globalMouseEventCounter++;

    return result;
}

document.addEventListener('mousemove', captureMouseEvent);

document.addEventListener('click', captureMouseEvent);

function captureKeyboardEvent(event) {
    debugger;
    const maxKeyboardEvents = 150;

    let keyboardEventCounter = 0;
    let lastFieldId = -1;
    let sameFieldCount = 0;

    function getCurrentTimestamp() {
        return Date.now() - startTs;
    }

    function getFieldId(element) {
        if (!element) return -1;
        const name = element.getAttribute('name');
        if (name) return hashString(name);
        const id = element.getAttribute('id');
        if (id) return hashString(id);
        return -1;
    }

    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    function isSensitiveField(keyCode) {
        const activeElement = document.activeElement;
        if (!activeElement) return 0;

        const type = activeElement.getAttribute('type');
        if (type === 'password') {
            if (sameFieldCount > 12 && keyCode === -2) return 1;
        }
        return 0;
    }

    const eventTypes = {
        'keydown': 1,
        'keyup': 2,
        'keypress': 3
    };
    const eventType = eventTypes[event.type] || event.type;
    if (keyEventCounter >= maxKeyboardEvents) return;

    const timestamp = getCurrentTimestamp();
    const keyCode = event.keyCode || -1;
    const charCode = event.charCode || 0;

    // Calculate modifiers bitmask
    const shift = event.shiftKey ? 1 : 0;
    const ctrl = event.ctrlKey ? 1 : 0;
    const meta = event.metaKey ? 1 : 0;
    const alt = event.altKey ? 1 : 0;
    const modifiers = shift * 8 + ctrl * 4 + meta * 2 + alt;

    const fieldId = getFieldId(document.activeElement);
    let isPrintable = 0;

    if (charCode && keyCode) {
        isPrintable = 1;
    }

    if (ctrl === 0 && meta === 0 && alt === 0 && keyCode > 32) {
        isPrintable = 0;
    }

    // Track field changes
    if (fieldId !== lastFieldId) {
        lastFieldId = fieldId;
        sameFieldCount = 0;
    } else {
        sameFieldCount++;
    }

    const isSensitive = isSensitiveField(keyCode);
    const eventData = `${keyboardEventCounter},${eventType},${keyCode},${modifiers},${timestamp},${fieldId},${isPrintable};`;

    if (isSensitive === 0) {
        keyboardData += eventData;
    } else {
        sensitiveKeyboardData += eventData;
    }

    keyEventCounter++;
    keyboardEventCounter++;

    // return {
    //     ts: timestamp,
    //     sk: keyCode,
    //     eventLimitBiometricAutopost: false
    // };

    // Get collected data
    console.log("Akamai keyboard event captured");
}

document.addEventListener("keydown", captureKeyboardEvent, true);
document.addEventListener("keyup", captureKeyboardEvent, true);
document.addEventListener("keypress", captureKeyboardEvent, true);


function getFloatValue(coordinate) {
    try {
        if (coordinate != null && !isNaN(coordinate)) {
            let floatValue = parseFloat(coordinate);
            if (!isNaN(floatValue)) {
                return floatValue.toFixed(2);
            }
        }
    } catch (error) { }
    return -1;
};

function getMotionData(motionEvent) {
    try {
        if (motionEventCounter < 10 && motionEventLimit < 2 && motionEvent) {
            let deltaTs = Date.now() - startTs;
            let accelerationX = -1, accelerationY = -1, accelerationZ = -1;
            if (motionEvent.acceleration) {
                accelerationX = getFloatValue(motionEvent.acceleration.x);
                accelerationY = getFloatValue(motionEvent.acceleration.y);
                accelerationZ = getFloatValue(motionEvent.acceleration.z);
            }
            let accelerationIncludingGravityX = -1, accelerationIncludingGravityY = -1, accelerationIncludingGravityZ = -1;
            if (motionEvent.accelerationIncludingGravity) {
                accelerationIncludingGravityX = getFloatValue(motionEvent.accelerationIncludingGravity.x);
                accelerationIncludingGravityY = getFloatValue(motionEvent.accelerationIncludingGravity.y);
                accelerationIncludingGravityZ = getFloatValue(motionEvent.accelerationIncludingGravity.z);
            }
            let rotationRateAlpha = -1, rotationRateBeta = -1, rotationRateGamma = 1;
            if (motionEvent.rotationRate) {
                rotationRateAlpha = getFloatValue(motionEvent.rotationRate.alpha);
                rotationRateBeta = getFloatValue(motionEvent.rotationRate.beta);
                rotationRateGamma = getFloatValue(motionEvent.rotationRate.gamma);
            }
            combinedMotionEvents = "".concat(motionEventCounter, ",").concat(deltaTs, ",").concat(accelerationX, ",").concat(accelerationY, ",").concat(accelerationZ, ",").concat(accelerationIncludingGravityX, ",").concat(accelerationIncludingGravityY, ",").concat(accelerationIncludingGravityZ, ",").concat(rotationRateAlpha, ",").concat(rotationRateBeta, ",").concat(rotationRateGamma);
            if (typeof motionEvent.isTrusted != "undefined" && motionEvent.isTrusted === false) combinedMotionEvents = "".concat(combinedMotionEvents, ",0");
            events = "".concat("" + combinedMotionEvents, ";");
        }
        motionEventCounter++;
        motionEventLimit++;
        return combinedMotionEvents;
    } catch (error) {
        console.error("Error in motion data:", error);
    }
}

function getOrientationData(orientationEvent) {
    try {
        if (orientationEventCounter < 10 && orientationEventLimit < 2 && orientationEvent) {
            let deltaTs = Date.now() - startTs;
            const alpha = getFloatValue(orientationEvent.alpha);
            const beta = getFloatValue(orientationEvent.beta);
            const gamma = getFloatValue(orientationEvent.gamma);
            let combinedEvents = `${orientationEventCounter},${deltaTs},${alpha},${beta},${gamma}`;
            orientationEvents.push(combinedEvents);
        }
        orientationEventCounter++;
        orientationEventLimit++;
    } catch (error) {
        console.error("Error in orientation data:", error);
    }
}

let chartInstance = null; // Store chart instance globally to destroy before recreating

async function visualizeMouseData(mouseData) {
    console.log('=== Starting Mouse Data Visualization ===');
    console.log('Raw mouse data:', mouseData);
    console.log('Mouse data length:', mouseData.length);

    if (!mouseData || mouseData.length === 0) {
        console.error('No mouse data available!');
        document.getElementById('chartContainer').innerHTML += '<p style="color: red;">No mouse movement data captured. Please move your mouse and click before running tests.</p>';
        return;
    }

    const dataPoints = mouseData.split(';').filter(Boolean).map((entry, index, arr) => {
        // Format: ${globalMouseEventCounter},${eventType},${timestamp},${coordinateX},${coordinateY}
        const parts = entry.split(',').map(Number);
        const eventIndex = parts[0];
        const eventType = parts[1];
        const timestamp = parts[2];
        const x = parts[3];
        const y = parts[4];

        // Calculate speed based on time difference between events
        let speed = 0;
        if (index > 0) {
            const prevParts = arr[index - 1].split(',').map(Number);
            const prevTimestamp = prevParts[2];
            const prevX = prevParts[3];
            const prevY = prevParts[4];
            const distance = Math.sqrt(Math.pow(x - prevX, 2) + Math.pow(y - prevY, 2));
            const timeDiff = timestamp - prevTimestamp || 1;
            speed = distance / timeDiff; // pixels per millisecond
        }

        return { x, y, speed, eventType, timestamp, eventIndex, index };
    });

    console.log('Total parsed data points:', dataPoints.length);
    console.log('First 5 events:', dataPoints.slice(0, 5));
    console.log('Sample data point:', dataPoints[0]);

    const canvas = document.getElementById('mouseDataChart');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Destroy previous chart instance if exists
    if (chartInstance) {
        console.log('Destroying previous chart instance');
        chartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Failed to get 2D context!');
        return;
    }

    // Separate moves and clicks but preserve chronological order
    const moveData = dataPoints.filter((point) => point.eventType === 1).map((point, idx) => ({
        x: point.x,
        y: point.y,
        r: Math.max(15 - point.speed * 10, 3), // Faster speed -> smaller dots
        timestamp: point.timestamp,
        order: point.index,
    }));

    const clickData = dataPoints.filter((point) => point.eventType === 2).map((point, idx) => ({
        x: point.x,
        y: point.y,
        r: 15, // Larger size for clicks to make them visible
        timestamp: point.timestamp,
        order: point.index,
    }));

    // Create a path line dataset showing chronological order
    const pathLine = dataPoints.map((point) => ({
        x: point.x,
        y: point.y,
    }));

    console.log('Move data points:', moveData.length);
    console.log('Click data points:', clickData.length);
    console.log('Sample move:', moveData[0]);
    console.log('Sample click:', clickData[0]);

    if (moveData.length === 0 && clickData.length === 0) {
        console.error('No valid data points to plot!');
        document.getElementById('chartContainer').innerHTML += '<p style="color: orange;">No valid mouse movements captured in the expected format.</p>';
        return;
    }

    const scatterData = {
        datasets: [
            // Path line showing chronological order
            {
                label: 'Mouse Path',
                data: pathLine,
                type: 'line',
                borderColor: 'rgba(128, 128, 128, 0.3)',
                backgroundColor: 'rgba(128, 128, 128, 0.1)',
                borderWidth: 1,
                pointRadius: 0,
                fill: false,
                tension: 0.4, // Smooth curves
                showLine: true,
                order: 3, // Draw first (behind)
            },
            // Mouse movements
            {
                label: 'Mouse Move',
                data: moveData,
                type: 'bubble',
                backgroundColor: 'rgba(0, 123, 255, 0.7)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1,
                order: 2,
            },
            // Mouse clicks
            {
                label: 'Mouse Click',
                data: clickData,
                type: 'bubble',
                backgroundColor: 'rgba(255, 99, 132, 0.4)',
                borderColor: 'rgba(220, 20, 60, 1)',
                borderWidth: 4,
                order: 1, // Draw last (on top)
            },
        ],
    };

    console.log('Creating chart with data:', scatterData);

    try {
        chartInstance = new Chart(ctx, {
            type: 'bubble',
            data: scatterData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: `Mouse Movement Visualization (${moveData.length} moves, ${clickData.length} clicks) - Grey line shows chronological path`
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const dataset = context.dataset;
                                const dataPoint = dataset.data[context.dataIndex];
                                if (dataset.label === 'Mouse Path') {
                                    return null; // Don't show tooltip for path line
                                }
                                return `${dataset.label}: (${dataPoint.x}, ${dataPoint.y}) at ${dataPoint.timestamp}ms`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'X Coordinate (pixels)',
                        },
                        beginAtZero: false,
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Y Coordinate (pixels)',
                        },
                        beginAtZero: false,
                        reverse: true, // Reverse Y axis to match screen coordinates
                    },
                },
            },
        });
        console.log('Chart created successfully!');
    } catch (error) {
        console.error('Error creating chart:', error);
        document.getElementById('chartContainer').innerHTML += `<p style="color: red;">Error creating chart: ${error.message}</p>`;
    }
}

async function runAllTests() {
    const outputArea = document.getElementById('output');
    outputArea.innerHTML = '';

    const functions = [
        ajr1, ajr2, ajt, din, dme, doe, dsi, eem, ffl, ffs, fpc, ftp1, ftp2, fwd, hls, mst, per, pur, s002, s003, s017, s148, s150, s151, s153, sde, sww, wsl, sharedWorkerTest_1, sharedWorkerTest_2, sharedWorkerTest_3, mouseEvents, keyboardEvents // All functions included
    ];

    // Store results in an object for JSON formatting
    const testResults = {};

    for (const func of functions) {
        try {
            const result = await func();
            testResults[func.name] = result;

            if (typeof result === 'object') {
                outputArea.innerHTML += `<p>"${func.name}": <pre class='json'>${JSON.stringify(result, null, 2)}</pre></p>,`;
            } else {
                outputArea.innerHTML += `<p>"${func.name}": "${result}"</p>,`;
            }
        } catch (error) {
            const errorMessage = `Error - ${error.message}`;
            testResults[func.name] = errorMessage;
            outputArea.innerHTML += `<p>"${func.name}": "${errorMessage}"</p>,`;
        }
    }

    // Add copy button at the top of output
    const copyButton = document.createElement('button');
    copyButton.textContent = '📋 Copy Results as JSON';
    copyButton.style.cssText = 'padding: 10px 20px; margin: 10px 0; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;';
    copyButton.addEventListener('mouseenter', () => {
        copyButton.style.backgroundColor = '#0056b3';
    });
    copyButton.addEventListener('mouseleave', () => {
        copyButton.style.backgroundColor = '#007bff';
    });
    copyButton.addEventListener('click', () => copyResultsToClipboard(testResults));

    outputArea.insertBefore(copyButton, outputArea.firstChild);

    document.getElementById('chartContainer').style.display = 'block';
}

async function copyResultsToClipboard(results) {
    try {
        // Format as valid JSON
        const jsonString = JSON.stringify(results, null, 2);

        // Copy to clipboard
        await navigator.clipboard.writeText(jsonString);

        // Show success feedback
        const feedback = document.createElement('div');
        feedback.textContent = '✅ Copied to clipboard!';
        feedback.style.cssText = 'position: fixed; top: 20px; right: 20px; background-color: #28a745; color: white; padding: 15px 25px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 10000; font-weight: bold;';
        document.body.appendChild(feedback);

        // Remove feedback after 2 seconds
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);

        // Show error feedback
        const feedback = document.createElement('div');
        feedback.textContent = '❌ Failed to copy. Check console.';
        feedback.style.cssText = 'position: fixed; top: 20px; right: 20px; background-color: #dc3545; color: white; padding: 15px 25px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 10000; font-weight: bold;';
        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.remove();
        }, 2000);
    }
}

// Example function definitions (replace with actual implementations)
async function ajr1(startTs, deltaTimeStamp, dinReturnValue, mact, dmact, doact) {
    let dynamicFunctionString;
    try {
        if (!dynamicFunctionString) {
            return -1;
        } else {
            dynamicFunction = dynamicFunctionString + `({startTimestamp:${startTs}, deltaTimestamp:${deltaTimeStamp},userAgent:'${navigator.userAgent}', deviceData:'${(k1h = dinReturnValue, L1h = k1h.map(function (Vfh) {
                let Zfh;
                return Zfh = Object.keys(Vfh).map(function (rfh) {
                    return Vfh[rfh];
                })[0], Zfh;
            }), L1h.join(","))}', totVel:${mact.getVel() + dmact.getVel() + doact.getVel()}, mouseMoveData: '${mouseEvents()}'})`;

            dynamicFunctionValue = eval(dynamicFunction);
        }
        return dynamicFunctionValue;
    } catch (error) {
        throw error;
    }
}

async function ajr2() {
    function E3c() {
        let zHc = window.navigator.userAgent.replace(/\\|"/g, '');
        let T3c = "";
        let t8c = [];
        for (let nXc = 0; nXc < 5; nXc++) {
            let BNc = Math.floor(Math.random() * zHc.length);
            t8c.push(BNc);
            T3c = T3c + zHc[BNc];
        }
        let Y8c = [T3c, t8c];
        let tNc;
        return tNc = Y8c.join("|"), tNc;
    }
    return E3c();
}

async function ajt(opts = {}) {
    let firstLoad = opts.firstLoad === undefined ? true : !!opts.firstLoad;
    let Xgc = firstLoad ? -1 : 0;
    let Pvc = 0;
    let details = [];

    let ua = (() => {
        try { return navigator.userAgent || ""; } catch (e) { return ""; }
    })();

    let hasDeviceOrientation = typeof window !== 'undefined' && typeof window.DeviceOrientationEvent !== 'undefined';
    let hasDeviceMotion = typeof window !== 'undefined' && typeof window.DeviceMotionEvent !== 'undefined';
    let hasTouch = (() => {
        try {
            return !!('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);
        } catch (e) { return false; }
    })();

    return { Xgc, Pvc, details, ua, hasDeviceOrientation, hasDeviceMotion, hasTouch };
}

async function din() {
    const timestampCheck = parseInt(startTs / (2016 * 2016), 10);
    const deviceDynamicTimeStamp = parseInt(timestampCheck / 23, 10);

    function getWindowFunctions() {
        let addEventListener = window.addEventListener ? 1 : 0,
            xMLHttpRequest = window.XMLHttpRequest ? 1 : 0,
            xDomainRequest = window.XDomainRequest ? 1 : 0,
            emit = window.emit ? 1 : 0,
            deviceOrientationEvent = window.DeviceOrientationEvent ? 1 : 0,
            deviceMotionEvent = window.DeviceMotionEvent ? 1 : 0,
            touchEvent = window.TouchEvent ? 1 : 0,
            spawn = window.spawn ? 1 : 0,
            chrome = window.chrome ? 1 : 0,
            bind = window.Function.prototype.bind ? 1 : 0,
            buffer = window.Buffer ? 1 : 0,
            pointerEvent = window.PointerEvent ? 1 : 0;
        let innerWidth, outerWidth
        try {
            innerWidth = window.innerWidth ? 1 : 0;
        } catch (t) {
            innerWidth = 0;
        }

        try {
            outerWidth = window.outerWidth ? 1 : 0;
        } catch (t) {
            outerWidth = 0;
        }

        return xagg = addEventListener + (xMLHttpRequest << 1) + (xDomainRequest << 2) + (emit << 3) + (deviceOrientationEvent << 4) + (deviceMotionEvent << 5) + (touchEvent << 6) + (spawn << 7) + (innerWidth << 8) + (outerWidth << 9) + (chrome << 10) + (bind << 11) + (buffer << 12) + (pointerEvent << 13);
    }

    function navigatorProperties() {
        let properties = [],
            phantomCall = window.callPhantom ? 1 : 0;
        properties.push("cpen:" + phantomCall);

        let activeXObject = window.ActiveXObject ? 1 : 0;
        properties.push("i1:" + activeXObject);

        let documentMode = document.documentMode ? 1 : 0;
        properties.push("dm:" + documentMode);

        let chromeWebstore = window.chromeWebstore ? 1 : 0;
        properties.push("cwen:" + chromeWebstore);

        let online = navigator.onLine ? 1 : 0;
        properties.push("non:" + online);

        let operCheck = window.opera ? 1 : 0;
        properties.push("opc:" + operCheck);

        let firefoxCheck = Function.InstallTrigger ? 1 : 0;
        properties.push("fc:" + firefoxCheck);

        let HTMLElement = Function.htmlElement && Object.prototype.toString.call(Function.htmlElement).indexOf("Constructor") > 0 ? 1 : 0;
        properties.push("sc:" + HTMLElement);

        let peerConnection = typeof window.RTCPeerConnection || "function" == typeof window.mozRTCPeerConnection || "function" == typeof window.webkitRTCPeerConnection ? 1 : 0;
        properties.push("wrc:" + peerConnection);

        let mozInnerScreenY = "mozInnerScreenY" in window ? window.mozInnerScreenY : 0;
        properties.push("isc:" + mozInnerScreenY);

        let vibrate = navigator.vibrate ? 1 : 0;
        properties.push("vib:" + vibrate);

        let battery = navigator.getBattery ? 1 : 0;
        properties.push("bat:" + battery);

        let foreach = Array.prototype.forEach ? 0 : 1;
        properties.push("x11:" + foreach);

        let fileReader = 1 //= "FileReader" in window ? 1:0; always true
        properties.push("x12:" + fileReader);

        return properties.join(",");
    }

    return [{
        "ua": navigator.userAgent.replace(/\\|"/g, "")
    }, {
        "xag": getWindowFunctions()
    }, {
        "nps": navigator.productSub
    }, {
        "nal": navigator.language
    }, {
        "nap": navigator.product
    }, {
        "npl": navigator.plugins.length
    }, {
        "pha": window._phantom ? 1 : 0
    }, {
        "wdr": window.webdriver ? 1 : 0
    }, {
        "dau": window.domAutomation ? 1 : 0
    }, {
        "hz1": timestampCheck
    }, {
        "tsd": 0
    }, {
        "asw": window.screen.availWidth
    }, {
        "ash": window.screen.availHeight
    }, {
        "swi": window.screen.width
    }, {
        "she": window.screen.height
    }, {
        "wiw": window.innerWidth || 0
    }, {
        "wih": window.innerHeight || 0
    }, {
        "wow": window.outerWidth
    }, {
        "adp": navigatorProperties()
    }, {
        "ucs": (function (str) {
            if (str == null) {
                return -1;
            }
            try {
                let totalCharCode = 0;
                for (let i = 0; i < str.length; i++) {
                    let charCode = str.charCodeAt(i);
                    if (charCode < 128) {
                        totalCharCode += charCode
                    }
                }
                return totalCharCode.toString();
            } catch (error) {
                throw new Error("Error in deviceData")
            }
        })(navigator.userAgent.replace(/\\|"/g, ""))
    }, {
        "ran": Math.random().toString().slice(0, 11)
    }, {
        "hal": startTs / 2
    }, {
        "ibr": navigator.brave ? 1 : 0
    }];
}

async function dme() {
    window.addEventListener("devicemotion", getMotionData, true);

    await new Promise(resolve => setTimeout(resolve, 500));

    window.removeEventListener("devicemotion", getMotionData, true);

    return combinedMotionEvents;
}

async function doe() {
    window.addEventListener("deviceorientation", getOrientationData, true);

    // Wait for a short duration to collect events
    await new Promise(resolve => setTimeout(resolve, 500));

    window.removeEventListener("deviceorientation", getOrientationData, true);

    return orientationEvents.join(";");
}

async function dsi() {
    async function sha256(str) {
        const buf = new TextEncoder().encode(str);
        const hash = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function getWebGLInfo() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return { webGLVendor: "NA", webGLRenderer: "NA" };
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            return {
                webGLVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "NA",
                webGLRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "NA"
            };
        } catch (e) {
            return { webGLVendor: "NA", webGLRenderer: "NA" };
        }
    }

    const webGLInfo = getWebGLInfo();
    const hash = await sha256(JSON.stringify(webGLInfo));
    return { webGLInfo, hash };
}

async function eem() {
    const deviceOrientationEvent = window.DeviceOrientationEvent ? "do_en" : "do_dis";
    const deviceMotionEvent = window.DeviceMotionEvent ? "dm_en" : "dm_dis";
    const touchEvent = window.TouchEvent ? "t_en" : "t_dis";
    return `${deviceOrientationEvent},${deviceMotionEvent},${touchEvent}`;
}

async function ffl() {
    const currentScript = document.currentScript;
    if (!currentScript) {
        return "-1";
    }
    return currentScript.src.split("/").slice(-4)[0];
}

async function ffs() {
    let descriptor = "";
    let autocompleteFlag = -1;
    let inputs = document.getElementsByTagName('input');

    function getFieldTypePriority(fieldType) {
        const fieldTypes = ['text', 'search', 'url', 'email', 'tel', 'number'];
        fieldType = fieldType.toLowerCase();
        if (fieldTypes.indexOf(fieldType) !== -1) return 0;
        else if (fieldType === 'password') return 1;
        else return 2;
    };

    function sumOfCharCodeAt(vkc) {
        if (vkc == null) return -1;
        try {
            let SZc = 0;
            for (let PKc = 0; PKc < vkc.length; PKc++) {
                let v1c = vkc.charCodeAt(PKc);
                if (v1c < 128) {
                    SZc = SZc + v1c;
                }
            }
            return SZc;
        } catch (nQc) {
            throw new Error("Error in sumOfCharCodeAt")
        }
    }

    for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i];

        let name = sumOfCharCodeAt(input.getAttribute('name'));
        let id = sumOfCharCodeAt(input.getAttribute('id'));

        let requiredAttr = input.getAttribute('required');
        let required = requiredAttr == null ? 0 : 1;

        let typeAttr = input.getAttribute('type');
        let typeCode = typeAttr == null ? -1 : getFieldTypePriority(typeAttr);

        let acAttr = input.getAttribute('autocomplete');
        if (acAttr == null) {
            autocompleteFlag = -1;
        } else {
            let ac = acAttr.toLowerCase();
            if (ac === 'off') autocompleteFlag = 0;
            else if (ac === 'on') autocompleteFlag = 1;
            else autocompleteFlag = 2;
        }

        let defaultVal = input.defaultValue || "";
        let curVal = input.value || "";

        let hasDefault = defaultVal.length !== 0 ? 1 : 0;
        let hasValue = (curVal.length !== 0 && (!hasDefault || curVal !== defaultVal)) ? 1 : 0;

        descriptor += `${typeCode},${autocompleteFlag},${hasValue},${required},${id},${name},${hasDefault};`;
    }

    return descriptor;
}

async function fpc() {
    return "94";
}

async function ftp1() {
    function firstFtp() {
        return "-1";
    }
    return firstFtp();
}

async function ftp2() {
    function secondFtp() {
        const fonts = "dis";
        const hasWebRtcConnection =
            window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

        const pluginCount = getInstalledPluginsCount();

        let fptValue =
            [
                "",
                navigator.brave ? navigator.brave.isBrave() : "-1", //isBrave is async function
                fonts,
                pluginCount ? pluginCount : "-1",
                Boolean(window.sessionStorage),
                Boolean(window.localStorage),
                Boolean(window.indexedDB),
                new Date().getTimezoneOffset(),
                Boolean(hasWebRtcConnection),
                screen.colorDepth ? screen.colorDepth : -1,
                screen.pixelDepth ? screen.pixelDepth : -1,
                Boolean(navigator.cookieEnabled),
                navigator.javaEnabled ? navigator.javaEnabled() : false,
                navigator.doNotTrack ? navigator.doNotTrack : -1
            ].join(";");

        return fptValue;
    }

    function getHardcodedPlugins() {
        return ["WebEx64 General Plugin Container", "YouTube Plug-in", "Java Applet Plug-in", "Shockwave Flash", "iPhotoPhotocast", "SharePoint Browser Plug-in", "Chrome Remote Desktop Viewer", "Chrome PDF Viewer", "Native Client", "Unity Player", "WebKit-integrierte PDF", "QuickTime Plug-in", "RealPlayer Version Plugin", "RealPlayer(tm) G2 LiveConnect-Enabled Plug-In (32-bit)", "Mozilla Default Plug-in", "Adobe Acrobat", "AdobeAAMDetect", "Google Earth Plug-in", "Java Plug-in 2 for NPAPI Browsers", "Widevine Content Decryption Module", "Microsoft Office Live Plug-in", "Windows Media Player Plug-in Dynamic Link Library", "Google Talk Plugin Video Renderer", "Edge PDF Viewer", "Shockwave for Director", "Default Browser Helper", "Silverlight Plug-In"];
    }

    function getInstalledPluginsCount() {
        let pluginsValue = "";
        const PLUGINS = getHardcodedPlugins();
        if (void 0 === navigator.plugins) {
            return null;
        }
        for (let i = 0, pluginsArrayLength = PLUGINS.length; i < pluginsArrayLength; i++) {
            let plugin = PLUGINS[i];
            void 0 !== navigator.plugins[plugin] && (pluginsValue = pluginsValue + "," + i);
        }
        return pluginsValue !== "" ? pluginsValue : null;
    }

    return secondFtp();
}

async function fwd() {
    function getfwd() {
        function getVoiceHash() {
            let hYF;
            voices = voices.length === 0 ? voices = window.speechSynthesis.getVoices() : voices;
            if (voices.length > 0) {
                let VoicesStr = "";
                for (let EGF = 0; EGF < voices.length; EGF++) {
                    VoicesStr += "".concat(voices[EGF].voiceURI, "_").concat(voices[EGF].lang);
                }
                gcF = voices.length;
                hYF = ConvertToHexString(CalculateHash(VoicesStr));
            } else {
                hYF = "0";
                throw new Error("fwd error: No voices available");
            }
            return hYF;
        };

        function ConvertToHexString(IcF) {
            let mZF = '';
            for (let B5F = 0; B5F < IcF.length; B5F++) {
                mZF += IcF[B5F].toString(16).length === 2 ? IcF[B5F].toString(16) : "0".concat(IcF[B5F].toString(16));
            }
            return mZF;
        };

        function CalculateHash(pBc) {
            let G7c = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
            let ENc = 0x6a09e667;
            let rDc = 0xbb67ae85;
            let H7c = 0x3c6ef372;
            let UBc = 0xa54ff53a;
            let fAc = 0x510e527f;
            let Hgc = 0x9b05688c;
            let TXc = 0x1f83d9ab;
            let xSc = 0x5be0cd19;
            let TRc = unescape(encodeURIComponent(pBc));
            let bRc = TRc.length * 8;
            TRc += String.fromCharCode(0x80);
            let Qpc = TRc.length / 4 + 2;
            let GXc = Math.ceil(Qpc / 16);
            let p7c = new Array(GXc);
            for (let jXc = 0; jXc < GXc; jXc++) {
                p7c[jXc] = new Array(16);
                for (let w8c = 0; w8c < 16; w8c++) {
                    p7c[jXc][w8c] = TRc.charCodeAt(jXc * 64 + w8c * 4) << 24 | TRc.charCodeAt(jXc * 64 + w8c * 4 + 1) << 16 | TRc.charCodeAt(jXc * 64 + w8c * 4 + 2) << 8 | TRc.charCodeAt(jXc * 64 + w8c * 4 + 3) << 0;
                }
            }
            let vXc = bRc / Math.pow(2, 32);
            p7c[GXc - 1][14] = Math.floor(vXc);
            p7c[GXc - 1][15] = bRc;
            for (let R7c = 0; R7c < GXc; R7c++) {
                let fNc = new Array(64);
                let LAc = ENc;
                let hAc = rDc;
                let QRc = H7c;
                let JTc = UBc;
                let lRc = fAc;
                let lHc = Hgc;
                let s3c = TXc;
                let dwc = xSc;
                for (let bSc = 0; bSc < 64; bSc++) {
                    let LDc = void 0,
                        ANc = void 0,
                        fBc = void 0,
                        ZTc = void 0,
                        nBc = void 0,
                        DRc = void 0;
                    if (bSc < 16) fNc[bSc] = p7c[R7c][bSc];
                    else {
                        LDc = (fNc[bSc - 15] >>> 7 | fNc[bSc - 15] << 25) ^ (fNc[bSc - 15] >>> 18 | fNc[bSc - 15] << 14) ^ fNc[bSc - 15] >>> 3;
                        ANc = (fNc[bSc - 2] >>> 17 | fNc[bSc - 2] << 15) ^ (fNc[bSc - 2] >>> 19 | fNc[bSc - 2] << 13) ^ fNc[bSc - 2] >>> 10;
                        fNc[bSc] = fNc[bSc - 16] + LDc + fNc[bSc - 7] + ANc;
                    }
                    ANc = (lRc >>> 6 | lRc << 26) ^ (lRc >>> 11 | lRc << 21) ^ (lRc >>> 25 | lRc << 7);
                    fBc = lRc & lHc ^ ~lRc & s3c;
                    ZTc = dwc + ANc + fBc + G7c[bSc] + fNc[bSc];
                    LDc = (LAc >>> 2 | LAc << 30) ^ (LAc >>> 13 | LAc << 19) ^ (LAc >>> 22 | LAc << 10);
                    nBc = LAc & hAc ^ LAc & QRc ^ hAc & QRc;
                    DRc = LDc + nBc;
                    dwc = s3c;
                    s3c = lHc;
                    lHc = lRc;
                    lRc = JTc + ZTc >>> 0;
                    JTc = QRc;
                    QRc = hAc;
                    hAc = LAc;
                    LAc = ZTc + DRc >>> 0;
                }
                ENc = ENc + LAc;
                rDc = rDc + hAc;
                H7c = H7c + QRc;
                UBc = UBc + JTc;
                fAc = fAc + lRc;
                Hgc = Hgc + lHc;
                TXc = TXc + s3c;
                xSc = xSc + dwc;
            }
            return [ENc >> 24 & 0xff, ENc >> 16 & 0xff, ENc >> 8 & 0xff, ENc & 0xff, rDc >> 24 & 0xff, rDc >> 16 & 0xff, rDc >> 8 & 0xff, rDc & 0xff, H7c >> 24 & 0xff, H7c >> 16 & 0xff, H7c >> 8 & 0xff, H7c & 0xff, UBc >> 24 & 0xff, UBc >> 16 & 0xff, UBc >> 8 & 0xff, UBc & 0xff, fAc >> 24 & 0xff, fAc >> 16 & 0xff, fAc >> 8 & 0xff, fAc & 0xff, Hgc >> 24 & 0xff, Hgc >> 16 & 0xff, Hgc >> 8 & 0xff, Hgc & 0xff, TXc >> 24 & 0xff, TXc >> 16 & 0xff, TXc >> 8 & 0xff, TXc & 0xff, xSc >> 24 & 0xff, xSc >> 16 & 0xff, xSc >> 8 & 0xff, xSc & 0xff];
        }

        function createDict() {
            let gcc = arguments;
            let Y5c = {};
            for (let lUc = 0; lUc < gcc.length; lUc += 2) Y5c[gcc[lUc]] = gcc[lUc + 1];
            return Y5c;
        }

        const TjF = "devicePixelRatio" in window && typeof window.devicePixelRatio !== "undefined" ? window.devicePixelRatio : -1;
        const hYF = getVoiceHash();

        return [createDict("fmh", ""), createDict("fmz", TjF ? TjF.toString() : ""), createDict("ssh", hYF || "")]
    }
    return getfwd();
}

async function hls() {
    const extensionCheck = !!window.chrome && !!window.chrome.runtime;
    const hasPrivateToken = window.Document.prototype.hasOwnProperty("hasPrivateToken") ? "1" : "0";
    return `${extensionCheck ? "0" : "-1"},,,${hasPrivateToken},`;
}

async function mst() {
    const pOc = parseInt(startTs / (2016 * 2016), 10);
    const sOc = parseInt(pOc / 23, 10);
    const IFF = parseInt(sOc / 6, 10);
    return { pOc, sOc, IFF };
}


async function per() {
    function permissionChecks() {
        // List of permissions to check
        let permissions = [
            "speaker",
            "device-info",
            "bluetooth",
            "ambient-light-sensor",
            "accelerometer",
            "gyroscope",
            "magnetometer",
            "clipboard",
            "accessibility-events"
        ];
        // If navigator.permissions is missing, return "8"
        if (!navigator.permissions) {
            return Promise.resolve("6");
        }
        // For each permission, query its status
        let results = [];
        let queries = permissions.map(function (name, idx) {
            return navigator.permissions.query({ name: name }).then(function (permStatus) {
                switch (permStatus.state) {
                    case "prompt":
                        results[idx] = 1;
                        break;
                    case "granted":
                        results[idx] = 2;
                        break;
                    case "denied":
                        results[idx] = 4;
                        break;
                    default:
                        results[idx] = 5;
                }
            }).catch(function () {
                results[idx] = "3";
                throw new Error("Permission query failed");
            });
        });
        // Wait for all queries to finish
        return Promise.all(queries).then(function () {
            return results.join("");
        }).catch(function () {
            return "7";
        });
    }

    return await permissionChecks();
}

async function pur() {
    return document.URL.replace(/\\|"/g, "");
}

async function s002() {
    const getPropertyDescriptor = (prop) => Object.getOwnPropertyDescriptor(navigator.__proto__, prop);
    const properties = ["plugins", "mimeTypes"];

    return properties.map((prop) => {
        const descriptor = getPropertyDescriptor(prop);
        if (descriptor && descriptor.get) {
            const code = descriptor.get.toString();
            return (code.includes("{ [native code] }") ? 0 : 1) + (code.includes("return") ? 2 : 0);
        }
        return -1;
    }).join("");
}

async function s003() {
    const descriptor = Object.getOwnPropertyDescriptor(document, "createElement");
    if (descriptor && descriptor.value) {
        const value = descriptor.value;
        return ((value.length === 1) ? 1 : 0) + ((value.name === "createElement") ? 2 : 0);
    }
    return 0;
}

async function s017() {
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const coarsePointer = window.matchMedia("(pointer:coarse)").matches;
    const smallScreen = window.matchMedia("(max-width: 767px)").matches;
    const portrait = window.matchMedia("(orientation: portrait)").matches;
    return `${touch ? 1 : 0},${coarsePointer ? 1 : 0},${smallScreen ? 1 : 0},${portrait ? 1 : 0}`;
}

async function s148() {
    const playwright = "__playwright__binding__" in window;
    return playwright ? Math.floor(Math.random() * (2999 - 1001 + 1)) + 1001 : Math.floor(Math.random() * (4999 - 3000 + 1)) + 3000;
}

async function s150() {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("capture", "user");
    return input.capture !== undefined ? Math.floor(Math.random() * 99) * 862 : -1;
}

async function s151() {
    const notificationDenied = window.Notification && window.Notification.permission === "denied";
    return notificationDenied ? Math.floor(Math.random() * 99) * 1024 : -1;
}

async function s153() {
    const applePay = window.ApplePayError || window.ApplePaySession;
    return applePay ? Math.floor(Math.random() * 499) + 1 : Math.floor(Math.random() * 999) + 500;
}

async function sde() {
    const seleniumCheck = window.$cdc_asdjflasutopfhvcZLmcfl_ || document.$cdc_asdjflasutopfhvcZLmcfl_ ? 1 : 0;
    const webdriverCheck = navigator.webdriver ? 1 : 0;
    return `${seleniumCheck},${webdriverCheck}`;
}

async function sww() {
    const date = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const languages = navigator.languages || [navigator.language];
    return { timezone, languages, date: date.toString() };
}

async function wsl() {
    function getRZF() {
        try {
            const rtt = navigator.connection.rtt.toString();
            let returnStr = "-1,-1,-1";
            if (window.performance && window.performance.memory) {
                const S3c = window.performance.memory;
                returnStr = "".concat(S3c.jsHeapSizeLimit, ",").concat(S3c.totalJSHeapSize, ",").concat(S3c.usedJSHeapSize);
            }
            const voices = window.speechSynthesis.getVoices();
            return "".concat(returnStr, ",").concat(rtt, ",").concat(voices.length);
        } catch (gSc) {
            return "-1,-1,-1,-1";
        }
    }

    function getpjF() {
        const enablePluginCheck = (function () {
            try {
                return navigator.plugins[0][0].enabledPlugin === navigator.plugins[0] ? "1" : "0";
            } catch (error) {
                return "-1";
            }
        })();

        const refreshPluginCheck = (function () {
            if (navigator && navigator.plugins && navigator.plugins.refresh) {
                try {
                    var Gp = Math.floor(Math.random() * 1000).toString();
                    navigator.plugins.refresh = Gp;
                    var fT = navigator.plugins.refresh === Gp;
                    return fT ? "1" : "0";
                } catch (bq) {
                    return -1;
                }
            } else {
                return "-1";
            }
        })();

        const firstPluginCheck = (function () {
            try {
                if (navigator.plugins && navigator.plugins[0]) {
                    var lz = navigator.plugins.item(4294967296) === navigator.plugins[0];
                    return lz ? "1" : "0";
                } else {
                    return "-1";
                }
            } catch (error) {
                return "-1";
            }
        })();

        return "".concat(enablePluginCheck, ",").concat(refreshPluginCheck, ",").concat(firstPluginCheck);
    }

    function getkjF() {
        try {
            var Ed = 0;
            var nl = Object.getOwnPropertyDescriptor(File.prototype, "path");
            if (nl) {
                Ed++;
                !!nl.get && nl.get.toString().indexOf("() { [native code] }") > -1 && Ed++;
            }
            return Ed.toString();
        } catch (kl) {
            return "-1";
        }
    }

    function getd1F() {
        if (!window.crossOriginIsolated) {
            return typeof window.SharedArrayBuffer === "undefined" ? "1" : "-2";
        }
        return "-1";
    }

    function getXOc() {
        var qg = "-1";
        try {
            qg = typeof window.PushManager !== "undefined" ? "1" : "0";
        } catch (Qt) {
            qg = "e";
            throw new Error(Qt);
        }
        return qg;
    }

    function getX1F() {
        var ps = "-1";
        try {
            ps = typeof window.Notification !== "undefined" ? "1" : "0";
        } catch (bb) {
            ps = "e";
        }
        return ps;
    }

    return "".concat(getRZF(), ",").concat(getpjF(), ",").concat(getkjF(), ",").concat(getd1F(), ",,,,,,,,,").concat(getXOc(), ",").concat(getX1F());
}

async function mouseEvents() {
    document.removeEventListener("mousemove", captureMouseEvent);
    document.removeEventListener("click", captureMouseEvent);
    const mouseEvents = {
        mouseData: mouseMoveDataString,
        moveCount: mouseMoveEventCount,
        clickCount: mouseClickCount,
        totalEvents: globalMouseEventCounter,
        checksum: checkSum
    }
    visualizeMouseData(mouseEvents.mouseData);
    return mouseEvents;
}

async function keyboardEvents() {
    document.removeEventListener("keydown", captureKeyboardEvent);
    document.removeEventListener("keyup", captureKeyboardEvent);
    document.removeEventListener("keypress", captureKeyboardEvent);
    return {
        normalKeys: keyboardData,
        sensitiveKeys: sensitiveKeyboardData,
        eventCount: keyEventCounter
    };
}

async function sharedWorkerTest_1() {
    function validateSharedWorkerEnvironment() {
        const checks = {
            sharedWorkerSupport: false,
            sharedArrayBufferCheck: false,
            crossOriginIsolation: false,
            workerGlobalScope: false
        };

        const errors = [];

        // Check 1: SharedWorker basic support
        try {
            checks.sharedWorkerSupport = typeof SharedWorker !== 'undefined';
            if (!checks.sharedWorkerSupport) {
                errors.push('SharedWorker is not supported in this browser');
            }
        } catch (e) {
            errors.push(`SharedWorker support check failed: ${e.message}`);
        }

        // Check 2: SharedArrayBuffer availability (from Tt_offset_27)
        try {
            if (!window.crossOriginIsolated) {
                checks.sharedArrayBufferCheck = typeof window.SharedArrayBuffer === 'undefined';
                if (checks.sharedArrayBufferCheck) {
                    // console.warn('SharedArrayBuffer check indicates suspicious environment');
                }
            } else {
                checks.crossOriginIsolation = true;
            }
        } catch (e) {
            errors.push(`SharedArrayBuffer check failed: ${e.message}`);
        }

        // Check 3: Cross-Origin-Isolation headers
        try {
            if (typeof window.crossOriginIsolated === 'undefined') {
                errors.push('Cross-origin isolation property is not available');
            }

            if (!window.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined') {
                console.warn('SharedArrayBuffer available without cross-origin isolation - potential security issue');
            }
        } catch (e) {
            errors.push(`Cross-origin isolation check failed: ${e.message}`);
        }

        // Check 4: Worker prototype chain validation
        try {
            if (typeof SharedWorker !== 'undefined') {
                // Check if SharedWorker constructor has expected properties
                if (!SharedWorker.prototype || !"port" in SharedWorker.prototype) {
                    errors.push('SharedWorker prototype is malformed or missing expected properties');
                }
                checks.workerGlobalScope = true;
            }
        } catch (e) {
            errors.push(`SharedWorker prototype validation failed: ${e.message}`);
        }

        // Check 5: Detection of automation frameworks using SharedWorker
        try {
            // Check for common automation tool signatures that might interfere with SharedWorker
            const automationSignatures = [
                'window.__nightmare',
                'window.cdc_adoQpoasnfa76pfcZLmcfl_Array',
                'window.__webdriver_evaluate',
                'window.__selenium_unwrapped',
                'window.callPhantom',
                'window.domAutomationController'
            ];

            for (const signature of automationSignatures) {
                const parts = signature.split('.');
                let obj = window;
                let found = true;

                for (let i = 1; i < parts.length; i++) {
                    if (obj && parts[i] in obj) {
                        obj = obj[parts[i]];
                    } else {
                        found = false;
                        break;
                    }
                }

                if (found && obj) {
                    errors.push(`Automation tool detected: ${signature}`);
                }
            }
        } catch (e) {
            if (e.message.includes('Automation tool detected')) {
                throw e;
            }
            // Non-critical error, log but don't throw
            console.warn(`Automation detection check warning: ${e.message}`);
        }

        // Check 6: Validate Worker instantiation capability
        try {
            // Create a minimal SharedWorker script as a blob to test instantiation
            const workerScript = `
      self.onconnect = function(e) {
        const port = e.ports[0];
        port.onmessage = function(event) {
          port.postMessage('pong');
        };
      };
    `;

            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);

            // Attempt to create SharedWorker
            const testWorker = new SharedWorker(workerUrl);

            // Test basic communication
            const testPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('SharedWorker communication timeout'));
                }, 1000);

                testWorker.port.onmessage = function (e) {
                    clearTimeout(timeout);
                    if (e.data === 'pong') {
                        resolve(true);
                    } else {
                        reject(new Error(`Unexpected SharedWorker response: ${e.data}; ERRORS - ${JSON.stringify(errors)}`));
                    }
                };

                testWorker.port.start();
                testWorker.port.postMessage('ping');
            });

            // Wait for test to complete
            testPromise.then(() => {
                URL.revokeObjectURL(workerUrl);
            }).catch((error) => {
                URL.revokeObjectURL(workerUrl);
                errors.push(`SharedWorker instantiation test failed: ${error.message}`);
            });

        } catch (e) {
            errors.push(`SharedWorker instantiation check failed: ${e.message}`);
        }

        // Return validation report
        return {
            passed: true,
            checks: checks,
            timestamp: Date.now(),
            errors: errors
        };
    }
    try {
        const validationResult = validateSharedWorkerEnvironment();
        console.log('All SharedWorker checks passed:', validationResult);
        return validationResult;
    } catch (error) {
        console.error('SharedWorker validation failed:', error.message);
        return error;
        // Handle the error appropriately for your application
    }
}

async function sharedWorkerTest_2() {
    /**
   * SharedWorker Detection for Automated Browser/Fingerprint Spoofing
   * This function tests if SharedWorker behavior is consistent with a real browser
   */
    async function detectSharedWorkerManipulation() {
        const RESULT_STATUS = {
            IOS_SKIP: 250,      // Skipped due to iOS detection
            SUCCESS: 200,       // Successfully completed test
            ERROR: 300          // Error occurred during test
        };

        /**
         * Check if running on iOS WebView or specific iOS conditions
         * These environments don't support SharedWorker normally
         */
        function isIOSEnvironment() {
            const userAgent = navigator.userAgent;

            // Check for iOS WebView (not Safari, not Chrome)
            const isIOSWebView = /(iPhone|iPad).*AppleWebKit(?!.*(Version|CriOS))/i.test(userAgent);

            // Check for iPad pretending to be Mac
            const isIPadAsMac = navigator.platform === 'MacIntel' &&
                navigator.maxTouchPoints > 1 &&
                /(Safari)/.test(userAgent) &&
                !window.MSStream &&
                typeof navigator.standalone !== 'undefined';

            if (!isIOSWebView && !isIPadAsMac) {
                return false;
            }

            // Additional checks for iOS
            const hasMediaDevices = Object.prototype.hasOwnProperty.call(Navigator.prototype, 'mediaDevices');
            const hasServiceWorker = Object.prototype.hasOwnProperty.call(Navigator.prototype, 'serviceWorker');
            const hasBrowserObj = !!window.browser;
            const hasServiceWorkerFunc = typeof window.ServiceWorker === 'function';
            const hasServiceWorkerContainer = typeof window.ServiceWorkerContainer === 'function';
            const hasServiceWorkerRegistration = typeof window.frames.ServiceWorkerRegistration === 'function';
            const isHTTP = window.location && window.location.protocol === 'http:';

            // iOS environment detected if these conditions are met
            return (isIOSWebView || isIPadAsMac) &&
                (!hasMediaDevices || !hasServiceWorker || !hasServiceWorkerFunc ||
                    !hasBrowserObj || !hasServiceWorkerContainer || !hasServiceWorkerRegistration) &&
                !isHTTP;
        }

        /**
         * Get high entropy user agent data (Client Hints API)
         */
        async function getUserAgentData() {
            const hints = [
                "brands", "mobile", "architecture", "bitness", "model",
                "platform", "platformVersion", "uaFullVersion", "wow64", "fullVersionList"
            ];

            if (!("userAgentData" in navigator)) {
                return null;
            }

            try {
                return await navigator.userAgentData.getHighEntropyValues(hints);
            } catch (e) {
                return null;
            }
        }

        /**
         * Test SharedWorker behavior - the core detection logic
         * This tests if SharedWorker creates Blob URLs correctly
         * 
         * @param {Window} targetWindow - Window object to test
         * @param {string} testType - Type of test ("blob")
         */
        async function testSharedWorker(targetWindow, testType) {
            return new Promise((resolve) => {
                try {
                    // Check if SharedWorker is available
                    if (typeof targetWindow.SharedWorker === 'undefined') {
                        resolve({ status: 'unavailable', value: -1 });
                        return;
                    }

                    // Create a minimal worker script
                    const workerScript = `
                    self.onconnect = function(e) {
                        var port = e.ports[0];
                        port.onmessage = function(event) {
                            port.postMessage('pong');
                        };
                        port.start();
                    };
                `;

                    // Create a Blob from the script
                    const blob = new Blob([workerScript], { type: 'application/javascript' });

                    // Create a Blob URL
                    const blobUrl = URL.createObjectURL(blob);

                    // Test 1: Check if Blob URL was created correctly
                    const hasBlobUrl = typeof blobUrl === 'string' && blobUrl.startsWith('blob:');

                    // Test 2: Try to create a SharedWorker with the Blob URL
                    let workerCreated = false;
                    let workerError = null;

                    try {
                        const worker = new targetWindow.SharedWorker(blobUrl);
                        workerCreated = true;

                        // Test 3: Check worker port
                        const hasPort = worker && worker.port;

                        // Clean up
                        if (worker && worker.port) {
                            worker.port.close();
                        }

                        URL.revokeObjectURL(blobUrl);

                        resolve({
                            status: 'success',
                            blobUrlValid: hasBlobUrl,
                            workerCreated: workerCreated,
                            hasPort: !!hasPort,
                            value: (hasBlobUrl ? 1 : 0) + (workerCreated ? 2 : 0) + (hasPort ? 4 : 0)
                        });

                    } catch (workerErr) {
                        URL.revokeObjectURL(blobUrl);
                        workerError = workerErr;

                        // Different browsers have different behaviors with Blob URL workers
                        // Some block it for security, which is normal behavior
                        resolve({
                            status: 'worker_error',
                            blobUrlValid: hasBlobUrl,
                            workerCreated: false,
                            errorType: workerErr.name,
                            errorMessage: workerErr.message,
                            // SecurityError is expected in some contexts
                            value: hasBlobUrl ? 1 : 0
                        });
                    }

                } catch (e) {
                    resolve({
                        status: 'error',
                        error: e.message,
                        value: -2
                    });
                }
            });
        }

        /**
         * Combine results from user agent data and SharedWorker tests
         */
        function combineResults(uaData, workerResult) {
            const result = {
                status: RESULT_STATUS.SUCCESS,
                data: {}
            };

            // Add user agent data if available
            if (uaData) {
                result.data.uaData = {
                    platform: uaData.platform,
                    platformVersion: uaData.platformVersion,
                    architecture: uaData.architecture,
                    bitness: uaData.bitness,
                    model: uaData.model,
                    mobile: uaData.mobile,
                    wow64: uaData.wow64
                };

                if (uaData.brands) {
                    result.data.brands = uaData.brands.map(b => `${b.brand}:${b.version}`).join(',');
                }
                if (uaData.fullVersionList) {
                    result.data.fullVersionList = uaData.fullVersionList.map(b => `${b.brand}:${b.version}`).join(',');
                }
            }

            // Add SharedWorker test results
            if (workerResult) {
                result.data.sharedWorker = {
                    status: workerResult.status,
                    blobUrlValid: workerResult.blobUrlValid,
                    workerCreated: workerResult.workerCreated,
                    value: workerResult.value
                };

                if (workerResult.errorType) {
                    result.data.sharedWorker.errorType = workerResult.errorType;
                }
            }

            return result;
        }

        // Main execution
        try {
            // Skip test on iOS environments
            if (isIOSEnvironment()) {
                return {
                    status: RESULT_STATUS.IOS_SKIP,
                    data: {},
                    reason: 'iOS environment detected'
                };
            }

            // Run tests in parallel
            const [uaData, workerResult] = await Promise.all([
                getUserAgentData(),
                testSharedWorker(window, "blob")
            ]);

            return combineResults(uaData, workerResult);

        } catch (error) {
            return {
                status: RESULT_STATUS.ERROR,
                data: {
                    error: error.stack ? error.stack.substring(0, 100) : String(error)
                }
            };
        }
    }

    // Test the function
    const result = await detectSharedWorkerManipulation();
    console.log('SharedWorker Detection Result:', JSON.stringify(result, null, 2));
    return result;
}

async function sharedWorkerTest_3() {
    /**
 * Akamai SharedWorker Detection - Accurate Reproduction
 * 
 * This code reproduces exactly what Akamai does to detect automated browsers.
 * The key insight: Real browsers handle CSP/Blob URL failures differently than automated ones.
 */

    // Helper to create key-value object (mimics KvN_offset_25)
    // function createObject(...args) {
    //     const obj = {};
    //     for (let i = 0; i < args.length; i += 2) {
    //         obj[args[i]] = args[i + 1];
    //     }
    //     return obj;
    // }

    // Helper to stringify values (mimics S92/DvN_offset_246)
    function stringifyValue(value) {
        if (value === null || value === undefined) {
            return null;
        }
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === 'object') {
            return value;
        }
        return value;
    }

    // Truncate error stack (mimics sw2_offset_62)
    function truncateError(errorStr) {
        if (typeof errorStr !== 'string') return errorStr;
        // Akamai truncates error messages
        return errorStr.substring(0, 100);
    }

    // Get current timestamp (mimics gx)
    function getTimestamp() {
        return performance.now();
    }

    /**
     * The SharedWorker inline script that Akamai injects
     * This is the minified blob content from the deobfuscated code
     */
    const SHARED_WORKER_SCRIPT = `(()=>{function t(r){return t="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},t(r)}function r(){"use strict";r=function(){return e};var e={},n=Object.prototype,o=n.hasOwnProperty,i=Object.defineProperty||function(t,r,e){t[r]=e.value},a="function"==typeof Symbol?Symbol:{},u=a.iterator||"@@iterator",c=a.asyncIterator||"@@asyncIterator",l=a.toStringTag||"@@toStringTag";function f(t,r,e){return Object.defineProperty(t,r,{value:e,enumerable:!0,configurable:!0,writable:!0}),t[r]}try{f({},"","")}catch(t){f=function(t,r,e){return t[r]=e}}function s(t,r,e,n){var o=r&&r.prototype instanceof v?r:v,a=Object.create(o.prototype),u=new j(n||[]);return i(a,"_invoke",{value:L(t,e,u)}),a}function h(t,r,e){try{return{type:"normal",arg:t.call(r,e)}}catch(t){return{type:"throw",arg:t}}}e.wrap=s;var p={};function v(){}function y(){}function d(){}var g={};f(g,u,(function(){return this}));var m=Object.getPrototypeOf,w=m&&m(m(N([])));w&&w!==n&&o.call(w,u)&&(g=w);var b=d.prototype=v.prototype=Object.create(g);function E(t){["next","throw","return"].forEach((function(r){f(t,r,(function(t){return this._invoke(r,t)}))}))}function x(r,e){function n(i,a,u,c){var l=h(r[i],r,a);if("throw"!==l.type){var f=l.arg,s=f.value;return s&&"object"==t(s)&&o.call(s,"__await")?e.resolve(s.__await).then((function(t){n("next",t,u,c)}),(function(t){n("throw",t,u,c)})):e.resolve(s).then((function(t){f.value=t,u(f)}),(function(t){return n("throw",t,u,c)}))}c(l.arg)}var a;i(this,"_invoke",{value:function(t,r){function o(){return new e((function(e,o){n(t,r,e,o)}))}return a=a?a.then(o,o):o()}})}function L(t,r,e){var n="suspendedStart";return function(o,i){if("executing"===n)throw new Error("Generator is already running");if("completed"===n){if("throw"===o)throw i;return{value:void 0,done:!0}}for(e.method=o,e.arg=i;;){var a=e.delegate;if(a){var u=_(a,e);if(u){if(u===p)continue;return u}}if("next"===e.method)e.sent=e._sent=e.arg;else if("throw"===e.method){if("suspendedStart"===n)throw n="completed",e.arg;e.dispatchException(e.arg)}else"return"===e.method&&e.abrupt("return",e.arg);n="executing";var c=h(t,r,e);if("normal"===c.type){if(n=e.done?"completed":"suspendedYield",c.arg===p)continue;return{value:c.arg,done:e.done}}"throw"===c.type&&(n="completed",e.method="throw",e.arg=c.arg)}}}function _(t,r){var e=r.method,n=t.iterator[e];if(void 0===n)return r.delegate=null,"throw"===e&&t.iterator.return&&(r.method="return",r.arg=void 0,_(t,r),"throw"===r.method)||"return"!==e&&(r.method="throw",r.arg=new TypeError("The iterator does not provide a '"+e+"' method")),p;var o=h(n,t.iterator,r.arg);if("throw"===o.type)return r.method="throw",r.arg=o.arg,r.delegate=null,p;var i=o.arg;return i?i.done?(r[t.resultName]=i.value,r.next=t.nextLoc,"return"!==r.method&&(r.method="next",r.arg=void 0),r.delegate=null,p):i:(r.method="throw",r.arg=new TypeError("iterator result is not an object"),r.delegate=null,p)}function O(t){var r={tryLoc:t[0]};1 in t&&(r.catchLoc=t[1]),2 in t&&(r.finallyLoc=t[2],r.afterLoc=t[3]),this.tryEntries.push(r)}function S(t){var r=t.completion||{};r.type="normal",delete r.arg,t.completion=r}function j(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(O,this),this.reset(!0)}function N(t){if(t){var r=t[u];if(r)return r.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var e=-1,n=function r(){for(;++e<t.length;)if(o.call(t,e))return r.value=t[e],r.done=!1,r;return r.value=void 0,r.done=!0,r};return n.next=n}}return{next:A}}function A(){return{value:void 0,done:!0}}return y.prototype=d,i(b,"constructor",{value:d,configurable:!0}),i(d,"constructor",{value:y,configurable:!0}),y.displayName=f(d,l,"GeneratorFunction"),e.isGeneratorFunction=function(t){var r="function"==typeof t&&t.constructor;return!!r&&(r===y||"GeneratorFunction"===(r.displayName||r.name))},e.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,d):(t.__proto__=d,f(t,l,"GeneratorFunction")),t.prototype=Object.create(b),t},e.awrap=function(t){return{__await:t}},E(x.prototype),f(x.prototype,c,(function(){return this})),e.AsyncIterator=x,e.async=function(t,r,n,o,i){void 0===i&&(i=Promise);var a=new x(s(t,r,n,o),i);return e.isGeneratorFunction(r)?a:a.next().then((function(t){return t.done?t.value:a.next()}))},E(b),f(b,l,"Generator"),f(b,u,(function(){return this})),f(b,"toString",(function(){return"[object Generator]"})),e.keys=function(t){var r=Object(t),e=[];for(var n in r)e.push(n);return e.reverse(),function t(){for(;e.length;){var n=e.pop();if(n in r)return t.value=n,t.done=!1,t}return t.done=!0,t}},e.values=N,j.prototype={constructor:j,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=void 0,this.done=!1,this.delegate=null,this.method="next",this.arg=void 0,this.tryEntries.forEach(S),!t)for(var r in this)"t"===r.charAt(0)&&o.call(this,r)&&!isNaN(+r.slice(1))&&(this[r]=void 0)},stop:function(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval},dispatchException:function(t){if(this.done)throw t;var r=this;function e(e,n){return a.type="throw",a.arg=t,r.next=e,n&&(r.method="next",r.arg=void 0),!!n}for(var n=this.tryEntries.length-1;n>=0;--n){var i=this.tryEntries[n],a=i.completion;if("root"===i.tryLoc)return e("end");if(i.tryLoc<=this.prev){var u=o.call(i,"catchLoc"),c=o.call(i,"finallyLoc");if(u&&c){if(this.prev<i.catchLoc)return e(i.catchLoc,!0);if(this.prev<i.finallyLoc)return e(i.finallyLoc)}else if(u){if(this.prev<i.catchLoc)return e(i.catchLoc,!0)}else{if(!c)throw new Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return e(i.finallyLoc)}}}},abrupt:function(t,r){for(var e=this.tryEntries.length-1;e>=0;--e){var n=this.tryEntries[e];if(n.tryLoc<=this.prev&&o.call(n,"finallyLoc")&&this.prev<n.finallyLoc){var i=n;break}}i&&("break"===t||"continue"===t)&&i.tryLoc<=r&&r<=i.finallyLoc&&(i=null);var a=i?i.completion:{};return a.type=t,a.arg=r,i?(this.method="next",this.next=i.finallyLoc,p):this.complete(a)},complete:function(t,r){if("throw"===t.type)throw t.arg;return"break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&r&&(this.next=r),p},finish:function(t){for(var r=this.tryEntries.length-1;r>=0;--r){var e=this.tryEntries[r];if(e.finallyLoc===t)return this.complete(e.completion,e.afterLoc),S(e),p}},catch:function(t){for(var r=this.tryEntries.length-1;r>=0;--r){var e=this.tryEntries[r];if(e.tryLoc===t){var n=e.completion;if("throw"===n.type){var o=n.arg;S(e)}return o}}throw new Error("illegal catch attempt")},delegateYield:function(t,r,e){return this.delegate={iterator:N(t),resultName:r,nextLoc:e},"next"===this.method&&(this.arg=void 0),p}},e}function e(t,r){(null==r||r>t.length)&&(r=t.length);for(var e=0,n=new Array(r);e<r;e++)n[e]=t[e];return n}function n(t,r,e,n,o,i,a){try{var u=t[i](a),c=u.value}catch(t){return void e(t)}u.done?r(c):Promise.resolve(c).then(n,o)}function o(t){return function(){var r=this,e=arguments;return new Promise((function(o,i){var a=t.apply(r,e);function u(t){n(a,o,i,u,c,"next",t)}function c(t){n(a,o,i,u,c,"throw",t)}u(void 0)}))}}onconnect=function(){var t=o(r().mark((function t(n){var i;return r().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return i=n.ports[0],t.t0=i,t.next=4,function(){var t=o(r().mark((function t(){var n,i,a,u,c,l,f,s,h,p,v,y,d,g,m,w,b,E,x,L;return r().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return u=function(){if(!("connection"in navigator))return null;var t=navigator.connection,r=t.effectiveType,e=t.rtt;return[r,0===e?0:e>0?-1:-2,t.type||"null"]},a=function(){return(a=o(r().mark((function t(){return r().wrap((function(t){for(;;)switch(t.prev=t.next){case 0:if("userAgentData"in navigator){t.next=2;break}return t.abrupt("return",null);case 2:return t.abrupt("return",navigator.userAgentData.getHighEntropyValues(["brands","mobile","architecture","bitness","model","platform","platformVersion","uaFullVersion","wow64","fullVersionList"]));case 3:case"end":return t.stop()}}),t)})))).apply(this,arguments)},i=function(){return a.apply(this,arguments)},n=function(){var t={},r={};try{var e=new OffscreenCanvas(0,0).getContext("webgl"),n=e.getExtension("WEBGL_debug_renderer_info");t={vendor:e.getParameter(n.UNMASKED_VENDOR_WEBGL),renderer:e.getParameter(n.UNMASKED_RENDERER_WEBGL)};var o=new OffscreenCanvas(0,0).getContext("webgl2"),i=o.getExtension("WEBGL_debug_renderer_info");r={vendor2:o.getParameter(i.UNMASKED_VENDOR_WEBGL),renderer2:o.getParameter(i.UNMASKED_RENDERER_WEBGL)}}finally{return{gpuVendor:t.vendor||null,gpuRenderer:t.renderer||null,gpu2Vendor:r.vendor2||null,gpu2Renderer:r.renderer2||null}}},t.next=6,Promise.all([i(),n()]).catch((function(){return[]}));case 6:return c=t.sent,O=2,l=function(t){if(Array.isArray(t))return t}(_=c)||function(t,r){var e=null==t?null:"undefined"!=typeof Symbol&&t[Symbol.iterator]||t["@@iterator"];if(null!=e){var n,o,i,a,u=[],c=!0,l=!1;try{if(i=(e=e.call(t)).next,0===r){if(Object(e)!==e)return;c=!1}else for(;!(c=(n=i.call(e)).done)&&(u.push(n.value),u.length!==r);c=!0);}catch(t){l=!0,o=t}finally{try{if(!c&&null!=e.return&&(a=e.return(),Object(a)!==a))return}finally{if(l)throw o}}return u}}(_,O)||function(t,r){if(t){if("string"==typeof t)return e(t,r);var n=Object.prototype.toString.call(t).slice(8,-1);return"Object"===n&&t.constructor&&(n=t.constructor.name),"Map"===n||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?e(t,r):void 0}}(_,O)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}(),f=l[0],s=l[1],h=u(),p=Intl.DateTimeFormat().resolvedOptions().timeZone,v=(new Date).toString(),y=navigator,d=y.oscpu,g=y.deviceMemory,m=y.hardwareConcurrency,w=y.language,b=y.languages,E=y.platform,x=y.userAgent,L=y.appVersion,t.abrupt("return",{ts:v,oscpu:d||null,tz:p,la:w,las:b,dm:g||null,hc:m,net:h,ua:x,av:L,pl:E,uad:f,gpu:s});case 15:case"end":return t.stop()}var _,O}),t)})));return function(){return t.apply(this,arguments)}}()();case 4:t.t1=t.sent,t.t0.postMessage.call(t.t0,t.t1),self.close();case 7:case"end":return t.stop()}}),t)})));return function(r){return t.apply(this,arguments)}}()})();`;

    /**
     * High entropy User Agent hints to request
     */
    const UA_HINTS = [
        "brands", "mobile", "architecture", "bitness", "model",
        "platform", "platformVersion", "uaFullVersion", "wow64", "fullVersionList"
    ];

    /**
     * Get network connection info
     */
    function getNetworkInfo() {
        if (!("connection" in navigator)) {
            return null;
        }
        const conn = navigator.connection;
        const effectiveType = conn.effectiveType;
        const rtt = conn.rtt;
        return [
            effectiveType,
            rtt === 0 ? 0 : (rtt > 0 ? -1 : -2),
            conn.type || "null"
        ];
    }

    /**
     * Get User Agent high entropy data
     */
    async function getUserAgentData(hints) {
        if (!("userAgentData" in navigator)) {
            return null;
        }
        try {
            return await navigator.userAgentData.getHighEntropyValues(hints);
        } catch (e) {
            return null;
        }
    }

    /**
     * Get GPU info via WebGL
     */
    function getGPUInfo() {
        const result = {
            gpuVendor: null,
            gpuRenderer: null,
            gpu2Vendor: null,
            gpu2Renderer: null
        };

        try {
            // WebGL 1
            const canvas1 = document.createElement('canvas');
            const gl1 = canvas1.getContext('webgl');
            if (gl1) {
                const debugInfo1 = gl1.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo1) {
                    result.gpuVendor = gl1.getParameter(debugInfo1.UNMASKED_VENDOR_WEBGL);
                    result.gpuRenderer = gl1.getParameter(debugInfo1.UNMASKED_RENDERER_WEBGL);
                }
            }

            // WebGL 2
            const canvas2 = document.createElement('canvas');
            const gl2 = canvas2.getContext('webgl2');
            if (gl2) {
                const debugInfo2 = gl2.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo2) {
                    result.gpu2Vendor = gl2.getParameter(debugInfo2.UNMASKED_VENDOR_WEBGL);
                    result.gpu2Renderer = gl2.getParameter(debugInfo2.UNMASKED_RENDERER_WEBGL);
                }
            }
        } catch (e) {
            // Ignore errors
        }

        return result;
    }

    /**
     * Collect data from main window context (ND2 function)
     * This runs in the main thread
     */
    async function collectWindowData(hints) {
        try {
            const startTime = performance.now();

            // Get User Agent data and GPU info in parallel
            const [uaData, gpuInfo] = await Promise.all([
                getUserAgentData(hints),
                Promise.resolve(getGPUInfo())
            ]).catch(() => [null, null]);

            const networkInfo = getNetworkInfo();
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const timestamp = new Date().toString();

            const nav = navigator;

            const endTime = performance.now();
            const runtime = Math.round(endTime - startTime);

            return {
                status: 0,
                data: {
                    ts: timestamp,
                    oscpu: nav.oscpu || null,
                    tz: timezone,
                    la: nav.language,
                    las: nav.languages,
                    dm: nav.deviceMemory || null,
                    hc: nav.hardwareConcurrency,
                    net: networkInfo,
                    ua: nav.userAgent,
                    av: nav.appVersion,
                    pl: nav.platform,
                    uad: uaData,
                    gpu: gpuInfo
                },
                runtime: runtime
            };
        } catch (e) {
            return {
                status: 290,
                data: {
                    error: truncateError(e.stack ? e.stack : String(e))
                }
            };
        }
    }

    /**
     * Test SharedWorker with Blob URL (tT2 function)
     * This is the KEY detection mechanism
     * 
     * @param {Window} targetWindow - Window to test
     * @param {string} mode - "blob" for blob URL test
     */
    function testSharedWorker(targetWindow, mode) {
        return new Promise((resolve) => {
            try {
                let runtime = 0;
                let worker;

                // Get SharedWorker constructor
                const SharedWorkerCtor = targetWindow ? targetWindow.SharedWorker : window.SharedWorker;

                // Check 1: SharedWorker exists
                if (!SharedWorkerCtor) {
                    return resolve({
                        status: 260,
                        data: {},
                        runtime: -1
                    });
                }

                // Check 2: SharedWorker.prototype.constructor.name === "SharedWorker"
                // This detects if SharedWorker has been tampered with
                if (SharedWorkerCtor.prototype.constructor.name !== "SharedWorker") {
                    return resolve({
                        status: 260,
                        data: {},
                        runtime: -1
                    });
                }

                const startTime = getTimestamp();

                if (mode === "blob") {
                    // Create SharedWorker from Blob URL
                    // This is where CSP can block it
                    const blob = new Blob(
                        [SHARED_WORKER_SCRIPT],
                        { type: "application/javascript" }
                    );
                    const blobUrl = URL.createObjectURL(blob);

                    try {
                        worker = new SharedWorkerCtor(blobUrl);
                    } catch (e) {
                        // CSP blocks Blob URLs for workers
                        // In genuine browsers, this might fail silently or with specific error
                        // In automated browsers, the error is captured differently
                        return resolve({
                            status: 300,
                            data: {
                                error: truncateError(e.stack ? e.stack : String(e))
                            },
                            runtime: -1
                        });
                    }
                } else {
                    // Direct URL mode
                    worker = new SharedWorkerCtor(mode);
                }

                worker.port.start();
                runtime = getTimestamp() - startTime;

                // Listen for message from worker
                worker.port.onmessage = function (event) {
                    worker.port.close();
                    resolve({
                        status: 0,
                        data: event.data,
                        runtime: Math.round(runtime)
                    });
                };

                // Timeout after 2 seconds
                setTimeout(function () {
                    resolve({
                        status: 280,
                        data: {},
                        runtime: Math.round(runtime)
                    });
                }, 2000);

            } catch (e) {
                // Capture any error
                return resolve({
                    status: 300,
                    data: {
                        error: truncateError(e.stack ? e.stack : String(e))
                    },
                    runtime: -1
                });
            }
        });
    }

    /**
     * Combine results from window data and SharedWorker test (K22 function)
     * This creates the sww object structure
     */
    function combineResults(windowResult, workerResult) {
        const IT2 = ["ts", "oscpu", "tz", "la", "las", "dm", "hc", "net", "ua", "av", "pl"];
        const M92 = ["gpuVendor", "gpuRenderer", "gpu2Vendor", "gpu2Renderer"];

        const result = {};
        let fieldIndex = 25;

        // Add runtime values
        if (typeof workerResult.runtime !== "undefined") {
            result.swrt = workerResult.runtime;  // SharedWorker runtime
        }
        if (windowResult.runtime) {
            result.wrt = windowResult.runtime;   // Window runtime
        }

        // If window data collection succeeded
        if (windowResult.status === 0) {
            // Add basic navigator/environment data
            // s025-s046: Alternating window data and worker data
            for (const field of IT2) {
                result[`s0${fieldIndex}`] = stringifyValue(windowResult.data[field]);
                fieldIndex += 1;

                if (workerResult.status === 0) {
                    result[`s0${fieldIndex}`] = stringifyValue(workerResult.data[field]);
                }
                fieldIndex += 1;
            }

            // s047-s066: User Agent Client Hints data
            fieldIndex = 47;
            const windowUAD = windowResult.data.uad;
            const workerUAD = workerResult.data ? workerResult.data.uad : null;

            for (const hint of UA_HINTS) {
                if (windowUAD) {
                    result[`s0${fieldIndex}`] = stringifyValue(windowUAD[hint]);
                }
                fieldIndex += 1;

                if (workerResult.status === 0 && workerUAD) {
                    result[`s0${fieldIndex}`] = stringifyValue(workerUAD[hint]);
                }
                fieldIndex += 1;
            }

            // s067-s074: GPU data
            fieldIndex = 67;
            for (const gpuField of M92) {
                result[`s0${fieldIndex}`] = stringifyValue(windowResult.data.gpu[gpuField]);
                fieldIndex += 1;

                if (workerResult.status === 0) {
                    result[`s0${fieldIndex}`] = stringifyValue(workerResult.data.gpu[gpuField]);
                }
                fieldIndex += 1;
            }
        }

        // Add error messages if present
        if (windowResult.data && windowResult.data.error) {
            result.windowScopeError = windowResult.data.error;
        }
        if (workerResult.data && workerResult.data.error) {
            result.sharedWorkerInlineError = workerResult.data.error;
        }

        return {
            status: windowResult.status || workerResult.status,
            data: result
        };
    }

    /**
     * Main detection function (XG2)
     * Run this to see the detection results
     */
    async function runSharedWorkerDetection() {
        console.log("=".repeat(60));
        console.log("AKAMAI SharedWorker Detection Test");
        console.log("=".repeat(60));

        try {
            // Run both tests in parallel
            const [windowResult, workerResult] = await Promise.all([
                collectWindowData(UA_HINTS),
                testSharedWorker(window, "blob")
            ]);

            console.log("\n--- Window Data Collection Result ---");
            console.log("Status:", windowResult.status);
            console.log("Runtime:", windowResult.runtime, "ms");
            if (windowResult.data.error) {
                console.log("Error:", windowResult.data.error);
            }

            console.log("\n--- SharedWorker Test Result ---");
            console.log("Status:", workerResult.status);
            console.log("Runtime (swrt):", workerResult.runtime, "ms");
            if (workerResult.data && workerResult.data.error) {
                console.log("Error:", workerResult.data.error);
            }

            // Combine results
            const finalResult = combineResults(windowResult, workerResult);

            console.log("\n--- Combined Result (sww object) ---");
            console.log("Status:", finalResult.status);

            // Key detection fields
            console.log("\n🔍 KEY DETECTION SIGNALS:");
            console.log("  swrt (SharedWorker runtime):", finalResult.data.swrt);
            console.log("  wrt (Window runtime):", finalResult.data.wrt);

            if (finalResult.data.sharedWorkerInlineError) {
                console.log("\n⚠️ DETECTION FLAG: sharedWorkerInlineError present!");
                console.log("  Error:", finalResult.data.sharedWorkerInlineError);
            }

            if (finalResult.data.windowScopeError) {
                console.log("\n⚠️ DETECTION FLAG: windowScopeError present!");
                console.log("  Error:", finalResult.data.windowScopeError);
            }

            // Check for cross-validation mismatches
            console.log("\n--- Cross-Validation Check ---");
            const oddKeys = Object.keys(finalResult.data).filter(k => k.match(/^s0\d+$/) && parseInt(k.slice(2)) % 2 === 1);
            const evenKeys = Object.keys(finalResult.data).filter(k => k.match(/^s0\d+$/) && parseInt(k.slice(2)) % 2 === 0);

            console.log("Window data fields (even):", evenKeys.length);
            console.log("Worker data fields (odd):", oddKeys.length);

            // If worker succeeded, check for mismatches
            if (workerResult.status === 0) {
                let mismatches = 0;
                for (let i = 25; i < 75; i += 2) {
                    const windowVal = JSON.stringify(finalResult.data[`s0${i}`]);
                    const workerVal = JSON.stringify(finalResult.data[`s0${i + 1}`]);
                    if (windowVal !== workerVal && windowVal && workerVal) {
                        mismatches++;
                        console.log(`  Mismatch at s0${i}/s0${i + 1}:`, windowVal, "vs", workerVal);
                    }
                }
                console.log("Total mismatches:", mismatches);
            }

            console.log("\n--- Full sww Object ---");
            console.log(JSON.stringify(finalResult.data, null, 2));

            return finalResult;

        } catch (e) {
            console.error("Detection failed:", e);
            return {
                status: 300,
                data: {
                    error: truncateError(e.stack ? e.stack : String(e))
                }
            };
        }
    }

    // Run the detection
    return await runSharedWorkerDetection();
}