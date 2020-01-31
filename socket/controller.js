var path = require('path');
var bodyParser = require('body-parser');
// var date = require('date-and-time');
var _ = require('lodash');
var distance = require('google-distance-matrix');
// var distance1 = require('google-distance');
// var now = require('date-now');
// var system_timezone = require('system-timezone');
var moment = require('moment-timezone');
var redis = require('redis');
var http = require('http');
var urlencode = require('urlencode');





//'Ashish food company, Your Food is Preparing'
sendMessage = function(toNumber,message) {
  // var msg = urlencode(message);
  // var toNumber = number;
  var username = 'tarun@.com';
  var hash = '94450e2006e19c63c4abbdb0c499e45c76ca5e4a9ebe33bd28ba2ac65cd1c11e'; // The hash key could be found under Help->All Documentation->Your hash key. Alternatively you can use your Textlocal password in plain text.
  var sender = 'TXTEML';
  var data = 'username=' + username + '&hash=' + hash + '&sender=' + sender + '&numbers=' + toNumber + '&message=' + urlencode(message);
  var smsoptions = {
    host: 'api.textlocal.in', path: '/send?' + data
  };
  smscallback = function (response) {
    var str = '';//another chunk of data has been recieved, so append it to `str`
    response.on('data', function (chunk) {
      str += chunk;
    });//the whole response has been recieved, so we just print it out here
    response.on('end', function () {
      console.log(str);
    });
  };//console.log('hello js'))
  http.request(smsoptions, smscallback).end();
};

module.exports = function (app,io,port){
  app.get('/', (req, res) => {
    res.send('Chat Server is running on port ' + port);
  });
  var users={};
  var keys={};
  io.on('connection', function (socket) {
    var datetime = moment().tz("Asia/Calcutta").format('YYYY-MM-DD HH:mm:ss');
    let datetime2 = moment().tz("Asia/Calcutta").format('YYYY-MM-DD HH:mm:ss');
    console.log('socket server is running');

    // Registered user or check user
    let user_id = socket.handshake.query.user_id;
    io.to(socket.id).emit('user_id', user_id);
    users[user_id]=socket.id;
    console.log("Users list : "+ JSON.stringify(users));


    // ------------------------


    
    //url encode instalation need to use $ npm install urlencode

    // ---------------------------




    //get request from cammand console driver request
    var redisClint = redis.createClient();
    redisClint.subscribe('message');
    redisClint.on('message', function(channel,message){
      let online_driver = "SELECT * FROM users JOIN model_has_roles ON users.id = model_has_roles.model_id WHERE users.ustatus = 1 AND model_has_roles.role_id = 5";
      let driver_request = "SELECT * FROM driver_request WHERE STATUS = 0";
      // execute query
      db.query(driver_request, (err, dr_result) => {
        if (dr_result.length > 0) {
          var newreq = {request:dr_result};
          db.query(online_driver, (err, do_result) => {
            Object.keys(do_result).forEach(function(key) {
              // console.log('driverrequest1 user '+JSON.stringify(dr_result));
              console.log(message +' driverrequest '+ do_result[key].id + ' orderid ' + dr_result[0].booking_master_id);
              io.to(users[do_result[key].id]).emit('driverrequest',newreq);
            });
          });
        }
      });
    });

    //update driver online / offline status
    socket.on('drivertiming', (user_id,status) => {
      var datetime1 = moment().tz("Asia/Calcutta").format('YYYY-MM-DD HH:mm:ss');
      console.log('datetime ' + datetime);
      console.log('datetime2 ' + datetime2);
      db.query("UPDATE `users` SET updated_at='" + datetime1 + "',ustatus='" + status + "' WHERE (id = '" + user_id + "')");
      socket.emit('drivertiming', 'drivertiming '+user_id + ' ' + status);
      
      /*let drivertiming = "SELECT * FROM `driver_timing` drireq WHERE (user_id = '" + user_id + "' AND status = 0)";
      db.query(drivertiming, (err, timingresult) => {
            if (err) {
              console.log('error drivertiming : ' + err);
            }
            if (timingresult.length > 0) {
              console.log('result if drivertiming : ' + timingresult);
            }else{
              console.log('result else drivertiming : ' + timingresult);
            }
      });*/
      if (status == 0){
        console.log(datetime1 + ' drivertiming '+user_id + ' ' + status);
        db.query("UPDATE `driver_timing` SET updated_at='" + datetime1 + "',`status`=0 WHERE `user_id`='" +  user_id + "' AND status=1");
      }else
      if(status == 1){
        console.log(datetime1 +' drivertiming '+user_id + ' ' + status);
        db.query("INSERT INTO `driver_timing` (user_id,status,created_at,updated_at) VALUES ('" +  user_id + "', '" + status + "', '" + datetime1 + "', '" + datetime1 + "')");
      }
    });

    //update driver location
    socket.on('driverlocation', (user_id,latitude,longitude) => {
      db.query("UPDATE `users` SET updated_at='" + datetime + "',latitude='" + latitude + "',longitude='" + longitude + "' WHERE (id = '" + user_id + "')");
      io.to(users[user_id]).emit('driverlocation', {'latitude':latitude,'longitude':longitude});
      // console.log('driverlocation '+user_id + ' = '+latitude + ', ' + longitude + ' time ' + datetime);
    });

    //driver order status
    socket.on('driverrequeststatus', (user_id,orderid,status) => {
      socket.emit('driverrequeststatus', 'driverrequeststatus'+user_id);
      console.log('driverrequeststatus '+user_id +' '+orderid +' '+status);
      //driver order request decline
      if (user_id && orderid && status) {
        if (status == 0) {
          console.log('driverrequeststatus order is decline');
          socket.emit('driverrequeststatus', 'order is decline');
        }
        //driver order request accept
        else if (status == 1) {
          var resultfalse = {'status':'false','message':'Order is already accept different driver.','orderstatus':status};
          let driver_request_query = "SELECT * FROM `driver_request` drireq WHERE (booking_master_id = '" + orderid + "' AND status = 0)";
          // execute query
          db.query(driver_request_query, (err, drqresult) => {
            if (err) {
              console.log('error driver_request_query : ' + err);
            }
            if (drqresult.length > 0) {
              //updated driver request table
              let update_driver_request = "UPDATE `driver_request` SET updated_at='" + datetime + "',driver_id='" + user_id + "',status=1,order_status=0,order_remark=1 WHERE (booking_master_id = '" + orderid + "' AND status=0)";
              db.query(update_driver_request, (err, result) => {
                if (err) {
                  console.log('error update_driver_request : ' + err);
                }
              });

              Object.keys(drqresult).forEach(function(key) {
                var reobj = drqresult[key];
                //insert booking mearchant order table
                let insert_booking_mearchant_order = "INSERT INTO `booking_mearchant_order` (user_id, booking_master_id,tiffin_center_id,quantity,price,payment_mode,status,driver_id,created_at,updated_at) VALUES ('" +  reobj.user_id + "', '" + reobj.booking_master_id + "', '" + reobj.tiffin_center_id + "', '" + reobj.quantity + "', '" + reobj.price + "', '" + reobj.payment_mode + "', '" + 'Driver Assigned ' + "', '" + user_id + "', '" + datetime + "', '" + datetime + "')";
                db.query(insert_booking_mearchant_order, (err, result) => {
                  if (err) {
                    console.log('error insert_booking_mearchant_order : ' + err);
                  }
                });
                //insert booking driver order table
                let insert_booking_driver_order = "INSERT INTO `booking_driver_order` (user_id, booking_master_id,tiffin_center_id,quantity,price,payment_mode,status,created_at,updated_at) VALUES ('" +  reobj.user_id + "', '" + reobj.booking_master_id + "', '" + reobj.tiffin_center_id + "', '" + reobj.quantity + "', '" + reobj.price + "', '" + reobj.payment_mode + "', '" + 'Driver Assigned' + "', '" + datetime + "', '" + datetime + "')";
                db.query(insert_booking_driver_order, (err, result) => {
                  if (err) {
                    console.log('error insert_booking_driver_order : ' + err);
                  }
                });
                //insert booking order track table
                /*let insert_booking_order_track = "INSERT INTO `booking_order_track` (user_id, booking_master_id,tiffin_center_id,quantity,price,payment_mode,status,created_by,updated_by,created_at,updated_at) VALUES ('" +  reobj.user_id + "', '" + reobj.booking_master_id + "', '" + reobj.tiffin_center_id + "', '" + reobj.quantity + "', '" + reobj.price + "', '" + reobj.payment_mode + "', '" + 'GoToPick' + "', '" + user_id + "', '" + user_id + "','" + datetime + "', '" + datetime + "')";
                db.query(insert_booking_order_track, (err, result) => {
                  if (err) {
                    console.log('error insert_booking_order_track : ' + err);
                  }
                });*/
              });
            }
            else {
              console.log('result else : ' + resultfalse);
              socket.emit('driverrequeststatus', JSON.stringify(resultfalse));
            }
          });
          socket.emit('driverrequeststatus', 'order is accepte');
          console.log('driverrequeststatus order is accepte');
        }
        
        //driver order cancel job
        else if (status == 2) {
          console.log(user_id+ ' driverordrcanclejob '+ orderid);
          socket.emit('driverrequeststatus', 'order is cancle job');
        }
        //driver order go to pickup from merchant
        else if (status == 3) {
          var resulttrue = {'status':'true','message':'Order is prepared','orderstatus':status};
          var resultfalse = {'status':'false','message':'Order not prepared','orderstatus':status};
          let select_booking_mearchant_order_query = "SELECT * FROM `booking_master` drireq WHERE (id = '" + orderid + "' AND  status='Preparing')";
          db.query(select_booking_mearchant_order_query, (err, moqresult) => {
            if (err) {
              console.log('error select_booking_mearchant_order_query : ' + err);
            }
            if (moqresult.length > 0) {
              socket.emit('driverrequeststatus', resulttrue);
              console.log('result if : ' + JSON.stringify(resulttrue));

              Object.keys(moqresult).forEach(function(key) {
                var reobj = moqresult[key];
                //insert booking order track table
                sendMessage(reobj.user_contact_no, reobj.merchant_name+', Your Food is OnWay');

                let insert_booking_order_track = "INSERT INTO `booking_order_track` (user_id, booking_master_id,tiffin_center_id,quantity,price,payment_mode,status,created_by,updated_by,created_at,updated_at) VALUES ('" +  reobj.user_id + "', '" + reobj.id + "', '" + reobj.tiffin_center_id + "', '" + reobj.quantity + "', '" + reobj.round_amount + "', '" + reobj.tnc_text + "', '" + 'OnWay' + "', '" + user_id + "', '" + user_id + "','" + datetime + "', '" + datetime + "')";
                db.query(insert_booking_order_track, (err, result) => {
                  if (err) {
                    console.log('error insert_booking_order_track : ' + err);
                  }
                  /*if (result.length > 0) {
                  }*/
                });
              });

              //updated booking master table
              let update_pickup_booking_master = "UPDATE `booking_master` SET updated_at='" + datetime + "',status='" + 'OnWay' + "' WHERE (id = '" + orderid + "' AND status='Preparing')";
              db.query(update_pickup_booking_master, (err, result) => {
                if (err) {
                  console.log('error update_pickup_booking_master : ' + err);
                }
                if (result.length > 0) {
                  console.log('update update_pickup_booking_master : ' + JSON.stringify(result));
                }
              });

              //updated booking merchant table
              let update_pickup_booking_mearchant_order = "UPDATE `booking_mearchant_order` SET updated_at='" + datetime + "',status='" + 'OnWay' + "' WHERE (booking_master_id = '" + orderid + "' AND status='Preparing')";
              db.query(update_pickup_booking_mearchant_order, (err, result) => {
                if (err) {
                  console.log('error update_pickup_booking_mearchant_order : ' + err);
                }
              });
              //updated booking driver order table
              let update_pickup_booking_driver_order = "UPDATE `booking_driver_order` SET updated_at='" + datetime + "',status='" + 'OnWay' + "' WHERE (booking_master_id = '" + orderid + "' AND status='Preparing')";
              db.query(update_pickup_booking_driver_order, (err, result) => {
                if (err) {
                  console.log('error update_pickup_booking_driver_order : ' + err);
                }
              });

              //updated driver request table
              let update_driver_request = "UPDATE `driver_request` SET updated_at='" + datetime + "',order_status=0,order_remark=3 WHERE (booking_master_id = '" + orderid + "' AND status=1)";
              db.query(update_driver_request, (err, result) => {
                if (err) {
                  console.log('error update_driver_request : ' + err);
                }
              });

              
            }else {
              console.log('result else : ' + resultfalse);
              socket.emit('driverrequeststatus', JSON.stringify(resultfalse));
            }
          });















          
          

          /*let select_driver_request_query = "SELECT * FROM `driver_request` drireq WHERE (booking_master_id = '" + orderid + "' AND driver_id = '" + user_id + "' AND status=1)";
          db.query(select_driver_request_query, (err, moqresult) => {
            if (err) {
              console.log('error select_driver_request_query : ' + err);
            }
            if (moqresult.length > 0) {
              Object.keys(moqresult).forEach(function(key) {
                var reobj = moqresult[key];
                //insert booking order track table
                let insert_booking_order_track = "INSERT INTO `booking_order_track` (user_id, booking_master_id,tiffin_center_id,quantity,price,payment_mode,status,created_by,updated_by,created_at,updated_at) VALUES ('" +  reobj.user_id + "', '" + reobj.booking_master_id + "', '" + reobj.tiffin_center_id + "', '" + reobj.quantity + "', '" + reobj.price + "', '" + reobj.payment_mode + "', '" + 'OnWay' + "', '" + user_id + "', '" + user_id + "','" + datetime + "', '" + datetime + "')";
                db.query(insert_booking_order_track, (err, result) => {
                  if (err) {
                    console.log('error insert_booking_order_track : ' + err);
                  }
                });
              });
            }
          });*/
          // console.log(user_id+ ' driverordrpickup '+ orderid);
          // socket.emit('driverrequeststatus', 'order is pickup');
        }
        //driver finish the order delivery job
        else if (status == 4) {
          // var resulttrue = {'status':'true','message':'Order is prepared','orderstatus':status};
          var resultfalse = {'status':'false','message':'Order not OnWay','orderstatus':status};
          let select_booking_mearchant_order_query = "SELECT * FROM `booking_master` drireq WHERE (id = '" + orderid + "' AND  status='OnWay')";
          db.query(select_booking_mearchant_order_query, (err, moqresult) => {
            if (err) {
              console.log('error select_booking_mearchant_order_query : ' + err);
            }
            if (moqresult.length > 0) {
              // socket.emit('driverrequeststatus', resulttrue);
              console.log('result if : ' + JSON.stringify(resulttrue));

              Object.keys(moqresult).forEach(function(key) {
                var reobj = moqresult[key];
                //insert booking order track table
                sendMessage(reobj.user_contact_no, reobj.merchant_name+', Your Food is Delivered');
                let insert_booking_order_track = "INSERT INTO `booking_order_track` (user_id, booking_master_id,tiffin_center_id,quantity,price,payment_mode,status,created_by,updated_by,created_at,updated_at) VALUES ('" +  reobj.user_id + "', '" + reobj.id + "', '" + reobj.tiffin_center_id + "', '" + reobj.quantity + "', '" + reobj.round_amount + "', '" + reobj.tnc_text + "', '" + 'Delivered' + "', '" + user_id + "', '" + user_id + "','" + datetime + "', '" + datetime + "')";
                db.query(insert_booking_order_track, (err, result) => {
                  if (err) {
                    console.log('error insert_booking_order_track : ' + err);
                  }
                });
              });

              //updated booking master table
              let update_pickup_booking_master = "UPDATE `booking_master` SET updated_at='" + datetime + "',status='" + 'Delivered' + "' WHERE (id = '" + orderid + "' AND status='OnWay')";
              db.query(update_pickup_booking_master, (err, result) => {
                if (err) {
                  console.log('error update_pickup_booking_master : ' + err);
                }
              });

              //updated booking merchant table
              let update_pickup_booking_mearchant_order = "UPDATE `booking_mearchant_order` SET updated_at='" + datetime + "',status='" + 'Delivered' + "' WHERE (booking_master_id = '" + orderid + "' AND status='OnWay')";
              db.query(update_pickup_booking_mearchant_order, (err, result) => {
                if (err) {
                  console.log('error update_pickup_booking_mearchant_order : ' + err);
                }
              });
              //updated booking driver order table
              let update_pickup_booking_driver_order = "UPDATE `booking_driver_order` SET updated_at='" + datetime + "',status='" + 'Delivered' + "' WHERE (booking_master_id = '" + orderid + "' AND status='OnWay')";
              db.query(update_pickup_booking_driver_order, (err, result) => {
                if (err) {
                  console.log('error update_pickup_booking_driver_order : ' + err);
                }
              });

              //updated driver request table
              let update_driver_request = "UPDATE `driver_request` SET updated_at='" + datetime + "',order_status=1,order_remark=4 WHERE (booking_master_id = '" + orderid + "' AND status=1)";
              db.query(update_driver_request, (err, result) => {
                if (err) {
                  console.log('error update_driver_request : ' + err);
                }
              });

            }else {
              console.log('result else : ' + resultfalse);
              socket.emit('driverrequeststatus', JSON.stringify(resultfalse));
            }
          });



          /*//updated booking master table
          let update_pickup_booking_master = "UPDATE `booking_master` SET updated_at='" + datetime + "',status='" + 'Delivered' + "' WHERE (id = '" + orderid + "' AND status='OnWay')";
          db.query(update_pickup_booking_master, (err, result) => {
            if (err) {
              console.log('error update_pickup_booking_master : ' + err);
            }
          });
          //updated booking merchant table
          let update_pickup_booking_mearchant_order = "UPDATE `booking_mearchant_order` SET updated_at='" + datetime + "',status='" + 'Delivered' + "' WHERE (booking_master_id = '" + orderid + "' AND status='OnWay')";
          db.query(update_pickup_booking_mearchant_order, (err, result) => {
            if (err) {
              console.log('error update_pickup_booking_mearchant_order : ' + err);
            }
          });
          //updated booking driver order table
          let update_pickup_booking_driver_order = "UPDATE `booking_driver_order` SET updated_at='" + datetime + "',status='" + 'Delivered' + "' WHERE (booking_master_id = '" + orderid + "' AND status='OnWay')";
          db.query(update_pickup_booking_driver_order, (err, result) => {
            if (err) {
              console.log('error update_pickup_booking_driver_order : ' + err);
            }
          });

          let select_driver_request_query = "SELECT * FROM `driver_request` drireq WHERE (booking_master_id = '" + orderid + "' AND driver_id = '" + user_id + "' AND status=1)";
          db.query(select_driver_request_query, (err, moqresult) => {
            if (err) {
              console.log('error select_driver_request_query : ' + err);
            }
            if (moqresult.length > 0) {
              Object.keys(moqresult).forEach(function(key) {
                var reobj = moqresult[key];
                //insert booking order track table
                let insert_booking_order_track = "INSERT INTO `booking_order_track` (user_id, booking_master_id,tiffin_center_id,quantity,price,payment_mode,status,created_by,updated_by,created_at,updated_at) VALUES ('" +  reobj.user_id + "', '" + reobj.booking_master_id + "', '" + reobj.tiffin_center_id + "', '" + reobj.quantity + "', '" + reobj.price + "', '" + reobj.payment_mode + "', '" + 'Delivered' + "', '" + user_id + "', '" + user_id + "','" + datetime + "', '" + datetime + "')";
                db.query(insert_booking_order_track, (err, result) => {
                  if (err) {
                    console.log('error insert_booking_order_track : ' + err);
                  }
                });
              });
            }
          });*/

          // console.log(user_id+ ' driverorfinishjob '+ orderid);
          // socket.emit('driverrequeststatus', 'order finish job');
        }
      }
    });

    /*//driver order go to pickup from merchant
    socket.on('driverordrpickup', (user_id,orderid) => {
      console.log(user_id+ 'driverordrpickup '+ orderid);
    });
    //driver finish the order delivery job
    socket.on('driverorfinishjob', (user_id,orderid) => {
      console.log(user_id+ 'driverorfinishjob '+ orderid);
    });*/


    //getting driver order request
    /*socket.on('driverrequest', (user_id) => {     
      var driver_request_query = "SELECT * FROM `driver_request` drireq WHERE (driver_id = '" + user_id + "' AND status = 0)";
        // execute query
        db.query(driver_request_query, (err, result) => {
          // if (!err){
            socket.emit('driverrequest', result);
            // console.log('driverrequest '+result);
          // }
        });
    });*/
    /*socket.on('message', function(user_id,orderid){
      

     
    });*/


  });//end connection
};//end module.exports