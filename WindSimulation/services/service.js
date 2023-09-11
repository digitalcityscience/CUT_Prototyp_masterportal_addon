import axios from "axios";

/**
 * Service with helper functions for API requests
 */
class ApiService {
    url = "https://api.city-scope.hcu-hamburg.de/cut-mock/";
    urlWindSuffix = "trigger_calculation_wind";
    urlNoiseSuffix = "trigger_calculation_noise";


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
         * posts input data to api (wind)
         * @param {Object} payload - the json object going into the api
         * @returns {Promise<any> | null} request response
         */
    postWindData (payload) {
        return axios.post(`${this.url}${this.urlWindSuffix}`, payload);
    }

    /**
         * posts input data to api (noise)
         * @param {Object} payload - the json object going into the api
         * @returns {Promise<any> | null} request response
         */
    postNoiseData (payload) {
        return axios.post(`${this.url}${this.urlNoiseSuffix}`, payload);
    }

    /**
     * get tasks status
     * @param {String} taskId - the id of the tast in the api
     * @returns {Promise<any> | null} request response
     */
    getTaskStatus (taskId) {
        return axios.get(`${this.url}/tasks/${taskId}/status`);
    }

    /**
     * get tasks status
     * @param {String} taskId - the id of the tast in the api
     * @returns {Promise<any> | null} request response
     */
    getTaskResult (taskId) {
        return axios.get(`${this.url}/tasks/${taskId}`);
    }
}


export default ApiService;
