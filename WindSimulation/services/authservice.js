
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
        const response = await axios.post("https://schb.city-scope.hcu-hamburg.de/auth/login", {
            email: email,
            password: password
        });

        return response.data;
    }

    /**
     * Refreshes the user's authentication token.
     * @param {string} refreshToken - The refresh token for renewing authentication.
     * @param {string} accessToken - the invalid old accessToken
     * @returns {Promise<Object>} - The response object from the server.
     */
    static async refresh (refreshToken, accessToken) {
        const headers = new Headers();

        headers.append("Authorization", accessToken);
        const response = await axios.post("https://schb.city-scope.hcu-hamburg.de/auth/refresh", {
            refresh_token: refreshToken
        });

        console.log(response);
        return response.data;
    }

    /**
     * Logs out the user.
     * @param {string} refreshToken - The user's refresh token.
     * @returns {Promise<void>} - The response object from the server.
     */
    static async logout (refreshToken) {
        await axios.post("https://schb.city-scope.hcu-hamburg.de/auth/logout", {
            refresh_token: refreshToken
        });
    }
}

export default AuthService;

