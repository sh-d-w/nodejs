const crypto = require('crypto');	// Encryption
const path = require('path');

//Get app directory
const dirname = path.dirname(require.main.filename);

// Encryption:
const algorithm = 'aes-256-cbc';
const secret = 'mdm5'
const key =  crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, 32)//"12345678911111111111111111111111";
const iv = crypto.randomBytes(16);

function encrypt(text) {
	let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
	let encrypted = cipher.update(text);
	encrypted = Buffer.concat([encrypted, cipher.final()]);
	return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

function decrypt(text) {
	let iv = Buffer.from(text.iv, 'hex');
	let encryptedText = Buffer.from(text.encryptedData, 'hex');
	let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
	let decrypted = decipher.update(encryptedText);
	decrypted = Buffer.concat([decrypted, decipher.final()]);
	return decrypted.toString();
}


function	login() {
	// for patients to login
}

function	adminLogin() {
	// for doctors to login
}

function	signup() {
	// for users and doctors to sign up
}

//
function	logout() {
	// for patients or doctors to logout: deletes session variables
}


module.exports = { dirname, encrypt, decrypt };


// module.exports = function(app){

	// app.post('/login',function(req,res){
		// var password = encrypt(req.body.password)
		// var username = req.body.username
		// var htmlData

		// password = password.iv + password.encryptedData
		// htmlData = 'Hello:' + username + " " + decrypt( { iv: password.slice(0, 32), encryptedData: password.slice(32, password.length) } )
		// //res.send(htmlData);
		// console.log(htmlData);
		// //if logged in successfully:
		// res.sendFile(appDirectory + '/patients.html');

	// });

    // //other routes..
// }



// function add(x, y) {
  // return x + y;
// }

// function subtract(x, y) {
  // return x - y;
// }

// const num = 33;

