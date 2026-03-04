const express = require("express");
const { nanoid } = require("nanoid");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = 3000;

const JWT_SECRET = "access_secret";
const ACCESS_EXPIRES_IN = "15m";

app.use(express.json());

let users = [];
let products = [];

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "API AUTH + PRODUCTS",
            version: "1.0.0",
            description: "Практика 8 (на основе 7)",
        },
        servers: [{ url: `http://localhost:${port}` }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: ["./app.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

function findUser(username) {
    return users.find((u) => u.username === username);
}

async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res
            .status(401)
            .json({ error: "Missing or invalid Authorization header" });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload; // { sub, username, iat, exp }
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, age]
 *             properties:
 *               username:
 *                 type: string
 *                 example: Daria
 *               password:
 *                 type: string
 *                 example: qwerty123
 *               age:
 *                 type: integer
 *                 example: 25
 *     responses:
 *       201:
 *         description: Пользователь создан
 *       400:
 *         description: Ошибка валидации/пользователь уже существует
 */
app.post("/api/auth/register", async (req, res) => {
    const { username, password, age } = req.body;

    if (!username || !password || typeof age !== "number") {
        return res
            .status(400)
            .json({ error: "username, password and age are required" });
    }

    if (findUser(username)) {
        return res.status(400).json({ error: "user exists" });
    }

    const newUser = {
        id: nanoid(),
        username: String(username).trim(),
        age,
        hashedPassword: await hashPassword(password),
    };

    users.push(newUser);

    res.status(201).json({
        username: newUser.username,
        age: newUser.age,
        hashedPassword: newUser.hashedPassword,
        id: newUser.id,
    });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Логин пользователя (выдаёт JWT accessToken)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: Daria
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       200:
 *         description: Успешный вход
 *       401:
 *         description: Неверный пароль
 *       404:
 *         description: Пользователь не найден
 */
app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;

    const user = findUser(username);
    if (!user) return res.status(404).json({ error: "user not found" });

    const valid = await verifyPassword(password, user.hashedPassword);
    if (!valid) return res.status(401).json({ error: "wrong password" });

    const accessToken = jwt.sign(
        { sub: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );

    res.json({ accessToken });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получить текущего пользователя (нужен Bearer token)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Текущий пользователь
 *       401:
 *         description: Нет токена или токен неверный
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
    const user = users.find((u) => u.id === req.user.sub);
    if (!user) return res.status(404).json({ error: "user not found" });

    res.json({ id: user.id, username: user.username, age: user.age });
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить товары
 *     responses:
 *       200:
 *         description: Список товаров
 */
app.get("/api/products", (req, res) => {
    res.json(products);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать товар
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, category, price]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Adidas shoes
 *               category:
 *                 type: string
 *                 example: shoes
 *               description:
 *                 type: string
 *                 example: Running sneakers
 *               price:
 *                 type: number
 *                 example: 120
 *     responses:
 *       201:
 *         description: Товар создан
 */
app.post("/api/products", (req, res) => {
    const { title, category, description, price } = req.body;

    const product = {
        id: nanoid(),
        title,
        category,
        description,
        price,
    };

    products.push(product);
    res.status(201).json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по id (защищено JWT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Товар
 *       401:
 *         description: Нет/неверный токен
 *       404:
 *         description: Не найден
 */
app.get("/api/products/:id", authMiddleware, (req, res) => {
    const product = products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "not found" });
    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар по id (защищено JWT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       200:
 *         description: Обновлённый товар
 *       401:
 *         description: Нет/неверный токен
 *       404:
 *         description: Не найден
 */
app.put("/api/products/:id", authMiddleware, (req, res) => {
    const product = products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "not found" });

    Object.assign(product, req.body);
    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар по id (защищено JWT)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Удалено
 *       401:
 *         description: Нет/неверный токен
 */
app.delete("/api/products/:id", authMiddleware, (req, res) => {
    products = products.filter((p) => p.id !== req.params.id);
    res.json({ deleted: true });
});

app.listen(port, () => {
    console.log(`Server running http://localhost:${port}`);
    console.log(`Swagger http://localhost:${port}/api-docs`);
});