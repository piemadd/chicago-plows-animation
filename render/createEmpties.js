import fs from 'fs';

// this file creates empty files for gap frames when no plows are running

const daysPerMonth = {
  1: 31,
  2: 28,
  3: 31,
  4: 30,
  5: 31,
  6: 30,
  7: 31,
  8: 31,
  9: 30,
  10: 31,
  11: 30,
  12: 31,
};

const convertElementsToNumber = (elements) => {
  const yearPart = elements.year;
  const monthPart = elements.month.toString().padStart(2, '0');
  const dayPart = elements.day.toString().padStart(2, '0');
  const hourPart = elements.hour.toString().padStart(2, '0');
  const minutePart = elements.minute.toString().padStart(2, '0');

  return parseInt(`${yearPart}${monthPart}${dayPart}${hourPart}${minutePart}`);
};

const convertFileNameToElements = (fileName) => {
  const dC = fileName.split('.')[0].split('_');
  let final = {
    fileName,
    year: parseInt(dC[0]),
    month: parseInt(dC[1]),
    day: parseInt(dC[2]),
    hour: parseInt(dC[3]),
    minute: parseInt(dC[4]),
    asNumber: 0,
  }

  final.asNumber = convertElementsToNumber(final);

  return final;
};

const convertElementsToStringStart = (elements) => {
  const yearPart = elements.year;
  const monthPart = elements.month.toString().padStart(2, '0');
  const dayPart = elements.day.toString().padStart(2, '0');
  const hourPart = elements.hour.toString().padStart(2, '0');
  const minutePart = elements.minute.toString().padStart(2, '0');

  return `${yearPart}_${monthPart}_${dayPart}_${hourPart}_${minutePart}`;
};

const elementInArrayStartsWith = (array, startsWith) => {
  const filtered = array.find((element) => element.startsWith(startsWith));

  if (filtered) return filtered;
  return false;
};

const currentFilesList = fs.readdirSync('./data');

const lastFile = convertFileNameToElements(currentFilesList[currentFilesList.length - 1]);
let currentElement = convertFileNameToElements(currentFilesList[0]);
let lastValidFileName = currentFilesList[0];

while (currentElement.asNumber < lastFile.asNumber) {
  const elementStart = convertElementsToStringStart(currentElement);
  const elementStartFileName = elementInArrayStartsWith(currentFilesList, elementStart);
  if (!elementStartFileName) {
    // need to create file
    console.log(`Copying previous to ${elementStart}`)
    fs.cpSync(`./data/${lastValidFileName}`, `./data/${elementStart}_00.txt`)
    //fs.writeFileSync(`./data/${elementStart}_00.txt`, '', {encoding: 'utf8'});
  } else {
    console.log(`No need to create ${elementStart}`)
    lastValidFileName = elementStartFileName;
  }

  // increasing time and adjusting
  currentElement.minute++;
  if (currentElement.minute == 60) {
    currentElement.minute = 0;
    currentElement.hour++;
  }
  if (currentElement.hour == 24) {
    currentElement.hour = 0;
    currentElement.day++;
  }
  if (currentElement.day == daysPerMonth[currentElement.month] + 1) {
    currentElement.day = 1;
    currentElement.month++;
  }
  if (currentElement.month == 13) {
    currentElement.month = 1;
    currentElement.year++;
  }

  currentElement.asNumber = convertElementsToNumber(currentElement);
}