import fs, { promises } from 'fs';

if (fs.existsSync('./data_heatmap')) fs.rmSync('./data_heatmap', { force: true, recursive: true });
fs.mkdirSync('./data_heatmap');

const decompressPlows = (chunk, name) => {
  const arrayOfRawPlows = chunk.match(/.{1,3}/g);

  if (!arrayOfRawPlows) {
    console.log('empty', name)
    return [];
  }

  const plowsAsPoints = arrayOfRawPlows.map((rawPlow) => {
    return [
      rawPlow.charCodeAt(1),
      rawPlow.charCodeAt(2),
      480,
    ]
  }).filter((plow) => plow[0] && plow[1])

  return plowsAsPoints;
};

// getting list of files 
const listOfFilesToRender = fs.readdirSync('./data');

let currentMarkerState = [];

for (let i = 0; i < listOfFilesToRender.length; i++) {
  const rawPlows = fs.readFileSync(`./data/${listOfFilesToRender[i]}`, { encoding: 'utf8' });
  const plowData = decompressPlows(rawPlows, listOfFilesToRender[i]);
  const finalFileName = `./data_heatmap/${listOfFilesToRender[i].split('.')[0]}.json`;

  currentMarkerState.push(...plowData);

  if (i == 0 || i % 100 == 0) console.log(i, listOfFilesToRender.length)

  fs.writeFileSync(finalFileName, JSON.stringify(currentMarkerState), { encoding: 'utf8' });

  // decreasing values
  currentMarkerState = currentMarkerState
    .map((plow) => {
      return [
        plow[0],
        plow[1],
        plow[2] - 1,
      ]
    })
    .filter((plow) => plow[2] > 0);
};