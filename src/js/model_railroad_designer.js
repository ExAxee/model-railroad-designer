(function (){
    let INIT_DONE = false;

    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

    const UI_ELEMENTS = {
        svg_container:             undefined,
        defs_container:            undefined,
        canvas:                    undefined,
        default_objects_container: undefined,
        coord_container: {
            x:    undefined,
            y:    undefined,
            zoom: undefined,
        }
    };

    const app_settings = {
        "canvas": {
            "zoom":     1,
            "width":    1000,
            "height":   500,
            "offset_x": 0,
            "offset_y": 0,
        },
        "viewport": {
            "x": 0,
            "y": 0,
            "width":  200,
            "height": 100,
        },
        "controls": {
            "select_threshold": 25,
        },
    };

    const app_data = {
        "gauge": 16.5, // H0 scale is 16.5mm, so 1 SVG unit = 1mm
        "sleeper_distance": 7,
        "objects": [],
        "tracks": [
            {
                "start":  [10, 10],
                "end":    [60, 10],
                "radius": 0,
                "selected": false,
            },
            {
                "start":  [50, 50],
                "end":    [70, 70],
                "radius": 25,
                "selected": false,
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

    function createSVGElement(element_name) {
        return document.createElementNS(SVG_NAMESPACE, element_name);
    }

    //#endregion ------------------------------------------ END UTILITIES -------------------------------------------


    //#region    ------------------------------------------ EVENT HANDLERS ------------------------------------------

    function handle_mouse_scroll(event) {
        let zoom_increment = Math.sign(event.wheelDeltaY)*0.1; // +/- 0.1
        app_settings.canvas.zoom = parseFloat(
            clamp(0.1, 15, app_settings.canvas.zoom + zoom_increment).toFixed(1)
        );
        update_canvas_transform();
        update_zoom_view();
    };

    function handle_mouse_movement(event) {
        //console.log(event)

        if (event.shiftKey && event.buttons === 1) {
            // handle drag
            app_settings.canvas.offset_x += event.movementX;
            app_settings.canvas.offset_y += event.movementY;
            update_canvas_transform();
        };

        update_coordinate_view(event.offsetX, event.offsetY);
    };

    function handle_mouse_click(event) {
        let modifier_flags = event.shiftKey << 3 | event.ctrlKey << 2 | event.altKey;

        console.log(event)

        if ((modifier_flags == 0b000) && (event.buttons === 1)) { // primary click no modifiers
            app_data.tracks.every(track_data => {
                let center_x, center_y, mouse_x, mouse_y, distance;

                center_x = track_data.start[0] + (track_data.end[0] - track_data.start[0]) / 2;
                center_y = track_data.start[1] + (track_data.end[1] - track_data.start[1]) / 2;
                mouse_x  = (event.offsetX - app_settings.canvas.offset_x) / app_settings.canvas.zoom;
                mouse_y  = (event.offsetY - app_settings.canvas.offset_y) / app_settings.canvas.zoom;
                distance = Math.sqrt(Math.pow(center_x - mouse_x, 2) + Math.pow(center_y - mouse_y, 2));

                console.log(center_x, center_y)
                console.log(mouse_x, mouse_y)
                console.log("distance", distance, track_data)

                if (distance <= app_settings.controls.select_threshold) {
                    console.log("selected", track_data)
                    track_data.selected = true;
                    draw();
                    return false;
                };

                return true;
            });
        };
    };

    //#endregion ---------------------------------------- END EVENT HANDLERS ----------------------------------------


    //#region    ----------------------------------------- DRAWING FUNCTIONS ----------------------------------------

    function generate_track_object_data(track_data) {
        let track_container,
            track;

        track_container = createSVGElement("g")
        track_container.setAttribute("id", track_data.object_id);

        if (track_data?.radius > 0) {
            // generate curve
            track = createSVGElement("path");

            track.setAttribute(
                "d",
                `M${track_data.start[0]},${track_data.start[1]} A${track_data.radius},${track_data.radius},0,0,1,${track_data.end[0]},${track_data.end[1]}`
            );
        } else {
            // generate straight track
            track = createSVGElement("line");

            track.setAttribute("x1", track_data.start[0]);
            track.setAttribute("y1", track_data.start[1]);
            track.setAttribute("x2", track_data.end[0]);
            track.setAttribute("y2", track_data.end[1]);
        };

        track_container.append(track);

        if (track_data.selected) {
            let highlight = createSVGElement("rect");

            highlight.setAttribute("x", track_data.start[0]);
            highlight.setAttribute("y", track_data.start[1]);
            highlight.setAttribute("width",  track_data.end[0] - track_data.start[0]);
            highlight.setAttribute("height", track_data.end[1] - track_data.start[1]);

            track_container.append(highlight);
        };

        return track_container;
    };

    function draw() {
        // use requestAnimationFrame to change everything before the redraw to optimize performance

        // TODO: add support for objects that are comples, E.G. a switch that's made of a curve and a straight line

        // draw everything in the defs tag, then use the "use" tag to shift everything
        for (const track_data of app_data.tracks) {
            let object_id, track_object;

            // generate svg text that uses the "use" tag
            object_id = track_data?.object_id || window.crypto.randomUUID();
            track_data.object_id = object_id;

            track_object = generate_track_object_data(track_data);

            // track_object.setAttribute("x", track_data.start[0]);
            // track_object.setAttribute("y", track_data.start[1]);
            track_object.setAttribute("stroke", "#000000");
            track_object.setAttribute("fill", "none");

            UI_ELEMENTS.main_canvas.append(track_object);
        };
    };

    //#endregion --------------------------------------- END DRAWING FUNCTIONS --------------------------------------


    function resize_canvas_aspect_ratio() {
        UI_ELEMENTS.svg_container.setAttribute(
            "viewBox",
            `${app_settings.viewport.x} ${app_settings.viewport.y} ${app_settings.viewport.width} ${app_settings.viewport.height}`
        );
    };

    function update_canvas_transform() {
        UI_ELEMENTS.canvas.setAttribute(
            "transform",
            `translate(${app_settings.canvas.offset_x}, ${app_settings.canvas.offset_y}) scale(${app_settings.canvas.zoom})`
        );
    };

    function update_coordinate_view(viewport_x, viewport_y) {
        UI_ELEMENTS.coord_container.x.innerHTML = Math.round((viewport_x - app_settings.canvas.offset_x) / app_settings.canvas.zoom);
        UI_ELEMENTS.coord_container.y.innerHTML = Math.round((viewport_y - app_settings.canvas.offset_y) / app_settings.canvas.zoom);
    };

    function update_zoom_view() {
        UI_ELEMENTS.coord_container.zoom.innerHTML = app_settings.canvas.zoom;
    };


    //#region    ----------------------------------------- EXPOSED METHODS ------------------------------------------

    function _init() {
        console.log("INIT")
        if (INIT_DONE) return;

        let starting_x, starting_y, starting_zoom;
        starting_x    = undefined || 0;
        starting_y    = undefined || 0;
        starting_zoom = undefined || 1;

        let main_svg_element = document.querySelector("svg[data-mrd-ui-element='main-svg']");
        let defs_container   = document.querySelector("defs[data-mrd-ui-element='object-definition-container']");
        let main_canvas      = document.querySelector("g[data-mrd-ui-element='main-canvas']");

        let x_value    = document.querySelector("span[data-mrd-ui-element='x-coord']");
        let y_value    = document.querySelector("span[data-mrd-ui-element='y-coord']");
        let zoom_value = document.querySelector("span[data-mrd-ui-element='zoom-value']");

        UI_ELEMENTS.svg_container             = main_svg_element;
        UI_ELEMENTS.defs_container            = defs_container;
        UI_ELEMENTS.canvas                    = main_canvas;
        UI_ELEMENTS.default_objects_container = defs_container;

        UI_ELEMENTS.coord_container.x    = x_value;
        UI_ELEMENTS.coord_container.y    = y_value;
        UI_ELEMENTS.coord_container.zoom = zoom_value;

        main_svg_element.addEventListener("wheel",     handle_mouse_scroll);
        main_svg_element.addEventListener("mousedown", handle_mouse_click);
        main_svg_element.addEventListener("mousemove", handle_mouse_movement);

        INIT_DONE = true;
    };

    function _select_tool() {
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

        select_tool: _select_tool,

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
    [x] fixare coordinates shifted based on zoom (apply effects of zoom on coordinates)
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
