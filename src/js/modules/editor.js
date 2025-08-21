"use strict";

import { default_tools } from "/js/modules/default_tools.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";


//#region    ----------------------------------------------- TOOL -----------------------------------------------

class Tool {
    constructor(name, init) {
        // TODO: improve object making some attributes read-only
        // TODO: add type checks

        this.name = name;
        this.eventListeners = {}; // key: event name; value: handler method
        this._init = init;

        this.select   = () => {};
        this.deselect = () => {};
    };

    init() {
        this._init(this);
    };

    handleEvent(eventID, data) {
        if (eventID in this.eventListeners) {
            this.eventListeners[eventID](data);
        };
    };

    registerHandler(eventID, handler) {
        this.eventListeners[eventID] = handler;
    };

    removeHandler(eventID) {
        delete this.eventListeners[eventID];
    };
}

//#endregion ----------------------------------------------- TOOL -----------------------------------------------


//#region    ------------------------------------------- ENVIRONMENT --------------------------------------------

class Environment {
    constructor() {
        // TODO: improve object making some attributes read-only
        // TODO: add type checks

        this.ui_elements = {
            mainContainer:  null,
            svgElement:     null,
            svgCanvas:      null,
            svgDefs:        null,
            coordContainer: null,
        };
        this.activeTool = null;
        this.tools   = {}; // key: tool name; value: tool init handler
        this.plugins = {};
    };

    //#region    --------------------- TOOLS ----------------------

    registerTool(toolName, toolHandler) {
        if ((typeof toolName !== "string") || (typeof toolHandler !== "function")) return false;

        this.tools[toolName] = new Tool(toolName, toolHandler);
        this.tools[toolName].init();
        return true;
    };

    selectTool(toolName) {
        if (toolName in this.tools) {
            if ((this.activeTool != null) && (this.activeTool in this.tools)) {
                this.tools[toolName].deselect();
            };

            // trigger activation handler
            this.tools[toolName].select(this);
            this.activeTool = toolName;
            return true;
        };

        return false;
    };

    listTools() {
        return Object.keys(this.tools);
    };

    //#endregion --------------------- TOOLS ----------------------


    //#region    --------------------- EVENTS ---------------------

    handleEvent(eventID, data) {
        // TODO: define more events
        /*
            Accepted events:
            - mouse
                - click
                - drag
                - down
                - up
            - key
                - press
                - down
                - up
        */
        if ((this.activeTool != null) && (this.activeTool in this.tools)) {
            this.tools[this.activeTool].handleEvent(eventID, data);
            return true;
        };

        return false;
    };

    //#endregion --------------------- EVENTS ---------------------
};

// variable holding volatile session data to be shared
const ENVIRONMENT = new Environment();

//#endregion ------------------------------------------- ENVIRONMENT --------------------------------------------


//#region    -------------------------------------------- UTILITIES ---------------------------------------------

function _log(msg, ...args) {
    console.log(`[ EDITOR ] ${msg.trim()}`, ...args);
};

function degToRad(angle) {
    if (typeof angle !== "number") return null;
    return angle * (Math.PI / 180);
};

function radToDeg(angle) {
    if (typeof angle !== "number") return null;
    return angle * (180 / Math.PI);
};

function clamp(min, max, number) {
    if ((typeof min !== "number") || (typeof max !== "number") || (typeof number !== "number")) return null;
    return Math.min(max, Math.max(min, number));
};

function createSVGElement(elementName) {
    return document.createElementNS(SVG_NAMESPACE, elementName);
}

function setMultipleAttributes(element, attrs) {
    if (!(element instanceof Element)) return;
    if (attrs?.constructor !== Object) return;

    for (const [key, val] of Object.entries(attrs)) {
        if (typeof val !== "string") continue;
        element.setAttribute(key, val)
    };
}

//#endregion ------------------------------------------ END UTILITIES -------------------------------------------


//#region    -------------------------------------------- LISTENERS ---------------------------------------------

function mouseDragHandler(evt) {
    // TODO: make this work
    // TODO: make this listener not trigger the click
    console.log("drag")
};

function mouseClickInitHandler(evt) {
    if (evt.buttons == 4) { // MMB
        ENVIRONMENT.ui_elements.svgElement.addEventListener("mousemove", mouseDragHandler);
    } else if (evt.buttons === 1) { // LMB
        let evtData = {
            element: (evt.target == ENVIRONMENT.ui_elements.svgElement) ? null : evt.target,
            originalEvent: evt,
        };
        ENVIRONMENT.handleEvent("mouse::click", evtData);
    };
};

function mouseClickStopHandler(evt) {
    ENVIRONMENT.ui_elements.svgElement.removeEventListener("mousemove", mouseDragHandler);
}

function mouseScrollHandler(evt) {
    if (evt.shiftKey) { // SHIFT + SCROLL

    } else { // normal scroll

    };
};

//#endregion ------------------------------------------ END LISTENERS -------------------------------------------


function updateCanvasTransform() {
    if (!(ENVIRONMENT.ui_elements.svgCanvas instanceof Element)) return;
    ENVIRONMENT.ui_elements.svgCanvas.setAttribute(
        "transform",
        `translate(${appSettings.canvas.offsetX}, ${appSettings.canvas.offsetY}) scale(${appSettings.canvas.zoom})`
    );
};


//#region    ----------------------------------------- EXPOSED METHODS ------------------------------------------

export function listTools() {
    if (!(ENVIRONMENT instanceof Environment)) return null;

    return ENVIRONMENT.listTools();
};

export function selectTool(toolName) {
    if (!(ENVIRONMENT instanceof Environment)) return false;

    return ENVIRONMENT.selectTool(toolName);
};

export function registerTool(toolName, toolHandler) {
    if (!(ENVIRONMENT instanceof Environment)) return false;

    return ENVIRONMENT.registerTool(toolName, toolHandler);
};

export function init(element) {
    if (typeof element === "string") element = document.querySelector(element);
    if (!(element instanceof Element)) return;

    element.innerHTML = ""; // empty

    //#region    ---------------- STRUCTURAL INIT -----------------

    const svgElement      = createSVGElement("svg");
    const svgCanvas       = createSVGElement("g");
    const svgDefs         = createSVGElement("defs");
    const coordsContainer = document.createElement("div"); // TODO: FINISH

    /*<div class="coords-container" data-mrd-ui-element="coords-container">
        <span>x:</span><span class="text-pull-right" data-mrd-ui-element="x-coord">0</span>
        <span>y:</span><span class="text-pull-right" data-mrd-ui-element="y-coord">0</span>
        <span>zoom:</span><span class="text-pull-right" data-mrd-ui-element="zoom-value">1</span>
    </div>*/

    setMultipleAttributes(
        element,
        {
            "data-editor-element": "editor-main-container",
        }
    );

    setMultipleAttributes(
        svgElement,
        {
            "data-editor-element": "editor-main-SVG",
            "preserveAspectRatio": "xMinYMin",
            "width" : "100%",
            "height": "100%",
        },
    );

    setMultipleAttributes(
        svgCanvas,
        {
            "data-editor-element": "editor-SVG-canvas",
        }
    );

    setMultipleAttributes(
        svgDefs,
        {
            "data-editor-element": "editor-SVG-defs",
        }
    );

    svgElement.append(svgDefs, svgCanvas);
    element.append(svgElement);

    ENVIRONMENT.ui_elements.mainContainer  = element;
    ENVIRONMENT.ui_elements.svgElement     = svgElement;
    ENVIRONMENT.ui_elements.svgCanvas      = svgCanvas;
    ENVIRONMENT.ui_elements.svgDefs        = svgDefs;
    ENVIRONMENT.ui_elements.coordContainer = coordContainer;

    //#endregion -------------- END STRUCTURAL INIT ---------------

    _log("UI init done");

    //#region    ----------------- LISTENERS INIT -----------------

    for (const [toolName, toolHandler] of Object.entries(default_tools)) {
        ENVIRONMENT.registerTool(toolName, toolHandler);
    };

    // BASE LISTENERS
    // all listeners should relay some events to selected tools
    // NOTE: use click instead of up so it will only trigger if the click started in the container
    svgElement.addEventListener("mousedown", mouseClickInitHandler); // on mouse down
    svgElement.addEventListener("click",     mouseClickStopHandler); // on mouse up
    svgElement.addEventListener("mouseout",  mouseClickStopHandler); // add this to avoid errors
    svgElement.addEventListener("wheel",     mouseScrollHandler   ); // scroll wheel

    // TODO: remove
    ENVIRONMENT.selectTool("select");

    //#endregion --------------- END LISTENERS INIT ---------------
};

//#endregion --------------------------------------- END EXPOSED METHODS ----------------------------------------

/*
NOTES:
- tools have a single method that is used to initialize it, set listeners, etc
- listeners are not JS official ones, they're custom ones
- the editor relays events to the current selected item that has subscribed to that event
*/
