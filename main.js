const electron = require('electron');
const path = require('path');
const url = require('url')

const db = require('./connection');
const userMenu = require('./menuModules');

//Initializing electron objects
const {app, BrowserWindow, Menu, ipcMain} = electron;

//Declaring Browser Windows
let mainWindow;
let createUserWindow;
let editUserWindow;

let createProdWindow;

let userInfo;
let mainwc;
let createwc;
let createprod;
let editwc;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    })

    mainwc = mainWindow.webContents;

    mainWindow.loadFile('mainWindow.html');

    mainWindow.on('close', () => {
        mainWindow = null;
    })
}

app.on('ready', () => {
    createMainWindow();

    let mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);
});

ipcMain.on('login:in', (e, arr) => {

    //Construye consulta
    const text1 = 'SELECT * FROM security.users WHERE cedula = $1 AND password = $2 AND active = true';
    const values1 = arr;

    const text2 = 'UPDATE security.users SET date_last_login = LOCALTIMESTAMP WHERE user_id = $1';


    //Realiza consulta
    db.pool.query(text1, values1, (err, res) => {
        if(err){
            console.log(err.stack);
        }else{
            userInfo = res.rows[0];
            if(userInfo == undefined){ //Revisar por qué no se puede hacer esta validación
                                     //Fuera de la función 'pool.query'
                mainwc.send('login:info', 1);
            }
            else{
                const values2 = [userInfo.user_id];
                db.pool.query(text2, values2, (err, res) => {
                    if(err){
                        console.log(err.stack);
                    }
                })
                mainWindow.loadFile('welcome.html');
                mainwc.on('dom-ready', () => {
                    mainwc.send('user:name', userInfo.name);
                })
                userMenu.createMenu(userInfo.user_id, mainWindow)
                .then(res => {
                    mainMenuTemplate.push(res);
                    mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
                    Menu.setApplicationMenu(mainMenu);
                })
            }
        }
    })
})

ipcMain.on('admin:ready', (e) => {
    sendUsersList();
})

ipcMain.on('admin:create', (e) => {
    createUserWindow = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            nodeIntegration: true
        },
        parent: mainWindow,
        modal: true,
        frame: false,
        resizable: false,
    })

    createUserWindow.loadFile('createUser.html');

    createwc = createUserWindow.webContents;

    createUserWindow.on('close', () => {
        createUserWindow = null;
    });
})

ipcMain.on('prod:ready', (e) => {
    //sendProductList();
})

ipcMain.on('prod:create', (e) => {
    createProdWindow = new BrowserWindow({
        width: 500,
        height: 400,
        webPreferences: {
            nodeIntegration: true
        },
        parent: mainWindow,
        modal: true,
        frame: false,
        resizable: false,
    })

    createProdWindow.loadFile('createProduct.html');

    createprod = createProdWindow.webContents;

    createProdWindow.on('close', () => {
        createProdWindow = null;
    });
})

ipcMain.on('prodCreate:cancel', (e) => {
    createProdWindow.close();
})

ipcMain.on('usrCreate:cancel', (e) => {
    createUserWindow.close();
})

ipcMain.on('usrCreate:create', (e, obj) => {
    let values = [
        obj.cedula,
        obj.name,
        obj.password,
        obj.position
    ];

    const text = 'INSERT INTO security.users(cedula, name, date_create, password, "position", active) VALUES ($1, $2, LOCALTIMESTAMP, $3, $4, true);';

    db.pool.query(text, values, (err, res) => {
        if(err){
            console.log(err.stack);
        }else{
            sendUsersList();
            createUserWindow.close();
        }
    })
})

ipcMain.on('usrCreate:edit', (e, userid) => {
    editUserWindow = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: {
            nodeIntegration: true
        },
        parent: mainWindow,
        modal: true,
        frame: false,
        resizable: false
    })

    editUserWindow.loadFile('editUser.html');

    editwc = editUserWindow.webContents;

    editwc.on('dom-ready', () => {
        const text1 = 'SELECT user_id, cedula, password, date_create, date_last_login, name, "position", active FROM security.users WHERE user_id = $1;';
        const text2 = 'SELECT "userModule_id", module_id, user_id FROM security."UsersModules" WHERE user_id = $1;';
        const text3 = 'SELECT module_id, module_name, page_name FROM security.modules;'

        const values = [userid];

        let userInfo;
        let userModules;
        let modules;
        
        db.pool.query(text1, values)
        .then(res => {
            userInfo = res.rows[0];
            db.pool.query(text2, values)
            .then(res => {
                userModules = res.rows;
                db.pool.query(text3)
                .then(res => {
                    modules = res.rows;
                    let dataObject ={
                        userInfo: userInfo,
                        userModules: userModules,
                        modules: modules
                    };
                    // console.log(JSON.stringify(dataObject, null, 2));
                    editwc.send('usrEdit:userInfo', dataObject);
                })
            })
        })
        .catch(e => console.error(e.stack));
    })

    editUserWindow.on('close', () => {
        editUserWindow = null;
    });
})

ipcMain.on('usrEdit:cancel', (e) => {
    editUserWindow.close();
})

ipcMain.on('usrEdit:update', (e, obj) => {
    // console.log(JSON.stringify(obj, null, 2));
    
    const userText = 'UPDATE security.users SET name = $1, position = $2 WHERE user_id = $3;'
    const values1 = [obj.userName, obj.userPosition, obj.user_id];

    let idquery = '';
    obj.addedModules.forEach(id => {
        idquery = `${idquery}(${id},${obj.user_id}),`
    });
    idquery = idquery.slice(0,-1);

    const addModulesText = `INSERT INTO security."UsersModules" (module_id, user_id) VALUES ${idquery};`

    idquery = '';
    obj.removedModules.forEach(id => {
        idquery = `${idquery}${id},`;
    });
    idquery = idquery.slice(0,-1);

    const removeModulesText = `DELETE FROM security."UsersModules" WHERE module_id IN (${idquery}) AND user_id = ${obj.user_id};`

    db.pool.query(userText, values1)
    .then(res => {
        console.log('User name and position updated!');
    })
    .catch(err => console.log(err.stack))

    
    if(obj.addedModules.length > 0){
        db.pool.query(addModulesText)
        .then(res => {
            console.log('Modules added to user!')
        })
        .catch(err => console.log(err.stack))
    }

    if(obj.removedModules.length > 0){
        db.pool.query(removeModulesText)
        .then(res => {
            console.log('Modules removed from user!')
        })
        .catch(err => console.log(err.stack))
    }

    editUserWindow.close();
    sendUsersList();

})

ipcMain.on('usrEdit:toggle', (e, id) => {
    const text = 'SELECT security."user_toggle_status"($1);';

    db.pool.query(text, [id], (err, res) => {
        if(err){
            console.log(err.stack);
        }else{
            editUserWindow.close();
            sendUsersList();
        }
    })
})

const mainMenuTemplate = [
    {
        label: 'Archivo',
        submenu: [
            {
                label: 'Salir',
                accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
                click(){
                    app.quit();
                }
            },
            {
                label: 'Cerrar Sesión',
                click(){
                    if(mainMenuTemplate.length > 2){
                        let i = 0;
                        mainMenuTemplate.forEach(element => {
                            if(element.label == 'Modulos'){
                                mainMenuTemplate.splice(i,1);
                                //break;
                            }
                            i++;
                        });
                        mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
                        Menu.setApplicationMenu(mainMenu);
                    }
                    mainWindow.loadFile('mainWindow.html')
                }
            }
        ]
    }
];

if(process.env.NODE_ENV !== 'production'){
    mainMenuTemplate.push({
        label: 'Dev tools',
        submenu:[
            {
                label: 'Activar',
                accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
                click(item, focusedWindow){
                    focusedWindow.webContents.openDevTools();
                }
        },
        {
            role: 'reload'
        }
    ]
    })
}

function sendUsersList(){
    const text = 'SELECT * FROM security.users';
    let users;

    db.pool.query(text, (err, res) => {
        if(err){
            console.log(err.stack);
        }else{
            users = res.rows;
            mainwc.send('users:info', users);
        }
    })
}