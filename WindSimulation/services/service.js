import axios from "axios";

/**
 * Service with helper functions for API requests
 */
class ApiService {
    url = "https://api.city-scope.hcu-hamburg.de/cut-mock/";
    // url = "https://api.city-scope.hcu-hamburg.de/";   // prod url
    // urlWindSuffix = "trigger_calculation_wind";
    // urlNoiseSuffix = "trigger_calculation_noise";

    // TODO add "cut-public-api" to url and use "wind" or "noise" with a param like taskType instead of using suffix
    urlWindSuffix = "cut-public-api/wind";
    urlNoiseSuffix = "cut-public-api/noise";
    buildingsUrl = "https://api.city-scope.hcu-hamburg.de/cut-sim-data-provider";


    /**
     * constructor for the SelectionService
     * @param {String} url - the API url
     * @param {String} urlWindSuffix - api suffix for wind simulation
     * @param {String} urlNoiseSuffix - api suffix for noise simulation
     */
    constructor (url, urlWindSuffix, urlNoiseSuffix) {
        this.url = url || this.url;
        this.urlWindSuffix = urlWindSuffix || this.urlWindSuffix;
        this.urlNoiseSuffix = urlNoiseSuffix || this.urlNoiseSuffix;
    }

    /**
     * fetches buildings for bounding box (need for wind and noise sim)
     * @param {*} payload bounding box epsg:4326
     * @param {*} access_token API Access Token
     * @returns {Array} array with buildings geometries
     */
    getBuildings (payload, access_token) {
        return axios.post(`${this.buildingsUrl}/buildings/`, payload, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Authorization": access_token
            }
        });
    }

    /**
     * fetches buildings for bounding box (need for wind and noise sim)
     * @param {*} payload bounding box epsg:4326
     * @param {*} access_token API Access Token
     * @returns {Array} array with buildings geometries
     */
    getStreets (payload, access_token) {
        return axios.post(`${this.buildingsUrl}/streets/`, payload, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Authorization": access_token
            }
        });
    }

    /**
         * posts input data to api (wind)
         * @param {Object} payload - the json object going into the api
         * @param {*} access_token API Access Token
         * @returns {Promise<any> | null} request response
         */
    postWindData (payload, access_token) {
        return axios.post(`${this.url}${this.urlWindSuffix}/processes/wind-comfort/execution`, payload, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Authorization": access_token
            }
        });
    }

    /**
         * posts input data to api (noise)
         * @param {Object} payload - the json object going into the api
         * @param {*} access_token API Access Token
         * @returns {Promise<any> | null} request response
         */
    postNoiseData (payload, access_token) {
        return axios.post(`${this.url}${this.urlNoiseSuffix}/processes/traffic-noise/execution`, payload, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Authorization": access_token
            }
        });
    }

    /**
     * get tasks status
     * @param {String} taskId - the id of the tast in the api
     * @param {*} taskType type of simulation task (noise, wind, stormwater, ...)
     * @param {*} access_token API Access Token
     * @returns {Promise<any> | null} request response
     */
    getTaskStatus (taskId, taskType, access_token) {

        if (taskType === "noise") {
            return axios.get(`${this.url}${this.urlNoiseSuffix}/jobs/${taskId}/status`, {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "*/*",
                    "Authorization": access_token
                }
            });
        }

        return axios.get(`${this.url}${this.urlWindSuffix}/jobs/${taskId}/status`, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Authorization": access_token
            }
        });
    }

    /**
     * get tasks status
     * @param {String} taskId - the id of the tast in the api
     * @param {*} access_token API Access Token
     * @returns {Promise<any> | null} request response
     */
    getTaskStatusNoise (taskId, access_token) {
        return axios.get(`${this.url}${this.urlNoiseSuffix}/jobs/${taskId}/status`, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Authorization": access_token
            }
        });
    }

    /**
     * get tasks status
     * @param {String} taskId - the id of the tast in the api
     * @param {*} access_token API Access Token
     * @returns {Promise<any> | null} request response
     */
    getTaskResult (taskId, access_token) {
        return axios.get(`${this.url}${this.urlWindSuffix}/jobs/${taskId}/results`, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Authorization": access_token
            }
        });
    }

    /**
     * get tasks status
     * @param {String} taskId - the id of the tast in the api
     * @param {*} access_token API Access Token
     * @returns {Promise<any> | null} request response
     */
    getTaskResultNoise (taskId, access_token) {
        return axios.get(`${this.url}${this.urlNoiseSuffix}/jobs/${taskId}/results`, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Authorization": access_token
            }
        });
    }
}


export default ApiService;
