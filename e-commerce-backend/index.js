require('dotenv').config();

const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

app.use(express.json());

app.use(cors({
  origin: 'https://buyit-frontend.vercel.app',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
}));

app.options('*', cors());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("MongoDB connected");
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

const storage = multer.diskStorage({
  destination: path.join(__dirname, 'upload/images'),
  filename: (req, file, cb) => {
    return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage: storage });

app.post("/api/upload", upload.single('product'), (req, res) => {
  res.json({
    success: 1,
    image_url: `https://buyit-api-theta.vercel.app/images/${req.file.filename}`
  });
});

app.use('/images', express.static(path.join(__dirname, 'upload/images')));

const fetchuser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    return res.status(401).send({ errors: "Please authenticate using a valid token" });
  }
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.user = data.user;
    next();
  } catch (error) {
    return res.status(401).send({ errors: "Please authenticate using a valid token" });
  }
};

const Users = mongoose.model("Users", {
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  cartData: { type: Object },
  date: { type: Date, default: Date.now },
});

const Product = mongoose.model("Product", {
  id: { type: Number, required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  new_price: { type: Number },
  old_price: { type: Number },
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true },
});

const Order = mongoose.model("Order", {
  items: [{ id: Number, name: String, quantity: Number, price: Number, total: Number }],
  totalAmount: Number,
  shippingInfo: { name: String, address: String, city: String, postalCode: String },
  paymentInfo: { cardNumber: String, expiryDate: String, cvv: String },
  date: { type: Date, default: Date.now },
});

app.get("/", (req, res) => {
  res.send("Hello Syed, server is running");
});

app.post('/api/login', async (req, res) => {
  let success = false;
  try {
    let user = await Users.findOne({ email: req.body.email });
    if (user && req.body.password === user.password) {
      const data = { user: { id: user.id } };
      success = true;
      const token = jwt.sign(data, process.env.JWT_SECRET);
      res.json({ success, token });
    } else {
      res.status(400).json({ success, errors: "Invalid email/password" });
    }
  } catch (err) {
    res.status(500).json({ success: false, errors: "Internal Server Error" });
  }
});

app.post('/api/signup', async (req, res) => {
  let success = false;
  try {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
      return res.status(400).json({ success, errors: "User already exists" });
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
      cart[i] = 0;
    }
    const user = new Users({
      name: req.body.username,
      email: req.body.email,
      password: req.body.password,
      cartData: cart,
    });
    await user.save();
    const data = { user: { id: user.id } };
    const token = jwt.sign(data, process.env.JWT_SECRET);
    success = true;
    res.json({ success, token });
  } catch (err) {
    res.status(500).json({ success: false, errors: "Internal Server Error" });
  }
});

app.get("/api/allproducts", async (req, res) => {
  try {
    let products = await Product.find({});
    res.send(products);
  } catch (err) {
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.get("/api/newcollections", async (req, res) => {
  try {
    let products = await Product.find({});
    let arr = products.slice(-8);
    res.send(arr);
  } catch (err) {
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.get("/api/popularinwomen", async (req, res) => {
  try {
    let products = await Product.find({});
    let arr = products.splice(0, 4);
    res.send(arr);
  } catch (err) {
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post('/api/addtocart', fetchuser, async (req, res) => {
  try {
    let userData = await Users.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Added");
  } catch (err) {
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post('/api/removefromcart', fetchuser, async (req, res) => {
  try {
    let userData = await Users.findOne({ _id: req.user.id });
    if (userData.cartData[req.body.itemId] != 0) {
      userData.cartData[req.body.itemId] -= 1;
    }
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Removed");
  } catch (err) {
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post('/api/getcart', fetchuser, async (req, res) => {
  try {
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);
  } catch (err) {
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post("/api/addproduct", async (req, res) => {
  try {
    let products = await Product.find({});
    let id = products.length > 0 ? products.slice(-1)[0].id + 1 : 1;
    const product = new Product({
      id: id,
      name: req.body.name,
      image: req.body.image,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
    });
    await product.save();
    res.json({ success: true, name: req.body.name });
  } catch (err) {
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post("/api/removeproduct", async (req, res) => {
  try {
    await Product.findOneAndDelete({ id: req.body.id });
    res.json({ success: true, name: req.body.name });
  } catch (err) {
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json({ success: true, message: "Order placed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to place order" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
