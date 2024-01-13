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
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

/* custom */

const os = require('os');
const fs = require('fs');
const systemsData = require('../data/systems.json');

const homeUser = os.homedir();

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

function processFolder(folderPath, depth) {
  const files = fs.readdirSync(folderPath);

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);
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
      ].logo = `file://${homeUser}/emudeck/launcher/themes/enabled/logos/${folderName}.jpg`;
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
          const systemName = path.basename(romsPath);
          const relativePath = path.relative(romsPath, folderPath);

          console.log({ gameFilePath });

          gameList[folderName][i] = {
            name: gameFile,
            path: path.join(romsPath, relativePath, gameFile),
          };

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
  });
}

// Iniciar el proceso con la carpeta principal
processFolder(romsPath, maxDepth);

ipcMain.on('get-systems', async (event) => {
  event.reply('get-systems', JSON.stringify(Object.values(systems), null, 2));
});

ipcMain.on('get-games', async (event, system) => {
  if (system !== undefined) {
    console.log(gameList[system]);
    event.reply(
      'get-games',
      JSON.stringify(Object.values(gameList[system]), null, 2),
    );
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
