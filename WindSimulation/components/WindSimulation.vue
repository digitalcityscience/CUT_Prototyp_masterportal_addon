<script>
import AuthLogIn from "./AuthLogIn.vue";
import ToolTemplate from "../../../src/modules/tools/ToolTemplate.vue";
import {mapGetters, mapMutations} from "vuex";
import getters from "../store/gettersWindSimulation";
import mutations from "../store/mutationsWindSimulation";
import VectorSource from "ol/source/Vector.js";
import Polygon, {fromExtent} from "ol/geom/Polygon";
import GeoJSON from "ol/format/GeoJSON";
import {getSize, getCenter} from "ol/extent";
import LoaderOverlay from "../../../src/utils/loaderOverlay.js";
import Feature from "ol/Feature";
import ApiService from "../services/service.js";
import AuthService from "../services/authservice.js";
import Draw from "ol/interaction/Draw.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import {Stroke, Style, Fill} from "ol/style";
import VectorLayer from "ol/layer/Vector";
import Select from "ol/interaction/Select";
import {pointerMove} from "ol/events/condition";
import intersect from "@turf/intersect";
import buffer from "@turf/buffer";
import NoiseModal from "../contents/noise.vue";
import WindModal from "../contents/wind.vue";

export default {
    name: "WindSimulation",
    components: {
        AuthLogIn,
        ToolTemplate,
        WindModal,
        NoiseModal
    },
    data () {
        return {
            gridLayer: null,
            highlightLayer: null,
            workingLayer: null,
            type: "wind",
            result: {},
            dataSets: [],
            draw: null,
            square: null,
            activeSet: 0,
            counter: 0,
            buttonActive: false,
            squareActive: false,
            drawActive: false,
            noDrawing: true,
            showDrawing: true,
            showStreets: true,
            min: 0,
            max: 80,
            minNoise: 0,
            maxNoise: 100,
            windSpeed: 40,
            windDirection: 180,
            maxSpeed50: 50,
            maxSpeed30: 30,
            trafficQuota: 50,
            img: null,
            // these are for the error modal
            modalActive: false,
            modalMessage: null,
            // these are for the info modal
            showModal: false,
            modalContent: null,
            windModel: null,
            fixedExtent: null,
            logout: false,
            showAllOfType: false
        };
    },
    computed: {
        ...mapGetters("Tools/WindSimulation", Object.keys(getters)),
        ...mapGetters("Maps", ["projection", "projectionCode"]),
        source () {
            return this.workingLayer.getSource();
        },
        dataSetsLength () {
            return this.dataSets.length;
        },
        hasMultipleSetsSingleWithType () {
            const countOfType = this.dataSets.filter(dataset => dataset.type === this.type).length;

            return countOfType >= 2;
        }
    },
    watch: {
        active () {
            if (this.active && this.showGrid && this.authenticated) {
                this.toggleGrid(true);
            }
            else {
                this.toggleGrid(false);
            }
        },
        type () {
            this.resetInputs();

            if (this.showAllOfType) {
                this.rerenderForShowAll();
            }
        },
        showGrid () {
            if (this.active && this.showGrid && this.authenticated) {
                this.toggleGrid(true);
            }
            else {
                this.toggleGrid(false);
            }
        },
        authenticated () {
            if (this.active && this.showGrid && this.authenticated) {
                this.toggleGrid(true);
            }
            else {
                this.toggleGrid(false);
            }
        },
        activeSet (newValue, oldValue) {
            if (this.dataSets[newValue]) {
                this.windDirection = this.dataSets[newValue].windDirection;
                this.windSpeed = this.dataSets[newValue].windSpeed;
                this.showDrawing = this.dataSets[newValue].showDrawing;
                this.type = this.dataSets[newValue].type;
                this.results = this.dataSets[newValue].results;

                if (this.dataSets[oldValue].showDrawing === this.dataSets[newValue].showDrawing) {
                    this.rerenderVectorLayer();
                }
            }
            else {
                this.rerenderVectorLayer();
            }

        },
        dataSetsLength (newValue, oldValue) {
            if (newValue > oldValue && newValue > 1) {
                this.activeSet = newValue - 1;
            }

            if (newValue < oldValue) {
                this.activeSet -= 1;
            }

            if (newValue === 0) {
                this.activeSet = 0;
            }
        },
        showDrawing () {
            this.dataSets[this.activeSet].showDrawing = this.showDrawing;
            this.rerenderVectorLayer();
        },
        showStreets () {
            this.rerenderVectorLayer();
        },
        showAllOfType () {
            if (this.showAllOfType) {
                this.rerenderForShowAll();
            }
            else {
                this.rerenderVectorLayer();
            }
        }
    },
    created () {
        this.map = mapCollection.getMap("2D");
        this.apiService = new ApiService(this.url, this.urlWindSuffix, this.urlNoiseSuffix);
        this.createVectorLayer();

        this.source.on("addfeature", this.updateFeatures);
        this.source.on("removefeature", this.updateFeatures);
        this.$on("close", this.close);
    },
    /**
     * Put initialize here if mounting occurs after config parsing
     * @returns {void}
     */
    async mounted () {
        if (!this.refreshToken & !this.authenticated) {
            const refreshToken = localStorage.getItem("refreshToken"),
                loginSaved = localStorage.getItem("loginSaved"),
                oldAccessToken = localStorage.getItem("oldAccessToken");


            if (loginSaved && refreshToken && oldAccessToken) {
                try {
                    const response = await AuthService.refresh(refreshToken, oldAccessToken);

                    if (response.access_token) {
                        localStorage.setItem("oldAccessToken", response.access_token);
                        this.setAccessToken(response.access_token);
                        this.setAuthenticated(true);
                    }

                }
                catch (error) {
                    console.error(error);
                }
            }
        }

        this.loadGrid();
        this.applyTranslationKey(this.name);
    },
    methods: {
        ...mapMutations("Tools/WindSimulation", Object.keys(mutations)),
        createVectorLayer () {
            /* WEBGL Implementation (needs to be updated)
            const attributes = {
                    id: "dcs_simulations",
                    source: new VectorSource(),
                    disableHitDetection: false,
                    name: "dcs_simulations",
                    typ: "VectorBase",
                    gfiAttributes: "showAll",
                    opacity: 1,
                    // renderer: "webgl",
                    styleId: undefined
                },
                layer = webgl.createLayer(attributes);*/

            this.workingLayer = new VectorLayer({
                source: new VectorSource(),
                name: "dcs_simulations",
                id: "dcs_simulations"
            });

            this.workingLayer.setZIndex(10002);
            this.map.addLayer(this.workingLayer);
        },
        loadGrid () {
            fetch("/portal/dcs/assets/grid.geojson").then(response => {
                return response.json();
            }).then(geojsonData => {
                this.gridLayer = new VectorLayer({
                    id: "gridLayer",
                    name: "gridLayer",
                    source: new VectorSource({
                        features: new GeoJSON().readFeatures(geojsonData, {
                            dataProjection: "EPSG:4326",
                            featureProjection: this.projection
                        })
                    }),
                    style: new Style({
                        stroke: new Stroke({
                            color: "#CFF0FF",
                            width: 1
                        }),
                        fill: new Fill({
                            color: "rgba(255, 255, 255, 0.35)"
                        })
                    }),
                    visible: false
                });

                this.highlightLayer = new VectorLayer({
                    id: "gridHighlight",
                    source: new VectorSource(),
                    style: new Style({
                        stroke: new Stroke({
                            color: "#58AED6",
                            width: 3
                        }),
                        fill: new Fill({
                            color: "rgba(0, 0, 0, 0)"
                        })
                    }),
                    visible: false
                });

                this.gridLayer.setZIndex(10000);
                this.highlightLayer.setZIndex(10001);
                this.map.addLayer(this.gridLayer);
                this.map.addLayer(this.highlightLayer);
                this.addInteraction();
            });
        },
        addInteraction () {
            // save context for callback functions
            // eslint-disable-next-line
            const vm = this;

            this.selectInteraction = new Select({
                condition: pointerMove,
                layers: [this.gridLayer],
                style: new Style({
                    stroke: new Stroke({
                        color: "#58AED6",
                        width: 3
                    }),
                    fill: new Fill({
                        color: "rgba(0, 0, 0, 0)"
                    })
                })
            });

            this.map.addInteraction(this.selectInteraction);

            // push feature to highlightLayer to prevent stroke overlap
            this.selectInteraction.on("select", evt => {
                const selected = evt.selected,
                    deselected = evt.deselected;

                if (deselected.length > 0) {
                    this.highlightLayer.getSource().removeFeature(deselected[0]);
                }

                if (selected.length > 0) {
                    this.highlightLayer.getSource().addFeature(selected[0]);
                }
            });

            // make cursor pointer on hover
            this.map.on("pointermove", evt => {
                if (evt.dragging) {
                    return;
                }

                const pixel = this.map.getEventPixel(evt.originalEvent),
                    hit = this.map.hasFeatureAtPixel(pixel);

                this.map.getTargetElement().style.cursor = hit ? "pointer" : "";
            });

            // make grid clickable and send selected Feature to working layer
            this.map.on("singleclick", function (evt) {
                // context of this got lost in callback function, so using saved state from const
                vm.map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
                    if (layer.get("id") === "gridLayer") {
                        const clonedFeature = feature.clone(),
                            uid = vm.createUniqueId();

                        clonedFeature.setId("draw-" + vm.dataSets.length);
                        clonedFeature.set("featType", "drawing");
                        clonedFeature.set("dataset", uid);

                        vm.removeExistingFeature();
                        vm.workingLayer.getSource().addFeature(clonedFeature);
                        vm.rerenderVectorLayer();
                    }
                });
            });
        },
        /**
         * setting the gridLayer and it's highlightLayer visible or invisible
         * @param {Boolen} value true or false
         * @returns {void}
         */
        toggleGrid (value) {
            this.gridLayer.setVisible(value);
            this.highlightLayer.setVisible(value);
        },
        updateFeatures () {
            if (this.source.getFeatures().find(feature => feature.getId() === "draw-" + this.dataSets.length)) {
                this.noDrawing = false;
            }
            else {
                this.noDrawing = true;
            }
        },
        /**
         * NOT IN THE CURRENT BUILD: this function used to create a boundingbox via OpenLayers free draw - left here due to non-destructive workflow
         * @returns {void}
         */
        createDraw () {
            if (this.buttonActive) {
                this.buttonActive = false;
            }
            else {
                this.squareActive = false;
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
                    const order = this.dataSets.length;

                    if (this.dataSets.length && this.dataSets.find(dataSet => dataSet.id === this.activeSet)) {
                        this.activeSet = this.dataSets.length;
                    }

                    event.feature.setId("draw-" + order); // give the feature an id
                    event.feature.set("featType", "drawing");
                    event.feature.set("strokeWidth", "5px");
                    this.removeExistingFeature();
                    this.createExtent(event.feature);
                    this.drawActive = false;
                });

                this.map.on("pointerup", () => {
                    if (this.drawActive) {
                        this.draw.finishDrawing();
                        this.map.removeInteraction(this.draw);
                        this.buttonActive = false;
                        this.rerenderVectorLayer();
                    }
                });

                this.map.addInteraction(this.draw);
            }
        },
        /**
         * NOT IN THE CURRENT BUILD: this function used to create a square bounding box via OpenLayers draw - left here due to non-destructive workflow
         * @returns {void}
         */
        createSquare () {
            if (this.squareActive) {
                this.squareActive = false;
            }
            else {
                this.buttonActive = false;
                this.squareActive = true;

                const maxEdgeLength = 500;

                this.square = new Draw({
                    source: this.source,
                    type: "Circle",
                    geometryFunction: function (coordinates, geometry) {
                        const center = coordinates[0],
                            last = coordinates[1],
                            dx = center[0] - last[0],
                            dy = center[1] - last[1],
                            radius = Math.sqrt(dx * dx + dy * dy),

                            // Calculate the restricted distance based on the maximum edge length
                            restrictedRadius = Math.min(radius, maxEdgeLength),
                            angle = Math.atan2(dy, dx),
                            restrictedDX = restrictedRadius * Math.cos(angle),
                            restrictedDY = restrictedRadius * Math.sin(angle),

                            // Calculate the coordinates for the square
                            halfEdgeLength = Math.min(restrictedDX, restrictedDY),
                            topLeft = [center[0] - halfEdgeLength, center[1] + halfEdgeLength],
                            topRight = [center[0] + halfEdgeLength, center[1] + halfEdgeLength],
                            bottomLeft = [center[0] - halfEdgeLength, center[1] - halfEdgeLength],
                            bottomRight = [center[0] + halfEdgeLength, center[1] - halfEdgeLength],
                            squareCoordinates = [topLeft, bottomLeft, bottomRight, topRight, topLeft];


                        // Update the geometry coordinates
                        if (!geometry) {
                            // eslint-disable-next-line
                            geometry = new Polygon([squareCoordinates]);
                        }
                        else {
                            geometry.setCoordinates([squareCoordinates]);
                        }

                        return geometry;
                    }
                });

                this.square.on("drawstart", () => {
                    this.drawActive = true;
                });

                this.square.on("drawend", (event) => {
                    const order = this.dataSets.length;

                    if (this.dataSets.length && this.dataSets.find(dataSet => dataSet.id === this.activeSet)) {
                        this.activeSet = this.dataSets.length;
                    }

                    event.feature.setId("draw-" + order); // give the feature a id
                    event.feature.set("featType", "drawing");
                    this.removeExistingFeature();
                    this.createStyle(event.feature);
                    this.drawActive = false;
                    this.square.finishDrawing();
                    this.map.removeInteraction(this.square);
                    this.squareActive = false;

                });

                this.map.addInteraction(this.square);
            }
        },
        /**
         * NOT IN THE CURRENT BUILD: this function is building the square extent from the free draw function
         * @param {Feature} feature this function takes the feature created from the createDraw() function and creates an extent
         * @returns {void}
         */
        createExtent (feature) {
            const extent = feature.getGeometry().getExtent(),
                sizeCheck = getSize(extent),
                polygonStyle = new Style({
                    stroke: new Stroke({
                        color: "red",
                        width: 3
                    }),
                    fill: null
                });

            if (sizeCheck[0] > 500 || sizeCheck[1] > 500) {
                const x = sizeCheck[0] >= 500 ? this.$t("additional:modules.tools.windSimulation.x500") : null,
                    y = sizeCheck[1] >= 500 ? this.$t("additional:modules.tools.windSimulation.y500") : null;

                this.modalMessage = [x, y].join(",");
                this.modalActive = true;
                this.fixExtent(extent, sizeCheck[0], sizeCheck[1]);
            }

            feature.setGeometry(fromExtent(extent));
            feature.setStyle(polygonStyle);
        },
        createStyle (feature) {
            const polygonStyle = new Style({
                stroke: new Stroke({
                    color: "red",
                    width: 3
                }),
                fill: null
            });

            feature.setStyle(polygonStyle);
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
            const order = this.dataSets.length,
                polygonStyle = new Style({
                    stroke: new Stroke({
                        color: "red",
                        width: 3
                    }),
                    fill: null
                });

            this.removeExistingFeature();

            this.fixedExtent.setId("draw-" + order);
            this.fixedExtent.setStyle(polygonStyle);
            this.source.addFeature(this.fixedExtent);
            this.rerenderVectorLayer();
            this.modalActive = false;
        },
        cancelFix () {
            this.removeExistingFeature();
            this.modalActive = false;
        },
        removeExistingFeature () {
            if (this.source.getFeatures().length) {
                const featureExists = this.source.getFeatures().find(feature => feature.getId() === "draw-" + this.dataSets.length);

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
        getFeature (value) {
            if (this.source.getFeatures().length) {
                const featureExists = value ? this.source.getFeatures().find(feature => feature.getId() === "draw-" + value) : this.source.getFeatures().find(feature => feature.getId() === "draw-" + this.activeSet);

                if (featureExists) {
                    const featureCopy = featureExists.clone();

                    return featureCopy;
                }
            }

            return null;
        },
        async simulateWind () {
            LoaderOverlay.show();
            const format = new GeoJSON(),
                feature = this.getFeature(this.dataSets.length),
                featureJson = format.writeFeatureObject(feature, {dataProjection: "EPSG:4326", featureProjection: this.projection}),
                bufferedArea = buffer(featureJson, 100, {units: "meters"}),
                boundingBox = bufferedArea.geometry.coordinates[0],
                featureCollection = {
                    type: "FeatureCollection",
                    features: [
                        {
                            type: "Feature",
                            properties: {},
                            geometry: {
                                coordinates: [boundingBox],
                                type: "Polygon"
                            }
                        }
                    ]
                },
                dataSet = {
                    id: this.type + "-" + this.activeSet + "-" + this.counter,
                    results: null,
                    type: this.type,
                    area: featureJson,
                    bufferedArea: bufferedArea,
                    dataset: feature.get("dataset"),
                    windSpeed: this.windSpeed,
                    windDirection: this.windDirection,
                    showDrawing: this.showDrawing,
                    img: null
                },
                buildings = await this.apiService.getBuildings(featureCollection, this.accessToken),
                prepareApiDataSet = {
                    wind_speed: parseInt(this.windSpeed, 10) / 3.6, // wind_speed in m/s
                    wind_direction: parseInt(this.windDirection, 10),
                    buildings: buildings.data
                },
                task = await this.apiService.postWindData(prepareApiDataSet, this.accessToken),
                taskId = task.data.job_id,
                taskStatus = await this.getTaskStatus(taskId, "wind");

            if (taskStatus === "SUCCESS") {
                const taskResult = await this.apiService.getTaskResult(taskId, this.accessToken);

                this.results = taskResult.data.result.geojson.features;
                dataSet.results = taskResult.data.result.geojson.features;

                await this.addFeaturesToVectorLayer(dataSet);
                this.dataSets.push(dataSet);
                // this.rerenderVectorLayer();
                this.map.getView().fit(feature.getGeometry().getExtent());
                await this.createPNG();
                this.counter += 1;
                LoaderOverlay.hide();
            }
        },
        async simulateNoise () {
            LoaderOverlay.show();
            const format = new GeoJSON(),
                feature = this.getFeature(this.dataSets.length),
                featureJson = format.writeFeatureObject(feature, {dataProjection: "EPSG:4326", featureProjection: this.projection}),
                bufferedArea = buffer(featureJson, 100, {units: "meters"}),
                boundingBox = bufferedArea.geometry.coordinates[0],
                featureCollection = {
                    type: "FeatureCollection",
                    features: [
                        {
                            type: "Feature",
                            properties: {},
                            geometry: {
                                coordinates: [boundingBox],
                                type: "Polygon"
                            }
                        }
                    ]
                },
                dataSet = {
                    id: this.type + "-" + this.activeSet + "-" + this.counter,
                    results: null,
                    type: this.type,
                    area: featureJson,
                    bufferedArea: bufferedArea,
                    dataset: feature.get("dataset"),
                    maxSpeed30: this.maxSpeed30,
                    maxSpeed50: this.maxSpeed50,
                    trafficQuota: this.trafficQuota,
                    showDrawing: this.showDrawing,
                    img: null
                },
                /* apiSet for Mock-API
                prepareApiDataSet = {
                    bbox: format.writeFeatureObject(feature, {dataProjection: "EPSG:4326", featureProjection: this.projection}).geometry.coordinates[0],
                    calculation_settings: {
                        max_speed: this.maxSpeed50,
                        traffic_quota: this.trafficQuota
                    }
                },*/
                streets = await this.apiService.getStreets(featureCollection, this.accessToken),
                buildings = await this.apiService.getBuildings(featureCollection, this.accessToken),
                prepareApiDataSet = {
                    buildings: buildings.data,
                    roads: this.adjustStreets(streets.data)
                },
                task = await this.apiService.postNoiseData(prepareApiDataSet, this.accessToken),
                taskId = task.data.job_id,
                taskStatus = await this.getTaskStatus(taskId, "noise");

            if (taskStatus === "SUCCESS") {
                const taskResult = await this.apiService.getTaskResultNoise(taskId, this.accessToken);

                this.results = taskResult.data.result.geojson.features;
                dataSet.results = taskResult.data.result.geojson.features;
                dataSet.streets = this.adjustStreets(streets.data);

                await this.addFeaturesToVectorLayer(dataSet);
                this.dataSets.push(dataSet);
                // this.rerenderVectorLayer();
                this.map.getView().fit(feature.getGeometry().getExtent());
                await this.createPNG();
                this.counter += 1;
                LoaderOverlay.hide();
            }
        },
        async getTaskStatus (taskId, taskType) {
            let loop = true;

            while (loop) {
                const response = await this.apiService.getTaskStatus(taskId, taskType, this.accessToken);

                if (response.data.status === "SUCCESS" || response.data.job_state === "FAILURE") {
                    return response.data.status;
                }
                else if (response.data.status === "PENDING") {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                else {
                    loop = false;
                    return null;
                }
            }

            return null;
        },
        async addFeaturesToVectorLayer (dataSet) {
            const format = new GeoJSON(),
                turfPolygon = dataSet.area;

            this.results.forEach((feature, index) => {
                const cutFeature = intersect(turfPolygon, feature),
                    properties = feature.properties;

                if (intersect(turfPolygon, feature)) {
                    let color,
                        polygonStyle = {};
                    // create openlayers feature from JSON
                    const feat = format.readFeature(cutFeature, {featureProjection: this.projection});

                    feat.setProperties(properties);
                    feat.setId(dataSet.id + "-" + index);
                    feat.set("type", this.type);
                    feat.set("source", dataSet.id);
                    feat.set("featType", "simulation");
                    feat.set("dataset", dataSet.dataset);

                    if (this.type === "wind") {
                        color = this.colorSpace.wind[feat.get("value")];
                    }

                    if (this.type === "noise") {
                        color = this.colorSpace.noise[feat.get("value")];
                    }

                    feat.set("styling", color);

                    polygonStyle = new Style({
                        fill: new Fill({
                            color: color
                        })
                    });

                    feat.setStyle(polygonStyle);

                    this.source.addFeature(feat);
                }
            });

            // add streets to map as well
            if (dataSet.type === "noise" && dataSet.streets) {
                dataSet.streets.features.forEach((street, index) => {
                    if (street.geometry && street.geometry.coordinates) {
                        const properties = street.properties,

                            // create openlayers feature from JSON
                            feat = format.readFeature(street.geometry, {featureProjection: this.projection}),
                            streetStyle = new Style({
                                stroke: new Stroke({
                                    width: properties.max_speed / 10,
                                    color: "white"})
                            });

                        feat.setProperties(properties);
                        feat.setId(dataSet.id + "-street-" + index);
                        feat.set("type", this.type);
                        feat.set("source", dataSet.id);
                        feat.set("featType", "street");
                        feat.set("dataset", dataSet.dataset);
                        feat.setStyle(streetStyle);

                        this.source.addFeature(feat);
                    }
                });
            }

            this.source.changed();
        },
        rerenderVectorLayer () {
            if (this.source.getFeatures().length) {
                this.source.getFeatures().forEach(feature => {
                    if (feature.get("featType") === "drawing") {
                        if (feature.getId() === "draw-" + this.dataSets.length) {
                            const polygonStyle = new Style({
                                stroke: new Stroke({
                                    color: "red",
                                    width: 3
                                }),
                                fill: null
                            });

                            feature.setStyle(polygonStyle);

                        }
                        else if (feature.getId() === "draw-" + this.activeSet) {
                            /* OLD LOGIC WITH DRAWING VISIBLE ON MAP if (!this.dataSets[this.activeSet].showDrawing) {
                                feature.setStyle(null);
                            }
                            else if (this.dataSets[this.activeSet].showDrawing) {
                                const polygonStyle = new Style({
                                    stroke: new Stroke({
                                        color: "red",
                                        width: 3
                                    }),
                                    fill: null
                                });

                                feature.setStyle(polygonStyle);
                            }*/

                            const polygonStyle = new Style({
                                stroke: new Stroke({
                                    color: "red",
                                    width: 1
                                }),
                                fill: null
                            });

                            feature.setStyle(polygonStyle);
                        }
                        else {
                            feature.setStyle(new Style({}));
                        }
                    }

                    if (feature.get("featType") === "simulation") {
                        if (feature.get("source") === this.dataSets[this.activeSet].id) {
                            const color = feature.get("styling"),
                                polygonStyle = new Style({
                                    fill: new Fill({
                                        color: color
                                    })
                                });

                            feature.setStyle(polygonStyle);
                        }
                        else {
                            feature.setStyle(new Style({}));
                        }
                    }

                    if (feature.get("featType") === "street") {
                        if (this.showStreets) {
                            if (feature.get("source") === this.dataSets[this.activeSet].id) {
                                const stroke = feature.get("max_speed") / 10,
                                    streetStyle = new Style({
                                        stroke: new Stroke({
                                            color: "white",
                                            width: stroke
                                        })
                                    });

                                feature.setStyle(streetStyle);
                            }
                            else {
                                feature.setStyle(new Style({}));
                            }
                        }
                        else {
                            feature.setStyle(new Style({}));
                        }
                    }
                });

                this.source.changed();
            }
        },
        rerenderForShowAll () {
            if (this.source.getFeatures().length) {
                this.source.getFeatures().forEach(feature => {
                    if (feature.get("featType") === "simulation" && feature.get("type") === this.type) {
                        const color = feature.get("styling"),
                            polygonStyle = new Style({
                                fill: new Fill({
                                    color: color
                                })
                            });

                        feature.setStyle(polygonStyle);
                    }

                    else {
                        feature.setStyle(new Style({}));
                    }
                });
            }

            this.source.changed();
        },
        adjustStreets (streets) {
            streets.features.forEach(street => {
                if (street.properties.traffic_settings_adjustable) {
                    // adjust speed
                    if (street.properties.max_speed === 30) {
                        street.properties.max_speed = parseInt(this.maxSpeed30, 10);
                    }
                    else if (street.properties.max_speed === 50) {
                        street.properties.max_speed = parseInt(this.maxSpeed50, 10);
                    }

                    // adjust traffic amounts
                    street.properties.truck_traffic_daily = street.properties.truck_traffic_daily * (parseInt(this.trafficQuota, 10) / 100);
                    street.properties.car_traffic_daily = street.properties.car_traffic_daily * (parseInt(this.trafficQuota, 10) / 100);
                }
            });

            return streets;
        },
        async createPNG () {

            try {
                const mapOnceResult = await this.waitForMapOnce();

                this.dataSets[this.activeSet].img = mapOnceResult;
                this.map.renderSync();
            }
            catch (error) {
                // Handle any errors that may occur
                console.error(error);
            }
        },
        downloadPNG () {
            const link = document.createElement("a");

            link.href = this.dataSets[this.activeSet].img;
            link.download = "dcs_simulation_tile_" + this.dataSets[this.activeSet].type;
            link.click();
        },
        waitForMapOnce () {
            // eslint-disable-next-line
            return new Promise((resolve, reject) => {
                this.map.once("rendercomplete", function (map) {
                    let dataResult = null;
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
                                    // eslint-disable-next-line
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

                    dataResult = mapCanvas.toDataURL();
                    resolve(dataResult);
                });
            });
        },
        zoomToActiveTile () {
            const feature = this.getFeature(0);

            this.map.getView().fit(feature.getGeometry().getExtent());
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
        resetInputs () {
            this.windSpeed = 40;
            this.windDirection = 180;
            this.maxSpeed50 = 50;
            this.maxSpeed30 = 30;
            this.trafficQuota = 50;
        },
        removeSet (activeSet) {
            this.removeFeaturesFromLayer(this.dataSets[activeSet].dataset);
            this.dataSets.splice(activeSet, 1);
            this.updateDrawFeatureIds();

            if (this.activeSet >= 1) {
                this.activeSet -= 1;
            }
            else {
                this.activeSet = 0;
            }
        },
        removeFeaturesFromLayer (uid) {
            const featuresToRemove = [],
                source = this.workingLayer.getSource();

            source.forEachFeature((feature) => {
                if (feature.get("dataset") === uid) {
                    featuresToRemove.push(feature);
                }
            });

            featuresToRemove.forEach((feature) => {
                source.removeFeature(feature);
            });
        },
        updateDrawFeatureIds () {
            this.dataSets.forEach((dataSet, index) => {
                this.layer.getSource().getFeatures().forEach((feature) => {
                    if (feature.get("featType") === "drawing" && feature.get("dataset") === dataSet.dataset) {
                        feature.setId(`draw-${index}`);
                    }
                });
            });
        },
        createUniqueId () {
            return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        },
        logoutUser () {
            AuthService.logout(this.refreshToken, this.accessToken);
            this.setAuthenticated(false);
            this.close();
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
            const model = Radio.request("ModelList", "getModelByAttributes", {id: this.$store.state.Tools.WindSimulation.id});

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
                <AuthLogIn v-if="!authenticated" />
                <div
                    v-if="authenticated"
                    class="addon_wrapper"
                >
                    <div class="header">
                        <h3 class="sub_title">
                            {{ $t('additional:modules.tools.windSimulation.sub_title') }}
                        </h3>
                        <button
                            class="logout"
                            @click="logout = !logout"
                        >
                            <i class="bi bi-person-fill" />
                        </button>
                        <div
                            v-if="logout"
                            class="logout_input"
                        >
                            <p>{{ $t('additional:modules.tools.windSimulation.auth.logout') }}</p>
                            <button
                                @click="logoutUser"
                            >
                                {{ $t('additional:modules.tools.windSimulation.auth.logoutConfirm') }}
                            </button>
                        </div>
                    </div>
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
                        <button
                            class="head disabled"
                            :class="{highlight: type === 'abm'}"
                            @click="type = 'abm'"
                        >
                            <i class="bi bi-people-fill" />
                            <p>{{ $t('additional:modules.tools.windSimulation.title_pedestrians') }}</p>
                        </button>
                        <button
                            class="head disabled"
                            :class="{highlight: type === 'stormwater'}"
                            @click="type = 'stormwater'"
                        >
                            <i class="bi bi-cloud-lightning-rain-fill" />
                            <p>{{ $t('additional:modules.tools.windSimulation.title_stormwater') }}</p>
                        </button>
                        <button
                            class="head disabled"
                            :class="{highlight: type === 'sun'}"
                            @click="type = 'sun'"
                        >
                            <i class="bi bi-sun-fill" />
                            <p>{{ $t('additional:modules.tools.windSimulation.title_sun') }}</p>
                        </button>
                    </div>
                    <div class="section draw">
                        <!-- DRAW BUTTONS (not used anymore)
                        button
                            :class="{draw: buttonActive}"
                            @click="createDraw()"
                        >
                            <i class="bi bi-pencil" />
                        </button>
                        <button
                            :class="{draw: squareActive}"
                            @click="createSquare()"
                        >
                            <i class="bi bi-pencil-square" />
                        </button>-->
                        <div
                            v-if="dataSets[activeSet] && dataSets[activeSet].type === 'noise' && dataSets[activeSet].results"
                            class="input"
                        >
                            <!--eslint-disable-next-line-->
                            <input
                                id="show_streets"
                                v-model="showStreets"
                                type="checkbox"
                            >
                            <div class="label">
                                <p>{{ $t('additional:modules.tools.windSimulation.showStreets') }}</p>
                            </div>
                        </div>
                        <div class="input">
                            <!--eslint-disable-next-line-->
                            <input
                                id="show_drawing"
                                type="checkbox"
                                checked
                                @change="toggleGrid($event.target.checked)"
                            >
                            <div class="label">
                                <p>{{ $t('additional:modules.tools.windSimulation.showGrid') }}</p>
                            </div>
                        </div>
                        <button
                            class="reset_button"
                            @click="resetInputs"
                        >
                            <i class="bi bi-arrow-counterclockwise" />
                        </button>
                    </div>
                    <template v-if="type === 'wind'">
                        <div class="section info">
                            <h4>{{ $t('additional:modules.tools.windSimulation.header.wind') }}</h4>
                            <p>{{ $t('additional:modules.tools.windSimulation.contents.wind') }}</p>
                        </div>
                        <h5 class="break_title">
                            {{ $t('additional:modules.tools.windSimulation.settings') }}
                        </h5>
                        <div class="section params">
                            <button
                                class="info_button"
                                @click="showModal = true"
                            >
                                <i class="bi bi-info" />
                            </button>
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
                                        step="10"
                                        class="simulation_slider slider"
                                    >
                                </div>
                                <p
                                    class="value"
                                    :class="{error: !windSpeed}"
                                >
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
                                        min="0"
                                        max="360"
                                        value="180"
                                        step="15"
                                        class="simulation_slider slider"
                                    >
                                </div>
                                <p
                                    class="value"
                                    :class="{error: !windDirection}"
                                >
                                    {{ windDirection }}° {{ calculateDirection(windDirection) }}
                                </p>
                            </div>
                            <div
                                v-if="noDrawing"
                                class="hint"
                            >
                                <i class="bi bi-exclamation-triangle" />
                                <p>{{ $t('additional:modules.tools.windSimulation.noDrawing') }}</p>
                            </div>
                            <div
                                v-if="!windSpeed || !windDirection"
                                class="hint"
                            >
                                <i class="bi bi-exclamation-triangle" />
                                <p>{{ $t('additional:modules.tools.windSimulation.noParams') }}</p>
                            </div>
                            <button
                                class="wide run_sim"
                                :class="{disabled: noDrawing || !windSpeed || !windDirection}"
                                @click="simulateWind()"
                            >
                                <i class="bi bi-wind" />
                                <p>{{ $t('additional:modules.tools.windSimulation.runSimulation') }}</p>
                            </button>
                        </div>
                    </template>
                    <template v-if="type === 'noise'">
                        <div class="section info">
                            <h4>{{ $t('additional:modules.tools.windSimulation.header.noise') }}</h4>
                            <p>{{ $t('additional:modules.tools.windSimulation.contents.noise') }}</p>
                        </div>
                        <h5 class="break_title">
                            {{ $t('additional:modules.tools.windSimulation.settings') }}
                        </h5>
                        <!-- eslint-disable-next-line -->
                        <div class="section params">
                            <button
                                class="info_button"
                                @click="showModal = true"
                            >
                                <i class="bi bi-info" />
                            </button>
                            <div class="section_head">
                                <i class="bi bi-car-front" />
                                <p><strong>{{ $t('additional:modules.tools.windSimulation.params_noise') }}</strong></p>
                            </div>
                            <span class="sub_section">
                                <div class="row">
                                    <div class="road_sign">
                                        30
                                    </div>
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
                                            v-model="maxSpeed30"
                                            type="range"
                                            :min="minNoise"
                                            :max="maxNoise"
                                            step="10"
                                            value="30"
                                            class="simulation_slider slider"
                                        >
                                    </div>
                                    <p
                                        class="value"
                                        :class="{error: !maxSpeed30}"
                                    >
                                        {{ maxSpeed30 }} km/h
                                    </p>
                                </div>
                                <div class="row">
                                    <div class="road_sign">
                                        50
                                    </div>
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
                                            v-model="maxSpeed50"
                                            type="range"
                                            :min="minNoise"
                                            :max="maxNoise"
                                            step="10"
                                            value="50"
                                            class="simulation_slider slider"
                                        >
                                    </div>
                                    <p
                                        class="value"
                                        :class="{error: !maxSpeed50}"
                                    >
                                        {{ maxSpeed50 }} km/h
                                    </p>
                                </div>
                            </span>
                            <p><strong>{{ $t('additional:modules.tools.windSimulation.params_noise_2') }}</strong></p>
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
                                <p
                                    class="value"
                                    :class="{error: !trafficQuota}"
                                >
                                    {{ trafficQuota }} %
                                </p>
                            </div>
                            <div class="section simulation">
                                <div
                                    v-if="noDrawing"
                                    class="hint"
                                >
                                    <i class="bi bi-exclamation-triangle" />
                                    <p>{{ $t('additional:modules.tools.windSimulation.noDrawing') }}</p>
                                </div>
                                <div
                                    v-if="!trafficQuota || !maxSpeed30 || !maxSpeed50"
                                    class="hint"
                                >
                                    <i class="bi bi-exclamation-triangle" />
                                    <p>{{ $t('additional:modules.tools.windSimulation.noParams') }}</p>
                                </div>
                                <button
                                    class="wide"
                                    :class="{disabled: noDrawing || !trafficQuota || !maxSpeed30 || !maxSpeed50}"
                                    @click="simulateNoise()"
                                >
                                    <i class="bi bi-car-front" />
                                    <p>{{ $t('additional:modules.tools.windSimulation.runSimulation') }}</p>
                                </button>
                            </div>
                        </div>
                    </template>
                    <h5
                        v-if="dataSets.length && dataSets[activeSet]"
                        class="break_title"
                    >
                        {{ $t('additional:modules.tools.windSimulation.results') }}
                    </h5>
                    <div class="section results">
                        <div
                            v-if="dataSets.length && dataSets[activeSet]"
                            class="result set"
                        >
                            <!--eslint-disable-next-line-->
                            <div
                                v-if="dataSets[activeSet].img"
                                class="image_placeholder"
                                @click="zoomToActiveTile"
                                @keyup="zoomToActiveTile"
                            >
                                <img
                                    alt=""
                                    :src="dataSets[activeSet].img"
                                >
                                <div class="hover_box">
                                    <i class="bi bi-zoom-in" />
                                    <p>{{ $t('additional:modules.tools.windSimulation.zoomToTile') }}</p>
                                </div>
                            </div>
                            <p>Ergebnistabelle von Simulationsset #{{ activeSet + 1 }}</p>
                            <!--<p> {{ dataSets[activeSet] }}</p>-->
                        </div>
                        <template v-if="type === 'wind' && dataSets.length">
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
                                        <img
                                            src="assets/img/wind_1.png"
                                            alt="Sitting Long"
                                        >
                                    </li>
                                    <li class="legend_unit">
                                        <p class="italic">
                                            2.5m/s - 4m/s
                                        </p>
                                        <div class="color_block blue_2" />
                                        <p>
                                            Sitting Short
                                        </p>
                                        <img
                                            src="assets/img/wind_2.png"
                                            alt="Sitting Short"
                                        >
                                    </li>
                                    <li class="legend_unit">
                                        <p class="italic">
                                            4m/s - 6m/s
                                        </p>
                                        <div class="color_block green" />
                                        <p>
                                            Walking Slow
                                        </p>
                                        <img
                                            src="assets/img/wind_3.png"
                                            alt="Walking Slow"
                                        >
                                    </li>
                                    <li class="legend_unit">
                                        <p class="italic">
                                            5m/s - 8m/s
                                        </p>
                                        <div class="color_block yellow" />
                                        <p>
                                            Walking Fast
                                        </p>
                                        <img
                                            src="assets/img/wind_4.png"
                                            alt="Walking Fast"
                                        >
                                    </li>
                                    <li class="legend_unit">
                                        <p class="italic">
                                            8m/s - 10m/s
                                        </p>
                                        <div class="color_block orange" />
                                        <p>
                                            Uncomfortable
                                        </p>
                                        <img
                                            src="assets/img/wind_5.png"
                                            alt="Uncomfortable"
                                        >
                                    </li>
                                    <li class="legend_unit">
                                        <p class="italic">
                                            > 10m/s
                                        </p>
                                        <div class="color_block red" />
                                        <p>
                                            Dangerous
                                        </p>
                                        <img
                                            src="assets/img/wind_6.png"
                                            alt="Dangerous"
                                        >
                                    </li>
                                </div>
                            </div>
                        </template>
                        <template v-if="type === 'noise' && dataSets.length">
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
                        <div
                            v-if="dataSets.length && dataSets[activeSet] && dataSets[activeSet].img"
                            class="download"
                        >
                            <button
                                class="image-download"
                                @click="downloadPNG"
                            >
                                <i class="bi bi-download" />
                                <p>{{ $t('additional:modules.tools.windSimulation.Download') }}</p>
                            </button>
                        </div>
                    </div>
                    <div
                        v-if="dataSets.length"
                        class="section pagination"
                    >
                        <div
                            v-if="hasMultipleSetsSingleWithType"
                            class="show_all"
                        >
                            <input
                                id="show_all_of_type"
                                v-model="showAllOfType"
                                type="checkbox"
                            >
                            <label for="show_all_of_type">{{ $t('additional:modules.tools.windSimulation.showAll') }} {{ type }}</label>
                        </div>
                        <div
                            class="pagination_wrapper"
                            :class="{disabled: showAllOfType}"
                        >
                            <button
                                v-for="(set, i) in dataSets"
                                :key="set.id"
                                class="pagination_point"
                                :class="{
                                    highlight: showAllOfType && set.type === type,
                                    blur: showAllOfType && set.type !== type,
                                    active: i === activeSet
                                }"
                                @click="setPagination('set', i)"
                            >
                                <p>{{ i + 1 }}</p>
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
                            <button
                                class="pagination_point red"
                                @click="removeSet(activeSet)"
                            >
                                <i class="bi bi-trash-fill" />
                            </button>
                        </div>
                    </div>
                </div>
                <div
                    v-if="showModal"
                    id="info_modal"
                    class="info_modal"
                    @close="showModal = false"
                >
                    <div class="modal_body">
                        <template v-if="type === 'noise'">
                            <NoiseModal />
                        </template>
                        <template v-if="type === 'wind'">
                            <WindModal />
                        </template>
                        <button
                            class="cancel"
                            @click="showModal = false"
                        >
                            <i class="bi bi-x" />
                        </button>
                    </div>
                    <!--eslint-disable-next-line-->
                    <div
                        class="close_modal"
                        @click="showModal = false"
                    />
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
                    <!--eslint-disable-next-line-->
                    <div
                        class="cancelFix"
                        @click="cancelFix"
                        @keyup="cancelFix"
                    />
                </div>
            </div>
        </template>
    </ToolTemplate>
</template>

<style scoped lang="scss">
    @import "../utils/variables.scss";

    #wind-simulation-addon {
        min-height: 100%;
        display: flex;
        flex-flow: row wrap;
        align-items: center;
        .header {
            display: flex;
            flex-flow: row wrap;
            justify-content: space-between;
            .sub_title {
                font-size:120%;
                color:#444;
                border:none;
                padding:0;
                margin:0;
            }

            .logout {
                flex:0 0 30px;
                height:30px;
                background:whitesmoke;
                border-radius:5px;
                border:none;
                font-size: 16px;
            }

            .logout_input {
                display:flex;
                flex-flow:row wrap;
                flex:1 0 100%;
                background:whitesmoke;
                border-radius:5px;
                padding:10px;
                box-sizing: border-box;

                p {
                    line-height:30px;
                    font-family:system-ui;
                }

                button {
                    height:30px;
                    padding:5px 10px;
                    box-sizing: border-box;
                    background:$masterportal_blue;
                    color:whitesmoke;
                    border:none;
                    border-radius:5px;
                    font-family:system-ui;
                    margin-left:5px;
                }
            }
        }


        .break_title {
            display:block;
            position:relative;
            font-size: 120%;
            font-weight: 300;
            margin: 10px 0px;
            color: #444;
            &:after {
                top: 50%;
                transform: translateY(-50%);
                left: 70px;
                width: 100%;
                height: 0.5px;
                background: #ccc;
            }
        }
        .section {
            position:relative;
            width:100%;
            display:flex;
            flex-flow:row wrap;
            justify-content:flex-start;
            margin:0px 0px 10px 0px;
            padding:20px 0px;
            // border-bottom:1px solid #ccc;

            .info_button {
                width:30px;
                flex: 0 0 30px;
                height:30px;
                position:absolute;
                top:-35px;
                right:0;
                font-size:16px;
                border-radius:5px;
                border:none;
            }

            .hint {
                display:flex;
                flex-flow:row wrap;
                justify-content:center;
                padding:5px;
                width:70%;
                border-radius:5px;
                background: #F0DA2E;
                margin: 30px auto 5px auto;
                align-items: baseline;

                i {
                    color:lightcoral;
                    flex:20px;
                    flex-grow:0;
                    margin-right:5px;
                }

                p {
                    font-size:12px;
                    flex:auto;
                    flex-grow:0;
                }
            }

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
                flex-flow:row nowrap;
                justify-content:center;
                flex:auto;
                flex-grow:0;
                margin-right: 3px;
                margin-bottom:3px;
                padding:10px;
                background:$coup_blue_1;
                border:1px solid $coup_blue_1;

                .bi {
                    flex:0 0 30px;
                    height:auto;
                    color:whitesmoke;
                }

                p {
                    flex-basis:auto;
                    flex-grow:0;
                    margin:0 20px 0 0;
                    color:whitesmoke;
                }

                &.highlight {
                    background:$coup_blue_2;
                    border:1px solid whitesmoke;
                }

                &.disabled {
                    opacity:0.8;
                    pointer-events:none;
                }
            }

            &.results {
                background:white;

                .result {
                    width:100%;

                    .image_placeholder {
                        display:block;
                        position:relative;
                        width:100%;

                        img {
                            width:100%;
                            height:auto;
                        }

                        .hover_box {
                            pointer-events: none;
                            position:absolute;
                            display:flex;
                            flex-flow:row wrap;
                            justify-content: center;
                            align-content: center;
                            top:0;
                            left:0;
                            width:100%;
                            height:100%;
                            background:rbga(0,0,0,0.25);
                            backdrop-filter:blur(3px);
                            opacity:0;
                            transition:0.3s;

                            .bi, p {
                                flex: 1 0 100%;
                                color:whitesmoke;
                                text-align:center;
                            }

                            .bi {
                                font-size:30px;
                            }

                            p {
                                font-weight:500;
                                font-size:120%;
                            }
                        }

                        &:hover {
                            cursor:pointer;

                            .hover_box {
                                opacity:1;
                                transition:0.3s;
                            }
                        }

                    }
                }
            }

            &.draw {
                border:none;
                background:#eee;
                padding:20px;
                justify-content:space-between;
                align-items:center;

                .input {
                    display:flex;
                    flex-flow:row wrap;
                    justify-content:center;
                    align-items:center;
                    margin:0 0 0 auto;

                    input {
                        width:20px;
                        margin-right:10px;
                    }

                    p {
                        font-size:110%;
                        margin:0;
                    }
                }

                button {
                    margin-right:3px;
                }

                .reset_button {
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    width: 30px;
                    height: 30px;
                    margin-left: 20px;
                    background: whitesmoke;
                }
            }

            &.params {
                background:#eee;
                padding:20px;

                .sub_section {
                    width:100%;
                    padding:15px;
                    background: rgba(0,0,40, 0.05);
                    border-radius:3px;
                    margin-bottom:10px;

                    .input {
                        flex-basis:calc(100% - 120px);
                    }

                    .road_sign {
                        display:flex;
                        flex-flow:row wrap;
                        justify-content:center;
                        align-items:center;
                        width:30px;
                        height:30px;
                        margin-right:10px;
                        border:3px solid red;
                        border-radius:50%;
                        background: white;
                        color: #222;
                        padding-top: 3px;
                        font-weight: 900;
                    }
                }

                .run_sim {
                    margin:10px 0px;
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
                        flex:1 0 70px;
                        margin-right:0px;
                        background:whitesmoke;
                        border:1px solid #ddd;
                        font-size:100%;
                        padding:5px;
                        text-align:center;

                        &.error {
                            outline:1px solid red;
                        }
                    }

                .input {
                    display:flex;
                    flex-flow:row wrap;
                    justify-content: flex-start;
                    flex-basis:calc(100% - 84px);
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
                        position:relative;
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

                        img {
                            width: 15px;
                            height: auto;
                            position: absolute;
                            top: 50%;
                            left: 5px;
                            transform: translateY(-50%);
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

                &.image-download {
                    width:200px;
                    display:flex;
                    flex-flow:row wrap;
                    justify-content:center;
                    border:none;
                    border-radius:5px;
                    margin:5px 0px 5px auto;

                    .bi {
                        flex-basis:30px;
                        margin-right:10px;
                    }

                    p {
                        flex-basis:auto;
                        color:#222;
                    }

                    &:hover {
                        background:$masterportal_blue;

                        p, .bi {
                            color:whitesmoke;
                        }
                    }
                }

                &.draw {
                    background-color:$masterportal_blue;
                    color:white;
                }

                &.wide {
                    flex:1 0 100%;
                    padding:10px 20px;
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

            .show_all {
                display:flex;
                align-items:center;
                margin: 5px 5px 10px auto;

                label {
                    margin-left:10px;
                }
            }

            .pagination_wrapper {
                flex: 1 0 100%;
                display:flex;
                flex-flow:row wrap;
                justify-content:flex-end;

                &.disabled {
                    pointer-events:none;
                    opacity: 0.75;
                    filter:blur(1px);
                }

                .pagination_point {
                    flex:0 0 30px;
                    height:30px;
                    margin-right:2px;
                    border-radius:5px;
                    background:#ccc;
                    border:none;
                    padding:0;

                    &.highlight {
                        border:1px solid #222;
                    }

                    &.blur {
                        opacity:0.5,
                    }

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
                        background:$coup_blue_1;
                        color:whitesmoke;
                    }

                    &.red {
                        background:$error_red;
                    }
                }
            }

            .download {
                width:100%;
            }
        }

        #wind_modal, #info_modal {
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
                max-height:65vh;
                transform: translate(-50%,-50%);
                border-radius: 5px;
                padding: 30px;
                background:white;
                -webkit-box-shadow: 0px 5px 15px -10px rgba(0,0,0,0.75);
                -moz-box-shadow: 0px 5px 15px -10px rgba(0,0,0,0.75);
                box-shadow: 0px 5px 15px -10px rgba(0,0,0,0.75);
                overflow-y:auto;

                p {
                  color:red;

                  &.warn {
                    color:#222;
                    font-weight:700;
                    margin:10px 0px;
                  }
                }

                .cancel {
                    position:absolute;
                    top:5px;
                    right:5px;
                    border:none;
                    border-radius:5px;
                    font-size:16px;
                }
            }

            .cancelFix, .close_modal {
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
