"use strict";

const tool_select_handler = function (tool) {
    tool.registerHandler("mouse::click", (data) => console.log("mouse::click", data));

    tool.select   = () => console.log("SELECT");
    tool.deselect = () => console.log("DESELECT");
};

export const default_tools = {
    "select": tool_select_handler,
};
