
import {generateSimpleGetters} from ".../../../src/app-store/utils/generators";
import windSimulationState from "./stateWindSimulation";

const getters = {
    ...generateSimpleGetters(windSimulationState)
};

export default getters;
