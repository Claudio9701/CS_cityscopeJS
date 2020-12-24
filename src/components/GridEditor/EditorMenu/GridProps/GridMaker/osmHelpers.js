import * as osmtogeojson from "osmtogeojson"
import { featureCollection, buffer, envelope } from "turf"

function setLanduseType(feat) {
    if (['college','university'].includes(feat.properties.amenity)) {
      return 'Campus'
    } else if (feat.properties.building === 'industrial' || feat.properties.landuse === 'industrial' || 'industrial' in feat.properties) {
      return 'Industrial'
    } else if (feat.properties.office === 'educational_institution' || feat.properties.tourism ===  'museum' || ['language_school', 'music_school'].includes(feat.properties.amenity)) {
      return 'Institutional'
    } else if (feat.properties.railway === 'narrow_gauge') {
      return 'Light Industrial'
    }  else if (feat.properties.building === 'office' || 'office' in feat.properties) {
      return 'Office'
    } else if (['dog_park', 'park'].includes(feat.properties.leisure)) {
      return 'Park'
    } else if (['bicycle_parking', 'motorcycle_parking', 'parking'].includes(feat.properties.amenity) || feat.properties.building === 'parking') {
      return 'Parking'
    } else if (['detached','semidetached_house','dormitory','residential'].includes(feat.properties.building) || 'residential' in feat.properties || feat.properties.landuse === 'residential') {
      return 'Residential'
    }  else if (feat.properties.building === 'retail' || feat.properties.landuse === 'retail' || 'shop' in feat.properties) {
      return 'Retail'
    } else {
      return 'Residential'
    }
}

export const overpassQuery = `
    [timeout:120][out:json][bbox];
    (
      // Campus
      way["amenity"~"college|university"];
      node["amenity"~"college|university"];
      relation["amenity"~"college|university"];
      way["amenity"~"college|university"];
      node["amenity"~"college|university"];
      relation["amenity"~"college|university"];
      // Industrial
      way["building"="industrial"];
      node["building"="industrial"];
      relation["building"="industrial"];
      way["landuse"="industrial"];
      node["landuse"="industrial"];
      relation["landuse"="industrial"];
      way["industrial"];
      node["industrial"];
      relation["industrial"];
      // Institution
      way["office"="educational_institution"];
      node["office"="educational_institution"];
      relation["office"="educational_institution"];
      way["tourism"="museum"];
      node["tourism"="museum"];
      relation["tourism"="museum"];
      way["amenity"="language_school"];
      node["amenity"="language_school"];
      relation["amenity"="language_school"];
      way["amenity"="music_school"];
      node["amenity"="music_school"];
      relation["amenity"="music_school"];
      // Light Industrial
      way["railway"="narrow_gauge"];
      node["railway"="narrow_gauge"];
      relation["railway"="narrow_gauge"];
      // Office
      way["building"="office"];
      node["building"="office"];
      relation["building"="office"];
      way["office"];
      node["office"];
      relation["office"];
      // Park
      way["leisure"~"dog_park|park"];
      node["leisure"~"dog_park|park"];
      relation["leisure"~"dog_park|park"];
      // Parking
      way["amenity"~"bicycle_parking|motorcycle_parking|parking"];
      node["amenity"~"bicycle_parking|motorcycle_parking|parking"];
      relation["amenity"~"bicycle_parking|motorcycle_parking|parking"];
      way["building"="parking"];
      node["building"="parking"];
      relation["building"="parking"];
      // Residential
      way["building"~"detached|semidetached_house|dormitory|residential"];
      node["building"~"detached|semidetached_house|dormitory|residential"];
      relation["building"~"detached|semidetached_house|dormitory|residential"];
      way["landuse"="residential"];
      node["landuse"="residential"];
      relation["landuse"="residential"];
      way["residential"];
      node["residential"];
      relation["residential"];
      // Retail
      way["building"="retail"];
      node["building"="retail"];
      relation["building"="retail"];
      way["landuse"="retail"];
      node["landuse"="retail"];
      relation["landuse"="retail"];
      way["shop"];
      node["shop"];
      relation["shop"];
    );
    out body geom;
    `

export const fetchOverpassData = async ( query, bbox ) => {
    // Build query
    let overpassUrl = new URL('https://overpass-api.de/api/interpreter')
    let params = new URLSearchParams({
      'data': query,
      'bbox': bbox,
    })
    overpassUrl.search = params.toString();
    // Get data
    const response = await fetch(overpassUrl);
    const result = await response.json();
    return result
}

export const processOverpassData = async (overpassData, types) => {
    // Convert to geojson
    let osmData = await osmtogeojson(overpassData)
    // Process nodes
    let osmNodes = await featureCollection(osmData.features.filter(obj => obj.id.startsWith("node")));
    let osmNodesBuffer = await buffer(osmNodes, 0.01);
    let osmNodesEnvelope = await featureCollection(osmNodesBuffer.features.map(envelope));
    // Concatenate processed nodes with ways
    let osmWays = await featureCollection(osmData.features.filter(obj => obj.id.startsWith("way")));
    let osmPolygons = await featureCollection([...osmWays.features, ...osmNodesEnvelope.features])
    // Get landuse for each polygon using map features (osm tags)
    let osmPolygonsWithLanduse = await featureCollection(osmPolygons.features.map(feat => {
        feat.properties = {...feat.properties, ...types.filter(type => type.name === setLanduseType(feat))[0]}
        return feat
    }))
    return osmPolygonsWithLanduse
}
