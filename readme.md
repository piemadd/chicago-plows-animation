# Chicago Plows Animation

For starters, this codebase is an absolute mess. Prepare for anything and EVERYTHING to break upon modification.

**NODE 22 IS REQUIRED**
I recommend something like NVM for that.

## Installation

You know the drill. 

```bash
git clone https://github.com/piemadd/chicago-plows-animation
cd chicago-plows-animation
npm install
```

## Running

### Downloading Data
This is the stupidest part. All of the data is stored in Cloudflare R2 and you WILL get ratelimited multiple times. You can modify the `https://query-chicago-plows-data-v1.piero.workers.dev` URL within `./render/donwload.js`, adding query parameters `year`, `month`, and/or `date` if you please, or you can just make an animation with every data packet saved. Occasionally you'll get a connection reset error and you just have to restart the download script until all data is downloaded. Its painful, I know, but I can't just whitelist everyone out there.

### Actual Rendering
Follow these steps CAREFULLY (after downloading)
- `node ./render/createEmpties.js` - clones files to make sure every minute has a frame, not required but recommended
- `node ./render/generateHeatmapData.js` - generates the heatmaps
- `node ./render/index.js` - the actual rendering script, and the biggest mess
- `bash merge.sh` - just ffmpeg to spit out a single mp4

ok have fun, or not

## File Format
While the data files seem to be ordinary txt, they are not. Inside is a series of UTF-16 encoded characters, with every 3 characters representing a snowplow ID, longitude, and latitude.
Decoding the ID is fairly straightforward: just get the character code, like so:
```js
const plowID = rawPlow.charCodeAt(0);
```
While the longitude and latitude are slightly more complex (due to me truncating and offsetting the data to save space), it follows pretty much the same concept. Get the character code, divide by 100,000, and then add the bounding box minimum value to that, like so:
```js
const CHICAGO_PLOWS_MIN_LON = -88.0;
const CHICAGO_PLOWS_MIN_LAT = 41.6;
const plowLon = (rawPlow.charCodeAt(1) / 100000) + CHICAGO_PLOWS_MIN_LON;
const plowLat = (rawPlow.charCodeAt(2) / 100000) + CHICAGO_PLOWS_MIN_LAT;
```

All of this together leaves you with a function like this (`chunk` is a string of characters, presumed to have a length divisible by three):
```js
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
```