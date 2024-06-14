const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const userService = require("./user-service.js");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const axios = require("axios");

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());
const jwtSecret = 'LJsGTQ76jK4qsqa4gEjy3JFgu';

// JSON Web Token Setup
let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

// Configure its options
let jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
  secretOrKey: jwtSecret,
};

let strategy = new JwtStrategy(jwtOptions, function (jwt_payload, next) {
  console.log("payload received", jwt_payload);

  if (jwt_payload) {
    next(null, {
      _id: jwt_payload._id,
      userName: jwt_payload.userName,
    });
  } else {
    next(null, false);
  }
});

passport.use(strategy);

app.use(passport.initialize());

// app.get("/", (req, res) => {
//   res.send("Hello Geeks");
// });

app.post("/api/user/register", (req, res) => {
  userService
    .registerUser(req.body)
    .then((msg) => {
      res.json({ message: msg });
    })
    .catch((msg) => {
      res.status(422).json({ message: msg });
    });
});

app.post("/api/user/login", (req, res) => {
  userService
    .checkUser(req.body)
    .then((user) => {
      let token = jwt.sign(
        {
          _id: user._id,
          username: user.username,
        },
        jwtOptions.secretOrKey,
        { expiresIn: 60 * 60 }
      );
      res.json({ message: "login successful", token: token });
    })
    .catch((msg) => {
      res.status(422).json({ message: msg });
    });
});

app.get(
  "/api/user/apikey",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .getAPIKey(req.user._id)
      .then((data) => {
        res.json(data);
      })
      .catch((msg) => {
        res.status(422).json({ error: msg });
      });
  }
);

app.patch(
  "/api/user/change-api-key",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    userService
      .changeAPIKey(req.body.userName, req.body.newAPIKey)
      .then((data) => {
        res.json(data);
      })
      .catch((msg) => {
        res.status(422).json({ error: msg });
      });
  }
);

//TODO: Create delete user functionality
// app.delete("/api/user/history/:id",passport.authenticate('jwt', { session: false }), (req, res) => {
//     userService.removeHistory(req.user._id, req.params.id)
//     .then(data => {
//         res.json(data)
//     }).catch(msg => {
//         res.status(422).json({ error: msg });
//     })
// });

app.get(
  "/get-splitwise-user",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    console.log(
      `Bearer ${req} ${JSON.stringify(req.body)} ${JSON.stringify(
        req.query
      )} ${JSON.stringify(req.params)}`
    );
    axios
      .get("https://secure.splitwise.com/api/v3.0/get_current_user", {
        headers: {
          Authorization: `Bearer ${req.query.apiKey}`,
          "Access-Control-Allow-Origin": "*",
        },
      })
      .then((resp) => res.json(resp.data))
      .catch((err) => res.status(452).json({ error: err }));
    // return response;
  }
);

app.get(
  "/get-friends",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    axios
      .get("https://secure.splitwise.com/api/v3.0/get_friends", {
        headers: {
          Authorization: `Bearer ${req.query.apiKey}`,
          "Access-Control-Allow-Origin": "*",
        },
      })
      .then((resp) => res.json(resp.data))
      .catch((err) => res.status(452).json({ error: err }));
    // return response;
  }
);

app.post(
  "/add-expense-friends",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let postData = {
      description: req.body.description,
      cost: req.body.cost,
      currency_code: req.body.currency_code,
      users__0__owed_share: req.body.users__0__owed_share,
      users__0__user_id: req.body.users__0__user_id,
      users__0__paid_share: req.body.users__0__paid_share,
    };
    
    req.body.users.map((user,idx)=>{
      postData[`users__${idx+1}__email`] = user.email;
      postData[`users__${idx+1}__owed_share`] = user.owed_share;
    });
    axios
      .post("https://secure.splitwise.com/api/v3.0/create_expense", postData,{headers:{
        Authorization: `Bearer ${req.body.apiKey}`,
        "Access-Control-Allow-Origin": "*",
      }})
      .then((result) => console.log(result))
      .catch((err) => console.log(err));
  }
);

userService
  .connect()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("API listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log("unable to start the server: " + err);
    process.exit();
  });
