const express = require('express')
const mysql = require('mysql')


// const crypto = require('crypto');

const bodyParser = require('body-parser');		//Parse form data to backend			enables: req.body
const	session = require('express-session')	//Cookies to use session variables		enables: req.session

// Create connection:
const db = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'hyperionMediclinic'
})

// Connect to mysql:
db.connect(err => {
	if (err){
		throw err
	}
	console.log('mysql connected')
})

const	app = express()
var		cookie;

app.use(session({					//to enable req.session
	secret:'mdm5',
	resave: true,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({		//to enable req.body
  extended: true
}));
app.use(bodyParser.json());

//call other file functionalities:
//require('./patients')(app);

const lib = require("./lib");

// const result = lib.add(4, 4);
// console.log(`The result is: ${result}`);

//render HTML:
app.get('/',function(req, res) {
  res.sendFile(lib.dirname + '/index.html');
});

app.get('/patients',function(req, res) {
  res.sendFile(lib.dirname + '/patients.html');
});

app.get('/doctors',function(req, res) {
  res.sendFile(lib.dirname + '/doctors.html');
});

app.post('/selectPractitioner', function(req, res){	// patient page step 1
	//res.send(req.body)
	//req.body + ' ' + 
	//res.send(req.query);
	//console.log(req.body);

	if (req.body.practitioners)	{	
		req.session.practitioner = req.body.practitioners	// store practitioner in cookie
		console.log('practitioner: ' + req.body.practitioners)
		//navigate frontend to month calender
		res.redirect('/patients?month=true&date=' + (new Date()).valueOf());	//go to patients page
	}
	else {	// need to send practitioners to frontend
		// sql query load all administrators where information LIKE req.body.practitioner
		// console.log('send practitioners to frontend')
				//PRACTISES:
		let l_sql = 'SELECT * FROM practises'
		let l_query = db.query(l_sql, (l_err, l_results) => {
			if (l_err) {
				throw l_err
			}
			let l_fields = ""
			let l_str = ""

			if (l_results != '') {
				let l_json = JSON.parse(JSON.stringify(l_results))
				for (var id in l_json) {
					l_fields += l_json[id]['field'] + ';'
				}
				//console.log(l_results)
				l_fields = l_fields.slice(0, -1)
			}

			let sql = "SELECT * FROM administrators WHERE information LIKE '" + req.body.fields + "'"
			let query = db.query(sql, (err, results) => {
				if (err) {
					throw err
				}
				//console.log(results)
				if (results != '') {
					let l_json = JSON.parse(JSON.stringify(results))

					for (var id in l_json) {
						l_str += l_json[id]['dr_schedule_id'] + ':' + l_json[id]['name'] + ':'
					}
					l_str = l_str.slice(0, -1)
				}
				//res.redirect('/patients?select=true&fields=&practitioners=' + l_str);	//go to patients page
				res.redirect('/patients?select=true&fields=' + l_fields + '&practitioners=' + l_str);	//go to patients page

				//res.send('login details fetched')
			})
			//res.send('login details fetched')
		})
	}
});


app.post('/select_day', function(req, res){	//patient page step 2
	let l_datetime = req.body.datetime.split(';')
	let	l_date = new Date(parseInt(l_datetime[0]))
//	let l_datetime = req.body.slot.split(':')
	//let	l_date = new Date(parseInt(l_datetime[0]))
	let l_datestr = ((l_date. getMonth() + 1).toString() + "/" + l_date.getDate().toString() + "/" + l_date. getFullYear().toString()).toString()

	//res.send(req.body)
	//res.send(" " + new Date(parseInt(l_datetime[0])));

	// SELECT * FROM TABLE 'doctor' + req.session.practitioner	WHERE date = l_datestr
	let sql = "SELECT * FROM doctor" + req.session.practitioner + " WHERE date='" + l_datestr + "'"
	let query = db.query(sql, (err, results) => {
		if (err) {
			throw err
		}
		if (results != '') {
			let l_json = JSON.parse(JSON.stringify(results))
			let	l_slots = ""
			let	l_data = ""

			// 1. then collect data to send back
			for (var id in l_json) {
				l_data = results[id]['information']		// get data stored at date location
			}
			// 3. send back data:
			if (req.session.type == 'patient')
				res.redirect('/patients?day=true&fields=&practitioners=' + req.session.practitioner + '&slots=' + l_data + '&date=' + parseInt(l_datetime[0]));	//go to patients page
			else if (req.session.type == 'doctor')
				res.redirect('/doctors?day=true&fields=&practitioners=' + '&slots=' + l_data + '&date=' + parseInt(l_datetime[0]));	//go to patients page
		}
		else {
			//2. send back data:
				if (req.session.type == 'patient')
					res.redirect('/patients?day=true&fields=&practitioners=' + req.session.practitioner + '&slots=&date=' + parseInt(l_datetime[0]));	//go to patients page
				else if (req.session.type == 'doctor')
					res.redirect('/doctors?day=true&fields=&practitioners=' + '&slots=&date=' + parseInt(l_datetime[0]));	//go to patients page

		}
//		console.log(results)
//		res.send('login details fetched')
	})

});

function	patient_schedule(p_results, p_period, p_patient_id, p_doctor_id) {
	let	l_data = p_results.slice(0, -1).split(";")
	let i = -1
	let	l_bfound = false
	let	l_output = ""
	
	while (++i < l_data.length) {
		let	l_info = l_data[i].split(":")
		
		if (l_info[0] == p_period) {// if found period
			l_bfound = true
			if (parseInt(l_info[1]) == 0)//red
				;
			if (parseInt(l_info[1]) == 1)//green
				;
			if (parseInt(l_info[1]) == 2)//yellow
				l_data[i] = "";//remove
		}
		if (l_data[i] != "")
			l_output += l_data[i] + ";"
	}
	if (l_bfound == false)
		l_output +=  p_period + ":" + '2' + ":" + p_patient_id + ":" + p_doctor_id + ";";// then add new data to end of l_output
	return l_output
}

function	doctor_schedule(p_results, p_period, p_patient_id, p_doctor_id) {
	let	l_data = p_results.slice(0, -1).split(";")
	let i = -1
	let	l_bfound = false
	let	l_output = ""
	
	while (++i < l_data.length) {
		let	l_info = l_data[i].split(":")
		
		if (l_info[0] == p_period) {// if found period
			l_bfound = true
			if (parseInt(l_info[1]) == 0)//red
				l_data[i] = "";//makes slot open again
			if (parseInt(l_info[1]) == 1)//green
				l_data[i] = "";//cancels appointment
			if (parseInt(l_info[1]) == 2)//yellow
				l_data[i] = l_info[0] + ":" + '1' + ":" + l_info[3] + ":" + l_info[4];//green
		}
		if (l_data[i] != "")
			l_output += l_data[i] + ";"
	}
	if (l_bfound == false)
		l_output +=  p_period + ":" + '0' + ":" + p_patient_id + ":" + p_doctor_id + ";";// then add new data to end of l_output
	return l_output
}

app.post('/appointment', function(req, res){	//patient page step 3
	// -1: nothing	0:red	1:green		2:yellow
	let l_datetime = req.body.slot.split(':')
	let	l_date = new Date(parseInt(l_datetime[0]))
	let l_datestr = ((l_date. getMonth() + 1).toString() + "/" + l_date.getDate().toString() + "/" + l_date. getFullYear().toString()).toString()

	// console.log(req.body)
	// res.send(req.body)

	// SELECT * FROM TABLE 'doctor' + req.session.practitioner	WHERE date = l_datestr
	let sql = "SELECT * FROM doctor" + req.session.practitioner + " WHERE date='" + l_datestr + "'"
	let query = db.query(sql, (err, results) => {
		if (err) {
			throw err
		}
		if (results != '') {
			let l_json = JSON.parse(JSON.stringify(results))
			let	l_slots = ""
			let	l_data = ""
			// 1. then collect data to send back
			for (var id in l_json) {
				l_data = results[id]['information']		// get data stored at date location
			}
				// if red / if green / if yellow
			if (req.session.type == 'patient') 			// if patient, buttons work differently to doctor
				l_slots = patient_schedule(l_data, l_datetime[1], req.session.email, req.session.practitioner)
			else if (req.session.type == 'doctor')
				l_slots = doctor_schedule(l_data, l_datetime[1], req.session.email, req.session.practitioner)
			// 2. update table doctor" + req.session.practitioner  changing at l_datetime[1] with l_slots at information:
			let l_sql = "UPDATE doctor" + req.session.practitioner + " SET information='" + l_slots + "' WHERE date='" + l_datestr + "'"
			let l_query = db.query(l_sql, l_err => {
				if (l_err) {
					throw l_err
				}
				//console.log('system_variables updated for dr_schedule_id')
			// 3. send back data:
				if (req.session.type == 'patient')
					res.redirect('/patients?day=true&fields=&practitioners=' + req.session.practitioner + '&slots=' + l_slots + '&date=' + parseInt(l_datetime[0]));	//go to patients page
				else if (req.session.type == 'doctor')
					res.redirect('/doctors?day=true&fields=&practitioners=' + '&slots=' + l_slots + '&date=' + parseInt(l_datetime[0]));	//go to patients page
			})
		}
		else {
	//		1. insert new date:
			let l_str = ""
			if (req.session.type == 'patient') 
				l_str = l_datetime[1] + ":2:" + req.session.email + ":" + req.session.practitioner + ";"
			else if (req.session.type == 'doctor')
				l_str = l_datetime[1] + ":0:" + req.session.email + ":" + req.session.practitioner + ";"

			let l_post = { date: l_datestr, information: l_str}
			let l_sql = "INSERT INTO doctor" + req.session.practitioner + " SET ?"
			query = db.query(l_sql, l_post, l_err => {
				if (l_err) {
					throw l_err
				}
				//console.log('new administrator account created')
				//res.send('login added')
			//2. send back data:
				if (req.session.type == 'patient')
					res.redirect('/patients?day=true&fields=&practitioners=' + req.session.practitioner + '&slots=' + l_str + '&date=' + parseInt(l_datetime[0]));	//go to patients page
				else if (req.session.type == 'doctor')
					res.redirect('/doctors?day=true&fields=&practitioners=' + '&slots=' + l_str + '&date=' + parseInt(l_datetime[0]));	//go to patients page
			})

		}
//		console.log(results)
//		res.send('login details fetched')
	})

	// if result != ''
	//		1. then collect data to send back
	//		2. update table changing at l_datetime[1]
	//			if (req.session.type == 'patient') 			// if patient, buttons work differently to doctor
	//			if red / if green / if yellow 				// if blue
	// else
	//		1. insert new date

	// if (req.session.type == 'patient')
		// res.redirect('/patients?day=true&fields=&practitioners=' + req.session.practitioner + '&slots=' + '&date=' + parseInt(l_datetime[0]));	//go to patients page
	// else if (req.session.type == 'doctor')
		// res.redirect('/doctors?day=true&fields=&practitioners=' + '&slots=' + '&date=' + parseInt(l_datetime[0]));	//go to patients page

	
});


app.post('/login',function(req, res){
	let sql = 'SELECT * FROM users where email="' + req.body.email + '"'
	let query = db.query(sql, (err, results) => {
		if (err) {
			throw err
		}
		if (results != '') {	//then user account already exists so check password 
			let password = results[0].password
			let l_decrypted = lib.decrypt( { iv: password.slice(0, 32), encryptedData: password.slice(32, password.length) } )

			if ( req.body.password == l_decrypted ) {
				req.session.email = req.body.email	// store session cookie data
				req.session.type = 'patient'
				req.session.id = results[0]['id']		// store session cookie data

				// sql query parse practises to fields parameter below: seperated by colons:
				let l_sql = 'SELECT * FROM practises'
				let l_query = db.query(l_sql, (l_err, l_results) => {
					if (l_err) {
						throw l_err
					}
					let l_fields = ""

					if (l_results != '') {
						let l_json = JSON.parse(JSON.stringify(l_results))
						for (var id in l_json) {
							l_fields += l_json[id]['field'] + ';'
						}
						//console.log(l_results)
						l_fields = l_fields.slice(0, -1)

					}
					//res.send('login details fetched')
					res.redirect('/patients?select=true&fields=' + l_fields + '&practitioners=');	//go to patients page
				})
			}
			else
				res.redirect('/?tab=login&message=incorrect login credentials');	//go to login page

		}
		else
			res.redirect('/?tab=login&message=incorrect login credentials!');	//go to login page

		//console.log(results)
		//res.send('login details fetched')
	})

});

app.post('/adminLogin', function(req,res){
	// var password = lib.encrypt(req.body.password)
	// var username = req.body.username
	// var htmlData

	// password = password.iv + password.encryptedData
	// htmlData = 'Hello:' + username + " " + lib.decrypt( { iv: password.slice(0, 32), encryptedData: password.slice(32, password.length) } )
// //	res.send(htmlData)
	// console.log(req.body);
	// //if logged in successfully:
		// res.sendFile(lib.dirname + '/doctors.html');

	let sql = 'SELECT * FROM administrators where email="' + req.body.email + '"'
	let query = db.query(sql, (err, results) => {
		if (err) {
			throw err
		}
		if (results != '') {
			//then user account already exists so check password 
			let password = results[0].password
			let l_decrypted = lib.decrypt( { iv: password.slice(0, 32), encryptedData: password.slice(32, password.length) } )

			if ( req.body.password == l_decrypted ) {
				req.session.email = req.body.email	// store session cookie data
				req.session.name = results[0].name
				req.session.fields = results[0].information
				req.session.practitioner = results[0].dr_schedule_id
				req.session.type = 'doctor'
				res.redirect('/doctors?month=true&fields=' + results[0].information + '&practitioners=' + results[0].name + '&date=' + (new Date()).valueOf() );	//go to doctors page
			}
			else
				res.redirect('/?tab=adminLogin&message=incorrect login credentials');	//go to login page

		}
		else
			res.redirect('/?tab=adminLogin&message=incorrect login credentials!');	//go to login page

		//console.log(results)
		//res.send('login details fetched')
	})

});

app.post('/signup', function(req,res){
	let password = lib.encrypt(req.body.password)
	//let username = req.body.username
	//let email = req.body.email
	//let htmlData
	password = password.iv + password.encryptedData

	if (req.body.fields) {	// do insert for doctors
		// if email does not exist in database:
		let sql = 'SELECT * FROM administrators where email="' + req.body.email + '"'
		let query = db.query(sql, (err, results) => {
			if (err) {
				throw err
			}
			if (results != '') {
				//then user account already exists
				res.redirect('/?tab=adminLogin&message=account already exists');	//go to login page
			}
			else {// else insert into table
				// if no systems variables then have to create system variables
				// extract table counter from system_variables and increment it
				// create table for schedules for doctor
				// if practises does not exists in practises table, then add to practises table
				update_dr_schedule(req.body, password)
				res.redirect('/?tab=adminLogin&message=congratulations, you have successfully created an account')	//go to login page

			}
			//console.log(results)
			//res.send('login details fetched')
		})
		//res.send(req.body)
	}
	else {					// do insert for patients

		let sql = 'SELECT * FROM users where email="' + req.body.email + '"'
		let query = db.query(sql, (err, results) => {
			if (err) {
				throw err
			}
			if (results != '') {
				//then user account already exists
				res.redirect('/?tab=login&message=account already exists');	//go to login page
			}
			else {// else insert into table
		
				let post = { name: req.body.username, email: req.body.email, password: password, information: '' }
				sql = 'INSERT INTO users SET ?'
				query = db.query(sql, post, err => {
					if (err) {
						throw err
					}
					//res.send('login added')
					res.redirect('/?tab=login&message=congratulations, you have successfully created an account');	//go to login page
				})
			}
			//console.log(results)
			//res.send('login details fetched')
		})
	}
});

app.post('/logout',function(req, res){
	req.session.destroy(function(err) {
		if(err) {
			console.log(err)
		} else {
			res.redirect('/')
		}
	});
});


// Create database:
app.get('/createdb', (req, res) => {
	let sql = 'CREATE DATABASE hyperionMediclinic'
	db.query(sql, err => {
		if (err) {
			throw err
		}
		res.send('database created')
	})
})

// Create table:
app.get('/createTables', (req, res) => {
	let sql = 'CREATE TABLE users(id int AUTO_INCREMENT, name VARCHAR(255) , email VARCHAR(255), password VARCHAR(255), information VARCHAR(1024), PRIMARY KEY(id))'
	db.query(sql, err => {
		if (err) {
			throw err
		}
		res.send('logins table created')
	})

	sql = 'CREATE TABLE system_variables(id int AUTO_INCREMENT, dr_schedule_id INT, PRIMARY KEY(id))'
	db.query(sql, err => {
		if (err) {
			throw err
		}
		res.send('system variables table created')
	})

	sql = 'CREATE TABLE administrators(id int AUTO_INCREMENT, name VARCHAR(255), email VARCHAR(255), password VARCHAR(255), information VARCHAR(1024), dr_schedule_id INT, PRIMARY KEY(id))'
	db.query(sql, err => {
		if (err) {
			throw err
		}
		res.send('doctors table created')
	})

	sql = 'CREATE TABLE practises(id int AUTO_INCREMENT, field VARCHAR(255), PRIMARY KEY(id))'
	db.query(sql, err => {
		if (err) {
			throw err
		}
		res.send('practises table created')
	})
})


function	update_dr_schedule(p_body, p_password) {
	let sql = 'SELECT * FROM system_variables'
	let query = db.query(sql, (err, results) => {
		if (err) {
			throw err
		}
		if (results == '') // if no results then need to init_system_variables
			init_system_variables()

		update_system_variables(results[0].dr_schedule_id + 1)
		// insert doctor data into table
		update_administrators(p_body, p_password, results[0].dr_schedule_id + 1)
		// create new table for dr_schedule_id
		create_dr_schedule(results[0].dr_schedule_id + 1)
		// update practises 
		update_practises(p_body)
		//console.log(results)
		//res.send('login details fetched')
	})
}

function	update_practises(p_body) {
	let sql = 'SELECT * FROM practises'
	let query = db.query(sql, (err, results) => {
		if (err) {
			throw err
		}
		if (results == '') // if no results then need to init_system_variables
			insert_practise(p_body);
		else {	// loop through practises and check if any meets p_body.fields
			let l_json = JSON.parse(JSON.stringify(results))
			let bfound = false

			for (var id in l_json) {
				for (var key in l_json[id]) {
					// console.log("Key: " + key);
					// console.log("Value: " + l_json[id][key]);
					if (l_json[id][key] == p_body.fields)
						bfound = true
				}
				if (bfound)
					break;
			}
			if (!bfound)
				insert_practise(p_body)
		}
	})
}

function	insert_practise(p_body) {
	let post = { field: p_body.fields }
	sql = 'INSERT INTO practises SET ?'
	query = db.query(sql, post, err => {
		if (err) {
			throw err
		}
		console.log('new practise added')
		//res.send('login added')
	})
}

function	create_dr_schedule(p_id) {
	sql = 'CREATE TABLE doctor' + p_id.toString() + '(id int AUTO_INCREMENT, date VARCHAR(15), information VARCHAR(1024), PRIMARY KEY(id))'
	db.query(sql, err => {
		if (err) {
			throw err
		}
		console.log('doctors' + p_id.toString() + ' table created')
	})
}

function	update_administrators(p_body, p_password, p_id) {
	let post = { name: p_body.username, email: p_body.email, password: p_password, information: p_body.fields, dr_schedule_id: p_id}
	sql = 'INSERT INTO administrators SET ?'
	query = db.query(sql, post, err => {
		if (err) {
			throw err
		}
		console.log('new administrator account created')
		//res.send('login added')
	})
}

function	update_system_variables(p_value) {
	let sql = 'UPDATE system_variables SET dr_schedule_id=' + (p_value) + '  WHERE id=1'
	let query = db.query(sql, err => {
		if (err) {
			throw err
		}
		console.log('system_variables updated for dr_schedule_id')
	})
}

function	init_system_variables() {
	let post = { dr_schedule_id: 0 }
	let sql = 'INSERT INTO system_variables SET ?'
	let query = db.query(sql, post, err => {
		if (err) {
			throw err
		}
		console.log("added system_variable")
		//res.send('login added')
	})
}

// insert data to table:
app.get('/login1', (req, res) => {
	let post = { name: 'Jake smith', email: 'test@gmail.com', password: 'unsecure', information: '' }
	let sql = 'INSERT INTO logins SET ?'
	let query = db.query(sql, post, err => {
		if (err) {
			throw err
		}
		res.send('login added')
	})
})

// Select User:
app.get('/getUser', (req, res) => {
	let sql = 'SELECT * FROM logins'
	let query = db.query(sql, (err, results) => {
		if (err) {
			throw err
		}
		console.log(results)
		res.send('login details fetched')
	})
})


// Update User:
app.get('/updateUser/:id', (req, res) => {
	let newPassword = 'Updated password'
	let sql = `UPDATE users SET password = '${newPassword}' WHERE id=${req.params.id}`
	let query = db.query(sql, err => {
		if (err) {
			throw err
		}
		res.send('login updated')
	})
})

// Delete User:
app.get('/deleteUser/:id', (req, res) => {
	let sql = `DELETE FROM user WHERE id= ${req.params.id}`
	let query = db.query(sql, err => {
		if (err) {
			throw err
		}
		res.send('login deleted')
	})
})

//show tables
app.get('/showTables', (req, res) => {
	let sql = 'SHOW TABLES'
	let query = db.query(sql, (err, results) => {
		if (err) {
			throw err
		}
		console.log(results)
		if (results != '') {
			l_json = JSON.parse(JSON.stringify(results))
			for (var id in l_json) {
				for (var key in l_json[id]) {
					console.log("Key: " + key);
					console.log("Value: " + l_json[id][key]);
				}
			}
			res.send('tables fetched: ' +  l_json )
		}
		else
			res.send('no tables found')
	})
})

app.get('/dropTables', (req, res) => {
	let sql = 'SHOW TABLES'
	let query = db.query(sql, (err, results) => {
		if (err) {
			throw err
		}
		console.log(results)
		if (results != '') {
			l_json = JSON.parse(JSON.stringify(results))
			for (var id in l_json) {
				for (var key in l_json[id]) {
					//console.log("Key: " + key);
					//console.log("Value: " + l_json[id][key]);
					let l_sql = 'DROP TABLE ' + l_json[id][key]
					let l_query = db.query(l_sql, l_err => {
						if (l_err) {
							throw l_err
						}
						//console.log(results)
					})
				}
			}
			//res.send('tables fetched and removed')
		}
		else
			res.send('no tables found')
	})
})

app.listen('3000', () => {
	console.log('server started on port 3000')
})