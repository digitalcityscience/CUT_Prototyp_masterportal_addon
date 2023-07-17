import WindSimulationComponent from "./components/WindSimulation.vue";
import WindSimulationStore from "./store/index";
import deLocale from "./locales/de/additional.json";
import enLocale from "./locales/en/additional.json";

export default {
    component: WindSimulationComponent,
    store: WindSimulationStore,
    locales: {
        de: deLocale,
        en: enLocale
    }
};
