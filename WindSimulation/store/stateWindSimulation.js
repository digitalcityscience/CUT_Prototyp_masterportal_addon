/**
 * User type definition
 * @typedef {object} VueAddonState
 * @property {boolean} active if true, VueAddon will rendered
 * @property {string} id id of the VueAddon component
 * @property {module:ol/interaction/Pointer} selectPointerMove contains interaction listener to map
 * @property {object[]} projections list of available projections
 * @property {object} mapProjection projection of the map
 * @property {number[]} positionMapProjection position of the projection in the map
 * @property {boolean} updatePosition if true, position is updated in tool
 * @property {string} currentProjectionName name of the current projection
 * @property {object} currentProjection the current projection
 * @property {string} currentSelection currently selected projection value
 * @property {string} coordinatesEastingField label of the easting field
 * @property {string} coordinatesNorthingField label of the northing field
 * @property {string} name displayed as title (config-param)
 * @property {string} icon icon next to title (config-param)
 * @property {boolean} renderToWindow if true, tool is rendered in a window, else in sidebar (config-param)
 * @property {boolean} resizableWindow if true, window is resizable (config-param)
 * @property {boolean} isVisibleInMenu if true, tool is selectable in menu (config-param)
 * @property {boolean} deactivateGFI flag if tool should deactivate gfi (config-param)
 */
const state = {
    active: false,
    authenticated: false,
    accessToken: "",
    refreshToken: "",
    id: "WindSimulation",
    // defaults for config.json parameters
    name: "DCS Simulations",
    showGrid: true,
    icon: "bi-bullseye",
    renderToWindow: false,
    resizableWindow: false,
    isVisibleInMenu: true,
    initialWidth: 500,
    deactivateGFI: true,
    // url: "https://api.city-scope.hcu-hamburg.de/",
    url: "https://api.city-scope.hcu-hamburg.de/cut-mock/",
    urlWindSuffix: "cut-public-api/wind",
    urlNoiseSuffix: "cut-public-api/noise",
    // url: "https://api.city-scope.hcu-hamburg.de/cut-mock/",
    // url: "https://dcs.creative-collective.de/",
    // urlWindSuffix: "trigger_calculation_wind",
    // urlNoiseSuffix: "trigger_calculation_noise",
    colorSpace: {
        wind: {
            "0": [69, 140, 191, 0.75],
            "0.2": [149, 211, 224, 0.75],
            "0.4": [144, 195, 99, 0.75],
            "0.6": [244, 236, 125, 0.75],
            "0.8": [251, 196, 111, 0.75],
            "1": [238, 118, 121, 0.75]
        },
        noise: {
            "0": [184, 214, 209, 0.75],
            "1": [206, 228, 204, 0.75],
            "2": [226, 242, 191, 0.75],
            "3": [243, 198, 131, 0.75],
            "4": [232, 126, 77, 0.75],
            "5": [205, 70, 62, 0.75],
            "6": [161, 26, 77, 0.75],
            "7": [117, 8, 92, 0.75]
        }
    }
};

export default state;
