const express = require('express');
const app = express();
const port = 3000;

// In-memory products storage
let products = [
    {
        id: 1,
        name: 'Adidas Adizero Adios Pro 4',
        price: 250,
        description: 'Супер-кроссовки для марафонов: LIGHTSTRIKE PRO, ENERGYRODS 2.0, Continental rubber.',
        imageLight: '/shoes.jpg',
        imageDark: '/shoes-dark.png',
        link: 'https://www.adidas.com/us/adizero-adios-pro-4-shoes/JR1267.html'
    },
    {
        id: 2,
        name: 'SHU Run Loose Shorts Brown 25',
        price: 80,
        description: 'Беговые свободные шорты (коричневые). Лёгкие и удобные для тренировок.',
        imageLight: '/shorts.jpg',
        imageDark: '/shorts-dark.png',
        link: 'https://shuclothes.com/ru/run/run-shorts/run-loose-shorts-brown-25'
    }
];


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// Logger middleware (optional but professional)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Root
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// CREATE
app.post('/products', (req, res) => {
    const { name, price } = req.body;

    if (!name || price === undefined) {
        return res.status(400).json({ message: 'Name and price required' });
    }

    const product = {
        id: Date.now(),
        name,
        price
    };

    products.push(product);
    res.status(201).json(product);
});

// READ ALL
app.get('/products', (req, res) => {
    res.json(products);
});

// READ ONE
app.get('/products/:id', (req, res) => {
    const product = products.find(p => p.id == req.params.id);

    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
});

// UPDATE
app.patch('/products/:id', (req, res) => {
    const product = products.find(p => p.id == req.params.id);

    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    const { name, price } = req.body;

    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;

    res.json(product);
});

// DELETE
app.delete('/products/:id', (req, res) => {
    const index = products.findIndex(p => p.id == req.params.id);

    if (index === -1) {
        return res.status(404).json({ message: 'Product not found' });
    }

    products.splice(index, 1);
    res.send('Deleted');
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
