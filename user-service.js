const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

let mongoDBConnectionString = process.env.MONGO_URL;

let Schema = mongoose.Schema;

let userSchema = new Schema({
    userName: {
        type: String,
        unique: true
    },
    password: String,
    apiKey:{
        type: String,
        unique: true,
        required: true
    }
});

let User;

module.exports.connect = function () {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection(mongoDBConnectionString);

        db.on('error', err => {
            reject(err);
        });

        db.once('open', () => {
            User = db.model("users", userSchema);
            resolve();
        });
    });
};

module.exports.registerUser = function (userData) {
    return new Promise(function (resolve, reject) {

        if (userData.password != userData.password2) {
            reject("Passwords do not match");
        } else {

            bcrypt.hash(userData.password, 10).then(hash => {

                userData.password = hash;

                let newUser = new User(userData);

                newUser.save().then(() => {
                    resolve("User " + userData.userName + " successfully registered");  
                }).catch(err => {
                    if (err.code == 11000) {
                        reject("User Name already taken");
                    } else {
                        reject("There was an error creating the user: " + err);
                    }
                })
            }).catch(err => reject(err));
        }
    });
};

module.exports.checkUser = function (userData) {
    return new Promise(function (resolve, reject) {

        User.findOne({ userName: userData.userName })
            .exec()
            .then(user => {
                console.log("iser found");
                bcrypt.compare(userData.password, user.password).then(res => {
                    console.log(userData.password)
                    if (res === true) {
                        resolve(user);
                    } else if(res===false) {
                        reject("Incorrect password for user " + userData.userName);
                    }
                });
            }).catch(err => {
                reject("Unable to find user " + userData.userName);
            });
    });
};

module.exports.getAPIKey = function (id) {
    return new Promise(function (resolve, reject) {

        User.findById(id)
            .exec()
            .then(user => {
                resolve(user.apiKey)
            }).catch(err => {
                reject(`Unable to get apikey for user with id: ${id}`);
            });
    });
}

module.exports.changeAPIKey = function(userNameProvided, newAPIKey){
    return new Promise(function(resolve, reject){
        User.updateOne({userName: userNameProvided},
            {apiKey: newAPIKey})
            .then(user=>{
                resolve(user);
            }).catch(err=>{
                reject(`Unable to change the API Key for ${userNameProvided}. Please contact Admin`);
            })
    })
}