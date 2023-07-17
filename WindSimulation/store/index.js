import getters from "./gettersWindSimulation";
import mutations from "./mutationsWindSimulation";
import state from "./stateWindSimulation";

export default {
    namespaced: true,
    state: {...state},
    mutations,
    getters
};
