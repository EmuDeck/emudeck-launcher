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
import { exec, spawn } from 'child_process';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

/* custom */
app.commandLine.appendSwitch('disk-cache-size', '10737418240');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const fs = require('fs');
const axios = require('axios');
const systemsData = require('../data/systems.json');

const homeUser = os.homedir();

const dbPath = `${homeUser}/emudeck/launcher/sqlite/database.db`;
// const dbPath = path.join(__dirname, 'sqlite', 'database.db');
const db = new sqlite3.Database(dbPath);

let shellType: string;
if (os.platform().includes('win32')) {
  shellType = {};
} else {
  shellType = { shell: '/bin/bash' };
}

// Settings to JS vars
let settingsPath;
const themesPath = `${homeUser}/emudeck/launcher/themes/`;
const themeCSSPath = `${homeUser}/emudeck/launcher/themes/enabled/index.css`;
if (os.platform().includes('win32')) {
  settingsPath = `${homeUser}/EmuDeck/settings.ps1`;
} else {
  settingsPath = `${homeUser}/emudeck/settings.sh`;
}
const settingsContent = fs.readFileSync(settingsPath, 'utf8');
const themeCSSContent = fs.readFileSync(themeCSSPath, 'utf8');
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

const { romsPath } = envVars;

const maxDepth = 2; // Puedes ajustar este valor según tu necesidad

const systems = {};
const gameList = {};

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
      console.log('unknown system, exiting.');
      process.exit();
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

    if (results.length > 0) {
      const insertQuery = `
          INSERT OR REPLACE INTO roms (file_name, name, system, platform, path, databaseID)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
      const imageData = {
        gameFile,
        romNameTrimmed,
        folderName,
        platform,
        gameFilePath,
      };
      results.forEach((result) => {
        imageData.databaseID = result.DatabaseID;
      });
      // console.log({ imageData });
      db.run(
        insertQuery,
        [
          imageData.gameFile,
          imageData.romNameTrimmed,
          imageData.folderName,
          imageData.platform,
          imageData.gameFilePath,
          imageData.databaseID,
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
    }
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
        systems[
          folderName
        ].poster = `file://${homeUser}/emudeck/launcher/themes/enabled/posters/${folderName}.jpg`;
        systems[
          folderName
        ].controller = `file://${homeUser}/emudeck/launcher/themes/enabled/controllers/${folderName}.png`;
        systems[
          folderName
        ].logo = `file://${homeUser}/emudeck/launcher/themes/enabled/logos/${folderName}.svg`;
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
  const filePath = `${romsPath}/${system}/metadata.txt`;
  // We extract the launch parameter
  const systemInfoContent = fs.readFileSync(filePath, 'utf8');
  let launchParameter = systemInfoContent
    .split('\n')
    .filter((line) => line.trim().startsWith('launch:'))
    .map((line) => line.trim().substring(8));
  launchParameter = launchParameter[0];
  launchParameter = launchParameter.replace('{file.path}', `"${path}"`);

  return exec(`${launchParameter}`, shellType, (error, stdout, stderr) => {
    event.reply('load-game', error, stdout, stderr);
  });

  // event.reply('get-systems', JSON.stringify(Object.values(systems), null, 2));
});

ipcMain.on('get-games', async (event, system) => {
  if (system !== undefined) {
    // const query = 'SELECT * FROM roms WHERE system = ?';
    const query = `SELECT * FROM (SELECT DISTINCT path, name, FileName as screenshot FROM roms JOIN Images ON Images.DatabaseID = roms.databaseID WHERE roms.system = ? AND Images.Type = "Screenshot - Gameplay" GROUP BY name)`;

    // Ejecutar la consulta
    db.all(query, [system], (err, rows) => {
      if (err) {
        return console.error('Error al realizar la consulta:', err.message);
      }

      const resultsArray = rows.map((row) => ({ ...row }));
      const resultsJSON = JSON.stringify(resultsArray, null, 2);
      console.log({ resultsJSON });
      event.reply('get-games', resultsJSON);
    });
  }
});

ipcMain.on('get-theme', async (event) => {
  event.reply('get-theme', themeCSSContent);
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
    width: 1024,
    height: 728,
    autoHideMenuBar: true,
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
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
//
