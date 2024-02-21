const axios = require('axios');
const mongoose = require('mongoose');
const cron = require('node-cron');
const express = require('express');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
//task 1
mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
const name_and_id_Schema = new mongoose.Schema({
  id: String,
  name: String
});
const nameAndId = mongoose.model('name_and_ids', name_and_id_Schema);
async function fetchAndStoreCryptoData() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/list?include_platform=false');
    const res = response.data;
    await nameAndId.deleteMany({});
    await nameAndId.insertMany(res);
    console.log('Intitial data fetched');
  } catch (error) {
    console.error('Error intitial fetching:', error.message);
  }
}
async function updateCryptoData() {
    console.log("updating ... ");
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/list?include_platform=false');
    const res = response.data;
    for (const r of res) {
      await nameAndId.updateOne({ id: r.id }, r, { upsert: true });
    }
    console.log('Data updated');
  } catch (error) {
    console.error('Error updating:', error.message);
  }
}
fetchAndStoreCryptoData();
cron.schedule('0 * * * *', updateCryptoData);
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});
// task 2
app.use(express.json());
app.get('/convert', async (req, res) => {
  try {
    const { fromCurrency, toCurrency, date } = req.query;
    if (!fromCurrency || !toCurrency || !date) {
      return res.status(400).json({ error: 'Missing params' });
    }
    const fromCurrencyResponse = await axios.get(`https://api.coingecko.com/api/v3/coins/${fromCurrency}/history?date=${date}`);
    const fromCurrencyData = fromCurrencyResponse.data.market_data.current_price.inr;
    const toCurrencyResponse = await axios.get(`https://api.coingecko.com/api/v3/coins/${toCurrency}/history?date=${date}`);
    const toCurrencyData = toCurrencyResponse.data.market_data.current_price.inr;
    const price = fromCurrencyData / toCurrencyData;
    res.json({ price });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//task 3
app.use(express.json());
app.get('/companies', async (req, res) => {
  try {
    const { currency } = req.query;
    if (!currency || (currency !== 'bitcoin' && currency !== 'ethereum')) {
      return res.status(400).json({ error: 'Invalid crypto provided. Please provide either "bitcoin" or "ethereum".' });
    }
    const response = await axios.get(`https://api.coingecko.com/api/v3/companies/public_treasury/${currency}`);
    const companies = response.data.companies.map(company => company.name);
    res.json({ companies });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
