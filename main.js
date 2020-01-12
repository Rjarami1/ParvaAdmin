const electron = require('electron');
const path = require('path');
const url = require('url')

//Initializing electron objects
const {app, BrowserWindow, Menu, ipcMain} = electron

//Declaring Browser Windows
let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    })

    mainWindow.loadFile('mainWindow.html');
}

app.on('ready', createMainWindow);