const mysql      = require('mysql');

const db = mysql.createConnection({

  host     : 'localhost',
  user     : 'root',
  password : 'password',
  database : 'database'

});

db.connect(function(err){
	if(!err) {
	    console.log("Database is connected successfully ....");    
	} else {
	    console.log("Error connecting database ....");    
	}
});

global.db = db;

