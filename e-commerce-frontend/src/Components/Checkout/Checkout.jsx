import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShopContext } from '../../Context/ShopContext';
import './Checkout.css';

const Checkout = () => {
  const { cartItems, products, getTotalCartAmount } = useContext(ShopContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const orderDetails = {
      items: products.filter(product => cartItems[product.id] > 0).map(product => ({
        id: product.id,
        name: product.name,
        quantity: cartItems[product.id],
        price: product.new_price,
        total: product.new_price * cartItems[product.id]
      })),
      totalAmount: getTotalCartAmount(),
      shippingInfo: {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode
      },
      paymentInfo: {
        cardNumber: formData.cardNumber,
        expiryDate: formData.expiryDate,
        cvv: formData.cvv
      }
    };

    try {
      // Send order details to the backend
      const response = await fetch('http://localhost:4000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderDetails)
      });

      if (response.ok) {
        // Redirect to the confirmation page
        navigate('/confirmation');
      } else {
        // Handle server errors
        console.error('Failed to place order');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="checkout">
      <h1>Checkout</h1>

      <div className="checkout-summary">
        <h2>Order Summary</h2>
        {products.map((product) => {
          if (cartItems[product.id] > 0) {
            return (
              <div key={product.id} className="checkout-item">
                <img src={product.image} alt={product.name} />
                <div className="checkout-item-details">
                  <p>{product.name}</p>
                  <p>Quantity: {cartItems[product.id]}</p>
                  <p>Price: ${product.new_price}</p>
                  <p>Total: ${product.new_price * cartItems[product.id]}</p>
                </div>
              </div>
            );
          }
          return null;
        })}
        <h3>Total Amount: ${getTotalCartAmount()}</h3>
      </div>

      <form className="checkout-form" onSubmit={handleSubmit}>
        <h2>Shipping Information</h2>
        <div className="checkout-form-group">
          <label htmlFor="name">Name</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div className="checkout-form-group">
          <label htmlFor="address">Address</label>
          <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} required />
        </div>
        <div className="checkout-form-group">
          <label htmlFor="city">City</label>
          <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} required />
        </div>
        <div className="checkout-form-group">
          <label htmlFor="postalCode">Postal Code</label>
          <input type="text" id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange} required />
        </div>

        <h2>Payment Information</h2>
        <div className="checkout-form-group">
          <label htmlFor="cardNumber">Card Number</label>
          <input type="text" id="cardNumber" name="cardNumber" value={formData.cardNumber} onChange={handleChange} required />
        </div>
        <div className="checkout-form-group">
          <label htmlFor="expiryDate">Expiry Date</label>
          <input type="text" id="expiryDate" name="expiryDate" placeholder="MM/YY" value={formData.expiryDate} onChange={handleChange} required />
        </div>
        <div className="checkout-form-group">
          <label htmlFor="cvv">CVV</label>
          <input type="text" id="cvv" name="cvv" value={formData.cvv} onChange={handleChange} required />
        </div>

        <button type="submit" className="checkout-submit-btn">Place Order</button>
      </form>
    </div>
  );
};

export default Checkout;
