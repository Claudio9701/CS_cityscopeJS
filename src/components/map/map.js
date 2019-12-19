/* global window */
import React, { Component } from "react";
import { StaticMap } from "react-map-gl";
import DeckGL from "@deck.gl/react";
import { TripsLayer } from "@deck.gl/geo-layers";
import "mapbox-gl/dist/mapbox-gl.css";
import { HeatmapLayer, PathLayer, GeoJsonLayer } from "deck.gl";
import { LightingEffect, AmbientLight, _SunLight } from "@deck.gl/core";

export default class Map extends Component {
    constructor(props) {
        super(props);
        this.state = {
            cityIOmodulesData: {},
            menu: [],
            isDragging: false,
            pickedCellsState: null,
            toggleBuildingShow: "none",
            time: 0,
            viewState: {
                longitude: -71.0894527,
                latitude: 42.3603609,
                zoom: 17,
                pitch: 0,
                bearing: 0
            }
        };
        const ambientLight = new AmbientLight({
            color: [255, 255, 255],
            intensity: 1
        });
        const dirLight = new _SunLight({
            timestamp: Date.UTC(2019, 7, 1, 10),
            color: [255, 255, 255],
            intensity: 1.0,
            _shadow: true
        });
        this.day = Date.UTC(2019, 7, 1, this.state.time);
        const lightingEffect = new LightingEffect({ ambientLight, dirLight });
        lightingEffect.shadowColor = [0, 0, 0, 0.3];
        this._effects = [lightingEffect];
        this.colors = {
            idle: [255, 255, 255, 200],
            hovered: [77, 195, 255, 200],
            picked: [255, 51, 204, 200],
            water: [100, 100, 100, 200],
            scale: [
                [213, 62, 79],
                [252, 141, 89],
                [254, 224, 139],
                [230, 245, 152],
                [153, 213, 148],
                [50, 136, 189]
            ]
        };
        this.animationFrame = null;
        this.startSimHour = 60 * 60 * 7;
        this.endSimHour = 60 * 60 * 14;
        this.animationSpeed = 10;
        this._onViewStateChange = this._onViewStateChange.bind(this);
    }

    _onViewStateChange({ viewState }) {
        this.setState({ viewState });
    }

    _setViewStateToTableHeader() {
        const header = this.props.cityIOmodulesData.header;
        this.setState({
            viewState: {
                ...this.state.viewState,
                longitude: header.spatial.longitude,
                latitude: header.spatial.latitude,
                zoom: 14,
                pitch: 0,
                bearing: 180 - header.spatial.rotation
            }
        });
    }

    _animate() {
        // stop animation on toggle
        if (
            this.animationFrame &&
            !this.state.menu.includes("ABM") &&
            !this.state.menu.includes("SUN")
        ) {
            window.cancelAnimationFrame(this.animationFrame);
            return;
        }
        const { startSimHour, animationSpeed, endSimHour } = this;
        let t = this.state.time + animationSpeed;
        if (this.state.time > endSimHour || this.state.time < startSimHour) {
            t = startSimHour;
        }
        this.setState({
            time: t
        });
        this._animationFrame = window.requestAnimationFrame(
            this._animate.bind(this)
        );
        // this._calculateSunPosition();
    }

    /**
     * Description. calculates the sun position
     * to fit the `_animate` time
     */
    _calculateSunPosition() {
        // const menu = this.state.menu;
        // if (!menu.includes("SUN")) return;

        var date = new Date(this.state.time * 1000);
        // Hours part from the timestamp
        var hours = date.getHours();
        // Minutes part from the timestamp
        var minutes = "0" + date.getMinutes();
        // Seconds part from the timestamp
        var seconds = "0" + date.getSeconds();
        this._effects[0].directionalLights[0].timestamp = Date.UTC(
            2019,
            7,
            1,
            hours,
            minutes,
            seconds
        );
    }

    componentWillUnmount() {
        if (this.animationFrame) {
            window.cancelAnimationFrame(this.animationFrame);
        }
    }

    componentDidMount() {
        this._animate();
        this._rightClickViewRotate();
        this._setViewStateToTableHeader();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.cityIOmodulesData !== prevProps.cityIOmodulesData) {
            this.setState({ cityIOmodulesData: this.props.cityIOmodulesData });
            this._proccessGridData();
            this._proccessAccessData();
        }
    }

    /**
     * Description. gets `props` with geojson
     * and procces the interactive area
     */
    _proccessGridData() {
        let d = this.props.cityIOmodulesData;
        const grid = d.grid;
        const geojson = d.meta_grid;
        const interactiveMapping = d.interactive_grid_mapping;
        for (let i in interactiveMapping) {
            geojson.features[interactiveMapping[i]].properties.type =
                grid[i][0];

            geojson.features[
                interactiveMapping[i]
            ].properties.color = this.colors.scale[grid[i][0]];
        }
        this.setState({ meta_grid: geojson });
    }

    /**
     * Description. gets `props` with geojson
     * and procces the access layer data
     */
    _proccessAccessData() {
        const p = this.props.cityIOmodulesData.access;
        let coordinates = p.features.map(d => d.geometry.coordinates);
        let values = p.features.map(d => d.properties);
        let heatmap = [];
        for (let i = 0; i < coordinates.length; i++) {
            heatmap.push({
                coordinates: coordinates[i],
                values: values[i]
            });
        }
        this.setState({ access: heatmap });
    }

    /**
     * Description. fix deck issue
     * with rotate right botton
     */
    _rightClickViewRotate() {
        document
            .getElementById("deckgl-wrapper")
            .addEventListener("contextmenu", evt => evt.preventDefault());
    }

    _mulipleObjPicked = e => {
        return this.deckGL.pickObjects({
            x: e.x - 10,
            y: e.y - 10,
            width: 20,
            height: 20
        });
    };

    _handlePicking = e => {
        /*
            allow only to pick cells that are
            not of CityScope TUI & that are interactable
            so to not overlap TUI activity  
            */

        const multiSelectedObj = this._mulipleObjPicked(e);

        multiSelectedObj.forEach(picked => {
            const pickedProps = picked.object.properties;
            if (pickedProps.land_use === "M1" && !pickedProps.interactive) {
                pickedProps.old_height = pickedProps.height;
                pickedProps.old_color = pickedProps.color;
                pickedProps.color = this.colors.picked;
                pickedProps.height = 50;
            }
        });
        this.setState({
            pickedCellsState: multiSelectedObj
        });
    };

    _handleDrag = bool => {
        this.setState({ isDragging: bool });
    };

    _renderLayers() {
        // const menu = this.state.menu;
        const cityIOmodulesData = this.props.cityIOmodulesData;

        let layers = [
            new GeoJsonLayer({
                id: "GRID",
                data: this.state.meta_grid,
                visible: true,
                // menu.includes("GRID") ? true : false,
                pickable: true,
                extruded: true,
                lineWidthScale: 1,
                lineWidthMinPixels: 2,
                getElevation: d =>
                    d.properties.land_use === "M1" ? d.properties.height : 1,
                getFillColor: d =>
                    d.properties.type !== undefined
                        ? d.properties.color
                        : d.properties.color
                        ? d.properties.color
                        : d.properties.land_use === "M1"
                        ? this.colors.idle
                        : this.colors.water,

                onDrag: event => {
                    if (this.state.menu.includes("EDIT")) {
                        this._handlePicking(event);
                    }
                },
                onDragStart: () => {
                    if (this.state.menu.includes("EDIT"))
                        this._handleDrag(true);
                },
                onDragEnd: () => {
                    this._handleDrag(false);
                },

                updateTriggers: {
                    getFillColor: this.state.pickedCellsState,
                    getElevation: this.state.pickedCellsState
                },
                transitions: {
                    getFillColor: 500,
                    getElevation: 250
                }
            }),

            new TripsLayer({
                id: "ABM",
                visible: true,
                // menu.includes("ABM") ? true : false,
                data: cityIOmodulesData.ABM,
                getPath: d => d.path,
                getTimestamps: d => d.timestamps,
                getColor: d => {
                    //switch between modes or types of users
                    switch (d.mode[1]) {
                        case 0:
                            return [255, 0, 0];
                        case 1:
                            return [0, 0, 255];
                        case 2:
                            return [0, 255, 0];
                        default:
                            return [0, 0, 0];
                    }
                },
                getWidth: 2,
                opacity: 0.8,
                rounded: true,
                trailLength: 200,
                currentTime: this.state.time
            }),

            new PathLayer({
                id: "PATHS",
                visible: true,
                // menu.includes("PATHS") ? true : false,
                _shadow: false,
                data: cityIOmodulesData.ABM,
                getPath: d => {
                    const noisePath =
                        Math.random() < 0.5
                            ? Math.random() * 0.00005
                            : Math.random() * -0.00005;
                    for (let i in d.path) {
                        d.path[i][0] = d.path[i][0] + noisePath;
                        d.path[i][1] = d.path[i][1] + noisePath;
                        d.path[i][2] = 200;
                    }
                    return d.path;
                },
                getColor: d => {
                    switch (d.mode[1]) {
                        case 0:
                            return [255, 0, 0];
                        case 1:
                            return [0, 0, 255];
                        case 2:
                            return [0, 255, 0];
                        default:
                            return [0, 0, 0];
                    }
                },
                opacity: 0.2,
                getWidth: 1
            }),

            new HeatmapLayer({
                id: "ACCESS",
                visible: true,
                // menu.includes("ACCESS") ? true : false,
                colorRange: this.colors.scale,
                radiusPixels: 200,
                opacity: 0.25,
                data: this.state.access,
                getPosition: d => d.coordinates,
                getWeight: d => d.values.housing
            })
        ];
        return layers;
    }

    _onWebGLInitialized = gl => {
        this.setState({ gl });
    };

    _onMapLoad = () => {
        const map = this._map;
        map.addLayer({
            id: "3dBuildingsLayer",
            displayName: "3dBuildingsLayer",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 10,
            paint: {
                "fill-extrusion-color": "#fff",
                "fill-extrusion-height": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    0.1,
                    10,
                    15.05,
                    ["get", "height"]
                ],
                "fill-extrusion-opacity": 0.5
            }
        });
        map.setLayoutProperty("3dBuildingsLayer", "visibility", "visible");
    };

    render() {
        const { gl } = this.state;
        return (
            <div>
                <DeckGL
                    ref={ref => {
                        // save a reference to the Deck instance
                        this.deckGL = ref && ref.deck;
                    }}
                    viewState={this.state.viewState}
                    onViewStateChange={this._onViewStateChange}
                    className="map"
                    layers={this._renderLayers()}
                    effects={this._effects}
                    controller={{ dragPan: !this.state.isDragging }}
                >
                    <StaticMap
                        asyncRender={true}
                        ref={ref => {
                            // save a reference to the mapboxgl.Map instance
                            this._map = ref && ref.getMap();
                        }}
                        gl={gl}
                        dragRotate={true}
                        reuseMaps={true}
                        mapboxApiAccessToken={
                            process.env.REACT_APP_MAPBOX_TOKEN
                        }
                        mapStyle={process.env.REACT_APP_MAPBOX_STYLE}
                        preventStyleDiffing={true}
                        onLoad={this._onMapLoad}
                    />
                </DeckGL>
            </div>
        );
    }
}