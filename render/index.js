import fs from 'fs';
import maplibregl from '@maplibre/maplibre-gl-native';
import * as turf from "@turf/turf";
import sharp from 'sharp';
import config from '../config.js';

/*
Timelapse of S&S Snowplows Dec 6th-8th
I have a program running, archiving the positions of every snowplow run by the Chicago Department of Streets and Sanitation once per minute and compiled the data from a few weeks ago into a timelapse. For those interested in the rendering pipleline, I'm using maplibre-gl-native and sharp via nodejs to render the frames and combining them with ffmpeg.
*/

const imageBG = sharp('./render/bg.png');
const fgTemplate = fs.readFileSync('./fgTemplate.svg', { encoding: 'utf8' });

const overallStyle = {
  zoom: 0,
  pitch: 0,
  center: [-97.84139698274907, 41.81914579981135],
  layers: [],
  projection: { "type": 'mercator' },
  bearing: 0,
  sources: {},
  version: 8,
  metadata: {},
};

if (!fs.existsSync('./render/out')) fs.mkdirSync('./render/out');

let map = new maplibregl.Map();
map.load(overallStyle);

const asyncMapRender = (renderOptions) => {
  return new Promise((resolve, reject) => {
    map.render(renderOptions, (err, buffer) => {
      if (err) reject(err);
      resolve(buffer);
    })
  })
};

const convertFileNameToDate = (fileName) => {
  const dC = fileName.split('.')[0].split('_');
  return new Date(`${dC[0]}-${dC[1]}-${dC[2]}T${dC[3]}:${dC[4]}:${dC[5]}.000Z`);
};

const convertDateToPlainEnglish = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    //year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    //hourCycle: "h24",
    timeZone: "America/Chicago",
    //timeZoneName: 'short',
  }).format(date);
}

const asyncSaveImage = async (buffer, fileName, sharpOptions) => {
  const mapImage = await sharp(buffer, sharpOptions).png().toBuffer();
  const fgImg = await sharp(Buffer.from(fgTemplate.replace('Jan 01, 0000, 00:00 AM', convertDateToPlainEnglish(convertFileNameToDate(fileName))))).png().toBuffer();

  await imageBG
    .composite([
      { input: mapImage },
      { input: fgImg },
    ])
    .toFile(`./render/out/${fileName.split('.')[0]}.png`);
}

const asyncSaveMapImage = async (listOfFiles) => {
  for (let i = 0; i < listOfFiles.length; i++) {
    const fileName = listOfFiles[i];

    if (!fs.existsSync(`./render/out/${fileName.split('.')[0]}.png`)) {
      const mapImageBuffer = await asyncMapRender({
        zoom: config.centerZoom,
        width: config.width,
        height: config.height,
        center: [config.centerLon, config.centerLat],
        bearing: 0,
        pitch: 0,
      });

      await asyncSaveImage(mapImageBuffer, fileName, {
        raw: {
          width: config.width,
          height: config.height,
          channels: 4,
        },
      });
    }

    console.log(`Done rendering with file ${fileName} : ${i + 1} / ${listOfFiles.length} (${((100 * (i + 1)) / listOfFiles.length).toFixed(2)}%)`)
    changeMapState(fileName, i == 0 ? fileName : listOfFiles[i - 1]);
  };
};

const CHICAGO_PLOWS_MIN_LON = -88.0;
const CHICAGO_PLOWS_MIN_LAT = 41.6;

const decompressPlows = (chunk) => {
  const arrayOfRawPlows = chunk.match(/.{1,3}/g);

  if (!arrayOfRawPlows) return {
    "type": "FeatureCollection",
    "features": [],
  };

  const plowsAsPoints = arrayOfRawPlows.map((rawPlow) => {
    const plowID = rawPlow.charCodeAt(0);
    const plowLon = (rawPlow.charCodeAt(1) / 100000) + CHICAGO_PLOWS_MIN_LON;
    const plowLat = (rawPlow.charCodeAt(2) / 100000) + CHICAGO_PLOWS_MIN_LAT;

    return {
      "type": "Feature",
      "properties": {
        plowID,
      },
      "geometry": {
        "coordinates": [
          plowLon,
          plowLat
        ],
        "type": "Point"
      }

    };
  }).filter((plow) => plow.geometry.coordinates[0] && plow.geometry.coordinates[1])

  return {
    "type": "FeatureCollection",
    "features": plowsAsPoints,
  };
};

const decompressHeatmap = (chunk) => {
  const heatmapAsPoints = chunk.map((rawPoint) => {
    const pointLon = (rawPoint[0] / 100000) + CHICAGO_PLOWS_MIN_LON;
    const pointLat = (rawPoint[1] / 100000) + CHICAGO_PLOWS_MIN_LAT;

    return {
      "type": "Feature",
      "properties": {
        value: rawPoint[2],
      },
      "geometry": {
        "coordinates": [
          pointLon,
          pointLat
        ],
        "type": "Point"
      }

    };
  }).filter((point) => point.geometry.coordinates[0] && point.geometry.coordinates[1])

  return {
    "type": "FeatureCollection",
    "features": heatmapAsPoints,
  };
};


const initializeMarkers = (listOfFilesToRender) => {
  const fileName = listOfFilesToRender[0];
  const fileDataRaw = fs.readFileSync(`./data/${fileName}`, { encoding: 'utf8' });
  const fileDataRawHeatmap = JSON.parse(fs.readFileSync(`./data_heatmap/${fileName.split('.')[0]}.json`, { encoding: 'utf8' }));

  const convertedFile = decompressPlows(fileDataRaw);
  const processedHeatMap = decompressHeatmap(fileDataRawHeatmap);

  map.addSource(fileName + '_heatmap', {
    type: 'geojson',
    data: processedHeatMap
  });

  map.addLayer({
    'id': fileName + '_heatmap',
    'type': 'heatmap',
    'source': fileName + '_heatmap',
    'paint': {
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'value'],
        0,
        0,
        480,
        1
      ],
      'heatmap-intensity': 6,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(33,102,172,0)',
        0.2,
        'rgb(103,169,207)',
        0.4,
        'rgb(209,229,240)',
        0.6,
        'rgb(253,219,199)',
        0.8,
        'rgb(239,138,98)',
        1,
        'rgb(178,24,43)'
      ],
      'heatmap-radius': 2,
      'heatmap-opacity': 0.3
    }
  });

  map.addSource(fileName, {
    type: 'geojson',
    data: convertedFile
  });

  map.addLayer({
    'id': fileName,
    'type': 'circle',
    'source': fileName,
    'paint': {
      'circle-radius': 3,
      'circle-color': "#e40000",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1,
    }
  });

  asyncSaveMapImage(listOfFilesToRender);
};

const changeMapState = (fileName, previousFileName) => {
  map.removeLayer(previousFileName);
  map.removeSource(previousFileName);
  map.removeLayer(previousFileName + '_heatmap');
  map.removeSource(previousFileName + '_heatmap');

  const fileData = fs.readFileSync(`./data/${fileName}`, { encoding: 'utf8' });
  const fileDataRawHeatmap = JSON.parse(fs.readFileSync(`./data_heatmap/${fileName.split('.')[0]}.json`, { encoding: 'utf8' }));

  const convertedFile = decompressPlows(fileData);
  const processedHeatMap = decompressHeatmap(fileDataRawHeatmap);

  map.addSource(fileName + '_heatmap', {
    type: 'geojson',
    data: processedHeatMap
  });

  map.addLayer({
    'id': fileName + '_heatmap',
    'type': 'heatmap',
    'source': fileName + '_heatmap',
    'paint': {
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'value'],
        0,
        0,
        480,
        1
      ],
      'heatmap-intensity': 6,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0.0, 'rgba(0, 0, 255, 0)',
        0.2, 'rgba(0, 133, 167, 1)',
        0.4, 'rgba(0, 160, 0, 1)',
        0.6, 'rgba(196, 196, 0, 1)',
        0.8, 'rgb(255, 128, 0)',
        1.0, 'rgba(255, 0, 0, 1)'
      ],
      'heatmap-radius': 2,
      'heatmap-opacity': 0.7
    }
  });

  map.addSource(fileName, {
    type: 'geojson',
    data: convertedFile
  });

  map.addLayer({
    'id': fileName,
    'type': 'circle',
    'source': fileName,
    'paint': {
      'circle-radius': 3,
      'circle-color': "#e40000",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1,
    }
  });
};

// getting list of files 
const listOfFilesToRender = fs.readdirSync('./data');

initializeMarkers(listOfFilesToRender);