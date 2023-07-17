<script>
import ToolTemplate from "../../../src/modules/tools/ToolTemplate.vue";
import {mapGetters, mapMutations} from "vuex";
import getters from "../store/gettersWindSimulation";
import mutations from "../store/mutationsWindSimulation";
import VectorSource from "ol/source/Vector.js";
import Polygon, {fromExtent} from "ol/geom/Polygon";
import GeoJSON from "ol/format/GeoJSON";
import {getSize, getCenter} from "ol/extent";
import Feature from "ol/Feature";
import ApiService from "../services/service.js";
import Draw from "ol/interaction/Draw.js";
import Testdaten from "../../../portal/dcs/assets/test.json";
import "bootstrap-icons/font/bootstrap-icons.css";
import * as webgl from "@masterportal/masterportalapi/src/renderer/webgl";

export default {
    name: "WindSimulation",
    components: {
        ToolTemplate
    },
    data () {
        return {
            type: "wind",
            result: {},
            dataSets: [],
            draw: null,
            activeSet: 0,
            buttonActive: false,
            drawActive: false,
            showDrawing: true,
            min: 0,
            max: 80,
            minNoise: 0,
            maxNoise: 100,
            windSpeed: 40,
            windDirection: 180,
            maxSpeed: 50,
            trafficQuota: 50,
            img: null,
            modalActive: false,
            modalMessage: null,
            fixedExtent: null
        };
    },
    computed: {
        ...mapGetters("Tools/WindSimulation", Object.keys(getters)),
        ...mapGetters("Maps", ["projection", "projectionCode"]),
        layer () {
            return this.map.getLayers().getArray().filter(vectorLayer => vectorLayer.get("name") === "dcs_wind_simulation")[0];
        },
        source () {
            return this.layer.getSource();
        },
        features () {
            return this.source.getFeatures();
        },
        noDrawing () {
            if (this.features.find(feature => feature.getId() === "wind-" + this.activeSet) && !this.dataSets.find(set => set.id === this.activeSet)) {
                return false;
            }

            return true;
        }
    },
    watch: {
        activeSet (newValue, oldValue) {
            if (this.dataSets[newValue]) {
                this.windDirection = this.dataSets[newValue].windDirection;
                this.windSpeed = this.dataSets[newValue].windSpeed;
                this.showDrawing = this.dataSets[newValue].showDrawing;
                this.type = this.dataSets[newValue].type;

                if (this.dataSets[oldValue].showDrawing === this.dataSets[newValue].showDrawing) {
                    this.rerenderVectorLayer();
                }
            }
            else {
                this.rerenderVectorLayer();
            }

        },
        showDrawing () {
            this.dataSets[this.activeSet].showDrawing = this.showDrawing;
            this.rerenderVectorLayer();
        }
    },
    created () {
        this.map = mapCollection.getMap("2D");
        this.apiService = new ApiService(this.url, this.urlWindSuffix, this.urlNoiseSuffix);
        this.createVectorLayer();
        this.$on("close", this.close);
    },
    /**
     * Put initialize here if mounting occurs after config parsing
     * @returns {void}
     */
    mounted () {
        this.applyTranslationKey(this.name);
        this.loadDummyData();
    },
    methods: {
        ...mapMutations("Tools/WindSimulation", Object.keys(mutations)),
        createVectorLayer () {
            const attributes = {
                    id: "dcs_wind_simulation",
                    source: new VectorSource(),
                    disableHitDetection: false,
                    name: "dcs_wind_simulation",
                    typ: "VectorBase",
                    gfiAttributes: "showAll",
                    opacity: 1,
                    renderer: "webgl",
                    styleId: undefined
                },
                layer = webgl.createLayer(attributes);

            layer.setZIndex(9999);
            this.map.addLayer(layer);
        },
        createDraw () {
            if (this.buttonActive) {
                this.buttonActive = false;
            }
            else {
                this.buttonActive = true;

                this.draw = new Draw({
                    source: this.source,
                    type: "Polygon",
                    freehand: true
                });

                this.draw.on("drawstart", () => {
                    this.drawActive = true;
                });

                this.draw.on("drawend", (event) => {
                    if (this.dataSets.length && this.dataSets.find(dataSet => dataSet.id === this.activeSet)) {
                        this.activeSet = this.dataSets.length;
                    }

                    event.feature.setId("wind-" + this.activeSet); // give the feature a id
                    this.removeExistingFeature();
                    this.createExtent(event.feature);
                    this.drawActive = false;

                });

                this.map.on("pointerup", () => {
                    if (this.drawActive) {
                        this.draw.finishDrawing();
                        this.map.removeInteraction(this.draw);
                        this.buttonActive = false;
                    }
                });

                this.map.addInteraction(this.draw);
            }
        },
        createExtent (feature) {
            const extent = feature.getGeometry().getExtent(),
                sizeCheck = getSize(extent);

            if (sizeCheck[0] > 500 || sizeCheck[1] > 500) {
                const x = sizeCheck[0] >= 500 ? this.$t("additional:modules.tools.windSimulation.x500") : null,
                    y = sizeCheck[1] >= 500 ? this.$t("additional:modules.tools.windSimulation.y500") : null;

                this.modalMessage = [x, y].join(",");
                this.modalActive = true;
                this.fixExtent(extent, sizeCheck[0], sizeCheck[1]);
            }

            feature.setGeometry(fromExtent(extent));
            feature.styleRule = {
                style: {
                    polygonFillColor: [0, 0, 0, 0],
                    polygonStrokeColor: [255, 0, 0, 1],
                    polygonStrokeWidth: 3
                }
            };

        },
        fixExtent (extent, x, y) {
            const newX = x > 500 ? 500 : x,
                newY = y > 500 ? 500 : y,
                centerPoint = getCenter(extent),
                topLeft = [centerPoint[0] - newX / 2, centerPoint[1] + newY / 2],
                topRight = [centerPoint[0] + newX / 2, centerPoint[1] + newY / 2],
                bottomRight = [centerPoint[0] + newX / 2, centerPoint[1] - newY / 2],
                bottomLeft = [centerPoint[0] - newX / 2, centerPoint[1] - newY / 2],
                feature = new Feature({geometry: new Polygon([[topLeft, topRight, bottomRight, bottomLeft, topLeft]])});

            this.fixedExtent = feature;
        },
        confirmFix () {
            this.removeExistingFeature();
            this.fixedExtent.styleRule = {
                style: {
                    polygonFillColor: [0, 0, 0, 0],
                    polygonStrokeColor: [255, 0, 0, 1],
                    polygonStrokeWidth: 3
                }
            };

            this.fixedExtent.setId("wind-" + this.activeSet);
            this.source.addFeature(this.fixedExtent);
            this.rerenderVectorLayer();
            this.modalActive = false;
        },
        cancelFix () {
            this.removeExistingFeature();
            this.modalActive = false;
        },
        removeExistingFeature () {
            if (this.features.length) {
                const featureExists = this.features.find(feature => feature.getId() === "wind-" + this.activeSet);

                if (featureExists) {
                    this.source.removeFeature(featureExists);
                }
            }
        },
        calculateDirection (deg) {
            if (deg >= 23 && deg <= 67) {
                return "NE";
            }

            if (deg >= 68 && deg <= 112) {
                return "E";
            }

            if (deg >= 113 && deg <= 157) {
                return "SE";
            }

            if (deg >= 158 && deg <= 202) {
                return "S";
            }

            if (deg >= 203 && deg <= 247) {
                return "SW";
            }

            if (deg >= 248 && deg <= 292) {
                return "W";
            }

            if (deg >= 293 && deg <= 336) {
                return "NW";
            }

            return "N";
        },
        getFeature () {
            if (this.features.length) {
                const featureExists = this.features.find(feature => feature.getId() === "wind-" + this.activeSet);

                if (featureExists) {
                    const featureCopy = featureExists.clone();

                    return featureCopy;
                }
            }

            return null;
        },
        async simulateWind () {
            const format = new GeoJSON(),
                feature = this.getFeature(),
                dataSet = {
                    id: this.activeSet,
                    results: this.results,
                    type: this.type,
                    area: format.writeFeatureObject(feature, {dataProjection: "EPSG:4326", featureProjection: this.projection}),
                    windSpeed: this.windSpeed,
                    windDirection: this.windDirection,
                    showDrawing: this.showDrawing,
                    img: null
                },
                prepareApiDataSet = {
                    bbox: format.writeFeatureObject(feature, {dataProjection: "EPSG:4326", featureProjection: this.projection}).geometry.coordinates[0],
                    calculation_settings: {
                        wind_speed: this.windSpeed,
                        wind_direction: this.windDirection
                    }
                },
                taskId = await this.apiService.postWindData(prepareApiDataSet);

            console.log(prepareApiDataSet);
            console.log(taskId);
            this.dataSets.push(dataSet);
            this.rerenderVectorLayer();
            this.map.getView().fit(feature.getGeometry().getExtent());
            this.createPNG();
        },
        async simulateNoise () {
            const format = new GeoJSON(),
                feature = this.getFeature(),
                dataSet = {
                    id: this.activeSet,
                    results: this.results,
                    type: this.type,
                    area: format.writeFeatureObject(feature, {dataProjection: "EPSG:4326", featureProjection: this.projection}),
                    maxSpeed: this.maxSpeed,
                    trafficQuota: this.trafficQuota,
                    showDrawing: this.showDrawing,
                    img: null
                },
                prepareApiDataSet = {
                    bbox: format.writeFeatureObject(feature, {dataProjection: "EPSG:4326", featureProjection: this.projection}).geometry.coordinates[0],
                    calculation_settings: {
                        max_speed: this.maxSpeed,
                        traffic_quota: this.trafficQuota
                    }
                },
                taskId = await this.apiService.postNoiseData(prepareApiDataSet);

            console.log(prepareApiDataSet);
            console.log(taskId);
            this.dataSets.push(dataSet);
            this.rerenderVectorLayer();
            this.map.getView().fit(feature.getGeometry().getExtent());
            this.createPNG();
        },
        rerenderVectorLayer () {
            if (this.features.length) {
                this.features.forEach(feature => {
                    if (feature.getId() === "wind-" + this.activeSet && this.dataSets[this.activeSet]) {
                        if (!this.dataSets[this.activeSet].showDrawing) {
                            feature.styleRule = {
                                style: {
                                    polygonFillColor: [0, 0, 0, 0],
                                    polygonStrokeColor: [0, 0, 0, 0],
                                    polygonStrokeWidth: 0
                                }
                            };
                        }
                        if (this.dataSets.length && this.dataSets.find(set => set.id === this.activeSet && this.dataSets[this.activeSet].showDrawing)) {
                            feature.styleRule = {
                                style: {
                                    polygonFillColor: [255, 255, 255, 0.5],
                                    polygonStrokeColor: [255, 0, 0, 1],
                                    polygonStrokeWidth: 3
                                }
                            };
                        }
                        else if (this.dataSets[this.activeSet].showDrawing) {
                            feature.styleRule = {
                                style: {
                                    polygonFillColor: [0, 0, 0, 0],
                                    polygonStrokeColor: [255, 0, 0, 1],
                                    polygonStrokeWidth: 3
                                }
                            };
                        }
                    }
                    else if (feature.getId() === "wind-" + this.activeSet && !this.dataSets[this.activeSet]) {
                        feature.styleRule = {
                            style: {
                                polygonFillColor: [0, 0, 0, 0],
                                polygonStrokeColor: [255, 0, 0, 1],
                                polygonStrokeWidth: 3
                            }
                        };
                    }
                    else if (feature.getId().includes("testdata")) {
                        feature.styleRule = {
                            style: {
                                polygonFillColor: feature.getProperties().value >= 0.2 ? [255, 255, 0, 0.5] : feature.getProperties().value === 0.4 ? [255, 0, 0, 0.5] : [0, 0, 255, 0.5],
                                polygonStrokeColor: [0, 0, 0, 0],
                                polygonStrokeWidth: 0
                            }
                        };
                    }
                    else {
                        feature.styleRule = {
                            style: {
                                polygonFillColor: [0, 0, 0, 0],
                                polygonStrokeColor: [0, 0, 0, 0],
                                polygonStrokeWidth: 0
                            }
                        };
                    }
                });

                this.source.changed();
            }
        },
        createPNG () {
            this.map.once("rendercomplete", function (map) {
                const mapCanvas = document.createElement("canvas"),
                    size = map.target.getSize(),
                    mapContext = mapCanvas.getContext("2d");

                mapCanvas.width = size[0];
                mapCanvas.height = size[1];

                Array.prototype.forEach.call(
                    map.target.getViewport().querySelectorAll(".ol-layer canvas, canvas.ol-layer"),
                    function (canvas) {
                        if (canvas.width > 0) {
                            const opacity = canvas.parentNode.style.opacity || canvas.style.opacity,
                                transform = canvas.style.transform,
                                backgroundColor = canvas.parentNode.style.backgroundColor;

                            mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
                            let matrix;

                            if (transform) {
                                // Get the transform parameters from the style's transform matrix
                                matrix = transform
                                    .match(/^matrix\(([^\(]*)\)$/)[1]
                                    .split(",")
                                    .map(Number);
                            }
                            else {
                                matrix = [
                                    parseFloat(canvas.style.width) / canvas.width,
                                    0,
                                    0,
                                    parseFloat(canvas.style.height) / canvas.height,
                                    0,
                                    0
                                ];
                            }
                            // Apply the transform to the export map context
                            CanvasRenderingContext2D.prototype.setTransform.apply(
                                mapContext,
                                matrix
                            );

                            if (backgroundColor) {
                                mapContext.fillStyle = backgroundColor;
                                mapContext.fillRect(0, 0, canvas.width, canvas.height);
                            }
                            mapContext.drawImage(canvas, 0, 0);
                        }
                    }
                );

                mapContext.globalAlpha = 1;
                mapContext.setTransform(1, 0, 0, 1, 0, 0);

                this.dataSets[this.activeSet].img = mapCanvas.toDataURL();
            });
            this.map.renderSync();
        },
        setPagination (mode, value) {
            if (mode === "add") {
                const number = this.activeSet + value;

                if (number < 0) {
                    this.activeSet = this.dataSets.length - 1;
                    return;
                }

                if (number >= this.dataSets.length) {
                    this.activeSet = 0;
                    return;
                }

                this.activeSet = number;
            }
            else {
                this.activeSet = value;
            }
        },
        loadDummyData () {
            Testdaten.results.features.forEach((feature, index) => {
                const format = new GeoJSON(),
                    feat = format.readFeature(feature, {featureProjection: this.projection});

                feat.setId("testdata-" + index);
                feat.styleRule = {
                    style: {
                        polygonFillColor: [255, 255, 0, 0.5]
                        // polygonFillColor: feat.getProperties().value >= 0.2 ? [255,0,0,0.5] : feat.getProperties().value >= 0.4 ? [255,0,0,0.75] : [255,0,0,0.25],
                    }
                };

                this.source.addFeature(feat);
                this.rerenderVectorLayer();
            });
        },
        /**
         * Closes this tool window by setting active to false
         * @returns {void}
         */
        close () {
            this.setActive(false);

            // TODO replace trigger when Menu is migrated
            // set the backbone model to active false for changing css class in menu (menu/desktop/tool/view.toggleIsActiveClass)
            // else the menu-entry for this tool is always highlighted
            const model = Radio.request("ModelList", "getModelByAttributes", {id: this.$store.state.Tools.VueAddon.id});

            if (model) {
                model.set("isActive", false);
            }
        }
    }
};
</script>

<template lang="html">
    <ToolTemplate
        :title="$t(name)"
        :icon="icon"
        :active="active"
        :render-to-window="renderToWindow"
        :initial-width="initialWidth"
        :resizable-window="resizableWindow"
        :deactivate-gfi="deactivateGFI"
        :focus-to-close-icon="true"
    >
        <template #toolBody>
            <div
                v-if="active"
                id="wind-simulation-addon"
            >
                <div class="addon_wrapper">
                    <div class="section head">
                        <button
                            class="head"
                            :class="{highlight: type === 'wind'}"
                            @click="type = 'wind'"
                        >
                            <i class="bi bi-wind" />
                            <p>{{ $t('additional:modules.tools.windSimulation.title_wind') }}</p>
                        </button>
                        <button
                            class="head"
                            :class="{highlight: type === 'noise'}"
                            @click="type = 'noise'"
                        >
                            <i class="bi bi-car-front" />
                            <p>{{ $t('additional:modules.tools.windSimulation.title_noise') }}</p>
                        </button>
                    </div>
                    <div class="section draw">
                        <button
                            :class="{draw: buttonActive}"
                            @click="createDraw()"
                        >
                            <i class="bi bi-pencil-square" />
                        </button>
                        <div class="input">
                            <!--eslint-disable-next-line-->
                            <input
                                id="show_drawing"
                                v-model="showDrawing"
                                type="checkbox"
                            >
                            <div class="label">
                                <p>Show/ hide drawing</p>
                            </div>
                        </div>
                    </div>
                    <template v-if="type === 'wind'">
                        <div class="section params">
                            <div class="section_head">
                                <i class="bi bi-wind" />
                                <p><strong>{{ $t('additional:modules.tools.windSimulation.params_wind') }}</strong></p>
                            </div>
                            <div class="row">
                                <div class="input">
                                    <div class="labels">
                                        <div class="label">
                                            <p>{{ min }} km/h</p>
                                        </div>
                                        <div class="label">
                                            <p>{{ max }} km/h</p>
                                        </div>
                                    </div>
                                    <!--eslint-disable-next-line-->
                                    <input
                                        id="windSpeed_slider"
                                        v-model="windSpeed"
                                        type="range"
                                        :min="min"
                                        :max="max"
                                        value="50"
                                        class="simulation_slider slider"
                                    >
                                </div>
                                <p class="value">
                                    {{ windSpeed }} km/h
                                </p>
                            </div>
                            <div class="row">
                                <div class="input">
                                    <div class="labels">
                                        <div class="label">
                                            <p>N</p>
                                        </div>
                                        <div class="label">
                                            <p>E</p>
                                        </div>
                                        <div class="label">
                                            <p>S</p>
                                        </div>
                                        <div class="label">
                                            <p>W</p>
                                        </div>
                                        <div class="label">
                                            <p>N</p>
                                        </div>
                                    </div>
                                    <!--eslint-disable-next-line-->
                                    <input
                                        id="windSpeed_slider"
                                        v-model="windDirection"
                                        type="range"
                                        min="1"
                                        max="360"
                                        value="180"
                                        class="simulation_slider slider"
                                    >
                                </div>
                                <p class="value">
                                    {{ windDirection }}° {{ calculateDirection(windDirection) }}
                                </p>
                            </div>
                            <div class="section simulation">
                                <button
                                    class="wide"
                                    :class="{disabled: noDrawing}"
                                    @click="simulateWind()"
                                >
                                    <i class="bi bi-wind" />
                                    <p>{{ $t('additional:modules.tools.windSimulation.runSimulation') }}</p>
                                </button>
                            </div>
                        </div>
                    </template>
                    <template v-if="type === 'noise'">
                        <div class="section params">
                            <div class="section_head">
                                <i class="bi bi-car-front" />
                                <p><strong>{{ $t('additional:modules.tools.windSimulation.params_noise') }}</strong></p>
                            </div>
                            <div class="row">
                                <div class="input">
                                    <div class="labels">
                                        <div class="label">
                                            <p>{{ minNoise }} km/h</p>
                                        </div>
                                        <div class="label">
                                            <p>{{ maxNoise }} km/h</p>
                                        </div>
                                    </div>
                                    <!--eslint-disable-next-line-->
                                    <input
                                        id="maxSpeed_slider"
                                        v-model="maxSpeed"
                                        type="range"
                                        :min="minNoise"
                                        :max="maxNoise"
                                        step="10"
                                        value="50"
                                        class="simulation_slider slider"
                                    >
                                </div>
                                <p class="value">
                                    {{ maxSpeed }} km/h
                                </p>
                            </div>
                            <div class="row">
                                <div class="input">
                                    <div class="labels">
                                        <div class="label">
                                            <p>0%</p>
                                        </div>
                                        <div class="label">
                                            <p>100%</p>
                                        </div>
                                    </div>
                                    <!--eslint-disable-next-line-->
                                    <input
                                        id="trafficQuota_slider"
                                        v-model="trafficQuota"
                                        type="range"
                                        min="0"
                                        max="100"
                                        value="50"
                                        class="simulation_slider slider"
                                    >
                                </div>
                                <p class="value">
                                    {{ trafficQuota }} %
                                </p>
                            </div>
                            <div class="section simulation">
                                <button
                                    class="wide"
                                    :class="{disabled: noDrawing}"
                                    @click="simulateNoise()"
                                >
                                    <i class="bi bi-car-front" />
                                    <p>{{ $t('additional:modules.tools.windSimulation.runSimulation') }}</p>
                                </button>
                            </div>
                        </div>
                    </template>
                    <div class="section results">
                        <div
                            v-if="dataSets.length && dataSets[activeSet]"
                            class="result set"
                        >
                            <div
                                class="image_placeholder"
                            >
                                <img
                                    alt=""
                                    :src="dataSets[activeSet].img"
                                >
                            </div>
                            <p>Ergebnistabelle von Simulationsset #{{ dataSets[activeSet].id + 1 }}</p>
                            <p> {{ dataSets[activeSet] }}</p>
                        </div>
                        <template v-if="type === 'wind'">
                            <div class="legend wind">
                                <p class="header">
                                    <strong>Legend</strong>
                                </p>
                                <div class="legend_wrapper">
                                    <li class="legend_unit">
                                        <p class="italic">
                                            < 2.5m/s
                                        </p>
                                        <div class="color_block blue_1" />
                                        <p>
                                            Sitting Long
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <p class="italic">
                                            2.5m/s - 4m/s
                                        </p>
                                        <div class="color_block blue_2" />
                                        <p>
                                            Sitting Short
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <p class="italic">
                                            4m/s - 6m/s
                                        </p>
                                        <div class="color_block green" />
                                        <p>
                                            Walking Slow
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <p class="italic">
                                            5m/s - 8m/s
                                        </p>
                                        <div class="color_block yellow" />
                                        <p>
                                            Walking Fast
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <p class="italic">
                                            8m/s - 10m/s
                                        </p>
                                        <div class="color_block orange" />
                                        <p>
                                            Uncomfortable
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <p class="italic">
                                            > 10m/s
                                        </p>
                                        <div class="color_block red" />
                                        <p>
                                            Dangerous
                                        </p>
                                    </li>
                                </div>
                            </div>
                        </template>
                        <template v-if="type === 'noise'">
                            <div class="legend noise">
                                <p class="header">
                                    <strong>Legend</strong>
                                </p>
                                <div class="legend_wrapper">
                                    <li class="legend_unit">
                                        <div class="color_block noise_0" />
                                        <p>
                                            < 45 dB (A)
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <div class="color_block noise_1" />
                                        <p>
                                            45-50 dB (A)
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <div class="color_block noise_2" />
                                        <p>
                                            50-55 dB (A)
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <div class="color_block noise_3" />
                                        <p>
                                            55-60 dB (A)
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <div class="color_block noise_4" />
                                        <p>
                                            60-65 dB (A)
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <div class="color_block noise_5" />
                                        <p>
                                            65-70 dB (A)
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <div class="color_block noise_6" />
                                        <p>
                                            70-75 dB (A)
                                        </p>
                                    </li>
                                    <li class="legend_unit">
                                        <div class="color_block noise_7" />
                                        <p>
                                            > 75 dB (A)
                                        </p>
                                    </li>
                                </div>
                            </div>
                        </template>
                        <div class="download" />
                    </div>
                    <div
                        v-if="dataSets.length"
                        class="section pagination"
                    >
                        <div class="pagination_wrapper">
                            <button
                                v-for="set in dataSets"
                                :key="set.id"
                                class="pagination_point"
                                :class="{active: set.id === activeSet}"
                                @click="setPagination('set', set.id)"
                            >
                                <p>{{ set.id + 1 }}</p>
                            </button>
                            <button
                                class="pagination_point blue"
                                @click="setPagination('add', -1)"
                            >
                                <i class="bi bi-arrow-left" />
                            </button>
                            <button
                                class="pagination_point blue"
                                @click="setPagination('add', +1)"
                            >
                                <i class="bi bi-arrow-right" />
                            </button>
                        </div>
                    </div>
                </div>
                <div
                    v-if="modalActive"
                    id="wind_modal"
                    class="wind_modal"
                >
                    <div class="modal_body">
                        <p>{{ $t('additional:modules.tools.windSimulation.error500') }}</p>
                        <p class="warn">
                            {{ modalMessage }}
                        </p>
                        <p
                            class="edit"
                        >
                            {{ $t('additional:modules.tools.windSimulation.correct500') }}
                        </p>
                        <button
                            class="confirm"
                            @click="confirmFix"
                        >
                            {{ $t('additional:modules.tools.windSimulation.Bestätigen') }}
                        </button>
                        <button
                            class="cancel"
                            @click="cancelFix"
                        >
                            {{ $t('additional:modules.tools.windSimulation.Ablehnen') }}
                        </button>
                    </div>
                    <div
                        class="cancelFix"
                        @click="cancelFix"
                        @keyup="cancelFix"
                    />
                </div>
            </div>
            <a
                id="image-download"
                download="map.png"
            >Test</a>
        </template>
    </ToolTemplate>
</template>

<style scoped lang="scss">
    $masterportal_blue: #244470;
    $prime_blue: #768ba6;

    #wind-simulation-addon {
        .section {
            width:100%;
            display:flex;
            flex-flow:row wrap;
            justify-content:center;
            margin:0px 0px 10px 0px;
            padding:20px 0px;
            border-bottom:1px solid #ccc;

            .section_head {
                flex:1 0 100%;
                display:flex;
                flex-flow:row wrap;
                justify-content:flex-start;
                padding:10px 0px;

                p {
                    font-size:110%;
                    line-height:20px;
                    color:black;
                }

                i {
                    font-size:16px;
                    margin-right:10px;
                }
            }

            button.head {
                display:flex;
                flex-flow:row wrap;
                justify-content:center;
                flex:auto;
                margin-right: 3px;
                padding:10px;

                &:last-child {
                    margin:0;
                }
                .bi {
                    flex:0 0 30px;
                    height:auto;
                }

                p {
                    flex-basis:auto;
                    flex-grow:0;
                    color:#222;
                }

                &.highlight {
                    background:$masterportal_blue;

                    p {
                        color:whitesmoke;
                    }

                    .bi {
                        color:whitesmoke;
                    }
                }
            }

            &.results {
                background:white;
            }

            &.draw {
                justify-content:space-between;
                align-items:center;

                .input {
                    display:flex;
                    flex-flow:row wrap;
                    justify-content:center;
                    align-items:center;

                    input {
                        width:20px;
                        margin-right:10px;
                    }

                    p {
                        font-size:110%;
                        margin:0;
                    }
                }
            }

            .row {
                display:flex;
                flex-flow:row wrap;
                justify-content:flex-start;
                align-items: center;
                flex: 1 0 100%;
                margin:3px 0px;

                p.value {
                        flex:0 0 70px;
                        margin-right:8px;
                        background:whitesmoke;
                        border:1px solid #ddd;
                        font-size:100%;
                        padding:5px;
                        text-align:center;
                    }

                .input {
                    display:flex;
                    flex-flow:row wrap;
                    justify-content: flex-start;
                    flex-basis:calc(100% - 80px);
                    padding-left:0px;

                    .labels {
                        flex: 1 0 100%;
                        display:flex;
                        flex-flow:row wrap;
                        justify-content:space-between;

                        .label {
                            position:relative;
                            flex-basis:auto;

                            p {
                                margin:0;
                                text-align:center;
                            }

                            &:after {
                                content:"";
                                position:absolute;
                                bottom:-5px;
                                left:50%;
                                transform:translateX(-50%);
                                width:1px;
                                height:5px;
                                background:#ccc;
                            }

                            &:first-child {
                                &:after {
                                    left:0;
                                    transform:translateX(0);
                                }
                            }

                            &:last-child {
                                &:after {
                                    left:auto;
                                    right:0;
                                    transform:translateX(0);
                                }
                            }
                        }
                    }
                }

                input.slider {
                    flex: 1 0 100%;
                    filter:grayscale(0.8);
                }
            }

            .legend {
                background:white;
                flex:1 0 100%;
                height:auto;

                &.noise {
                    .legend_wrapper {
                        .legend_unit {
                            flex-basis:11%;
                        }
                    }
                }

                p {
                    &.header {
                        margin: 10px 0px;
                        text-align: left;
                    }
                }

                .legend_wrapper {
                    width:100%;
                    display:flex;
                    flex-flow:row wrap;
                    justify-content:space-between;

                    .legend_unit {
                        display: flex;
                        flex-flow: row wrap;
                        flex-basis: 15%;
                        flex-grow: 0;

                        p {
                            flex:1 0 100%;
                            font-size:80%;

                            &.italic {
                                font-style:italic;
                            }
                        }

                        .color_block {
                            flex:1 0 100%;
                            height:20px;

                            &.blue_1 {
                                background:#458cbf;
                            }

                            &.blue_2 {
                                background:#95d3e0;
                            }

                            &.green {
                                background:#90c363;
                            }

                            &.yellow {
                                background:#f4ec7d;
                            }

                            &.orange {
                                background:#fbc46f;
                            }

                            &.red {
                                background:#ee7679
                            }

                            &.noise_0 {
                                background:#B8D6D1;
                            }

                            &.noise_1 {
                                background:#CEE4CC;
                            }

                            &.noise_2 {
                                background:#E2F2BF;
                            }

                            &.noise_3 {
                                background:#F3C683;
                            }

                            &.noise_4 {
                                background:#E87E4D;
                            }

                            &.noise_5 {
                                background:#CD463E;
                            }

                            &.noise_6 {
                                background:#A11A4D;
                            }
                            &.noise_7 {
                                background:#75085C;
                            }
                        }
                    }
                }
            }

            button {
                display:flex;
                flex-flow:row wrap;
                justify-content:center;
                align-items:center;
                padding:5px 10px;
                border:1px solid #444;

                &.draw {
                    background-color:$masterportal_blue;
                    color:white;
                }

                &.wide {
                    flex:1 0 100%;
                    padding:5px 20px;
                    background-color:$prime_blue;
                    border:1px solid $prime_blue;
                    color:whitesmoke;
                }

                &.disabled {
                    opacity:0.75;
                    filter:grayscale(1);
                    pointer-events:none;
                }

                .bi {
                    flex:0 0 20px;
                    margin:0px 3px;
                }

                p {
                    flex:1 0 auto;
                    color:whitesmoke;
                    line-height:normal;
                }
            }

            .pagination_wrapper {
                flex: 1 0 100%;
                display:flex;
                flex-flow:row wrap;
                justify-content:flex-end;

                .pagination_point {
                    flex:0 0 30px;
                    height:30px;
                    margin-right:2px;
                    border-radius:5px;
                    background:#ccc;
                    border:none;
                    padding:0;
                    &.active {
                        background:$prime_blue;

                        p {
                            color:whitesmoke;
                        }
                    }

                    p {
                        color:#222;
                        text-align:center;
                        margin:0;
                        width:100%;
                        line-height:30px;
                    }

                    &.blue {
                        background:$masterportal_blue;
                        color:whitesmoke;
                    }
                }
            }
        }

        #wind_modal {
            position:fixed;
            width:100vw;
            height:100vh;
            top:0;
            left:0;
            background:rgba(0,0,0,0.25);
            backdrop-filter: blur(3px);
            z-index:1000;

            .modal_body {
                position:absolute;
                z-index:3;
                top:50%;
                left:50%;
                width:500px;
                height:auto;
                transform: translate(-50%,-50%);
                border-radius: 5px;
                padding: 30px;
                background:white;
                -webkit-box-shadow: 0px 5px 15px -10px rgba(0,0,0,0.75);
                -moz-box-shadow: 0px 5px 15px -10px rgba(0,0,0,0.75);
                box-shadow: 0px 5px 15px -10px rgba(0,0,0,0.75);

                p {
                  color:red;

                  &.warn {
                    color:#222;
                    font-weight:700;
                    margin:10px 0px;
                  }
                }
            }

            .cancelFix {
                position:absolute;
                top:0;
                left:0;
                width:100%;
                height:100%;
                z-index:1;
            }
        }
    }
</style>
