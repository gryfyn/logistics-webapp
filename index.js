const express = require('express');
const app = express();
const port = 3700;
const bodyparser = require("body-parser");
const cookieParser = require("cookie-parser");
const sessions = require('express-session');
const FileStore = require("session-file-store")(sessions);
const fs = require('fs');
const path = require('path');

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(sessions({
  name: "User_Session",
  secret: "8Ge2xLWOImX2HP7R1jVy9AmIT0Z68oSH4QXIyRZyVqtcl4z1Iu12345678191234578687",
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: false },
  resave: false,
  store: new FileStore({ path: "./data/sessions.json", logFn: function () {} })
}));

app.use(express.static('public'));
app.set('views', 'views');
app.set('view engine', 'hbs');

const usersFilePath = path.join(__dirname, 'data', 'users.json');
const deliveriesFilePath = path.join(__dirname, 'data', 'deliveries.json');
const assignedDeliveriesFilePath = path.join(__dirname, 'assignedDeliveries.json');

// Read JSON data from file
function readJSONFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Write JSON data to file
function writeJSONFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Middleware to check if the user is authenticated
function authenticateUser(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/');
  }
}

// Middleware to check if the user is delivery personnel
function isDeliveryPersonnel(req, res, next) {
  if (req.session.user && req.session.user.role === 'delivery_personnel') {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
}

// Routes
app.get('/', (req, res) => {
  res.render('./user/login');
});

app.get('/admin-dashboard', (req, res) => {
  res.render('./admin/adminDashboard');
});

app.get('/assign-page', (req, res) => {
  res.render('./admin/assign');
});

app.get('/login-page', (req, res) => {
  res.render('./user/login');
});

app.get('/profile', (req, res) => {
  res.render('./user/profile');
});

app.get('/completed', authenticateUser, isDeliveryPersonnel,(req, res) => {
  res.render('./user/completed');
});

app.get('/deliveries', (req, res) => {
  const deliveries = readJSONFile(deliveriesFilePath);
  res.json(deliveries);
});

app.get('/pending', authenticateUser, isDeliveryPersonnel, (req, res) => {
  res.render('./user/pending');
});



app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = readJSONFile(usersFilePath);

  const user = users.find(u => u.email === email);
  
  if (user && user.password === password) {
    req.session.user = { email: user.email, role: user.role, id: user.id, name: user.name};
    
    if (user.role === 'admin') {
      res.redirect('/admin-dashboard');
    } else if (user.role === 'delivery_personnel') {
      res.redirect('/pending');
    } else {
      res.redirect('/');
    }
  } else {
    res.status(401).send('Invalid email or password');
  }
});


app.get('/pending-deliveries', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userEmail = req.session.user.email;
  const deliveries = readJSONFile(deliveriesFilePath);

  const pendingDeliveries = deliveries.filter(delivery => delivery.email === userEmail && delivery.status === 'Pending');
  res.json(pendingDeliveries);
});

app.get('/completed-deliveries', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userEmail = req.session.user.email;
  const deliveries = readJSONFile(deliveriesFilePath);

  const completedDeliveries = deliveries.filter(delivery => delivery.email === userEmail && delivery.status === 'Delivered');
  res.json(completedDeliveries);
});

app.get('/get-user-profile', authenticateUser, (req, res) => {
  const userEmail = req.session.user.email;

  fs.readFile(usersFilePath, 'utf8', (err, usersData) => {
    if (err) {
      console.error('Error reading users file:', err);
      return res.status(500).json({ error: 'Failed to read user profile.' });
    }

    try {
      const users = JSON.parse(usersData);

      // Find the user object based on userEmail (assuming users is an array of user objects)
      const user = users.find(u => u.email === userEmail);

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Construct user information object to send in response
      const userInfo = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        // Add other fields as needed
      };

      res.status(200).json(userInfo);
    } catch (err) {
      console.error('Error parsing users data:', err);
      res.status(500).json({ error: 'Failed to parse user data.' });
    }
  });
});

app.put('/update-delivery-status/:id', (req, res) => {
  const deliveryID = parseInt(req.params.id);
  const { status } = req.body;

  // Read deliveries data from the JSON file
  fs.readFile(deliveriesFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading deliveries.json:', err);
      return res.status(500).json({ error: 'Failed to read deliveries data.' });
    }

    try {
      let deliveries = JSON.parse(data);

      // Find delivery by ID
      const deliveryIndex = deliveries.findIndex(delivery => delivery.deliveryID === deliveryID);

      if (deliveryIndex !== -1) {
        if (deliveries[deliveryIndex].status === 'Pending') {
          // Update delivery status
          deliveries[deliveryIndex].status = status;

          // Write updated data back to deliveries.json
          fs.writeFile(deliveriesFilePath, JSON.stringify(deliveries, null, 2), (err) => {
            if (err) {
              console.error('Error writing deliveries.json:', err);
              res.status(500).json({ error: 'Failed to update delivery status.' });
            } else {
              res.status(200).json({ message: 'Delivery status updated successfully.' });
            }
          });
        } else {
          res.status(400).json({ error: 'Delivery status is not "Pending".' });
        }
      } else {
        res.status(404).json({ error: 'Delivery not found.' });
      }
    } catch (err) {
      console.error('Error parsing deliveries data:', err);
      res.status(500).json({ error: 'Failed to parse deliveries data.' });
    }
  });
});

app.post('/add-delivery', (req, res) => {
  const newDelivery = req.body;

  fs.readFile('./data/deliveries.json', (err, data) => {
      if (err) {
          return res.status(500).json({ success: false, message: 'Failed to read deliveries data' });
      }

      const deliveries = JSON.parse(data);
      deliveries.push(newDelivery);

      fs.writeFile('./data/deliveries.json', JSON.stringify(deliveries, null, 2), (err) => {
          if (err) {
              return res.status(500).json({ success: false, message: 'Failed to update deliveries data' });
          }

          res.json({ success: true });
      });
  });
});


// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.redirect('/');
  });
});

// Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
