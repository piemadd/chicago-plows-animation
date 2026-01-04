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