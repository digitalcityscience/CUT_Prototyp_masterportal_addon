
import {generateSimpleGetters} from ".../../../src/app-store/utils/generators";
import WindSimulationState from "./stateWindSimulation";

const getters = {
    ...generateSimpleGetters(WindSimulationState)
};

export default getters;
