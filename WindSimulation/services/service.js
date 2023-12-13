import axios from "axios";

/**
 * Service with helper functions for API requests
 */
class ApiService {
    // testUrl = "https://api.city-scope.hcu-hamburg.de/cut-mock/";
    url = "https://api.city-scope.hcu-hamburg.de/";
    // urlWindSuffix = "trigger_calculation_wind";
    // urlNoiseSuffix = "trigger_calculation_noise";
    urlWindSuffix = "wind-v2";
    urlNoiseSuffix = "noise-v2";
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
     * @returns {Array} array with buildings geometries
     */
    getBuildings (payload) {
        console.log(payload);
        return axios.post(`${this.buildingsUrl}/buildings/`, payload, {
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*"
            }
        });
    }

    /**
     * fetches buildings for bounding box (need for wind and noise sim)
     * @param {*} payload bounding box epsg:4326
     * @returns {Array} array with buildings geometries
     */
    getStreets (payload) {
        return axios.post(`${this.buildingsUrl}/streets/`, payload);
    }

    /**
         * posts input data to api (wind)
         * @param {Object} payload - the json object going into the api
         * @returns {Promise<any> | null} request response
         */
    postWindData (payload) {
        console.log("I am getting logged", payload);
        return axios.post(`${this.url}${this.urlWindSuffix}/processes/wind/execution`, payload);
    }

    /**
         * posts input data to api (noise)
         * @param {Object} payload - the json object going into the api
         * @returns {Promise<any> | null} request response
         */
    postNoiseData (payload) {
        return axios.post(`${this.url}${this.urlNoiseSuffix}/noise/execution`, payload);
    }

    /**
     * get tasks status
     * @param {String} taskId - the id of the tast in the api
     * @returns {Promise<any> | null} request response
     */
    getTaskStatusWind (taskId) {
        return axios.get(`${this.url}${this.urlWindSuffix}/jobs/${taskId}`);
    }

    /**
     * get tasks status
     * @param {String} taskId - the id of the tast in the api
     * @returns {Promise<any> | null} request response
     */
    getTaskStatusNoise (taskId) {
        return axios.get(`${this.url}${this.urlNoiseSuffix}/noise/jobs/${taskId}/status`);
    }

    /**
     * get tasks status
     * @param {String} taskId - the id of the tast in the api
     * @returns {Promise<any> | null} request response
     */
    getTaskResult (taskId) {
        return axios.get(`${this.url}/tasks/${taskId}`);
    }

    /**
     * get tasks status
     * @param {String} taskId - the id of the tast in the api
     * @returns {Promise<any> | null} request response
     */
    getTaskResultWind (taskId) {
        return axios.get(`${this.url}${this.urlWindSuffix}/jobs/${taskId}/results`);
    }

    /**
     * get tasks status
     * @param {String} taskId - the id of the tast in the api
     * @returns {Promise<any> | null} request response
     */
    getTaskResultNoise (taskId) {
        return axios.get(`${this.url}${this.urlNoiseSuffix}/noise/jobs/${taskId}/results`);
    }
}


export default ApiService;
