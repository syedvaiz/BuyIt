require('dotenv').config();

const port = 4000;
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
    console.log(file);
    return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage: storage });

app.post("/upload", upload.single('product'), (req, res) => {
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
    const data = jwt.verify(token, "secret_ecom");
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
  console.log("Root endpoint hit");
  res.send("Hello syed server is running");
});

app.use((req, res, next) => {
  console.log(`Request URL: ${req.url}`);
  next();
});

app.post('/login', async (req, res) => {
  let success = false;
  try {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
      const passCompare = req.body.password === user.password;
      if (passCompare) {
        const data = { user: { id: user.id } };
        success = true;
        const token = jwt.sign(data, 'secret_ecom');
        res.json({ success, token });
      } else {
        return res.status(400).json({ success: success, errors: "Please try with correct email/password" });
      }
    } else {
      return res.status(400).json({ success: success, errors: "Please try with correct email/password" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, errors: "Internal Server Error" });
  }
});

app.post('/signup', async (req, res) => {
  let success = false;
  try {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
      return res.status(400).json({ success: success, errors: "Existing user found with this email" });
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
    const token = jwt.sign(data, 'secret_ecom');
    success = true;
    res.json({ success, token });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, errors: "Internal Server Error" });
  }
});

app.get("/allproducts", async (req, res) => {
  console.log("/allproducts endpoint hit");
  try {
    let products = await Product.find({});
    res.send(products);
  } catch (err) {
    console.error("All products error:", err);
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.get("/newcollections", async (req, res) => {
  console.log("/newcollections endpoint hit");
  try {
    let products = await Product.find({});
    let arr = products.slice(1).slice(-8);
    res.send(arr);
  } catch (err) {
    console.error("New collections error:", err);
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.get("/popularinwomen", async (req, res) => {
  console.log("/popularinwomen endpoint hit");
  try {
    let products = await Product.find({});
    let arr = products.splice(0, 4);
    res.send(arr);
  } catch (err) {
    console.error("Popular in women error:", err);
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post('/addtocart', fetchuser, async (req, res) => {
  console.log("/addtocart endpoint hit");
  try {
    let userData = await Users.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Added");
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post('/removefromcart', fetchuser, async (req, res) => {
  console.log("/removefromcart endpoint hit");
  try {
    let userData = await Users.findOne({ _id: req.user.id });
    if (userData.cartData[req.body.itemId] != 0) {
      userData.cartData[req.body.itemId] -= 1;
    }
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Removed");
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post('/getcart', fetchuser, async (req, res) => {
  console.log("/getcart endpoint hit");
  try {
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post("/addproduct", async (req, res) => {
  console.log("/addproduct endpoint hit");
  try {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
      let last_product_array = products.slice(-1);
      let last_product = last_product_array[0];
      id = last_product.id + 1;
    } else {
      id = 1;
    }
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
    console.error("Add product error:", err);
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post("/removeproduct", async (req, res) => {
  console.log("/removeproduct endpoint hit");
  try {
    const product = await Product.findOneAndDelete({ id: req.body.id });
    res.json({ success: true, name: req.body.name });
  } catch (err) {
    console.error("Remove product error:", err);
    res.status(500).json({ errors: "Internal Server Error" });
  }
});

app.post('/api/orders', async (req, res) => {
  console.log("/api/orders endpoint hit");
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json({ success: true, message: "Order placed successfully" });
  } catch (error) {
    console.error("Order error:", error);
    res.status(500).json({ success: false, message: "Failed to place order" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
