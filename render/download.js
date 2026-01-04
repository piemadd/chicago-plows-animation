import fs from 'fs';
import pLimit from 'p-limit';

const limit = pLimit(4);

if (!fs.existsSync('./data')) fs.mkdirSync('./data');

const downloadAndSaveFile = async (fileName) => {
  const finalFileName = `./data/${fileName.replaceAll('/', '_')}`;
  if (fs.existsSync(finalFileName)) return;
  const dataText = await fetch(`https://chicago-plows-data-v1.pgm.sh/${fileName}`).then((res) => res.text());
  await fs.promises.writeFile(finalFileName, dataText);
};

(async () => {
  const fileNamesRaw = await fetch('https://query-chicago-plows-data-v1.piero.workers.dev').then((res) => res.json());
  const fileNames = Object.keys(fileNamesRaw).sort().map((year) => {
    return Object.keys(fileNamesRaw[year]).sort().map((month) => {
      return Object.keys(fileNamesRaw[year][month]).sort().map((date) => {
        return fileNamesRaw[year][month][date].sort().map((time) =>
          [year, month, date, time].join('/')
        )
      })
    })
  })
  .flat(3)
  .filter((name) => name.startsWith('2025/12/2'));

  //fs.writeFileSync('./frames.json', JSON.stringify(fileNames), { encoding: 'utf8' });

  const filesToFetch = fileNames.map(fileName => {
    return limit(() => downloadAndSaveFile(fileName));
  });

  // Execute all tasks
  Promise.all(filesToFetch).then(() => {
    console.log('All files downloaded!');
  });
})();