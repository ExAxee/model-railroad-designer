(function (){
    let INIT_DONE = false;

    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

    const UI_ELEMENTS = {
        svgContainer:             undefined,
        defsContainer:            undefined,
        canvas:                    undefined,
        defaultObjectsContainer: undefined,
        coordContainer: {
            x:    undefined,
            y:    undefined,
            zoom: undefined,
        }
    };

    const appSettings = {
        canvas: {
            zoom:     1,
            width:    1000,
            height:   500,
            offsetX: 0,
            offsetY: 0,
        },
        viewport: {
            x: 0,
            y: 0,
            width:  200,
            height: 100,
        },
        controls: {
            selectThreshold: 25,
        },
    };

    const appData = {
        gauge: 16.5, // H0 scale is 16.5mm, so 1 SVG unit = 1mm
        sleeperDistance: 7,
        objects: [],
        tracks: [
            {
                start:  [10, 10],
                end:    [60, 10],
                radius: 0,
                selected: false,
            },
            {
                start:  [50, 50],
                end:    [70, 70],
                radius: 25,
                selected: false,
            }
        ],
    };


    //#region    -------------------------------------------- UTILITIES ---------------------------------------------

    function degToRad(angle) {
        return angle * (Math.PI / 180);
    };

    function radToDeg(angle) {
        return angle * (180 / Math.PI);
    };

    function clamp(min, max, number) {
        return Math.min(max, Math.max(min, number));
    };

    function createSVGElement(elementName) {
        return document.createElementNS(SVG_NAMESPACE, elementName);
    }

    //#endregion ------------------------------------------ END UTILITIES -------------------------------------------


    //#region    ------------------------------------------ EVENT HANDLERS ------------------------------------------

    function handleMouseScroll(event) {
        let zoomIncrement = Math.sign(event.wheelDeltaY)*0.1; // +/- 0.1
        appSettings.canvas.zoom = parseFloat(
            clamp(0.1, 15, appSettings.canvas.zoom + zoomIncrement).toFixed(1)
        );
        updateCanvasTransform();
        updateZoomView();
    };

    function handleMouseMovement(event) {
        //console.log(event)

        if (event.shiftKey && event.buttons === 1) {
            // handle drag
            appSettings.canvas.offsetX += event.movementX;
            appSettings.canvas.offsetY += event.movementY;
            updateCanvasTransform();
        };

        updateCoordinateView(event.offsetX, event.offsetY);
    };

    function handleMouseClick(event) {
        let modifierFlags = event.shiftKey << 3 | event.ctrlKey << 2 | event.altKey;

        console.log(event)

        if ((modifierFlags == 0b000) && (event.buttons === 1)) { // primary click no modifiers
            appData.tracks.every(trackData => {
                let centerX, centerY, mouseX, mouseY, distance;

                centerX = trackData.start[0] + (trackData.end[0] - trackData.start[0]) / 2;
                centerY = trackData.start[1] + (trackData.end[1] - trackData.start[1]) / 2;
                mouseX  = (event.offsetX - appSettings.canvas.offsetX) / appSettings.canvas.zoom;
                mouseY  = (event.offsetY - appSettings.canvas.offsetY) / appSettings.canvas.zoom;
                distance = Math.sqrt(Math.pow(centerX - mouseX, 2) + Math.pow(centerY - mouseY, 2));

                console.log(centerX, centerY)
                console.log(mouseX, mouseY)
                console.log("distance", distance, trackData)

                if (distance <= appSettings.controls.selectThreshold) {
                    console.log("selected", trackData)
                    trackData.selected = true;
                    draw();
                    return false;
                };

                return true;
            });
        };
    };

    //#endregion ---------------------------------------- END EVENT HANDLERS ----------------------------------------


    //#region    ----------------------------------------- DRAWING FUNCTIONS ----------------------------------------

    function generateTrackObjectData(trackData) {
        let trackContainer,
            track;

        trackContainer = createSVGElement("g")
        trackContainer.setAttribute("id", trackData.objectId);

        if (trackData?.radius > 0) {
            // generate curve
            track = createSVGElement("path");

            track.setAttribute(
                "d",
                `M${trackData.start[0]},${trackData.start[1]} A${trackData.radius},${trackData.radius},0,0,1,${trackData.end[0]},${trackData.end[1]}`
            );
        } else {
            // generate straight track
            track = createSVGElement("line");

            track.setAttribute("x1", trackData.start[0]);
            track.setAttribute("y1", trackData.start[1]);
            track.setAttribute("x2", trackData.end[0]);
            track.setAttribute("y2", trackData.end[1]);
        };

        trackContainer.append(track);

        if (trackData.selected) {
            let highlight = createSVGElement("rect");

            highlight.setAttribute("x", trackData.start[0]);
            highlight.setAttribute("y", trackData.start[1]);
            highlight.setAttribute("width",  trackData.end[0] - trackData.start[0]);
            highlight.setAttribute("height", trackData.end[1] - trackData.start[1]);

            trackContainer.append(highlight);
        };

        return trackContainer;
    };

    function draw() {
        // use requestAnimationFrame to change everything before the redraw to optimize performance

        // TODO: add support for objects that are comples, E.G. a switch that's made of a curve and a straight line

        // draw everything in the defs tag, then use the "use" tag to shift everything
        for (const trackData of appData.tracks) {
            let objectId, trackObject;

            // generate svg text that uses the "use" tag
            objectId = trackData?.objectId || window.crypto.randomUUID();
            trackData.objectId = objectId;

            trackObject = generateTrackObjectData(trackData);

            // track_object.setAttribute("x", track_data.start[0]);
            // track_object.setAttribute("y", track_data.start[1]);
            trackObject.setAttribute("stroke", "#000000");
            trackObject.setAttribute("fill", "none");

            UI_ELEMENTS.main_canvas.append(trackObject);
        };
    };

    //#endregion --------------------------------------- END DRAWING FUNCTIONS --------------------------------------


    function resizeCanvasAspectRatio() {
        UI_ELEMENTS.svgContainer.setAttribute(
            "viewBox",
            `${appSettings.viewport.x} ${appSettings.viewport.y} ${appSettings.viewport.width} ${appSettings.viewport.height}`
        );
    };

    function updateCanvasTransform() {
        UI_ELEMENTS.canvas.setAttribute(
            "transform",
            `translate(${appSettings.canvas.offsetX}, ${appSettings.canvas.offsetY}) scale(${appSettings.canvas.zoom})`
        );
    };

    function updateCoordinateView(viewportX, viewportY) {
        UI_ELEMENTS.coordContainer.x.innerHTML = Math.round((viewportX - appSettings.canvas.offsetX) / appSettings.canvas.zoom);
        UI_ELEMENTS.coordContainer.y.innerHTML = Math.round((viewportY - appSettings.canvas.offsetY) / appSettings.canvas.zoom);
    };

    function updateZoomView() {
        UI_ELEMENTS.coordContainer.zoom.innerHTML = appSettings.canvas.zoom;
    };


    //#region    ----------------------------------------- EXPOSED METHODS ------------------------------------------

    function _init() {
        console.log("INIT")
        if (INIT_DONE) return;

        let startingX, startingY, startingZoom;
        startingX    = undefined || 0;
        startingY    = undefined || 0;
        startingZoom = undefined || 1;

        let mainSvgElement = document.querySelector("svg[data-mrd-ui-element='main-svg']");
        let defsContainer  = document.querySelector("defs[data-mrd-ui-element='object-definition-container']");
        let mainCanvas     = document.querySelector("g[data-mrd-ui-element='main-canvas']");

        let xValue    = document.querySelector("span[data-mrd-ui-element='x-coord']");
        let yValue    = document.querySelector("span[data-mrd-ui-element='y-coord']");
        let zoomValue = document.querySelector("span[data-mrd-ui-element='zoom-value']");

        UI_ELEMENTS.svgContainer            = mainSvgElement;
        UI_ELEMENTS.defsContainer           = defsContainer;
        UI_ELEMENTS.canvas                  = mainCanvas;
        UI_ELEMENTS.defaultObjectsContainer = defsContainer;

        UI_ELEMENTS.coordContainer.x    = xValue;
        UI_ELEMENTS.coordContainer.y    = yValue;
        UI_ELEMENTS.coordContainer.zoom = zoomValue;

        mainSvgElement.addEventListener("wheel",     handleMouseScroll);
        mainSvgElement.addEventListener("mousedown", handleMouseClick);
        mainSvgElement.addEventListener("mousemove", handleMouseMovement);

        INIT_DONE = true;
    };

    function _selectTool() {
        if (!INIT_DONE) return;

    };

    function _import() {
        if (!INIT_DONE) return;

    };

    function _export() {
        if (!INIT_DONE) return;

    };

    //#endregion --------------------------------------- END EXPOSED METHODS ----------------------------------------

    window.mrd = { // ModelRailroadDesigner
        init:        _init,

        select_tool: _selectTool,

        import:      _import,
        export:      _export,
    };
})();

/*
Drawing pipeline:
    1. draw everything
    2. listen for events
        2.1 mark objects for redraw (count new elements)
        2.2 redraw only marked objects
*/

/*
TODO:
    [x] fix coordinates shifted based on zoom (apply effects of zoom on coordinates)
    [x] use svg nesting instead of spamming "use" tag, so that it's easier to manage them -> isn't doable, svg cuts image and ruins it
    [ ] add zoom to zoom on mouse position https://stackoverflow.com/questions/60190965/zoom-scale-at-mouse-position
    [ ] use hitbox for click triggering
    [ ] improve draw function to not duplicate objects but instead draw only updated ones
    [ ] add drag (area) selection
    [ ] add function to move objects (one or more)
    [ ] add snapping
    [ ] add basic drawings
    [ ] add functioning canvas settings
    [ ] add settings/data saving in local storage
    [ ] add data (and settings) exporting (json)
    [ ] add auto optimizer of tracks (multiple segments become one)
*/

/*
Project structure: {
    name
    gauge
    sleeper-distance
    objects[] -> switches, straight segments, curves, etc
    tracks[]  -> dynamic tracks/curves, objects are a group of tracks
}

local storage structure: {
    last_open_project_data -> name, position, etc
    app_settings
    projects[]
}
*/

/*
function show_window(window_content, window_title, control_bar_content) {
    let floating_window, close_button, content_container, title_bar, control_bar;

    floating_window = $(`
        <div class="floating-window" data-window-title="${window_title}" style="top: 0; left: 0">
            <div class="row expanded floating-window-title-bar" name="title-bar">
                <span name="window-title">${window_title}</span>
                <span name="close-button">X</span>
            </div>
            <hr>
            <div class="floating-window-content" name="content"></div>
            <div class="floating-window-controls" name="controls"></div>
        </div>
    `);

    content_container = floating_window.find("*[name='content']");
    title_bar         = floating_window.find("*[name='title-bar']");
    control_bar       = floating_window.find("*[name='controls'");

    close_button = title_bar.find("*[name='close-button']");

    // LISTENERS
    // #region
    close_button.on("click", () => {
        floating_window.remove();
    });

    title_bar.on("mousedown", (event) => {
        let mouse_x,         mouse_y,
            window_css_left, window_css_top,
            window_width,    window_height,
            container_width, container_height,
            mouse_relative_to_window_x, mouse_relative_to_window_y;

        mouse_x = event.clientX;
        mouse_y = event.clientY;

        window_css_left = floating_window.css("left").replace("px", "");
        window_css_top  = floating_window.css("top").replace("px", "");

        window_width  = floating_window.outerWidth();
        window_height = floating_window.outerHeight();

        container_width  = floating_window.parent().width();
        container_height = floating_window.parent().height();

        floating_window.addClass("floating-window-moving");

        mouse_relative_to_window_x = mouse_x - window_css_left;
        mouse_relative_to_window_y = mouse_y - window_css_top;

        $(document).off("mousemove").on("mousemove", (event) => {
            let mouse_x, mouse_y, delta_x, delta_y;

            mouse_x = event.clientX;
            mouse_y = event.clientY;

            delta_x = mouse_x - mouse_relative_to_window_x;
            delta_y = mouse_y - mouse_relative_to_window_y;

            if (delta_x < 0) delta_x = 0;
            if (delta_y < 0) delta_y = 0;

            if (delta_x + window_width > container_width)   delta_x = container_width - window_width;
            if (delta_y + window_height > container_height) delta_y = container_height - window_height;

            floating_window.css("left", delta_x);
            floating_window.css("top",  delta_y);
        });
    });

    title_bar.on("mouseup", () => {
        floating_window.removeClass("floating-window-moving");
        $(document).off("mousemove");
    });
    // #endregion

    // CONTENT ADDING
    content_container.append(window_content);
    control_bar.append(control_bar_content);

    $("body").append(floating_window);
};
*/
