/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { exec } from 'child_process';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

/* custom */
const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const fs = require('fs');
const axios = require('axios');
const simpleGit = require('simple-git');
const systemsData = require('../data/systems.json');

const homeUser = os.homedir();

// SS
const devid = 'djrodtc';
const devpassword = 'diFay35WElL';
const softname = 'EmuDeckROMLauncher';

app.commandLine.appendSwitch('disk-cache-size', '10737418240');
app.commandLine.appendSwitch('--no-sandbox');

let theme;
ipcMain.on('get-theme', async (event, name) => {
  theme = name;
  const themesPath = `${homeUser}/emudeck/launcher/themes`;
  const themeCSSPath = `${themesPath}/${theme}/index.css`;
  const themeCSSContent = fs.readFileSync(themeCSSPath, 'utf8');
  event.reply('get-theme', themeCSSContent);
});

async function getFirstLevelSubfolders(folder) {
  const absolutePath = path.resolve(folder);
  try {
    const files = await fs.promises.readdir(absolutePath);
    const subfolders = [];

    for (const file of files) {
      if (file === '.git') continue;
      const fullPath = path.join(absolutePath, file);
      const stats = await fs.promises.stat(fullPath);
      if (stats.isDirectory()) {
        subfolders.push(file);
      }
    }

    return subfolders;
  } catch (error) {
    console.error('Error reading the folder:', error);
    return [];
  }
}

ipcMain.on('refresh-systems', async (event, name) => {
  app.relaunch();
  app.quit();
});

ipcMain.on('get-available-themes', async (event, name) => {
  theme = name;
  const themesPath = `${homeUser}/emudeck/launcher/themes`;
  (async () => {
    const subfolders = await getFirstLevelSubfolders(themesPath);
    event.reply('get-available-themes', subfolders);
  })();
});

ipcMain.on('get-user-directory', (event) => {
  event.sender.send('user-directory', os.homedir());
});

async function downloadDatabase(url, savePath) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(savePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error al descargar la base de datos:', error.message);
  }
}

async function cloneOrUpdateRepository(repoUrl, destinationPath) {
  try {
    const git = simpleGit();

    if (!fs.existsSync(destinationPath)) {
      // Clona el repositorio si el directorio no existe
      await git.clone(repoUrl, destinationPath, ['--depth', '1']);
      console.log(`Repositorio clonado en: ${destinationPath}`);
    } else {
      // Realiza un pull si el directorio ya existe
      await git.cwd(destinationPath).pull();
      console.log(`Actualizado el repositorio en: ${destinationPath}`);
    }
  } catch (error) {
    console.error('Error al clonar o actualizar el repositorio:', error);
  }
}

// clone();

// Download it
const repoUrl = 'https://github.com/EmuDeck/emudeck-launcher-themes.git'; // Cambia esto por la URL de tu repositorio
const destinationPath = `${homeUser}/emudeck/launcher/themes`; // Cambia esto por tu directorio de destino

cloneOrUpdateRepository(repoUrl, destinationPath)
  .then(() => {
    createWindow();
  })
  .catch((error) => console.error('Error al guardar los themes:', error));

// Library SQLITE
const dbPathLibrary = `${homeUser}/emudeck/launcher/sqlite/library.db`;
let dbLibrary;
const dbDir = path.dirname(dbPathLibrary);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true }); // 'recursive: true' permite crear directorios anidados
}

if (!fs.existsSync(dbPathLibrary)) {
  const db = new sqlite3.Database(dbPathLibrary, (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Conexión exitosa a la base de datos.');

    const createTableSql = `CREATE TABLE "roms" (
      "id"	INTEGER,
      "file_name"	TEXT,
      "name"	TEXT,
      "emulator"	TEXT,
      "system"	TEXT,
      "platform"	TEXT,
      "played"	INTEGER DEFAULT 0,
      "path"	TEXT,
      "databaseID"	INTEGER,
      "parsed"	INTEGER,
      "favourite"	INTEGER DEFAULT 0,
      PRIMARY KEY("id" AUTOINCREMENT),
      UNIQUE("file_name")
    )`;
    db.run(createTableSql, (err) => {
      if (err) {
        console.error(err.message);
      } else {
        console.log('Tabla creada exitosamente o ya existía.');
      }
    });
  });
  dbLibrary = new sqlite3.Database(dbPathLibrary);
} else {
  dbLibrary = new sqlite3.Database(dbPathLibrary);
}

// Database SQLITE
const dbPath = `${homeUser}/emudeck/launcher/sqlite/database.db`;
let db;
if (!fs.existsSync(dbPath)) {
  // Download it
  const dbUrl = 'https://token.emudeck.com/database.db';

  downloadDatabase(dbUrl, dbPath)
    .then(() => {
      console.log('Base de datos descargada y guardada con éxito.');
      db = new sqlite3.Database(dbPath);
    })
    .catch((error) =>
      console.error('Error al guardar la base de datos:', error),
    );
} else {
  db = new sqlite3.Database(dbPath);
}

let shellType: string;
if (os.platform().includes('win32')) {
  shellType = {};
} else {
  shellType = { shell: '/bin/bash' };
}

// Settings to JS vars
let settingsPath;

if (os.platform().includes('win32')) {
  settingsPath = `${homeUser}/EmuDeck/settings.ps1`;
} else {
  settingsPath = `${homeUser}/emudeck/settings.sh`;
}

const settingsContent = fs.readFileSync(settingsPath, 'utf8');

// Divide el contenido en líneas y filtra las líneas que no son comentarios
const lines = settingsContent
  .split('\n')
  .filter((line) => !line.startsWith('#'));

// Crea un objeto con las variables de entorno
const envVars = {};
lines.forEach((line) => {
  const [key, value] = line.split('=');
  envVars[key.trim()] = value;
});
let { romsPath } = envVars;
// $HOME FIX
romsPath = romsPath.replace('"$HOME"', homeUser);
romsPath = romsPath.replaceAll('"', '');

const maxDepth = 1; // Puedes ajustar este valor según tu necesidad

const systems = {};
const gameList = {};

function getScId(system) {
  let ssID;
  switch (system) {
    case 'genesis':
    case 'genesiswide':
      ssID = '1';
      break;
    case 'mastersystem':
      ssID = '2';
      break;
    case 'nes':
      ssID = '3';
      break;
    case 'snes':
      ssID = '4';
      break;
    case 'gb':
      ssID = '9';
      break;
    case 'gbc':
      ssID = '10';
      break;
    case 'virtualboy':
      ssID = '11';
      break;
    case 'gba':
      ssID = '12';
      break;
    case 'gc':
      ssID = '13';
      break;
    case 'n64':
      ssID = '14';
      break;
    case 'nds':
      ssID = '15';
      break;
    case 'wii':
      ssID = '16';
      break;
    case '3ds':
      ssID = '17';
      break;
    case 'sega32x':
      ssID = '19';
      break;
    case 'segacd':
      ssID = '20';
      break;
    case 'gamegear':
      ssID = '21';
      break;
    case 'saturn':
      ssID = '22';
      break;
    case 'dreamcast':
      ssID = '23';
      break;
    case 'ngp':
      ssID = '25';
      break;
    case 'atari2600':
      ssID = '26';
      break;
    case 'jaguar':
      ssID = '27';
      break;
    case 'lynx':
      ssID = '28';
      break;
    case '3do':
      ssID = '29';
      break;
    case 'pcengine':
      ssID = '31';
      break;
    case 'bbcmicro':
      ssID = '37';
      break;
    case 'atari5200':
      ssID = '40';
      break;
    case 'atari7800':
      ssID = '41';
      break;
    case 'atarist':
      ssID = '42';
      break;
    case 'atari800':
      ssID = '43';
      break;
    case 'wswan':
      ssID = '45';
      break;
    case 'wswanc':
      ssID = '46';
      break;
    case 'colecovision':
      ssID = '48';
      break;
    case 'gw':
      ssID = '52';
      break;
    case 'psx':
      ssID = '57';
      break;
    case 'ps2':
      ssID = '58';
      break;
    case 'psp':
      ssID = '61';
      break;
    case 'amiga600':
      ssID = '64';
      break;
    case 'amstradcpc':
      ssID = '65';
      break;
    case 'c64':
      ssID = '66';
      break;
    case 'scv':
      ssID = '67';
      break;
    case 'neogeocd':
      ssID = '70';
      break;
    case 'pcfx':
      ssID = '72';
      break;
    case 'vic20':
      ssID = '73';
      break;
    case 'zxspectrum':
      ssID = '76';
      break;
    case 'zx81':
      ssID = '77';
      break;
    case 'x68000':
      ssID = '79';
      break;
    case 'channelf':
      ssID = '80';
      break;
    case 'ngpc':
      ssID = '82';
      break;
    case 'apple2':
      ssID = '86';
      break;
    case 'gx4000':
      ssID = '87';
      break;
    case 'dragon':
      ssID = '91';
      break;
    case 'bk':
      ssID = '93';
      break;
    case 'vectrex':
      ssID = '102';
      break;
    case 'supergrafx':
      ssID = '105';
      break;
    case 'fds':
      ssID = '106';
      break;
    case 'satellaview':
      ssID = '107';
      break;
    case 'sufami':
      ssID = '108';
      break;
    case 'sg1000':
      ssID = '109';
      break;
    case 'amiga1200':
      ssID = '111';
      break;
    case 'msx':
      ssID = '113';
      break;
    case 'pcenginecd':
      ssID = '114';
      break;
    case 'intellivision':
      ssID = '115';
      break;
    case 'msx2':
      ssID = '116';
      break;
    case 'msxturbor':
      ssID = '118';
      break;
    case '64dd':
      ssID = '122';
      break;
    case 'scummvm':
      ssID = '123';
      break;
    case 'amigacdtv':
      ssID = '129';
      break;
    case 'amigacd32':
      ssID = '130';
      break;
    case 'oricatmos':
      ssID = '131';
      break;
    case 'amiga':
      ssID = '134';
      break;
    case 'dos':
    case 'prboom':
      ssID = '135';
      break;
    case 'thomson':
      ssID = '141';
      break;
    case 'neogeo':
      ssID = '142';
      break;
    case 'megadrive':
      ssID = '203';
      break;
    case 'ti994a':
      ssID = '205';
      break;
    case 'lutro':
      ssID = '206';
      break;
    case 'supervision':
      ssID = '207';
      break;
    case 'pc98':
      ssID = '208';
      break;
    case 'pokemini':
      ssID = '211';
      break;
    case 'samcoupe':
      ssID = '213';
      break;
    case 'openbor':
      ssID = '214';
      break;
    case 'uzebox':
      ssID = '216';
      break;
    case 'apple2gs':
      ssID = '217';
      break;
    case 'spectravideo':
      ssID = '218';
      break;
    case 'palm':
      ssID = '219';
      break;
    case 'x1':
      ssID = '220';
      break;
    case 'pc88':
      ssID = '221';
      break;
    case 'tic80':
      ssID = '222';
      break;
    case 'solarus':
      ssID = '223';
      break;
    case 'mame':
      ssID = '230';
      break;
    case 'easyrpg':
      ssID = '231';
      break;
    case 'pico8':
      ssID = '234';
      break;
    case 'pcv2':
      ssID = '237';
      break;
    case 'pet':
      ssID = '240';
      break;
    case 'lowresnx':
      ssID = '244';
      break;
    default:
      ssID = 'unknown';
  }
  return ssID;
}

function getLaunchboxAlias(system) {
  let platform;

  switch (system) {
    case '3do':
      platform = '3DO Interactive Multiplayer';
      break;
    case 'amiga':
      platform = 'Commodore Amiga';
      break;
    case 'amiga600':
      platform = 'Commodore Amiga';
      break;
    case 'amiga1200':
      platform = 'Commodore Amiga';
      break;
    case 'amigacd32':
      platform = 'Commodore Amiga CD32';
      break;
    case 'amstradcpc':
      platform = 'Amstrad CPC';
      break;
    case 'apple2':
      platform = 'Apple II';
      break;
    case 'apple2gs':
      platform = 'Apple IIGS';
      break;
    case 'arcade':
      platform = 'Arcade';
      break;
    case 'arcadia':
      platform = 'Emerson Arcadia 2001';
      break;
    case 'atari800':
      platform = 'Atari 800';
      break;
    case 'atari2600':
      platform = 'Atari 2600';
      break;
    case 'atari5200':
      platform = 'Atari 5200';
      break;
    case 'atari7800':
      platform = 'Atari 7800';
      break;
    case 'atarijaguar':
      platform = 'Atari Jaguar';
      break;
    case 'atarijaguarcd':
      platform = 'Atari Jaguar CD';
      break;
    case 'atarilynx':
      platform = 'Atari Lynx';
      break;
    case 'atarist':
      platform = 'Atari ST';
      break;
    case 'atarixe':
      platform = 'Atari XEGS';
      break;
    case 'atomiswave':
      platform = 'Sammy Atomiswave';
      break;
    case 'bbcmicro':
      platform = 'BBC Microcomputer System';
      break;
    case 'c64':
      platform = 'Commodore 64';
      break;
    case 'cdtv':
      platform = 'Commodore CDTV';
      break;
    case 'chailove':
      platform = 'Commodore 128';
      break;
    case 'colecovision':
      platform = 'ColecoVision';
      break;
    case 'cps':
      platform = 'Arcade';
      break;
    case 'cps1':
      platform = 'Arcade';
      break;
    case 'cps2':
      platform = 'Arcade';
      break;
    case 'cps3':
      platform = 'Arcade';
      break;
    case 'dos':
      platform = 'MS-DOS';
      break;
    case 'dreamcast':
      platform = 'Sega Dreamcast';
      break;
    case 'doom':
      platform = 'MS-DOS';
      break;
    case 'famicom':
      platform = 'Nintendo Entertainment System';
      break;
    case 'fba':
      platform = 'Arcade';
      break;
    case 'fbneo':
      platform = 'Arcade';
      break;
    case 'gameandwatch':
      platform = 'Nintendo Game & Watch';
      break;
    case 'gc':
      platform = 'Nintendo GameCube';
      break;
    case 'gamegear':
      platform = 'Sega Game Gear';
      break;
    case 'gb':
      platform = 'Nintendo Game Boy';
      break;
    case 'gba':
      platform = 'Nintendo Game Boy Advance';
      break;
    case 'gbc':
      platform = 'Nintendo Game Boy Color';
      break;
    case 'genesis':
      platform = 'Sega Genesis';
      break;
    case 'genesiswide':
      platform = 'Sega Genesis';
      break;
    case 'gx4000':
      platform = 'Amstrad GX4000';
      break;
    case 'intellivision':
      platform = 'Mattel Intellivision';
      break;
    case 'mame':
      platform = 'Arcade';
      break;
    case 'mastersystem':
      platform = 'Sega Master System';
      break;
    case 'megacd':
      platform = 'Sega CD';
      break;
    case 'megacdjp':
      platform = 'Sega CD';
      break;
    case 'megadrive':
      platform = 'Sega Genesis';
      break;
    case 'megadrivejp':
      platform = 'Sega Genesis';
      break;
    case 'megaduck':
      platform = 'Mega Duck';
      break;
    case 'model2':
      platform = 'Sega Model 2';
      break;
    case 'model3':
      platform = 'Sega Model 3';
      break;
    case 'msx':
      platform = 'Microsoft MSX';
      break;
    case 'msx1':
      platform = 'Microsoft MSX';
      break;
    case 'msx2':
      platform = 'Microsoft MSX2';
      break;
    case 'msxturbor':
      platform = 'Microsoft MSX2+';
      break;
    case 'mugen':
      platform = 'MUGEN';
      break;
    case 'n64':
      platform = 'Nintendo 64';
      break;
    case 'n64dd':
      platform = 'Nintendo 64DD';
      break;
    case 'naomi':
      platform = 'Sega Naomi';
      break;
    case 'naomi2':
      platform = 'Sega Naomi 2';
      break;
    case 'n3ds':
      platform = 'Nintendo 3DS';
      break;
    case 'nds':
      platform = 'Nintendo DS';
      break;
    case 'neogeo':
      platform = 'SNK Neo Geo AES';
      break;
    case 'neogeocd':
      platform = 'SNK Neo Geo CD';
      break;
    case 'neogeocdjp':
      platform = 'SNK Neo Geo CD';
      break;
    case 'nes':
      platform = 'Nintendo Entertainment System';
      break;
    case 'ngp':
      platform = 'SNK Neo Geo Pocket';
      break;
    case 'ngpc':
      platform = 'SNK Neo Geo Pocket Color';
      break;
    case 'openbor':
      platform = 'OpenBOR';
      break;
    case 'pcengine':
      platform = 'NEC TurboGrafx-16';
      break;
    case 'pcenginecd':
      platform = 'NEC TurboGrafx-CD';
      break;
    case 'pokemini':
      platform = 'Nintendo Pokemon Mini';
      break;
    case 'primehacks':
      platform = 'Nintendo Wii';
      break;
    case 'ps2':
      platform = 'Sony Playstation 2';
      break;
    case 'ps3':
      platform = 'Sony Playstation 3';
      break;
    case 'psp':
      platform = 'Sony PSP';
      break;
    case 'psvita':
      platform = 'Sony Playstation Vita';
      break;
    case 'psx':
      platform = 'Sony Playstation';
      break;
    case 'quake':
      platform = 'MS-DOS';
      break;
    case 'saturn':
      platform = 'Sega Saturn';
      break;
    case 'saturnjp':
      platform = 'Sega Saturn';
      break;
    case 'scummvm':
      platform = 'ScummVM';
      break;
    case 'sega32x':
      platform = 'Sega 32X';
      break;
    case 'sega32xjp':
      platform = 'Sega 32X';
      break;
    case 'sega32xna':
      platform = 'Sega 32X';
      break;
    case 'segacd':
      platform = 'Sega CD';
      break;
    case 'sg-1000':
      platform = 'Sega SG-1000';
      break;
    case 'snes':
      platform = 'Super Nintendo Entertainment System';
      break;
    case 'sneshd':
      platform = 'Super Nintendo Entertainment System';
      break;
    case 'snesna':
      platform = 'Super Nintendo Entertainment System';
      break;
    case 'supergrafx':
      platform = 'NEC TurboGrafx-16';
      break;
    case 'switch':
      platform = 'Nintendo Switch';
      break;
    case 'tg-cd':
      platform = 'NEC TurboGrafx-CD';
      break;
    case 'tg16':
      platform = 'NEC TurboGrafx-16';
      break;
    case 'ti99':
      platform = 'Texas Instruments TI 99 4A';
      break;
    case 'trs-80':
      platform = 'Tandy TRS-80';
      break;
    case 'vic20':
      platform = 'Commodore VIC-20';
      break;
    case 'virtualboy':
      platform = 'Nintendo Virtual Boy';
      break;
    case 'wii':
      platform = 'Nintendo Wii';
      break;
    case 'wiiu':
      platform = 'Nintendo Wii U';
      break;
    case 'wonderswan':
      platform = 'WonderSwan';
      break;
    case 'wonderswancolor':
      platform = 'WonderSwan Color';
      break;
    case 'x1':
      platform = 'Sharp X1';
      break;
    case 'x68000':
      platform = 'Sharp X68000';
      break;
    case 'xbox':
      platform = 'Microsoft Xbox';
      break;
    case 'xbox360':
      platform = 'Microsoft Xbox 360';
      break;
    case 'zx81':
      platform = 'Sinclair ZX-81';
      break;
    case 'zxspectrum':
      platform = 'Sinclair ZX Spectrum';
      break;
    // Agrega más casos según sea necesario
    default:
      console.log(`unknown system, ignoring. ${system} `);
      break;
  }

  return platform;
}

const insertROM = (
  gameFile,
  romNameTrimmed,
  folderName,
  platform,
  gameFilePath,
  romNameForSearch,
  fileCachePath,
) => {
  const query = `
    SELECT *
    FROM Games
    WHERE Name LIKE ? AND Platform = ?
    ORDER BY Games.DatabaseID
    LIMIT 1
`;

  // Ejecutar la consulta
  // db.all(query, [`%${romNameForSearch}%`, platform], (err, rows) => {
  db.all(query, [`%${romNameForSearch}%`, platform], (err, rows) => {
    const results = rows;
    const imageData = {
      gameFile,
      romNameTrimmed,
      folderName,
      platform,
      gameFilePath,
    };
    if (results.length > 0) {
      results.forEach((result) => {
        imageData.databaseID = result.DatabaseID;
      });
      imageData.parsed = 1;
    } else {
      imageData.databaseID = 0;
      imageData.parsed = 0;
    }

    const insertQuery = `
        INSERT OR REPLACE INTO roms (file_name, name, system, platform, path, databaseID, parsed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

    // console.log({ imageData });
    dbLibrary.run(
      insertQuery,
      [
        imageData.gameFile,
        imageData.romNameTrimmed,
        imageData.folderName,
        imageData.platform,
        imageData.gameFilePath,
        imageData.databaseID,
        imageData.parsed,
      ],
      function (err) {
        if (err) {
          return console.error('Error al insertar datos:', err.message);
        }
        fs.writeFile(fileCachePath, '', (err) => {
          if (err) {
            console.error('Error writing the file:', err);
          }
        });
      },
    );
    // dbLibrary.close();
  });
};

function processFolder(folderPath, depth) {
  const files = fs.readdirSync(folderPath);

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);

    try {
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Procesar carpetas de forma recursiva
        processFolder(filePath, depth + 1);
      } else if (stat.isFile() && file.toLowerCase() === 'systeminfo.txt') {
        // Leer systeminfo.txt y extraer extensiones permitidas
        const systemInfoContent = fs.readFileSync(filePath, 'utf8');
        const allowedExtensions = systemInfoContent
          .split('\n')
          .filter((line) => line.trim().startsWith('.'))
          .map((line) => line.trim().substring(1));

        // Crear entrada en systems para la carpeta actual
        const folderName = path.basename(folderPath);
        systems[folderName] = { id: folderName, games: 0 };
        const systemID = systems[folderName];
        const systemData = systemsData[folderName];
        systems[folderName] = { ...systemID, ...systemData };
        systems[folderName].poster =
          `file://${homeUser}/emudeck/launcher/themes/${theme}/systems/${folderName}.jpg`;
        systems[folderName].controller =
          `file://${homeUser}/emudeck/launcher/themes/${theme}/controllers/${folderName}.png`;
        systems[folderName].logo =
          `file://${homeUser}/emudeck/launcher/themes/${theme}/logos/${folderName}.svg`;
        // Crear entrada en gameList para la carpeta actual
        gameList[folderName] = {};

        // Recorrer archivos en la carpeta actual y verificar extensiones
        const filesInFolder = fs.readdirSync(folderPath);
        let i = 0;
        filesInFolder.forEach((gameFile) => {
          const gameFilePath = path.join(folderPath, gameFile);
          const gameFileExt = `.${path
            .extname(gameFile)
            .toLowerCase()
            .substring(1)}`;

          const statGame = fs.statSync(gameFilePath);

          if (
            statGame.isFile() &&
            allowedExtensions[0].includes(gameFileExt) &&
            !gameFile.startsWith('.')
          ) {
            // Añadir entrada en gameList
            const relativePath = path.relative(romsPath, folderPath);

            gameList[folderName][i] = {
              name: gameFile,
              path: path.join(romsPath, relativePath, gameFile),
            };

            const romName = gameFile;

            let romNameTrimmed = romName
              .replace(/\.nkit/g, '')
              .replace(/!/g, '')
              .replace(/Disc /g, '')
              .replace(/Rev /g, '')
              .replace(/\([^()]*\)/g, '')
              .replace(/\[[A-z0-9!+]*\]/g, '')
              .replace(/ - /g, '  ')
              .replace(/ \./g, '.');

            romNameTrimmed = romNameTrimmed.replace(/\..*/, '');

            // Put "The" at the beginning of the rom name
            if (romNameTrimmed.includes(', The')) {
              romNameTrimmed = romNameTrimmed.replace(/, The/, '');
              romNameTrimmed = `The ${romNameTrimmed}`;
            }

            romNameTrimmed = romNameTrimmed.trimEnd();

            const romNameForSearch = romNameTrimmed.replace('The ', '');

            const platform = getLaunchboxAlias(folderName);

            // Cache
            fs.mkdir(
              `${homeUser}/emudeck/launcher/cache/${folderName}/`,
              { recursive: true },
              (err) => {
                if (err) {
                  console.error('Error creating dir:', err);
                }
              },
            );
            const fileCachePath = `${homeUser}/emudeck/launcher/cache/${folderName}/${gameFile}`;

            fs.access(fileCachePath, fs.constants.F_OK, (err) => {
              if (err) {
                insertROM(
                  gameFile,
                  romNameTrimmed,
                  folderName,
                  platform,
                  gameFilePath,
                  romNameForSearch,
                  fileCachePath,
                );
              }
            });

            // Incrementar contador de juegos
            systems[folderName].games++;
            i++;
          }
        });

        // Eliminar entrada en systems y gameList si no hay juegos
        if (systems[folderName].games === 0) {
          delete systems[folderName];
          delete gameList[folderName];
        }
      }
    } catch (error) {
      // Manejar la excepción cuando statSync() falla
      console.error(`File error: ${filePath}: ${error.message}`);
    }
  });
}
// Iniciar el proceso con la carpeta principal
// processFolder(romsPath, maxDepth);

ipcMain.on('get-systems', async (event) => {
  processFolder(romsPath, maxDepth);
  event.reply('get-systems', JSON.stringify(Object.values(systems), null, 2));
});

ipcMain.on('load-game', async (event, game) => {
  const { system, path } = game[0];

  console.log({ game });

  const filePath = `${romsPath}/${system}/metadata.txt`;
  // We extract the launch parameter
  const systemInfoContent = fs.readFileSync(filePath, 'utf8');
  let launchParameter = systemInfoContent
    .split('\n')
    .filter((line) => line.trim().startsWith('launch:'))
    .map((line) => line.trim().substring(8));
  launchParameter = launchParameter[0];
  launchParameter = launchParameter.replace('{file.path}', `"${path}"`);

  console.log({ launchParameter });

  return exec(
    `konsole -e ${launchParameter}`,
    shellType,
    (error, stdout, stderr) => {
      event.reply('load-game', error, stdout, stderr);
    },
  );

  // event.reply('get-systems', JSON.stringify(Object.values(systems), null, 2));
});

ipcMain.on('get-games', async (event, system) => {
  if (system !== undefined) {
    let resultsJSON;
    // const query =   'SELECT * FROM roms WHERE system = ?';

    db.run(
      `ATTACH DATABASE '${homeUser}/emudeck/launcher/sqlite/library.db' AS library`,
      (err) => {
        if (err) {
          console.error('Error attaching database:', err);
        } else {
          const query = `SELECT DISTINCT
            library.roms.path,
            library.roms.name,
            library.roms.system,
            (SELECT CONCAT('https://images.launchbox-app.com/', FileName) FROM Images WHERE Images.DatabaseID = library.roms.databaseID AND Images.Type = "Screenshot - Gameplay" LIMIT 1) as screenshot,
            (SELECT CONCAT('https://images.launchbox-app.com/', FileName) FROM Images WHERE Images.DatabaseID = library.roms.databaseID AND Images.Type = "Clear Logo" LIMIT 1) as logo,
            (SELECT CONCAT('https://images.launchbox-app.com/', FileName) FROM Images WHERE Images.DatabaseID = library.roms.databaseID AND Images.Type = "Box - Front" LIMIT 1) as boxart
          FROM library.roms
          WHERE library.roms.system = ?
          GROUP BY library.roms.name`;

          // Ejecutar la consulta
          db.all(query, [system], (err, rows) => {
            if (err) {
              return console.error(
                'Error al realizar la consulta:',
                err.message,
              );
            }
            db.run(`DETACH DATABASE library`);
            const resultsArray = rows.map((row) => ({ ...row }));
            resultsJSON = JSON.stringify(resultsArray, null, 2);
            event.reply('get-games', resultsJSON);
          });
        }
      },
    );
  }
});

async function getGameIdByName(gameName, system) {
  const systemId = getScId(system);
  const url = `https://www.screenscraper.fr/api2/jeuRecherche.php?devid=${devid}&devpassword=${devpassword}&softname=${softname}&systemeid=${systemId}&output=json&recherche=${encodeURIComponent(gameName)}`;

  console.log({ url });

  // Devolvemos una nueva Promesa
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            if (
              jsonData &&
              jsonData.response &&
              jsonData.response.jeux &&
              jsonData.response.jeux.length > 0
            ) {
              const gameId = jsonData.response.jeux[0].id;
              // console.log('ID del Juego encontrado:', gameId);
              if (gameId) {
                const urlSS = `https://www.screenscraper.fr/image.php?gameid=${gameId}&media=ss&hd=0&region=wor&num=&version=&maxwidth=338`;
                // We check if the url exists
                https
                  .get(urlSS, (res) => {
                    res.on('data', (chunk) => {
                      data += chunk;
                    });

                    res.on('end', () => {
                      if (data.length > 1000) {
                        resolve(
                          `https://www.screenscraper.fr/image.php?gameid=${gameId}&media=ss&hd=0&region=wor&num=&version=&maxwidth=338`,
                        );
                      } else {
                        // We retry with other region
                        urlSS = `https://www.screenscraper.fr/image.php?gameid=${gameId}&media=ss&hd=0&region=usa&num=&version=&maxwidth=338`;
                        // We check if the url exists
                        https
                          .get(urlSS, (res) => {
                            res.on('data', (chunk) => {
                              data += chunk;
                            });
                            res.on('end', () => {
                              if (data.length > 1000) {
                                resolve(
                                  `https://www.screenscraper.fr/image.php?gameid=${gameId}&media=ss&hd=0&region=usa&num=&version=&maxwidth=338`,
                                );
                              } else {
                                console.log('IMG not found');
                                resolve(false);
                              }
                            });
                          })
                          .on('error', (err) => {
                            console.log(`Error: ${err.message}`);
                          });

                        resolve(false);
                      }
                    });
                  })
                  .on('error', (err) => {
                    console.log(`Error: ${err.message}`);
                  });
              } else {
                resolve(null);
              }
            } else {
              console.log('Juego no encontrado');
              resolve(null); // Resuelve con null si el juego no se encuentra
            }
          } catch (error) {
            console.error('Error al procesar la respuesta JSON:', error);
            reject(error); // Rechaza la promesa si hay un error
          }
        });
      })
      .on('error', (error) => {
        console.error('Error en la solicitud:', error);
        reject(error); // Rechaza la promesa en caso de error en la solicitud
      });
  });
}

ipcMain.on('ss-artwork', async (event, system) => {
  if (system !== undefined) {
    let resultsJSON;
    // const query =   'SELECT * FROM roms WHERE system = ?';

    const selectQuery = `
       SELECT DISTINCT
         path,
         name,
         file_name,
         system
       FROM roms
       WHERE system = ?
       AND parsed = 0
       GROUP BY name
      `;

    // console.log({ imageData });
    dbLibrary.all(selectQuery, [system], function (err, rows) {
      if (err) {
        return console.error(
          'Error loading games with no artwork:',
          err.message,
        );
      }
      const resultsArray = rows.map((row) => ({ ...row }));

      // We run through the array to get the missing pictures
      async function lookForGame(game, system) {
        try {
          const imageUrl = await getGameIdByName(game, system);
          if (imageUrl) {
            return imageUrl;
          }
          return false;
        } catch (error) {
          console.error('Error obteniendo la URL de la imagen:', error);
        }
      }

      if (resultsArray.length > 0) {
        resultsArray.forEach((result) => {
          const romName = result.file_name;

          let romNameTrimmed = romName
            .replace(/\.nkit/g, '')
            .replace(/!/g, '')
            .replace(/Disc /g, '')
            .replace(/Rev /g, '')
            .replace(/\([^()]*\)/g, '')
            .replace(/\[[A-z0-9!+]*\]/g, '')
            .replace(/ \./g, '.');

          romNameTrimmed = romNameTrimmed.replace(/\..*/, '');
          console.log({ romNameTrimmed });
          lookForGame(romNameTrimmed, result.system)
            .then((imageUrl) => {
              if (imageUrl) {
                console.log('URL de la imagen:', imageUrl);
                result.screenshot = imageUrl;
                // We mark the game as scraped

                // SQLITE UPDATE
                dbLibrary.run(
                  `UPDATE roms
                        SET parsed = 1
                        WHERE name = ? and system = ?`,
                  [result.name, result.system],
                  function (err) {
                    if (err) {
                      return console.error(err.message);
                    }
                    console.log(`Filas actualizadas: ${this.changes}`);
                  },
                );

                // console.log({ resultsArray });
                resultsJSON = JSON.stringify(resultsArray, null, 2);
                event.reply('ss-artwork', resultsJSON);
              } else {
                // SQLITE UPDATE
                dbLibrary.run(
                  `UPDATE roms
                        SET parsed = 2
                        WHERE name = ? and system = ?`,
                  [result.name, result.system],
                  function (err) {
                    if (err) {
                      return console.error(err.message);
                    }
                    console.log(`Filas actualizadas: ${this.changes}`);
                  },
                );
              }
            })
            .catch((error) => {
              console.error('Error obteniendo la URL de la imagen:', error);
            });
        });
      }
      event.reply('ss-artwork-finish');
    });
  }
});
/* end custom */

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    fullscreen: false,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      webSecurity: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    // createWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
//
