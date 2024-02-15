
import axios from "axios";

/**
 * AuthService class for handling authentication processes.
 */
class AuthService {

    /**
     * Logs in the user using their email and password.
     * @param {string} email - The user's email address.
     * @param {string} password - The user's password.
     * @returns {Promise<Object>} - The response object from the server.
     */
    static async login (email, password) {
        const response = await axios.post("https://api.city-scope.hcu-hamburg.de/users/auth/login", {
            email: email,
            password: password
        });

        return response.data;
    }

    /**
     * Refreshes the user's authentication token.
     * @param {string} refresh_token - The refresh token for renewing authentication.
     * @param {string} access_token - the invalid old accessToken
     * @returns {Promise<Object>} - The response object from the server.
     */
    static async refresh (refresh_token, access_token) {
        const payload = {
                refresh_token: refresh_token
            },
            response = await axios.post("https://api.city-scope.hcu-hamburg.de/users/auth/refresh", payload, {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "*/*",
                    "Authorization": "Bearer " + access_token
                }
            });

        return response.data;
    }

    /**
     * Logs out the user.
     * @param {string} refreshToken - The user's refresh token.
     * @returns {Promise<void>} - The response object from the server.
     */
    static async logout (refreshToken) {
        await axios.post("https://api.city-scope.hcu-hamburg.de/users/auth/logout", {
            refresh_token: refreshToken
        });
    }
}

export default AuthService;

