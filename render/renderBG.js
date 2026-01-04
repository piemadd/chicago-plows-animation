import maplibregl from '@maplibre/maplibre-gl-native';
import style from './mapStyle.js';
import sharp from 'sharp';
import config from '../config.js';

const overallStyle = {
  zoom: 0,
  pitch: 0,
  center: [-97.84139698274907, 41.81914579981135],
  layers: style.layers,
  projection: { "type": 'mercator' },
  bearing: 0,
  sources: {
    protomaps: {
      type: "vector",
      tiles: [
        "https://v4mapa.amtraker.com/20251018/{z}/{x}/{y}.mvt",
        "https://v4mapb.amtraker.com/20251018/{z}/{x}/{y}.mvt",
        "https://v4mapc.amtraker.com/20251018/{z}/{x}/{y}.mvt",
        "https://v4mapd.amtraker.com/20251018/{z}/{x}/{y}.mvt"
      ],
      maxzoom: 15,
    },
  },
  version: 8,
  metadata: {},
};

let map = new maplibregl.Map();
map.load(style);

const asyncMapRender = (renderOptions) => {
  return new Promise((resolve, reject) => {
    map.render(renderOptions, (err, buffer) => {
      if (err) reject(err);
      resolve(buffer);
    })
  })
};

const asyncSaveImage = (buffer, fileName, sharpOptions) => {
  return new Promise((resolve, reject) => {
    var image = sharp(buffer, sharpOptions);

    // Convert raw image buffer to PNG
    image.toFile(`./render/${fileName}.png`, function (err) {
      if (err) reject(err);
      resolve();
    });
  })
};


asyncMapRender({
  zoom: config.centerZoom,
  width: config.width,
  height: config.height,
  center: [config.centerLon, config.centerLat],
  bearing: 0,
  pitch: 0,
})
  .then((mapImageBuffer) => {
    asyncSaveImage(mapImageBuffer, 'bg', {
      raw: {
        width: config.width,
        height: config.height,
        channels: 4,
      },
    });
  });