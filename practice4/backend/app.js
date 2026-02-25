const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let products = [
    {
        id: nanoid(),
        name: 'Adidas Adizero Adios Pro 4',
        category: 'Shoes',
        description: 'подходят для пробежек на дистанции свыше 20км. в кроссовки интегрированы карбоновые пластины',
        price: 250,
        stock: 12,
        rating: 4.8,
        image: 'https://a.lmcdn.ru/img600x866/R/T/RTLADY043301_27661435_3_v1_2x.jpg',
        link: 'https://www.lamoda.ru/p/rtlady043301/shoes-adidas-krossovki/?utm_referrer=https%3A%2F%2Fwww.google.com%2F'
    },
    {
        id: nanoid(),
        name: 'Run Loose Shorts Brown 25',
        category: 'Shorts',
        description: 'спортивные шорты со специализированными технологиями для комфортного бега',
        price: 79,
        stock: 20,
        rating: 4.6,
        image: 'https://cdn.shuclothes.com/sig/size:8192/q:100/aHR0cHM6Ly9zaHVjbG90aGVzLmNvbS9zdG9yYWdlLzUxODQ1LzEzOS5qcGc',
        link: 'https://shuclothes.com/ru/run/run-shorts/run-loose-shorts-brown-25'
    }
];




app.get('/', (req, res) => {
    res.send('API is running');
});

app.get('/api/products', (req, res) => {
    res.json(products);
});

app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
});

app.post('/api/products', (req, res) => {
    const { name, price, description, image, link, category, stock, rating } = req.body;

    if (!name || price === undefined) {
        return res.status(400).json({ message: 'name and price are required' });
    }

    const product = {
        id: nanoid(),
        name: String(name),
        price: Number(price),
        description: description ? String(description) : '',
        image: image ? String(image) : '',
        link: link ? String(link) : '',
        category: category ? String(category) : 'Other',
        stock: stock !== undefined ? Number(stock) : 0,
        rating: rating !== undefined ? Number(rating) : null
    };

    products.unshift(product);
    res.status(201).json(product);
});

app.patch('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const { name, price, description, image, link, category, stock, rating } = req.body;

    if (name !== undefined) product.name = String(name);
    if (price !== undefined) product.price = Number(price);
    if (description !== undefined) product.description = String(description);
    if (image !== undefined) product.image = String(image);
    if (link !== undefined) product.link = String(link);
    if (category !== undefined) product.category = String(category);
    if (stock !== undefined) product.stock = Number(stock);
    if (rating !== undefined) product.rating = rating === null ? null : Number(rating);

    res.json(product);
});

app.delete('/api/products/:id', (req, res) => {
    const before = products.length;
    products = products.filter(p => p.id !== req.params.id);
    if (products.length === before) return res.status(404).json({ message: 'Product not found' });
    res.send('Deleted');
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});