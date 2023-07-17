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
         * @returns {Promise<any> | null} request response
         */
    postWindData () {
        return axios.post(`${this.url}${this.urlWindSuffix}`);
    }

    /**
         * posts input data to api (noise)
         * @returns {Promise<any> | null} request response
         */
    postNoiseData () {
        return axios.post(`${this.url}${this.urlNoiseSuffix}`);
    }
}


export default ApiService;
