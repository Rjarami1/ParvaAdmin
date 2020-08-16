const electron = require('electron');
const _ = require('lodash');
const ObjectsToCsv = require('objects-to-csv');
const fs = require('fs');

const db = require('./connection')
const userMenu = require('./menuModules')

//Initializing electron objects
const { app, BrowserWindow, Menu, ipcMain, dialog } = electron

//SET ENV
//process.env.NODE_ENV = 'production';

//Declaring Browser Windows
let mainWindow
let createUserWindow
let editUserWindow

let createProdWindow
let editProdWindow
let prodwc

let userInfo
let mainwc
let createwc
let createprod
let editwc

let logged_user_id = -1;

function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true
		}
	})

	mainWindow.maximize();
	mainWindow.show();

	mainwc = mainWindow.webContents

	mainWindow.loadFile('src/mainWindow.html')

	mainWindow.on('close', () => {
		mainWindow = null
	})
}

app.on('ready', () => {
	createMainWindow()

	let mainMenu = Menu.buildFromTemplate(mainMenuTemplate)
	Menu.setApplicationMenu(mainMenu)	
})

ipcMain.on('login:in', (e, arr) => {
	//Construye consulta
	const text1 =
		'SELECT * FROM security.users WHERE cedula = $1 AND password = $2 AND active = true;'
	const values1 = arr

	const text2 =
		'UPDATE security.users SET date_last_login = LOCALTIMESTAMP WHERE user_id = $1;'
		
	const text3 = 'SELECT page_name FROM security.modules WHERE module_id = $1;';
	//Realiza consulta
	db.pool.query(text1, values1, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
		} else {
			userInfo = res.rows[0]
			if (userInfo == undefined) {
				//Revisar por qué no se puede hacer esta validación
				//Fuera de la función 'pool.query'
				mainwc.send('login:info', 1)
			} else {
				const values2 = [userInfo.user_id]
				logged_user_id = userInfo.user_id;
				db.pool.query(text2, values2, (err2, res2) => {
					if (err2) {
						console.log(err.stack)
						dialog.showErrorBox('Se ha producido un error', err2.stack);
					}
				})
				if(userInfo.default_page_id != null && userInfo.default_page_id != -1){
					const values3 = [userInfo.default_page_id]
					db.pool.query(text3, values3, (err3, res3) => {
						if(err3){
							console.log(err.stack)
							dialog.showErrorBox('Se ha producido un error', err3.stack);
						}
						else{
							let pageInfo = res3.rows[0];
							mainWindow.loadFile('src/' + pageInfo.page_name);
						}
					})
				}
				else{
					mainWindow.loadFile('src/welcome.html')
					mainwc.on('dom-ready', () => {
						mainwc.send('user:name', userInfo.name)
					})
				}
				userMenu
					.createMenu(userInfo.user_id, mainWindow) //Construye menu según módulos asignados a usuario
					.then(res => {
						mainMenuTemplate.push(res[0], res[1])
						mainMenu = Menu.buildFromTemplate(mainMenuTemplate)
						Menu.setApplicationMenu(mainMenu)
					})
			}
		}
	})
})

ipcMain.on('admin:ready', e => {
	sendUsersList()
})

ipcMain.on('admin:create', e => {
	createUserWindow = new BrowserWindow({
		width: 400,
		height: 500,
		webPreferences: {
			nodeIntegration: true
		},
		parent: mainWindow,
		modal: true,
		frame: false,
		resizable: false
	})

	createUserWindow.loadFile('src/createUser.html')

	createwc = createUserWindow.webContents

	createUserWindow.on('close', () => {
		createUserWindow = null
	})
})

ipcMain.on('prod:ready', e => {
	sendProductsList()
})


ipcMain.on('prod:create', e => {
	createProdWindow = new BrowserWindow({
		width: 350,
		height: 600,
		webPreferences: {
			nodeIntegration: true
		},
		parent: mainWindow,
		modal: true,
		frame: false,
		resizable: false
	})

	createProdWindow.loadFile('src/createProduct.html')

	createprod = createProdWindow.webContents

	createProdWindow.on('close', () => {
		createProdWindow = null
	})
})

ipcMain.on('prodEdit:cancel', e => {
	editProdWindow.close()
})

ipcMain.on('prodCreate:edit', (e, productid) => {
	editProdWindow = new BrowserWindow
		({
			width: 350,
			height: 600,
			webPreferences:
			{
				nodeIntegration: true
			},
			parent: mainWindow,
			modal: true,
			frame: false,
			resizable: false
		})
	editProdWindow.loadFile("src/editProduct.html");
	editwc = editProdWindow.webContents;

	editwc.on('dom-ready', () => {
		const text1 = 'SELECT product_id, code_prod, name_prod, val_prod, descp_prod, status_prod, productype, cost_prod FROM security."listProducts" WHERE product_id = $1;';

		const values = [productid];
		let prodInfo;

		db.pool.query(text1, values)
			.then(res => {
				prodInfo = res.rows[0];
				let dataObject = {
					prodInfo: prodInfo
				};

				editwc.send('prodEdit:prodInfo', dataObject);
			})
			.catch(e => console.error(e.stack));
	})

	editProdWindow.on('close', () => {
		editProdWindow = null;
	});
})

ipcMain.on('prodEdit:update', (e, obj) => {
	const prodText = 'UPDATE security."listProducts" SET code_prod=$1, name_prod=$2, val_prod=$3, descp_prod=$4, cost_prod=$5 WHERE product_id=$6;'
	const valuesP = [obj.code_prod, obj.name_prod, obj.val_prod, obj.descp_prod, obj.cost_prod, obj.product_id]
	db.pool
		.query(prodText, valuesP)
		.then(res => {
			console.log('Product details has been updated!')
		})
		.catch(err => {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
		})

	editProdWindow.close()
	sendProductsList()
})

ipcMain.on('prodCreate:cancel', e => {
	createProdWindow.close()
})

ipcMain.on('prodEdit:toggle', (e, id) => {
	const text = 'SELECT security."product_toggle_status"($1);'
	db.pool.query(text, [id], (err, res) => {
		if (err) {
			console.log(err.stack)
			dialog.showErrorBox('Se ha producido un error', err.stack);
		} else {
			editProdWindow.close()
			sendProductsList()
		}
	})
})

ipcMain.on('prodCreate:create', (e, obj) => {
	let values = [obj.code_prod, obj.name_prod, obj.val_prod, obj.descp_prod, obj.production_type, obj.prod_cost]
	const text =
		'INSERT INTO security."listProducts"(code_prod, name_prod, val_prod, descp_prod, status_prod, productype, cost_prod) VALUES ($1, $2, $3, $4, true, $5, $6);'

	db.pool.query(text, values, (err, res) => {
		if (err) {
			console.log(err.stack)
			dialog.showErrorBox('Se ha producido un error', err.stack);
		} else {
			sendProductsList()
			createProdWindow.close()
		}
	})
})

ipcMain.on('usrCreate:cancel', e => {
	createUserWindow.close()
})

ipcMain.on('usrCreate:create', (e, obj) => {
	let values = [obj.cedula, obj.name, obj.password, obj.position]

	const text =
		'INSERT INTO security.users(cedula, name, date_create, password, "position", active) VALUES ($1, $2, LOCALTIMESTAMP, $3, $4, true);'

	db.pool.query(text, values, (err, res) => {
		if (err) {
			console.log(err.stack)
			dialog.showErrorBox('Se ha producido un error', err.stack);
		} else {
			sendUsersList()
			createUserWindow.close()
		}
	})
})

ipcMain.on('usrCreate:edit', (e, userid) => {
	editUserWindow = new BrowserWindow({
		width: 650,
		height: 750,
		webPreferences: {
			nodeIntegration: true
		},
		parent: mainWindow,
		modal: true,
		frame: false,
		resizable: false
	})

	editUserWindow.loadFile('src/editUser.html')

	editwc = editUserWindow.webContents

	editwc.on('dom-ready', () => {
		const text1 =
			'SELECT user_id, cedula, password, date_create, date_last_login, name, "position", active, default_page_id FROM security.users WHERE user_id = $1;'
		const text2 =
			'SELECT "userModule_id", module_id, user_id FROM security."UsersModules" WHERE user_id = $1;'
		const text3 =
			'SELECT module_id, module_name, page_name FROM security.modules;'

		const values = [userid]

		let userInfo
		let userModules
		let modules

		db.pool
			.query(text1, values)
			.then(res => {
				userInfo = res.rows[0]
				db.pool.query(text2, values).then(res => {
					userModules = res.rows
					db.pool.query(text3).then(res => {
						modules = res.rows
						let dataObject = {
							userInfo: userInfo,
							userModules: userModules,
							modules: modules
						}
						// console.log(JSON.stringify(dataObject, null, 2));
						editwc.send('usrEdit:userInfo', dataObject)
					})
				})
			})
			.catch(e => console.error(e.stack))
	})

	editUserWindow.on('close', () => {
		editUserWindow = null
	})
})

ipcMain.on('usrEdit:cancel', e => {
	editUserWindow.close()
})

ipcMain.on('usrEdit:update', (e, obj) => {

	const userText =
		'UPDATE security.users SET name = $1, position = $2 WHERE user_id = $3;'
	const values1 = [obj.userName, obj.userPosition, obj.user_id]

	let idquery = ''
	obj.addedModules.forEach(id => {
		idquery = `${idquery}(${id},${obj.user_id}),`
	})
	idquery = idquery.slice(0, -1)

	const addModulesText = `INSERT INTO security."UsersModules" (module_id, user_id) VALUES ${idquery};`

	idquery = ''
	obj.removedModules.forEach(id => {
		idquery = `${idquery}${id},`
	})
	idquery = idquery.slice(0, -1)

	const removeModulesText = `DELETE FROM security."UsersModules" WHERE module_id IN (${idquery}) AND user_id = ${obj.user_id};`

	const defaultPageText = 'UPDATE security.users SET default_page_id = $1 WHERE user_id = $2;';
	const values2 = [obj.defaultPage, obj.user_id];

	db.pool
		.query(userText, values1)
		.then(res => {
			console.log('User name and position updated!')
		})
		.catch(err => {
			console.log(err.stack)
			dialog.showErrorBox('Se ha producido un error', err.stack);
		})

	if (obj.addedModules.length > 0) {
		db.pool
			.query(addModulesText)
			.then(res => {
				console.log('Modules added to user!')
			})
			.catch(err => {
				console.log(err.stack)
				dialog.showErrorBox('Se ha producido un error', err.stack);
			})
	}

	if (obj.removedModules.length > 0) {
		db.pool
			.query(removeModulesText)
			.then(res => {
				console.log('Modules removed from user!')
			})
			.catch(err => {
				console.log(err.stack)
				dialog.showErrorBox('Se ha producido un error', err.stack);
			})
	}

	if(obj.defaultPage != null){
		db.pool.query(defaultPageText, values2).then(res => {
			console.log('Default Page Updated!')
		})
		.catch(err => {
			console.log(err.stack)
			dialog.showErrorBox('Se ha producido un error', err.stack);
		})
	}

	editUserWindow.close()
	sendUsersList()
})

ipcMain.on('usrEdit:toggle', (e, id) => {
	const text = 'SELECT security."user_toggle_status"($1);'

	db.pool.query(text, [id], (err, res) => {
		if (err) {
			console.log(err.stack)
			dialog.showErrorBox('Se ha producido un error', err.stack);
		} else {
			editUserWindow.close()
			sendUsersList()
		}
	})
})

ipcMain.on('usrEdit:reset', (e, id) => {
	const text = 'SELECT security.user_password_reset($1);'

	db.pool.query(text, [id], (err, res) => {
		if (err) {
			console.log(err.stack)
			dialog.showErrorBox('Se ha producido un error', err.stack);
		} else {
			editUserWindow.close()
			mainwc.send('users:reset')
		}
	})
})

ipcMain.on('change:pass', (e, arr) => {
	if (arr[0] == userInfo.password) {
		const text = 'UPDATE security.users SET password = $1 WHERE user_id = $2;'

		db.pool.query(text, [arr[1], userInfo.user_id], (err, res) => {
			if (err) {
				console.log(err.stack)
				dialog.showErrorBox('Se ha producido un error', err.stack);
				mainwc.send('change:done', false)
			} else {
				mainwc.send('change:done', true)
			}
		})
	} else {
		mainwc.send('change:done', false)
	}
})

//Production types
ipcMain.on('production:ready', e => {
	const text1 = 'SELECT * FROM security."productionTypes" WHERE status = true;'

	db.pool.query(text1, (err1, res1) => {
		if (err1) {
			console.log(err1.stack);
			dialog.showErrorBox('Se ha producido un error', err1.stack);
		}
		else {
			createProdWindow.send('productionTypes:info', res1.rows)
		}
	})
})

ipcMain.on('production:create', e => {
	const text1 = 'SELECT * FROM security."productionTypes" WHERE status = true;'

	db.pool.query(text1, (err1, res1) => {
		if (err1) {
			console.log(err1.stack);
			dialog.showErrorBox('Se ha producido un error', err1.stack);
		}
		else {
			mainwc.send('prodTypes:info', res1.rows)
		}
	})
})

ipcMain.on('activeProducts:selected', (e, filter) => {
	const text1 = `SELECT product_id, code_prod, name_prod FROM security."listProducts" WHERE productype = '${filter.trim()}' AND status_prod = true`;

	db.pool.query(text1, (err1, res1) => {
		if (err1) {
			console.log(err1.stack)
			dialog.showErrorBox('Se ha producido un error', err1.stack);
		}
		else {
			mainwc.send('filteredProdcuts:info', res1.rows)
		}
	})
})

ipcMain.on('production:save', (e, arr) => {
	let qry = 'INSERT INTO public.production(produc_date, produc_code, produc_name, produc_quan, produc_type) VALUES ';
	let pro_value;

	arr.forEach(elm => {
		pro_value = `(CURRENT_TIMESTAMP, ${elm.code}, '${elm.name}', ${elm.quantity}, '${elm.type}'),`;
		qry += pro_value;
	});

	qry = qry.slice(0, -1);
	qry += ';'
	db.pool.query(qry, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
			mainwc.send('production:error');
		}
		else {
			mainwc.send('production:success');
		}
	})
})

ipcMain.on('expense:ready', e => {
	const text1 = 'SELECT * FROM security."expenseTypes" WHERE active = true;'
	const text2 = 'SELECT * FROM security."expenseCodes" WHERE active = true;'

	db.pool.query(text1, (err1, res1) => {
		if (err1) {
			console.log(err1.stack)
			dialog.showErrorBox('Se ha producido un error', err.stack);
		} else {
			db.pool.query(text2, (err2, res2) => {
				if (err2) {
					console.log(err2.stack)
					dialog.showErrorBox('Se ha producido un error', err2.stack);
				} else {
					mainwc.send('expense:info', [res1.rows, res2.rows])
				}
			})
		}
	})
})

ipcMain.on('expense:save', (e, arr) => {
	let query = 'INSERT INTO public.expenses(expense_code, expense_type, expense_date, expense_value, expense_quantity) VALUES ';
	let exp_value;

	arr.forEach(element => {
		exp_value = `(${element.code}, ${element.type}, '${element.date}', ${element.value}, ${element.quantity}),`;
		query += exp_value;
	});

	query = query.slice(0, -1);
	query += ';'

	db.pool.query(query, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
			mainwc.send('expense:error');
		}
		else {
			mainwc.send('expense:success');
		}
	})
})

ipcMain.on('expenseManager:ready', (e) => {

	const text1 = 'SELECT * FROM security."expenseTypes" WHERE active = true;'
	const text2 = 'SELECT * FROM security."expenseCodes" WHERE active = true;'

	db.pool.query(text1, (err1, res1) => {
		if (err1) {
			console.log(err1.stack);
			dialog.showErrorBox('Se ha producido un error', err1.stack);
		} else {
			db.pool.query(text2, (err2, res2) => {
				if (err2) {
					console.log(err2.stack);
					dialog.showErrorBox('Se ha producido un error', err2.stack);
				} else {
					mainwc.send('expenseManager:info', [res1.rows, res2.rows]);
				}
			})
		}
	})
})

ipcMain.on('expenseManager:save', (e, arr) => {
	let added_types = arr[0];
	let added_codes = arr[1];
	let deleted_types = arr[2];
	let deleted_codes = arr[3];

	let new_types_obj = [];
	let new_codes = [];

	let text, text2, text6;

	let promises = [];
	let promise1, promise2, promise3, promise4;

	if (added_types.length > 0) {
		text = 'INSERT INTO security."expenseTypes" (type_description, active) VALUES ';
		added_types.forEach(type => {
			text += `('${type.type_description}',true),`;

			new_codes = new_codes.concat(_.remove(added_codes, (n) => {
				return n.expense_type_id == type.type_id;
			}));
		});

		text = text.slice(0, -1);
		text += ' RETURNING type_id';

		promise1 = db.pool.query(text);
		promise1.then(res => {
			res.rows.forEach((row, index) => {
				new_types_obj.push({
					local_id: added_types[index].type_id,
					db_id: row.type_id
				});
			});

			new_codes.forEach((code, index) => {
				new_types_obj.forEach(type_obj => {
					if (code.expense_type_id == type_obj.local_id) {
						new_codes[index].expense_type_id = type_obj.db_id;
					}
				});
			});

			text6 = 'INSERT INTO security."expenseCodes" (expense_code, expense_type_id, code_description, active) VALUES ';
			new_codes.forEach(code => {
				text6 += `('${code.expense_code}',${code.expense_type_id},'${code.code_description}', true),`;
			});
			text6 = text6.slice(0, -1);
			db.pool.query(text6);
		})
			.catch(err => {
				console.log(err.stack);
				dialog.showErrorBox('Se ha producido un error', err.stack);
			});

		promises.push(promise1);
	}

	if (added_codes.length > 0) {
		text2 = 'INSERT INTO security."expenseCodes" (expense_code, expense_type_id, code_description, active) VALUES ';
		added_codes.forEach(code => {
			text2 += `('${code.expense_code}',${code.expense_type_id},'${code.code_description}', true),`;
		});

		text2 = text2.slice(0, -1);
		promise2 = db.pool.query(text2);
		promises.push(promise2);
	}

	if (deleted_types.length > 0) {
		const text3 = `UPDATE security."expenseTypes" SET active = false WHERE type_id IN (${deleted_types});`;
		const text4 = `UPDATE security."expenseCodes" SET active = false WHERE expense_type_id IN (${deleted_types});`;

		promise3 = db.pool.query(text3).then(res => {
			db.pool.query(text4)
		})
			.catch(err => {
				console.log(err.stack);
				dialog.showErrorBox('Se ha producido un error', err.stack);
			})

		promises.push(promise3);
	}

	if (deleted_codes.length > 0) {
		const text5 = `UPDATE security."expenseCodes" SET active = false WHERE code_id IN (${deleted_codes});`;

		promise4 = db.pool.query(text5);
		promises.push(promise4);
	}

	Promise.all(promises).then(e => {
		mainwc.send('expenseManager:done');
	}
	)
		.catch(err => {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
			mainwc.send('expenseManager:error');
		})
})

ipcMain.on('sales:ready', (e) => {
	const text = 'SELECT * FROM security."listProducts" WHERE status_prod = true;';
	const text2 = `SELECT shift_id FROM public.shifts WHERE user_id = ${logged_user_id} AND shift_status = true;`;
	let shift = -1;

	db.pool.query(text, (err1, res1) => {
		if (err1) {
			console.log(err1.stack);
			dialog.showErrorBox('Se ha producido un error', err1.stack);
		}
		else {
			db.pool.query(text2, (err2, res2) => {
				if (err2) {
					console.log(err2.stack);
					dialog.showErrorBox('Se ha producido un error', err2.stack);
				}
				else {
					if (res2.rowCount > 0) {
						shift = res2.rows[0].shift_id;
					}
					else {
						sendSalesReview();
					}
					mainwc.send('sales:info', [res1.rows, shift]);
				}
			});
		}
	});
})

ipcMain.on('sales:start', e => {
	const text = `INSERT INTO public.shifts (shift_start, shift_status, user_id) VALUES (CURRENT_TIMESTAMP, true, ${logged_user_id}) RETURNING shift_id;`;
	let shift;

	db.pool.query(text, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
		}
		else {
			shift = res.rows[0].shift_id;
			mainwc.send('sales:started', shift);
		}
	})
})


ipcMain.on('sales:end', e => {
	const text = `UPDATE public.shifts SET shift_status = false, shift_end = CURRENT_TIMESTAMP WHERE user_id = ${logged_user_id} AND shift_status = true;`;

	db.pool.query(text, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
		}
		else {
			sendSalesReview();
		}
	})
})

ipcMain.on('sales:register', (e, arr) => {
	let text = 'INSERT INTO public.sales(product_id, quantity, value, sale_date, shift_id) VALUES ';
	let regProducts = arr[0];
	let shift = arr[1];

	regProducts.forEach(product => {
		text += `(${product.prod_id},${product.quantity},${product.value},CURRENT_TIMESTAMP,${shift}),`;
	})

	text = text.slice(0, -1);

	db.pool.query(text, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
		}
		else {
			mainwc.send('sales:done');
		}
	})
})

////////////
ipcMain.on('productionReport:ready', e => {
	const text1 = 'SELECT * FROM public.production_view'
	const text2 = 'SELECT "prodType_description" FROM security."productionTypes" WHERE NOT "prodType_id" = 4;'

	db.pool.query(text1, (err1, res1) => {
		if (err1) {
			console.log(err1.stack)
			dialog.showErrorBox('Se ha producido un error', err1.stack);
		} else {
			db.pool.query(text2, (err2, res2) => {
				if (err2) {
					console.log(err2.stack)
					dialog.showErrorBox('Se ha producido un error', err2.stack);
				} else {
					mainwc.send('productionReport:info', [res1.rows, res2.rows])
				}
			})
		}
	})
})

ipcMain.on('productionReport:search', (e, arr) => {

	let obj = arr[0];
	console.log(obj)
	let text = 'SELECT "prodType_description", produc_date, produc_code, produc_name, produc_quan, produc_type, name_prod FROM public.production_view WHERE ';

	if (obj.fromDate.length > 0) {
		text += `produc_date >= '${obj.fromDate}' AND `;
	}
	if (obj.toDate.length > 0) {
		text += `produc_date >= '${obj.toDate}' AND `;
	}
	if (obj.producType.length > 0) {
		text += `produc_type = '${obj.producType}' AND `;
	}
	if (obj.producCode.length > 0) {
		text += `produc_name = '${obj.producCode}';`;
	}
	else {
		text = text.slice(0, -5) + ';';
	}

	console.log('query: ' + text);

	db.pool.query(text, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
		}
		else {
			if (arr[1] == 1) {
				mainwc.send('productionReport:result', res.rows);
			}
			else {
				let today = new Date();

				dialog.showSaveDialog({
					title: 'Generar reporte de producción',
					defaultPath: `reporte_produccion_${today.getDate().toString()}_${(today.getMonth() + 1).toString()}_${today.getFullYear().toString()}.csv`
				}).then(obj => {
					if(obj.filePath != undefined){
						const csv = new ObjectsToCsv(res.rows);
						csv.toDisk(obj.filePath).then(console.log('Generado'));		
					}
				})
			}
		}
	})
})

ipcMain.on('expenseReport:ready', (e) => {

	const text1 = 'SELECT DISTINCT type_description, type_id FROM public.expenses_view';
	const text2 = 'SELECT DISTINCT expense_code, code_description, code_type_id FROM public.expenses_view';

	db.pool.query(text1, (err1, res1) => {
		if (err1) {
			console.log(err1.stack);
			dialog.showErrorBox('Se ha producido un error', err1.stack);
		}
		else {
			db.pool.query(text2, (err2, res2) => {
				if (err2) {
					console.log(err2.stack);
					dialog.showErrorBox('Se ha producido un error', err2.stack);
				}
				else {
					mainwc.send('expenseReport:info', [res1.rows, res2.rows]);
				}
			})
		}
	})
})

ipcMain.on('expenseReport:search', (e, arr) => {

	let obj = arr[0];

	let text = 'SELECT expense_date, type_description, expense_code, code_description, expense_value, expense_quantity, total FROM public.expenses_view WHERE ';

	if (obj.fromDate.length > 0) {
		text += `expense_date >= '${obj.fromDate}' AND `;
	}
	if (obj.toDate.length > 0) {
		text += `expense_date <= '${obj.toDate}' AND `;
	}
	if (obj.expenseType.length > 0) {
		text += `type_description = '${obj.expenseType}' AND `
	}

	if (obj.expenseCode.length > 0) {
		text += `expense_code = '${obj.expenseCode}';`;
	}
	else {
		text = text.slice(0, -5) + ';';
	}

	console.log('query: ' + text);

	db.pool.query(text, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
		}
		else {
			if (arr[1] == 1) {
				mainwc.send('expenseReport:result', res.rows);
			}
			else {
				let today = new Date();

				dialog.showSaveDialog({
					title: 'Generar reporte de gastos',
					defaultPath: `reporte_gastos_${today.getDate().toString()}_${(today.getMonth() + 1).toString()}_${today.getFullYear().toString()}.csv`
				}).then(obj => {
					if(obj.filePath != ''){
						const csv = new ObjectsToCsv(formatExpensesCsv(res.rows));
						csv.toDisk(obj.filePath).then(console.log('Generado'));		
					}
				})
			}
		}
	})
})

ipcMain.on('salesReport:ready', (e) => {

	const text1 = 'SELECT DISTINCT name_prod, code_prod FROM public.salesreport_view';
	const text2 = 'SELECT DISTINCT name FROM public.salesreport_view';

	db.pool.query(text1, (err1, res1) => {
		if (err1) {
			console.log(err1.stack);
			dialog.showErrorBox('Se ha producido un error', err1.stack);
		}
		else {
			db.pool.query(text2, (err2, res2) => {
				if (err2) {
					console.log(err2.stack);
					dialog.showErrorBox('Se ha producido un error', err2.stack);
				}
				else {
					mainwc.send('salesReport:info', [res1.rows, res2.rows]);
				}
			})
		}
	})
})

ipcMain.on('salesReport:search', (e, arr) => {

	let obj = arr[0];

	let text = 'SELECT sale_date, code_prod, name_prod, value, quantity, total, shift_id, name FROM public.salesreport_view WHERE ';

	if (obj.fromDate.length > 0) {
		text += `sale_date >= '${obj.fromDate}' AND `;
	}
	if (obj.toDate.length > 0) {
		text += `sale_date <= '${obj.toDate}' AND `;
	}
	if (obj.product.length > 0) {
		text += `name_prod = '${obj.product}' AND `
	}
	if (obj.salesman.length > 0) {
		text += `name = '${obj.salesman}' AND `;
	}
	if (obj.shift.length > 0) {
		text += `shift_id = '${obj.shift}';`;
	}
	else {
		text = text.slice(0, -5) + ';';
	}

	db.pool.query(text, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
		}
		else {
			if (arr[1] == 1) {
				mainwc.send('salesReport:result', res.rows);
			}
			else {
				let today = new Date();

				dialog.showSaveDialog({
					title: 'Generar reporte de ventas',
					defaultPath: `reporte_ventas_${today.getDate().toString()}_${(today.getMonth() + 1).toString()}_${today.getFullYear().toString()}.csv`
				}).then(obj => {
					if(obj.filePath != ''){
						const csv = new ObjectsToCsv(formatSalesCsv(res.rows));
						csv.toDisk(obj.filePath).then(console.log('Generado'));	
					}
				})
			}
		}
	})
})

ipcMain.on('shiftReport:ready', (e) => {

	const text = 'SELECT DISTINCT name FROM public.shifts_view';

	db.pool.query(text, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
		}
		else {
			mainwc.send('shiftReport:info', res.rows);
		}
	})
})

ipcMain.on('shiftReport:search', (e, arr) => {

	let obj = arr[0];

	let text = 'SELECT shift_id, shift_start, shift_end, shift_status, total_shift, name FROM public.shifts_view WHERE ';

	if (obj.fromDate.length > 0) {
		text += `shift_start >= '${obj.fromDate}' AND `;
	}
	if (obj.toDate.length > 0) {
		text += `shift_start <= '${obj.toDate}' AND `;
	}
	if (obj.salesman.length > 0) {
		text += `name = '${obj.salesman}' AND `;
	}
	if (obj.shift.length > 0) {
		text += `shift_id = '${obj.shift}';`;
	}
	else {
		text = text.slice(0, -5) + ';';
	}

	db.pool.query(text, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
		}
		else {
			if (arr[1] == 1) {
				mainwc.send('shiftReport:result', res.rows);
			}
			else {
				let today = new Date();

				dialog.showSaveDialog({
					title: 'Generar reporte de turno',
					defaultPath: `reporte_turno_${today.getDate().toString()}_${(today.getMonth() + 1).toString()}_${today.getFullYear().toString()}.csv`
				}).then(obj => {
					if(obj.filePath != ''){
						const csv = new ObjectsToCsv(formatShiftCsv(res.rows));
						csv.toDisk(obj.filePath).then(console.log('Generado'));		
					}
				})
			}
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
				click() {
					app.quit()
				}
			},
			{
				label: 'Cerrar Sesión',
				click() {
					if (mainMenuTemplate.length > 2) {
						let i = 0
						//Al cerrar sesión busca y elimina el menú de módulos.
						mainMenuTemplate.forEach(element => {
							if (element.label == 'Modulos') {
								mainMenuTemplate.splice(i, 1)
								//break;
							}
							i++
						})
						i = 0
						//Al cerrar sesión busca y elimina el menú de cambiar contraseña.
						mainMenuTemplate.forEach(element => {
							if (element.label == 'Cambiar Constraseña') {
								mainMenuTemplate.splice(i, 1)
								//break;
							}
							i++
						})
						mainMenu = Menu.buildFromTemplate(mainMenuTemplate)
						Menu.setApplicationMenu(mainMenu)
					}
					logged_user_id = -1;
					mainWindow.loadFile('src/mainWindow.html')
				}
			}
		]
	}
]

if (process.env.NODE_ENV !== 'production') {
	mainMenuTemplate.push({
		label: 'Dev tools',
		submenu: [
			{
				label: 'Activar',
				accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
				click(item, focusedWindow) {
					focusedWindow.webContents.openDevTools()
				}
			},
			{
				role: 'reload'
			}
		]
	})
}

function sendUsersList() {
	const text = 'SELECT * FROM security.users'
	let users

	db.pool.query(text, (err, res) => {
		if (err) {
			console.log(err.stack)
			dialog.showErrorBox('Se ha producido un error', err.stack);
		} else {
			users = res.rows
			mainwc.send('users:info', users)
		}
	})
}

function sendProductsList() {
	const text = 'SELECT * FROM security."listProducts";'
	let products

	db.pool.query(text, (err, res) => {
		if (err) {
			console.log(err.stack)
			dialog.showErrorBox('Se ha producido un error', err.stack);
		} else {
			products = res.rows;
			mainwc.send('products:info', products)
		}
	})
}

function sendSalesReview() {
	const text = `SELECT * FROM public.sales_view WHERE shift_id = COALESCE((SELECT MAX(shift_id) FROM public.shifts WHERE user_id = ${logged_user_id}),-1);`;
	let products = [];

	db.pool.query(text, (err, res) => {
		if (err) {
			console.log(err.stack);
			dialog.showErrorBox('Se ha producido un error', err.stack);
		}
		else {
			products = res.rows;

			mainwc.send('sales:review', products);
		}
	})
}

function formatExpensesCsv(collection) {
	var formattedCollection = [];
	var formattedObject, formattedDate;

	collection.forEach(element => {
		formattedDate = new Date(Date.parse(element.expense_date));

		formattedObject = {
			fecha_gasto: formattedDate.toLocaleDateString('en-GB'),
			tipo_gasto: element.type_description.trim(),
			codigo_gasto: element.expense_code.trim(),
			descripcion_codigo_gasto: element.code_description.trim(),
			valor_gasto: element.expense_value,
			cantidad_gasto: element.expense_quantity,
			total_gasto: element.total
		};

		formattedCollection.push(formattedObject);

		formattedDate = null;
	});

	return formattedCollection;
}

function formatSalesCsv(collection) {
	var formattedCollection = [];
	var formattedObject, formattedDate;

	collection.forEach(element => {
		formattedDate = new Date(Date.parse(element.sale_date));

		formattedObject = {
			fecha_venta: formattedDate.toLocaleString().replace(',', ' '),
			codigo_producto_venta: element.code_prod.trim(),
			nombre_producto_venta: element.name_prod.trim(),
			valor_producto_venta: element.value,
			cantidad_venta: element.quantity,
			total_productos_venta: element.total,
			id_turno_venta: element.shift_id,
			nombre_vendedor_venta: element.name.trim()
		};

		formattedCollection.push(formattedObject);

		formattedDate = null;
	});

	return formattedCollection;
}

function formatShiftCsv(collection) {
	var formattedCollection = [];
	var formattedObject, formattedStartDate, formattedEndDate;

	collection.forEach(element => {
		formattedStartDate = new Date(Date.parse(element.shift_start));
		formattedEndDate = new Date(Date.parse(element.shift_end));

		if (formattedEndDate == 'Invalid Date') {
			formattedEndDate = '-'
		}
		else {
			formattedEndDate = formattedEndDate.toLocaleString().replace(',', ' ')
		}

		formattedObject = {
			id_turno: element.shift_id,
			inicio_turno: formattedStartDate.toLocaleString().replace(',', ' '),
			fin_turno: formattedEndDate,
			estado_turno: element.shift_status.trim(),
			total_turno: element.total_shift,
			nombre_vendedor: element.name
		};

		formattedCollection.push(formattedObject);

		formattedDate = null;
	});

	return formattedCollection;
}